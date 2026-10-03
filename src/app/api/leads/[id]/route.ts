import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, canAccessLead, canEditLead, logAuditEvent } from '@/lib/db';
import { canViewCustomerPersonalInfo, maskPhoneNumber } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();
  const lead = db.leads.find(l => l.id === params.id);

  if (!lead) {
    return NextResponse.json({ error: 'Không tìm thấy Lead' }, { status: 404 });
  }

  if (!canAccessLead(user, lead, db)) {
    return NextResponse.json({ error: 'Bạn không có quyền truy cập Lead này' }, { status: 403 });
  }

  // Bảo mật thông tin khách hàng:
  // Nếu là khách của Sale khác, ẩn SĐT, địa chỉ, email, công ty, ngày sinh
  const hasFullAccess = canViewCustomerPersonalInfo(user, lead.assignedSaleId);
  const securedLead = hasFullAccess
    ? lead
    : {
        ...lead,
        phone: maskPhoneNumber(lead.phone),
        email: '',
        address: '',
        company: '',
        dob: '',
        isOtherSaleLead: true,
      };

  const notes = hasFullAccess ? db.notes.filter(n => n.leadId === lead.id) : [];
  const auditLogs = hasFullAccess ? db.auditLogs.filter(a => a.entityId === lead.id) : [];
  const interactions = hasFullAccess ? db.interactions.filter(i => i.leadId === lead.id) : [];
  const deals = db.deals.filter(d => d.leadId === lead.id);
  const orders = db.orders.filter(o => o.leadId === lead.id);

  return NextResponse.json({
    lead: securedLead,
    notes,
    auditLogs,
    deals,
    orders,
    interactions,
    sources: db.sources,
    statuses: db.statuses,
    sales: db.users.filter(u => u.role === 'SALE' && !u.isLocked),
    products: db.products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price ?? p.retailPrice,
      retailPrice: p.retailPrice,
      imageUrl: p.imageUrl,
      category: p.category,
      unit: p.unit,
    })),
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();
  const leadIndex = db.leads.findIndex(l => l.id === params.id);

  if (leadIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Lead' }, { status: 404 });
  }

  const currentLead = db.leads[leadIndex];
  if (!canEditLead(user, currentLead, db)) {
    return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa khách hàng của Sale khác' }, { status: 403 });
  }

  const body = await request.json();
  const previousStatus = currentLead.status;
  const previousSale = currentLead.assignedSaleName;

  // Track status change for audit log
  const statusChanged = body.status && body.status !== previousStatus;

  // Add source to db.sources if new
  if (body.source && !db.sources.includes(body.source)) {
    db.sources.push(body.source);
  }

  // Handle productIds & productNames mapping
  if (body.productIds !== undefined) {
    const validProductIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const validProductNames: string[] = validProductIds
      .map(pid => db.products.find(p => p.id === pid)?.name)
      .filter((name): name is string => Boolean(name));
    body.productIds = validProductIds;
    body.productNames = validProductNames;
  }

  const updatedLead = {
    ...currentLead,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  // ĐỒNG BỘ 100% SANG CÁC ĐƠN HÀNG VÀ CÔNG NỢ LIÊN QUAN
  const leadOrders = db.orders.filter(o => o.leadId === currentLead.id);
  leadOrders.forEach(ord => {
    if (body.fullName) ord.customerName = body.fullName;
    if (body.phone) ord.customerPhone = body.phone;
    if (body.address) ord.customerAddress = body.address;
    if (body.company !== undefined) ord.company = body.company;

    if (statusChanged) {
      if (updatedLead.status === 'WON' && ord.status !== 'CANCELLED') {
        ord.status = 'COMPLETED';
        ord.paidAmount = ord.totalAmount;
        ord.remainingDebt = 0;
      } else if (updatedLead.status === 'LOST' || updatedLead.status === 'CANCELLED') {
        ord.status = 'CANCELLED';
        ord.remainingDebt = 0;
      }
    }
  });

  // ĐỒNG BỘ SANG CÁC DEAL LIÊN QUAN
  const leadDeals = db.deals.filter(d => d.leadId === currentLead.id);
  leadDeals.forEach(dl => {
    if (body.fullName) dl.customerName = body.fullName;
    if (body.phone) dl.customerPhone = body.phone;
    if (statusChanged) {
      if (updatedLead.status === 'WON') {
        const wonStage = db.pipelines[0]?.stages.find(s => s.isWon);
        if (wonStage) dl.stageId = wonStage.id;
        dl.winProbability = 100;
      } else if (updatedLead.status === 'LOST' || updatedLead.status === 'CANCELLED') {
        const lostStage = db.pipelines[0]?.stages.find(s => s.isLost);
        if (lostStage) dl.stageId = lostStage.id;
        dl.winProbability = 0;
      }
    }
    dl.updatedAt = new Date().toISOString();
  });

  db.leads[leadIndex] = updatedLead;
  writeDb(db);

  if (statusChanged) {
    logAuditEvent(
      user.id,
      user.name,
      'STAGE_CHANGE',
      'LEAD',
      updatedLead.id,
      `Chuyển trạng thái Lead sang: ${updatedLead.status}`,
      { previousValue: previousStatus, newValue: updatedLead.status }
    );
  } else {
    logAuditEvent(
      user.id,
      user.name,
      'UPDATE',
      'LEAD',
      updatedLead.id,
      `Cập nhật thông tin Lead: ${updatedLead.fullName}`
    );
  }

  return NextResponse.json({ lead: updatedLead });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();

  if (user.role === 'SALE' || user.role === 'STAFF') {
    return NextResponse.json({ error: 'Chỉ Quản lý hoặc Giám đốc mới có quyền xóa khách hàng' }, { status: 403 });
  }

  const leadIndex = db.leads.findIndex(l => l.id === params.id);
  if (leadIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Lead' }, { status: 404 });
  }

  const deletedLead = db.leads[leadIndex];
  db.leads.splice(leadIndex, 1);
  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'DELETE',
    'LEAD',
    params.id,
    `Xóa Lead: ${deletedLead.fullName} (${deletedLead.phone})`
  );

  return NextResponse.json({ success: true, message: 'Đã xóa Lead thành công' });
}
