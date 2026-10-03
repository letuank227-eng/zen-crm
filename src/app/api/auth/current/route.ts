import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const cookieUserId = request.cookies.get('zen_crm_user_id')?.value;
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = request.nextUrl.searchParams.get('userId');
  const userId = paramUserId || headerUserId || cookieUserId;

  const db = readDb();
  let currentUser = null;

  if (userId) {
    currentUser = db.users.find(u => u.id === userId && !u.isLocked) || null;
  }

  // Include users list (for role switcher & display), safe without exposing secret tokens
  const safeUsers = db.users.map(u => ({
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
    password: u.password || 'zengarden', // hardcoded default password
  }));

  return NextResponse.json({
    currentUser: currentUser
      ? {
          ...currentUser,
          password: currentUser.password || 'zengarden',
        }
      : null,
    isAuthenticated: !!currentUser,
    users: safeUsers,
    teams: db.teams,
  });
}
