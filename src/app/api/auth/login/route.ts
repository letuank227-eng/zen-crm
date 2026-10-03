import { NextRequest, NextResponse } from 'next/server';
import { readDb, logAuditEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, email, password } = body;
    const loginInput = (identifier || email || '').trim();

    if (!loginInput) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Email, Tên tài khoản hoặc Số điện thoại' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mật khẩu' },
        { status: 400 }
      );
    }

    const db = readDb();
    const lowerInput = loginInput.toLowerCase();

    // Match by email, id, or phone
    const user = db.users.find(
      u =>
        u.email.toLowerCase() === lowerInput ||
        u.id.toLowerCase() === lowerInput ||
        (u.phone && u.phone === loginInput)
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Tài khoản không tồn tại trên hệ thống ZEN CRM' },
        { status: 401 }
      );
    }

    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.' },
        { status: 403 }
      );
    }

    // Password verification: cleanPass must be "zengarden" OR match user.password
    const cleanPass = password.trim();
    const isValidPassword =
      cleanPass === 'zengarden' ||
      (user.password && cleanPass === user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Record login audit log
    logAuditEvent(
      user.id,
      user.name,
      'CREATE',
      'USER',
      user.id,
      `Đăng nhập thành công vào hệ thống ZEN CRM (${user.email} - Vai trò: ${user.role})`
    );

    const safeUser = { ...user };
    delete safeUser.password;

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: safeUser,
      token: `zen_sess_${user.id}_${Date.now()}`,
    });

    // Set cookie for persistence
    response.cookies.set('zen_crm_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xử lý đăng nhập' },
      { status: 500 }
    );
  }
}
