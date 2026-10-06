import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, filterLeadsByRole, logAuditEvent, getNextRoundRobinSale } from '@/lib/db';
import { generateId, canViewCustomerPhone, canViewCustomerPersonalInfo, maskPhoneNumber } from '@/lib/utils';
import { Lead, Order, OrderItem, OrderStatus, Deal } from '@/types/crm';
import { notifyNewOrder, notifyNewLead } from '@/lib/push';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  let leads = filterLeadsByRole(db.leads, user, db);

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const saleId = searchParams.get('saleId');
  const productId = searchParams.get('productId');
  const search = searchParams.get('search')?.toLowerCase().trim();
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (status && status !== 'ALL') {
    leads = leads.filter(l => l.status === status);
  }
  if (source && source !== 'ALL') {
    leads = leads.filter(l => l.source === source);
  }
  if (saleId && saleId !== 'ALL') {
    leads = leads.filter(l => l.assignedSaleId === saleId);
  }
  if (productId && productId !== 'ALL') {
    leads = leads.filter(l => l.productIds && l.productIds.includes(productId));
  }
  if (search) {
    leads = leads.filter(l =>
      l.fullName.toLowerCase().includes(search) ||
      l.phone.includes(search) ||
      l.email.toLowerCase().includes(search) ||
      (l.company && l.company.toLowerCase().includes(search)) ||
      (l.productNames && l.productNames.some(p => p.toLowerCase().includes(search)))
    );
  }
  if (dateFrom) {
    leads = leads.filter(l => new Date(l.createdAt) >= new Date(dateFrom));
  }
  if (dateTo) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    leads = leads.filter(l => new Date(l.createdAt) <= endOfDay);
  }

  // Sort by createdAt descending
  leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Bảo mật thông tin khách hàng của Sale khác:
  // Sale chỉ xem được Tên (fullName), Mua chậu nào (productNames), Tên bạn sale đó (assignedSaleName), Ngày tạo (createdAt)
  // Các thông tin cá nhân (SĐT, Email, Địa chỉ, Công ty, Ngày sinh) của khách thuộc Sale khác bị ẩn đi
  const securedLeads = leads.map(l => {
    if (canViewCustomerPersonalInfo(user, l.assignedSaleId)) {
      return l;
    }
    return {
      ...l,
      phone: maskPhoneNumber(l.phone),
      email: '',
      address: '',
      company: '',
      dob: '',
      isOtherSaleLead: true,
    };
  });

  let allowedSales = db.users.filter(u => u.role === 'SALE' && !u.isLocked);
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    allowedSales = allowedSales.filter(u => u.teamId === leaderTeamId || u.id === user.id);
  } else if (user.role === 'SALE') {
    allowedSales = allowedSales.filter(u => u.id === user.id);
  }

  return NextResponse.json({
    leads: securedLeads,
    total: leads.length,
    sources: db.sources,
    statuses: db.statuses,
    sales: allowedSales,
    products: db.products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price ?? p.retailPrice,
      retailPrice: p.retailPrice,
      category: p.category,
      unit: p.unit,
    })),
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();
  const body = await request.json();

  const {
    fullName,
    phone,
    email,
    address,
    dob,
    company,
    source,
    status = 'CONSULTING',
    tags = [],
    assignedSaleId,
    autoRoundRobin = false,
    initialNote,
    productIds = [],
    orderItems = [],
    discount = 0,
    deposit = 0,
    shippingFee = 0,
  } = body;

  if (!fullName || !phone) {
    return NextResponse.json({ error: 'Họ tên và Số điện thoại là bắt buộc' }, { status: 400 });
  }

  const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
  let finalSaleId = assignedSaleId;
  let finalSaleName: string | undefined = undefined;

  if (finalSaleId) {
    const saleUser = db.users.find(u => u.id === finalSaleId);
    if (user.role === 'LEADER' && saleUser && saleUser.teamId !== leaderTeamId && saleUser.id !== user.id) {
      return NextResponse.json({ error: 'Quản lý chỉ được phân công khách hàng cho nhân viên trong đội nhóm của mình' }, { status: 403 });
    }
    finalSaleName = saleUser?.name;
  } else if (autoRoundRobin) {
    const roundRobinSale = getNextRoundRobinSale(db, user.role === 'LEADER' ? leaderTeamId : undefined);
    if (roundRobinSale) {
      finalSaleId = roundRobinSale.id;
      finalSaleName = roundRobinSale.name;
    }
  } else {
    // Đơn hàng của ai tạo thì mặc định ghi nhận 100% cho chính người đó (dù là SALE, LEADER, ADMIN hay Giám đốc)
    finalSaleId = user.id;
    finalSaleName = user.name;
  }

  // Add source to db.sources if new
  if (source && !db.sources.includes(source)) {
    db.sources.push(source);
  }

  // Chuẩn bị danh sách sản phẩm của đơn hàng
  let finalOrderItems: OrderItem[] = [];
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    finalOrderItems = orderItems.map((item: any) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Math.max(0, Number(item.unitPrice) || 0);
      return {
        productId: item.productId || generateId('item'),
        productName: item.productName || 'Sản phẩm thủy sinh',
        quantity: qty,
        unitPrice: price,
        total: qty * price,
      };
    });
  } else if (Array.isArray(productIds) && productIds.length > 0) {
    finalOrderItems = productIds.map(pid => {
      const prod = db.products.find(p => p.id === pid);
      const price = prod?.price ?? prod?.retailPrice ?? 0;
      return {
        productId: pid,
        productName: prod?.name || 'Sản phẩm thủy sinh',
        quantity: 1,
        unitPrice: price,
        total: price,
      };
    });
  } else {
    finalOrderItems = [
      {
        productId: 'prod_lead_general',
        productName: 'Tư vấn nhu cầu setup thủy sinh',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ];
  }

  // Thuật toán tính toán tài chính:
  // 1. Tổng tiền hàng (subtotal)
  const subtotal = finalOrderItems.reduce((acc, it) => acc + it.total, 0);
  const numDiscount = Math.max(0, Number(discount) || 0);
  const numShipping = Math.max(0, Number(shippingFee) || 0);
  const numDeposit = Math.max(0, Number(deposit) || 0);

  // 2. Tổng giá trị đơn hàng = Tiền hàng + Tiền ship - Giảm giá (chiết khấu)
  const totalAmount = Math.max(0, subtotal + numShipping - numDiscount);

  // 3. Tiền đã thu thực tế (ban đầu là tiền cọc, tối đa không vượt quá tổng đơn)
  const paidAmount = Math.min(numDeposit, totalAmount);

  // 4. Công nợ còn lại phải thu = Tổng đơn - Đã thu
  const remainingDebt = Math.max(0, totalAmount - paidAmount);

  // Xác định trạng thái đơn hàng
  let orderStatus: OrderStatus = 'PENDING';
  if (status === 'LOST') {
    orderStatus = 'CANCELLED';
  } else if (totalAmount > 0 && remainingDebt === 0) {
    orderStatus = 'COMPLETED';
  } else if (status === 'WON') {
    orderStatus = remainingDebt === 0 ? 'COMPLETED' : 'PENDING';
  }

  const now = new Date().toISOString();
  const leadId = generateId('lead');
  const orderId = generateId('ord');
  const orderCode = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Tạo Đơn hàng & Công nợ tự động đổ về cho Kế toán
  const newOrder: Order = {
    id: orderId,
    code: orderCode,
    leadId: leadId,
    customerName: fullName,
    customerPhone: phone,
    customerAddress: address || '',
    company: company || '',
    items: finalOrderItems,
    subtotal,
    discount: numDiscount,
    shippingFee: numShipping,
    deposit: numDeposit,
    totalAmount,
    paidAmount,
    remainingDebt,
    status: orderStatus,
    leadSource: source || 'Website / Tự đến',
    consultingStatus: status,
    notes: initialNote || '',
    assignedSaleId: finalSaleId || user.id,
    assignedSaleName: finalSaleName || user.name,
    createdAt: now,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  db.orders.unshift(newOrder);

  // Tạo bản ghi Lead mới
  const newLead: Lead = {
    id: leadId,
    fullName,
    phone,
    email: email || '',
    address: address || '',
    dob: dob || '',
    company: company || '',
    source: source || 'Website / Tự đến',
    status,
    assignedSaleId: finalSaleId,
    assignedSaleName: finalSaleName,
    tags: Array.isArray(tags) ? tags : [],
    productIds: finalOrderItems.map(it => it.productId).filter(id => id !== 'prod_lead_general'),
    productNames: finalOrderItems.map(it => it.productName),
    discount: numDiscount,
    deposit: numDeposit,
    shippingFee: numShipping,
    subtotal,
    totalAmount,
    remainingDebt,
    orderId,
    orderCode,
    notesCount: initialNote ? 1 : 0,
    lastContactAt: now,
    createdAt: now,
    updatedAt: now,
  };

  db.leads.unshift(newLead);

  // Tạo Deal tương ứng nếu có giá trị để đồng bộ vào Pipeline và Báo cáo Doanh số
  if (totalAmount > 0 || status === 'WON') {
    const dealId = generateId('deal');
    const newDeal: Deal = {
      id: dealId,
      title: `${fullName} - ${finalOrderItems[0]?.productName || 'Đơn hàng'}`,
      leadId: newLead.id,
      customerName: fullName,
      customerPhone: phone,
      pipelineId: db.pipelines[0]?.id || 'pipe_default',
      stageId: status === 'WON'
        ? (db.pipelines[0]?.stages.find(s => s.isWon)?.id || 'st_won')
        : (db.pipelines[0]?.stages[0]?.id || 'st_1'),
      value: totalAmount,
      winProbability: status === 'WON' ? 100 : (status === 'CONSULTING' ? 60 : 30),
      expectedCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      assignedSaleId: finalSaleId || user.id,
      assignedSaleName: finalSaleName || user.name,
      products: finalOrderItems.map(it => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: 0,
        total: it.total,
      })),
      contracts: [],
      stageUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    db.deals.unshift(newDeal);
    newOrder.dealId = dealId;
  }

  if (initialNote) {
    db.notes.unshift({
      id: generateId('nt'),
      leadId: newLead.id,
      authorId: user.id,
      authorName: user.name,
      content: initialNote,
      createdAt: now,
    });
  }

  await writeDb(db);

  // Tự động gửi thông báo đẩy (Web Push) tới Admin và Leader của nhóm
  try {
    if (newOrder.totalAmount > 0) {
      await notifyNewOrder({ order: newOrder, creatorUser: user });
    } else {
      await notifyNewLead({ lead: newLead, creatorUser: user });
    }
  } catch (pushErr) {
    console.error('Lỗi gửi push notification khi tạo đơn / lead mới:', pushErr);
  }

  await logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'LEAD',
    newLead.id,
    `Tạo Lead "${newLead.fullName}" & Tự động đẩy Đơn hàng ${orderCode} (Tổng: ${new Intl.NumberFormat('vi-VN').format(totalAmount)} ₫, Cọc: ${new Intl.NumberFormat('vi-VN').format(paidAmount)} ₫, Nợ: ${new Intl.NumberFormat('vi-VN').format(remainingDebt)} ₫)`
  );

  return NextResponse.json({ lead: newLead, order: newOrder }, { status: 201 });
}
