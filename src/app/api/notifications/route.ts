import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb({ includeProducts: false });

  const allNotifs = db.notifications || [];

  // Sale/Leader chỉ nhận thông báo gán cho chính mình; Admin xem được hết
  const userNotifs = user.role === 'ADMIN'
    ? allNotifs
    : allNotifs.filter(n => n.userId === user.id);

  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  return NextResponse.json({
    notifications: userNotifs.slice(0, 50),
    unreadCount,
  });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();
  const body = await request.json();
  const { id, markAll } = body;

  if (!db.notifications) {
    db.notifications = [];
  }

  if (markAll) {
    db.notifications.forEach(n => {
      if (user.role === 'ADMIN' || n.userId === user.id) {
        n.isRead = true;
      }
    });
  } else if (id) {
    const notif = db.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
    }
  }

  await writeDb(db);

  const userNotifs = user.role === 'ADMIN'
    ? db.notifications
    : db.notifications.filter(n => n.userId === user.id);

  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  return NextResponse.json({
    success: true,
    unreadCount,
  });
}
