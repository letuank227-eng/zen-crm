import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseUserDevice(userAgent: string): string {
  if (!userAgent) return 'Trình duyệt Web';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iPhone (iOS)';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'Mac OS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Trình duyệt Web';
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getCurrentUser(userId);
    if (user.isLocked) {
      return NextResponse.json({ error: 'Tài khoản đã bị khóa' }, { status: 403 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const device = parseUserDevice(userAgent);

    const now = new Date();
    // Múi giờ Việt Nam (UTC+7)
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dateStr = vnTime.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const nowIso = now.toISOString();

    const db = await readDb({ includeProducts: false });

    // Cập nhật trạng thái trực tuyến của user
    const dbUser = db.users.find(u => u.id === userId);
    if (dbUser) {
      dbUser.lastActiveAt = nowIso;
      dbUser.currentDevice = device;
    }

    if (!db.userDailyActivities) {
      db.userDailyActivities = [];
    }

    const activityId = `${userId}_${dateStr}`;
    let act = db.userDailyActivities.find(a => a.id === activityId);

    if (!act) {
      act = {
        id: activityId,
        userId,
        userName: dbUser?.name || user.name,
        userRole: dbUser?.role || user.role,
        date: dateStr,
        totalSeconds: 45, // Bắt đầu phiên 45 giây
        sessionsCount: 1,
        firstActiveAt: nowIso,
        lastActiveAt: nowIso,
        device,
      };
      db.userDailyActivities.push(act);
    } else {
      const prevTime = new Date(act.lastActiveAt).getTime();
      const elapsedSec = Math.round((now.getTime() - prevTime) / 1000);

      // Nếu lần heartbeat trước cách không quá 3 phút (180s) => phiên đang tiếp tục
      if (elapsedSec > 0 && elapsedSec <= 180) {
        act.totalSeconds += Math.min(elapsedSec, 90);
      } else if (elapsedSec > 180) {
        // Nếu cách hơn 3 phút => tính là phiên đăng nhập/mở app mới trong ngày
        act.sessionsCount = (act.sessionsCount || 1) + 1;
        act.totalSeconds += 45;
      }

      act.lastActiveAt = nowIso;
      act.device = device;
      act.userName = dbUser?.name || user.name;
      act.userRole = dbUser?.role || user.role;
    }

    await writeDb(db);

    return NextResponse.json({
      ok: true,
      userId,
      isOnline: true,
      lastActiveAt: nowIso,
      date: dateStr,
    });
  } catch (err: any) {
    console.error('Lỗi heartbeat hoạt động user:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
