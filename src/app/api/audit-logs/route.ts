import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  // Sale reps can only see logs relevant to their actions; Admins and Leaders see all
  let logs = db.auditLogs;
  if (user.role === 'SALE') {
    logs = logs.filter(l => l.userId === user.id);
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const entityType = searchParams.get('entityType');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (action && action !== 'ALL') {
    logs = logs.filter(l => l.action === action);
  }
  if (entityType && entityType !== 'ALL') {
    logs = logs.filter(l => l.entityType === entityType);
  }
  if (dateFrom) {
    const start = new Date(dateFrom);
    logs = logs.filter(l => new Date(l.createdAt).getTime() >= start.getTime());
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    logs = logs.filter(l => new Date(l.createdAt).getTime() <= end.getTime());
  }

  return NextResponse.json({
    logs,
    total: logs.length,
  });
}
