import { NextRequest, NextResponse } from 'next/server';
import { readDb, toSafeUser } from '@/lib/db';
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

export async function GET(request: NextRequest) {
  // Set by middleware only when the signed session cookie is valid.
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ currentUser: null, isAuthenticated: false, users: [], teams: [] });
  }

  const db = await readDb({ includeProducts: false });
  const currentUser = db.users.find(u => u.id === userId && !u.isLocked) || null;
  if (!currentUser) {
    return NextResponse.json({ currentUser: null, isAuthenticated: false, users: [], teams: [] });
  }

  // Ghi nhận ngay tức thì khi bất kỳ ai mở/tải lại app
  try {
    const userAgent = request.headers.get('user-agent') || '';
    const device = parseUserDevice(userAgent);
    saveHeartbeat({ userId: currentUser.id, device }).catch(() => {});
  } catch {}

  // Directory of colleagues for display (names, roles, teams). Never includes passwords.
  const users = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    teamId: u.teamId,
    teamName: u.teamName,
    phone: u.phone,
    isLocked: u.isLocked,
    targetRevenue: u.targetRevenue,
    targetDeals: u.targetDeals,
    hasPassword: !!u.password,
  }));

  return NextResponse.json({
    currentUser: toSafeUser(currentUser),
    isAuthenticated: true,
    users,
    teams: db.teams,
  });
}
