import { NextRequest, NextResponse } from 'next/server';
import { readDb, toSafeUser } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Set by middleware only when the signed session cookie is valid.
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ currentUser: null, isAuthenticated: false, users: [], teams: [] });
  }

  const db = await readDb();
  const currentUser = db.users.find(u => u.id === userId && !u.isLocked) || null;
  if (!currentUser) {
    return NextResponse.json({ currentUser: null, isAuthenticated: false, users: [], teams: [] });
  }

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
