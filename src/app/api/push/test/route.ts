import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db';
import { sendPushToUsers } from '@/lib/push';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const user = await getCurrentUser(userId);

    const result = await sendPushToUsers([user.id], {
      title: '🔔 Thông báo thử nghiệm - ZEN CRM',
      message: `Chào ${user.name}! Điện thoại của bạn đã kết nối thành công và sẵn sàng nhận thông báo khi có đơn hàng mới.`,
      url: '/orders',
    });

    if (result.successCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Chưa tìm thấy thiết bị nào đã bật thông báo cho tài khoản này. Vui lòng bấm Cho phép thông báo trên điện thoại trước!',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi thông báo thử nghiệm thành công tới ${result.successCount} thiết bị!`,
      result,
    });
  } catch (err: any) {
    console.error('Lỗi gửi push test:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi server' }, { status: 500 });
  }
}
