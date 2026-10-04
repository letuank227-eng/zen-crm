import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Order, OrderItem } from '@/types/crm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  const deal = db.deals.find(d => d.id === params.id);
  if (!deal) {
    return NextResponse.json({ error: 'Không tìm thấy Deal' }, { status: 404 });
  }

  const body = await request.json();
  const { paidAmount = 0, dueDate, customerAddress } = body;

  const lead = db.leads.find(l => l.id === deal.leadId);

  const orderItems: OrderItem[] = (deal.products && deal.products.length > 0)
    ? deal.products.map(p => ({
        productId: p.productId,
        productName: p.productName,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        total: p.total,
      }))
    : [
        {
          productId: 'prod_custom',
          productName: deal.title,
          quantity: 1,
          unitPrice: deal.value,
          total: deal.value,
        },
      ];

  const totalAmount = deal.value;
  const initialPaid = Math.min(Number(paidAmount) || 0, totalAmount);
  const remainingDebt = Math.max(0, totalAmount - initialPaid);

  const newOrder: Order = {
    id: generateId('ord'),
    code: `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    dealId: deal.id,
    leadId: deal.leadId,
    customerName: deal.customerName,
    customerPhone: deal.customerPhone,
    customerAddress: customerAddress || lead?.address || '',
    items: orderItems,
    totalAmount,
    paidAmount: initialPaid,
    remainingDebt,
    status: 'PENDING',
    assignedSaleId: deal.assignedSaleId,
    assignedSaleName: deal.assignedSaleName,
    createdAt: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  db.orders.unshift(newOrder);

  // Update lead status to WON if not already
  if (lead) {
    lead.status = 'WON';
    lead.updatedAt = new Date().toISOString();
  }

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'ORDER',
    newOrder.id,
    `Chuyển đổi Deal "${deal.title}" thành Đơn hàng ${newOrder.code} (Tổng tiền: ${new Intl.NumberFormat('vi-VN').format(totalAmount)} ₫, Đã thu: ${new Intl.NumberFormat('vi-VN').format(initialPaid)} ₫, Công nợ: ${new Intl.NumberFormat('vi-VN').format(remainingDebt)} ₫)`
  );

  return NextResponse.json({ order: newOrder });
}
