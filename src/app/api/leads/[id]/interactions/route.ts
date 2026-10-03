import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { InteractionLog } from '@/types/crm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();

  const body = await request.json();
  const { channel = 'PHONE', summary, occurredAt } = body;

  if (!summary || !summary.trim()) {
    return NextResponse.json({ error: 'Nội dung tóm tắt tương tác không được để trống' }, { status: 400 });
  }

  const leadIndex = db.leads.findIndex(l => l.id === params.id);
  if (leadIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Lead' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const newInteraction: InteractionLog = {
    id: generateId('act'),
    leadId: params.id,
    authorId: user.id,
    authorName: user.name,
    channel,
    summary: summary.trim(),
    occurredAt: occurredAt || now,
    createdAt: now,
  };

  db.interactions.unshift(newInteraction);
  db.leads[leadIndex].lastContactAt = occurredAt || now;
  db.leads[leadIndex].updatedAt = now;

  writeDb(db);

  return NextResponse.json({ interaction: newInteraction });
}
