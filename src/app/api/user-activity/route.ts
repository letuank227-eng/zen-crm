import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser } from '@/lib/db';
import { getUserActivityReportData } from '@/lib/userActivityStorage';

export const dynamic = 'force-dynamic';

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

    const report = await getUserActivityReportData({
      targetDate,
      users: db.users || [],
      teams: db.teams || [],
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('Lỗi lấy báo cáo hoạt động user:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
