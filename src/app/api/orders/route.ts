import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, filterOrdersByRole, logAuditEvent } from '@/lib/db';
import { canViewCustomerPhone, maskPhoneNumber, generateId } from '@/lib/utils';
import { OrderStatus, UserNotification } from '@/types/crm';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();

  let orders = filterOrdersByRole(db.orders, user, db);

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const hasDebt = searchParams.get('hasDebt');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (status && status !== 'ALL') {
    if (status === 'DELIVERED_UNPAID') {
      orders = orders.filter(o => o.status === 'DELIVERED_UNPAID' || o.status === 'DELIVERING');
    } else {
      orders = orders.filter(o => o.status === status);
    }
  }
  if (hasDebt === 'true') {
    orders = orders.filter(o => o.remainingDebt > 0);
  }

  if (dateFrom) {
    const start = new Date(dateFrom);
    orders = orders.filter(o => new Date(o.createdAt).getTime() >= start.getTime());
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    orders = orders.filter(o => new Date(o.createdAt).getTime() <= end.getTime());
  }

  // Bảo mật SĐT khách hàng: Giám đốc/Quản lý xem hết; Sale chỉ xem SĐT khách mình phụ trách
  const securedOrders = orders.map(o => {
    if (canViewCustomerPhone(user, o.assignedSaleId)) {
      return o;
    }
    return {
      ...o,
      customerPhone: maskPhoneNumber(o.customerPhone),
    };
  });

  // Summary debt metrics (Ẩn tài chính đối với STAFF)
  const isStaff = user.role === 'STAFF';
  const totalRevenue = isStaff ? 0 : orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0);
  const totalCollected = isStaff ? 0 : orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.paidAmount : 0), 0);
  const totalDebt = isStaff ? 0 : orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.remainingDebt : 0), 0);

  return NextResponse.json({
    orders: securedOrders,
    metrics: {
      totalRevenue,
      totalCollected,
      totalDebt,
      orderCount: orders.length,
      hideFinancials: isStaff,
    },
  });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();
  const body = await request.json();
  const { id, status, paidAmount, customerAddress, dueDate, notes, cancelReason, discount, shippingFee } = body;

  const oIndex = db.orders.findIndex(o => o.id === id);
  if (oIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Đơn hàng' }, { status: 404 });
  }

  const currentOrder = db.orders[oIndex];
  const previousStatus = currentOrder.status;

  if (customerAddress !== undefined) currentOrder.customerAddress = customerAddress;
  if (dueDate) currentOrder.dueDate = dueDate;
  if (notes !== undefined) currentOrder.notes = notes;
  if (cancelReason !== undefined) currentOrder.cancelReason = cancelReason;

  // STAFF không được quyền sửa tiền thanh toán và công nợ
  if (user.role !== 'STAFF') {
    if (discount !== undefined) {
      currentOrder.discount = Math.max(0, Number(discount) || 0);
    }
    if (shippingFee !== undefined) {
      currentOrder.shippingFee = Math.max(0, Number(shippingFee) || 0);
    }
    if (currentOrder.subtotal !== undefined) {
      currentOrder.totalAmount = Math.max(0, currentOrder.subtotal + (currentOrder.shippingFee || 0) - (currentOrder.discount || 0));
    }
  }

  // Xử lý 4 trạng thái đơn hàng theo đúng nghiệp vụ:
  // 1. PENDING: Chờ xử lý
  // 2. DELIVERED_UNPAID (hoặc DELIVERING): Đã giao hàng thành công (chưa thanh toán) -> chuyển thành dư nợ
  // 3. COMPLETED: Hoàn thành -> đã thanh toán xong hết rồi (tất toán 100%)
  // 4. CANCELLED: Đơn hàng hủy
  if (status) {
    currentOrder.status = status as OrderStatus;

    if (status === 'COMPLETED' && user.role !== 'STAFF') {
      // Hoàn thành: Khách đã thanh toán xong hết toàn bộ tiền
      currentOrder.paidAmount = currentOrder.totalAmount;
      currentOrder.remainingDebt = 0;
    } else if (status === 'DELIVERED_UNPAID' || status === 'DELIVERING') {
      // Đã giao hàng thành công (chưa thanh toán) -> số tiền còn lại chuyển thành dư nợ chính thức
      let currentPaid = currentOrder.paidAmount;
      if (previousStatus === 'COMPLETED') {
        currentPaid = currentOrder.deposit || 0;
      }
      if (paidAmount !== undefined && paidAmount !== currentOrder.totalAmount) {
        currentPaid = Math.min(Number(paidAmount) || 0, currentOrder.totalAmount);
      }
      currentOrder.paidAmount = currentPaid;
      currentOrder.remainingDebt = Math.max(0, currentOrder.totalAmount - currentPaid);
    } else if (status === 'PENDING') {
      let currentPaid = currentOrder.paidAmount;
      if (previousStatus === 'COMPLETED') {
        currentPaid = currentOrder.deposit || 0;
      }
      if (paidAmount !== undefined && paidAmount !== currentOrder.totalAmount) {
        currentPaid = Math.min(Number(paidAmount) || 0, currentOrder.totalAmount);
      }
      currentOrder.paidAmount = currentPaid;
      currentOrder.remainingDebt = Math.max(0, currentOrder.totalAmount - currentPaid);
    } else if (status === 'CANCELLED') {
      if (cancelReason) currentOrder.cancelReason = cancelReason;
      currentOrder.remainingDebt = 0;
    }
  } else if (paidAmount !== undefined && user.role !== 'STAFF') {
    const newPaid = Math.min(Number(paidAmount) || 0, currentOrder.totalAmount);
    currentOrder.paidAmount = newPaid;
    currentOrder.remainingDebt = Math.max(0, currentOrder.totalAmount - newPaid);
    if (currentOrder.remainingDebt === 0 && currentOrder.totalAmount > 0 && currentOrder.status === 'PENDING') {
      currentOrder.status = 'COMPLETED';
    }
  }

  // TỰ ĐỘNG GỬI THÔNG BÁO VỀ CHO BẠN SALE ĐÃ CHỐT KHÁCH ĐÓ KHI ĐỔI TRẠNG THÁI
  if (status && status !== previousStatus && currentOrder.assignedSaleId) {
    const statusDisplayMap: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      DELIVERED_UNPAID: 'Đã giao hàng thành công (chưa thanh toán)',
      DELIVERING: 'Đã giao hàng thành công (chưa thanh toán)',
      COMPLETED: 'Hoàn thành (Đã thanh toán xong 100%)',
      CANCELLED: 'Đơn hàng hủy',
    };

    const oldLabel = statusDisplayMap[previousStatus] || previousStatus;
    const newLabel = statusDisplayMap[currentOrder.status] || currentOrder.status;

    let extraMessage = '';
    if (currentOrder.status === 'DELIVERED_UNPAID' || currentOrder.status === 'DELIVERING') {
      extraMessage = ` Đơn hàng đã giao, ghi nhận dư nợ cần thu: ${new Intl.NumberFormat('vi-VN').format(currentOrder.remainingDebt)} ₫.`;
    } else if (currentOrder.status === 'COMPLETED') {
      extraMessage = ` Khách đã tất toán 100% hóa đơn (${new Intl.NumberFormat('vi-VN').format(currentOrder.totalAmount)} ₫).`;
    } else if (currentOrder.status === 'CANCELLED' && currentOrder.cancelReason) {
      extraMessage = ` Lý do hủy: "${currentOrder.cancelReason}".`;
    }

    const notification: UserNotification = {
      id: generateId('notif'),
      userId: currentOrder.assignedSaleId,
      title: `Đơn ${currentOrder.code} đổi sang: ${newLabel}`,
      message: `Đơn hàng của khách "${currentOrder.customerName}" vừa chuyển từ [${oldLabel}] sang [${newLabel}].${extraMessage}`,
      type: 'ORDER_STATUS',
      orderId: currentOrder.id,
      orderCode: currentOrder.code,
      leadId: currentOrder.leadId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (!db.notifications) {
      db.notifications = [];
    }
    db.notifications.unshift(notification);
  }

  // ĐỒNG BỘ HOÀN TOÀN SANG KHÁCH HÀNG & LEAD
  const relatedLead = db.leads.find(l => l.id === currentOrder.leadId);
  if (relatedLead) {
    if (currentOrder.status === 'CANCELLED') {
      relatedLead.status = 'LOST';
      relatedLead.remainingDebt = 0;
    } else {
      relatedLead.remainingDebt = currentOrder.remainingDebt;
      relatedLead.deposit = currentOrder.paidAmount;
      relatedLead.totalAmount = currentOrder.totalAmount;
      if (currentOrder.status === 'COMPLETED') {
        relatedLead.status = 'WON';
      } else if (currentOrder.status === 'DELIVERED_UNPAID' || currentOrder.status === 'DELIVERING') {
        if (relatedLead.status !== 'WON') relatedLead.status = 'CONSULTING';
      }
    }
    relatedLead.updatedAt = new Date().toISOString();
  }

  // ĐỒNG BỘ VỚI DEAL & PIPELINE
  const relatedDeal = db.deals.find(d => (currentOrder.dealId && d.id === currentOrder.dealId) || d.leadId === currentOrder.leadId);
  if (relatedDeal) {
    if (currentOrder.status === 'COMPLETED') {
      const wonStage = db.pipelines[0]?.stages.find(s => s.isWon);
      if (wonStage) relatedDeal.stageId = wonStage.id;
      relatedDeal.winProbability = 100;
      relatedDeal.value = currentOrder.totalAmount;
    } else if (currentOrder.status === 'CANCELLED') {
      const lostStage = db.pipelines[0]?.stages.find(s => s.isLost);
      if (lostStage) relatedDeal.stageId = lostStage.id;
      relatedDeal.winProbability = 0;
    }
    relatedDeal.updatedAt = new Date().toISOString();
  }

  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'ORDER',
    id,
    `Cập nhật đơn hàng ${currentOrder.code}: Trạng thái: ${currentOrder.status}, Đã thanh toán: ${new Intl.NumberFormat('vi-VN').format(currentOrder.paidAmount)} ₫, Còn nợ: ${new Intl.NumberFormat('vi-VN').format(currentOrder.remainingDebt)} ₫`
  );

  return NextResponse.json({ order: currentOrder });
}
