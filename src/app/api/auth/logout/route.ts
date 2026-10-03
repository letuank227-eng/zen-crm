import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Đăng xuất thành công',
  });

  response.cookies.delete('zen_crm_user_id');
  return response;
}
