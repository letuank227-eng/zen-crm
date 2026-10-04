import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Quotation } from '@/types/crm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  const dealIndex = db.deals.findIndex(d => d.id === params.id);
  if (dealIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Deal' }, { status: 404 });
  }

  const body = await request.json();
  const { items = [], discount = 0, vat = 0, validUntil, notes } = body;

  const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
  const totalAmount = subtotal - Number(discount) + Number(vat);

  const quotation: Quotation = {
    id: generateId('quot'),
    dealId: params.id,
    code: `BG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    items,
    subtotal,
    discount: Number(discount) || 0,
    vat: Number(vat) || 0,
    totalAmount,
    status: 'SENT',
    validUntil: validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.deals[dealIndex].quotation = quotation;
  db.deals[dealIndex].value = totalAmount;
  db.deals[dealIndex].products = items;
  db.deals[dealIndex].updatedAt = new Date().toISOString();

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'DEAL',
    params.id,
    `Tạo bản báo giá ${quotation.code} trị giá ${new Intl.NumberFormat('vi-VN').format(totalAmount)} ₫ cho deal "${db.deals[dealIndex].title}"`
  );

  return NextResponse.json({ quotation });
}
