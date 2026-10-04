import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

// API routes reachable without a session.
const PUBLIC_API = new Set(['/api/auth/login', '/api/auth/logout', '/api/auth/current']);

/**
 * Authenticates every API request from the signed session cookie and injects the
 * verified user id as `x-user-id`. Any client-supplied `x-user-id` is discarded,
 * so route handlers can trust that header.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const headers = new Headers(request.headers);
  headers.delete('x-user-id');

  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const rawToken = cookieToken || bearerToken;

  const session = await verifySessionToken(rawToken);
  if (session) {
    headers.set('x-user-id', session.uid);
  } else if (!PUBLIC_API.has(pathname)) {
    return NextResponse.json(
      { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/api/:path*'],
};
