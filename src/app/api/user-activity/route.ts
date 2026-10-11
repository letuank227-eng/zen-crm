import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { getUserActivityReportData } from '@/lib/userActivityStorage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const db = await readDb({ includeProducts: false });
    const users = db.users || [];
    const teams = db.teams || [];

    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 401 });
    }
    if (currentUser.isLocked) {
      return NextResponse.json({ error: 'Tài khoản đã bị khóa' }, { status: 403 });
    }
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

    const report = await getUserActivityReportData({
      targetDate,
      users,
      teams,
    });

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('Lỗi lấy báo cáo hoạt động user:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
