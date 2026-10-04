import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công' });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete('zen_crm_user_id'); // legacy cookie
  return response;
}
