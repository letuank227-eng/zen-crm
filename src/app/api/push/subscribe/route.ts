import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db';
import { savePushSubscription, removePushSubscription } from '@/lib/push';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const user = await getCurrentUser(userId);
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Thiếu thông tin subscription' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    await savePushSubscription(user.id, subscription, userAgent);

    return NextResponse.json({ success: true, message: 'Đăng ký nhận thông báo thành công' });
  } catch (err: any) {
    console.error('Lỗi lưu push subscription:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    await getCurrentUser(userId);
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Thiếu endpoint' }, { status: 400 });
    }

    await removePushSubscription(endpoint);

    return NextResponse.json({ success: true, message: 'Hủy đăng ký nhận thông báo thành công' });
  } catch (err: any) {
    console.error('Lỗi xóa push subscription:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi server' }, { status: 500 });
  }
}
