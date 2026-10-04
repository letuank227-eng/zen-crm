import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Note } from '@/types/crm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  const body = await request.json();
  const { content } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Nội dung ghi chú không được để trống' }, { status: 400 });
  }

  const leadIndex = db.leads.findIndex(l => l.id === params.id);
  if (leadIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Lead' }, { status: 404 });
  }

  const newNote: Note = {
    id: generateId('nt'),
    leadId: params.id,
    authorId: user.id,
    authorName: user.name,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  db.notes.unshift(newNote);
  db.leads[leadIndex].notesCount = (db.leads[leadIndex].notesCount || 0) + 1;
  db.leads[leadIndex].updatedAt = new Date().toISOString();

  await writeDb(db);

  return NextResponse.json({ note: newNote });
}
