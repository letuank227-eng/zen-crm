import { NextRequest, NextResponse } from 'next/server';
import { saveHeartbeat } from '@/lib/userActivityStorage';

export const dynamic = 'force-dynamic';

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
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const device = parseUserDevice(userAgent);

    let clientTime: string | undefined;
    try {
      const body = await request.json();
      clientTime = body?.clientTime;
    } catch {}

    const result = await saveHeartbeat({
      userId,
      device,
      clientTime,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Lỗi heartbeat hoạt động user:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
