import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser, logAuditEvent } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền Backup toàn bộ dữ liệu' }, { status: 403 });
  }

  const db = await readDb();

  await logAuditEvent(
    user.id,
    user.name,
    'EXPORT',
    'SETTINGS',
    `backup_${Date.now()}`,
    'Thực hiện Sao lưu & Backup toàn bộ dữ liệu hệ thống CRM'
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: db,
  });
}
