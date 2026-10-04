import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, logAuditEvent } from '@/lib/db';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    // Set by middleware from the verified session cookie.
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!newPassword || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Mật khẩu mới phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự` },
        { status: 400 }
      );
    }

    const db = await readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const { ok } = await verifyPassword(String(oldPassword || ''), user.password);
    if (!ok) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
    }

    user.password = await hashPassword(newPassword.trim());
    await writeDb(db);

    await logAuditEvent(user.id, user.name, 'UPDATE', 'USER', user.id, `Đổi mật khẩu tài khoản: ${user.name}`);

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đổi mật khẩu' }, { status: 500 });
  }
}
