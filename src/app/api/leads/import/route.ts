import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent, getNextRoundRobinSale } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Lead, Order } from '@/types/crm';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  const body = await request.json();
  const { rows, autoRoundRobin = false, assignedSaleId, defaultSource } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Dữ liệu hàng nhập không hợp lệ hoặc rỗng' }, { status: 400 });
  }

  const addedLeads: Lead[] = [];
  const errors: { row: number; reason: string }[] = [];
  const now = new Date().toISOString();

  let targetSaleName: string | undefined = undefined;
  if (assignedSaleId) {
    const sale = db.users.find(u => u.id === assignedSaleId);
    targetSaleName = sale?.name;
  }

  rows.forEach((row, index) => {
    const fullName = String(row.fullName || row['Họ tên'] || row['Tên'] || '').trim();
    const phone = String(row.phone || row['Số điện thoại'] || row['SĐT'] || '').trim();
    const email = String(row.email || row['Email'] || '').trim();
    const company = String(row.company || row['Công ty'] || '').trim();
    const address = String(row.address || row['Địa chỉ'] || '').trim();
    const source = String(row.source || row['Nguồn'] || defaultSource || 'Import Excel').trim();
    const tagStr = String(row.tags || row['Tags'] || '').trim();
    const tags = tagStr ? tagStr.split(',').map((t: string) => t.trim()) : ['Imported'];

    if (!fullName) {
      errors.push({ row: index + 1, reason: 'Thiếu họ tên khách hàng' });
      return;
    }
    if (!phone) {
      errors.push({ row: index + 1, reason: 'Thiếu số điện thoại' });
      return;
    }

    let finalSaleId = assignedSaleId;
    let finalSaleName = targetSaleName;

    if (autoRoundRobin) {
      const rrSale = getNextRoundRobinSale(db);
      if (rrSale) {
        finalSaleId = rrSale.id;
        finalSaleName = rrSale.name;
      }
    }

    const leadId = generateId('lead');
    const orderId = generateId('ord');
    const orderCode = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order: Order = {
      id: orderId,
      code: orderCode,
      leadId: leadId,
      customerName: fullName,
      customerPhone: phone,
      customerAddress: address,
      company,
      items: [
        {
          productId: 'prod_lead_imported',
          productName: 'Lead mới từ Excel - Cần tư vấn báo giá',
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ],
      subtotal: 0,
      discount: 0,
      shippingFee: 0,
      deposit: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingDebt: 0,
      status: 'PENDING',
      leadSource: source,
      consultingStatus: 'NEW',
      notes: 'Được nhập tự động từ tệp Excel',
      assignedSaleId: finalSaleId || user.id,
      assignedSaleName: finalSaleName || user.name,
      createdAt: now,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const lead: Lead = {
      id: leadId,
      fullName,
      phone,
      email,
      address,
      company,
      source,
      status: 'NEW',
      assignedSaleId: finalSaleId,
      assignedSaleName: finalSaleName,
      tags,
      notesCount: 0,
      discount: 0,
      deposit: 0,
      shippingFee: 0,
      subtotal: 0,
      totalAmount: 0,
      remainingDebt: 0,
      orderId,
      orderCode,
      lastContactAt: now,
      createdAt: now,
      updatedAt: now,
    };

    if (source && !db.sources.includes(source)) {
      db.sources.push(source);
    }

    addedLeads.push(lead);
    db.leads.unshift(lead);
    db.orders.unshift(order);
  });

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'IMPORT',
    'LEAD',
    `import_${Date.now()}`,
    `Nhập hàng loạt ${addedLeads.length} Lead từ file Excel/CSV (Thất bại: ${errors.length} dòng)`
  );

  return NextResponse.json({
    success: true,
    importedCount: addedLeads.length,
    errorCount: errors.length,
    errors,
  });
}
