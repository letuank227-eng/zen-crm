import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, logAuditEvent, toSafeUser } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';
import { saveHeartbeat } from '@/lib/userActivityStorage';

function parseUserDevice(userAgent: string): string {
  if (!userAgent) return 'Trình duyệt Web';
  if (/iPhone/i.test(userAgent)) return 'iPhone (iOS)';
  if (/iPad/i.test(userAgent)) return 'iPad (iOS)';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'Mac OS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Trình duyệt Web';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, email, password } = body;
    const rawInput = String(identifier || email || '').trim();
    // Loại bỏ dấu nháy đơn/kép hoặc khoảng trắng vô tình dính vào (ví dụ Depham2001@gmail.com')
    const loginInput = rawInput.replace(/^['"`\s]+|['"`\s]+$/g, '');
    const rawPassword = String(password).trim();
    const cleanPassword = rawPassword.replace(/^['"`]+|['"`]+$/g, '');

    if (!loginInput) {
      return NextResponse.json({ error: 'Vui lòng nhập Gmail hoặc Email' }, { status: 400 });
    }
    if (!rawPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    const db = await readDb({ includeProducts: false });
    const lowerInput = loginInput.toLowerCase();
    const rawLower = rawInput.toLowerCase();
    const user = db.users.find(
      u => u.email.toLowerCase() === lowerInput ||
           u.email.toLowerCase() === rawLower ||
           (u.phone && (u.phone === loginInput || u.phone === rawInput))
    );

    // Same message for unknown account and wrong password (no account enumeration).
    const invalid = NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác' }, { status: 401 });
    if (!user) {
      console.warn('[Login Failed - User not found]', { rawInput, loginInput });
      return invalid;
    }

    let { ok, needsRehash } = await verifyPassword(rawPassword, user.password);
    if (!ok && cleanPassword !== rawPassword) {
      const retry = await verifyPassword(cleanPassword, user.password);
      if (retry.ok) {
        ok = true;
        needsRehash = retry.needsRehash;
      }
    }
    if (!ok) {
      console.warn('[Login Failed - Wrong password]', { userEmail: user.email, hasPassword: !!user.password });
      return invalid;
    }

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

    // Ghi nhận ngay lập tức trạng thái hoạt động trực tuyến và thời gian dùng app
    try {
      const userAgent = request.headers.get('user-agent') || '';
      const device = parseUserDevice(userAgent);
      await saveHeartbeat({
        userId: user.id,
        device,
      });
    } catch (actErr) {
      console.warn('Lỗi ghi nhận heartbeat khi đăng nhập:', actErr);
    }

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
