import { NextResponse } from 'next/server';

/**
 * Public self-registration is disabled: the old flow accepted hardcoded company codes
 * and let anyone create a LEADER account. Accounts are now created by the Director /
 * Manager in Settings (POST /api/users).
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Chức năng tự đăng ký đã tắt. Vui lòng liên hệ Giám đốc / Quản trị viên để được cấp tài khoản.' },
    { status: 403 }
  );
}
