import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  const body = await request.json();
  const { newSaleId, reason } = body;

  if (!newSaleId) {
    return NextResponse.json({ error: 'Vui lòng chọn nhân viên Sale mới' }, { status: 400 });
  }

  if (!reason || reason.trim() === '') {
    return NextResponse.json({ error: 'Bắt buộc phải nhập lý do chuyển giao khách hàng' }, { status: 400 });
  }

  const leadIndex = db.leads.findIndex(l => l.id === params.id);
  if (leadIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Lead' }, { status: 404 });
  }

  const targetSale = db.users.find(u => u.id === newSaleId);
  if (!targetSale) {
    return NextResponse.json({ error: 'Không tìm thấy nhân viên Sale được chỉ định' }, { status: 404 });
  }

  const lead = db.leads[leadIndex];

  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    if (targetSale.role === 'ADMIN' || (targetSale.teamId !== leaderTeamId && targetSale.id !== user.id)) {
      return NextResponse.json(
        { error: 'Quản lý chỉ có quyền chuyển giao khách hàng cho nhân viên trong đội nhóm của mình' },
        { status: 403 }
      );
    }
    if (lead.assignedSaleId && lead.assignedSaleId !== user.id) {
      const currentSale = db.users.find(u => u.id === lead.assignedSaleId);
      if (currentSale && currentSale.teamId !== leaderTeamId) {
        return NextResponse.json(
          { error: 'Quản lý không có quyền can thiệp khách hàng của đội nhóm khác' },
          { status: 403 }
        );
      }
    }
  }

  const oldSaleName = lead.assignedSaleName || 'Chưa phân công';

  lead.assignedSaleId = targetSale.id;
  lead.assignedSaleName = targetSale.name;
  lead.updatedAt = new Date().toISOString();

  db.leads[leadIndex] = lead;

  // Add transfer note to timeline as well
  db.notes.unshift({
    id: `nt_${Date.now()}`,
    leadId: lead.id,
    authorId: user.id,
    authorName: user.name,
    content: `[Chuyển giao phụ trách] Chuyển từ "${oldSaleName}" sang "${targetSale.name}". Lý do: ${reason}`,
    createdAt: new Date().toISOString(),
  });
  lead.notesCount = (lead.notesCount || 0) + 1;

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'TRANSFER',
    'LEAD',
    lead.id,
    `Chuyển giao khách hàng ${lead.fullName} từ "${oldSaleName}" sang "${targetSale.name}"`,
    {
      previousValue: oldSaleName,
      newValue: targetSale.name,
      reason,
    }
  );

  return NextResponse.json({ success: true, lead });
}
