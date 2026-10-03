import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || request.cookies.get('zen_crm_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!newPassword || newPassword.trim().length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' },
        { status: 400 }
      );
    }

    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const user = db.users[userIndex];

    // Check old password
    const isOldValid =
      user.password === oldPassword ||
      oldPassword === 'zengarden' ||
      (!user.password && oldPassword === 'zengarden');

    if (!isOldValid) {
      return NextResponse.json(
        { error: 'Mật khẩu hiện tại/mật khẩu được cấp trước đó không đúng' },
        { status: 400 }
      );
    }

    user.password = newPassword.trim();
    writeDb(db);

    logAuditEvent(
      user.id,
      user.name,
      'UPDATE',
      'USER',
      user.id,
      `Đổi mật khẩu tài khoản thành công: ${user.name}`
    );

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đổi mật khẩu' },
      { status: 500 }
    );
  }
}
