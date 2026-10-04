import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Contract } from '@/types/crm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  const dealIndex = db.deals.findIndex(d => d.id === params.id);
  if (dealIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Deal' }, { status: 404 });
  }

  const body = await request.json();
  const { title, status = 'DRAFT', fileName, fileSize, signedDate } = body;

  const newContract: Contract = {
    id: generateId('ctr'),
    dealId: params.id,
    contractCode: `HĐ-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(10 + Math.random() * 90)}`,
    title: title || 'Hợp đồng thương mại',
    status,
    fileName: fileName || 'Hop_dong_dinh_kem.pdf',
    fileSize: fileSize || '1.5 MB',
    signedDate: signedDate || (status === 'SIGNED' ? new Date().toISOString() : undefined),
    createdAt: new Date().toISOString(),
  };

  if (!db.deals[dealIndex].contracts) {
    db.deals[dealIndex].contracts = [];
  }
  db.deals[dealIndex].contracts.push(newContract);
  db.deals[dealIndex].updatedAt = new Date().toISOString();

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'DEAL',
    params.id,
    `Thêm hợp đồng ${newContract.contractCode} (Trạng thái: ${newContract.status}) vào deal "${db.deals[dealIndex].title}"`
  );

  return NextResponse.json({ contract: newContract });
}
