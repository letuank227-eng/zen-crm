import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, logAuditEvent, toSafeUser } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, email, password } = body;
    const loginInput = String(identifier || email || '').trim();

    if (!loginInput) {
      return NextResponse.json({ error: 'Vui lòng nhập Gmail hoặc Email' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    const db = await readDb();
    const lowerInput = loginInput.toLowerCase();
    const user = db.users.find(
      u => u.email.toLowerCase() === lowerInput || (u.phone && u.phone === loginInput)
    );

    // Same message for unknown account and wrong password (no account enumeration).
    const invalid = NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác' }, { status: 401 });
    if (!user) return invalid;

    const { ok, needsRehash } = await verifyPassword(String(password).trim(), user.password);
    if (!ok) return invalid;

    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.' },
        { status: 403 }
      );
    }

    // Transparently upgrade legacy plaintext passwords to bcrypt.
    if (needsRehash) {
      user.password = await hashPassword(String(password).trim());
      try {
        await writeDb(db);
      } catch (err) {
        console.error('Password rehash failed (will retry next login):', err);
      }
    }

    await logAuditEvent(
      user.id,
      user.name,
      'CREATE',
      'USER',
      user.id,
      `Đăng nhập thành công vào hệ thống ZEN CRM (${user.email} - Vai trò: ${user.role})`
    );

    const sessionToken = await createSessionToken(user.id);
    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: toSafeUser(user),
      token: sessionToken,
    });
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);
    response.cookies.delete('zen_crm_user_id'); // legacy unsigned cookie
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi xử lý đăng nhập' }, { status: 500 });
  }
}
