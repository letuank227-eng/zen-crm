import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser } from '@/lib/db';
import { User, Role } from '@/types/crm';

export const dynamic = 'force-dynamic';

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }
  return `${Math.max(1, minutes)} phút`;
}

function getRelativeActiveTime(isoDate?: string): { status: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'NEVER'; text: string } {
  if (!isoDate) {
    return { status: 'NEVER', text: 'Chưa từng vào app' };
  }

  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = now - then;

  if (diffMs <= 3 * 60 * 1000) {
    return { status: 'ONLINE', text: 'Đang trực tuyến' };
  }
  if (diffMs <= 15 * 60 * 1000) {
    const mins = Math.max(1, Math.round(diffMs / 60000));
    return { status: 'AWAY', text: `Vừa hoạt động (${mins} phút trước)` };
  }

  const diffHours = Math.floor(diffMs / (3600 * 1000));
  if (diffHours < 24) {
    return { status: 'OFFLINE', text: `Offline (${diffHours} giờ trước)` };
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    const timeStr = new Date(isoDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return { status: 'OFFLINE', text: `Offline (Hôm qua lúc ${timeStr})` };
  }

  return { status: 'OFFLINE', text: `Offline (${diffDays} ngày trước)` };
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const currentUser = await getCurrentUser(userId);
    // Yêu cầu phân quyền bảo mật: Chỉ ADMIN mới được xem trạng thái hoạt động và thời gian sử dụng app
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Chỉ Giám đốc (ADMIN) mới có quyền truy cập nhật ký giám sát hoạt động người dùng' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    let targetDate = searchParams.get('date');

    // Mặc định là ngày hôm nay theo múi giờ Việt Nam (UTC+7)
    if (!targetDate) {
      const now = new Date();
      const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      targetDate = vnTime.toISOString().slice(0, 10);
    }

    const db = await readDb({ includeProducts: false });
    const activities = db.userDailyActivities || [];

    let onlineNowCount = 0;
    let totalCompanySeconds = 0;
    let activeOnDateCount = 0;

    const userActivityList = db.users.map(u => {
      const presence = getRelativeActiveTime(u.lastActiveAt);
      if (presence.status === 'ONLINE') {
        onlineNowCount++;
      }

      const team = db.teams.find(t => t.id === u.teamId);
      const dayAct = activities.find(a => a.userId === u.id && a.date === targetDate);

      const totalSeconds = dayAct?.totalSeconds || 0;
      totalCompanySeconds += totalSeconds;
      if (totalSeconds > 0) {
        activeOnDateCount++;
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        teamName: team?.name || (u.role === 'ADMIN' ? 'Ban Giám Đốc' : 'Chưa phân team'),
        avatar: u.avatar,
        phone: u.phone,
        isLocked: u.isLocked,
        presenceStatus: presence.status,
        presenceText: presence.text,
        isOnline: presence.status === 'ONLINE',
        lastActiveAt: u.lastActiveAt || null,
        currentDevice: dayAct?.device || u.currentDevice || 'Không rõ',
        dateStats: {
          date: targetDate,
          totalSeconds,
          formattedDuration: formatDuration(totalSeconds),
          sessionsCount: dayAct?.sessionsCount || 0,
          firstActiveAt: dayAct?.firstActiveAt || null,
          lastActiveAtOnDate: dayAct?.lastActiveAt || null,
          device: dayAct?.device || null,
          workdayPercentage: Math.min(100, Math.round((totalSeconds / (8 * 3600)) * 100)),
        },
      };
    });

    // Sắp xếp: Ai đang Online lên đầu, tiếp theo là ai có thời gian sử dụng trong ngày cao nhất
    userActivityList.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (b.dateStats.totalSeconds || 0) - (a.dateStats.totalSeconds || 0);
    });

    return NextResponse.json({
      date: targetDate,
      summary: {
        onlineNowCount,
        activeOnDateCount,
        totalUsers: db.users.length,
        totalCompanySeconds,
        totalCompanyDurationFormatted: formatDuration(totalCompanySeconds),
      },
      users: userActivityList,
    });
  } catch (err: any) {
    console.error('Lỗi lấy báo cáo hoạt động user:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
