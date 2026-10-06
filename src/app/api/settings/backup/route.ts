import { NextRequest, NextResponse } from 'next/server';
import {
  readDb,
  getCurrentUser,
  logAuditEvent,
  createServerSnapshot,
  listServerSnapshots,
  usingTurso,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const user = await getCurrentUser(userId);

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (Admin) mới có quyền truy cập Sao lưu dữ liệu máy chủ' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const db = await readDb();

    if (action === 'status') {
      const snapshots = await listServerSnapshots();
      return NextResponse.json({
        storageEngine: usingTurso() ? 'Turso libSQL Cloud Database' : 'Local File Storage',
        connected: true,
        stats: {
          usersCount: db.users?.length || 0,
          leadsCount: db.leads?.length || 0,
          ordersCount: db.orders?.length || 0,
          productsCount: db.products?.length || 0,
          dealsCount: db.deals?.length || 0,
          teamsCount: db.teams?.length || 0,
          tasksCount: db.tasks?.length || 0,
          auditLogsCount: db.auditLogs?.length || 0,
        },
        snapshots,
        lastBackupAt: snapshots[0]?.createdAt || null,
      });
    }

    if (action === 'download') {
      await logAuditEvent(
        user.id,
        user.name,
        'EXPORT',
        'SETTINGS',
        `backup_${Date.now()}`,
        'Tải tệp tin sao lưu toàn bộ dữ liệu CRM (.json)'
      );

      const filename = `ZEN_CRM_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      const jsonPayload = JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          engine: usingTurso() ? 'turso-libsql' : 'local-file',
          data: db,
        },
        null,
        2
      );

      return new NextResponse(jsonPayload, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: for Excel backup and general API use
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi khi xử lý sao lưu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const user = await getCurrentUser(userId);

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (Admin) mới có quyền tạo bản sao lưu máy chủ' },
        { status: 403 }
      );
    }

    let description = 'Bản sao lưu máy chủ thủ công';
    try {
      const body = await request.json();
      if (body.description) description = String(body.description).trim();
    } catch {
      // Empty body is okay
    }

    const snapshot = await createServerSnapshot(user.name || user.email, description);

    await logAuditEvent(
      user.id,
      user.name,
      'UPDATE',
      'SETTINGS',
      snapshot.id,
      `Tạo bản sao lưu Snapshot máy chủ: ${snapshot.id} (${description})`
    );

    return NextResponse.json({
      success: true,
      snapshot,
      message: 'Đã tạo bản sao lưu Snapshot máy chủ thành công!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi khi tạo bản sao lưu máy chủ' }, { status: 500 });
  }
}
