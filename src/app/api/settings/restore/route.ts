import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  logAuditEvent,
  restoreDb,
  restoreFromServerSnapshot,
  createServerSnapshot,
} from '@/lib/db';
import { CrmDatabase } from '@/types/crm';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const user = await getCurrentUser(userId);

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục dữ liệu hệ thống' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { snapshotId, data } = body;

    if (snapshotId) {
      await restoreFromServerSnapshot(snapshotId);

      await logAuditEvent(
        user.id,
        user.name,
        'UPDATE',
        'SETTINGS',
        snapshotId,
        `Khôi phục toàn bộ hệ thống từ bản sao lưu máy chủ ${snapshotId}`
      );

      return NextResponse.json({
        success: true,
        message: `Đã khôi phục toàn bộ dữ liệu hệ thống từ bản sao lưu ${snapshotId} thành công!`,
      });
    }

    if (data) {
      // Basic sanity validation
      if (typeof data !== 'object' || data === null) {
        return NextResponse.json({ error: 'Định dạng dữ liệu không hợp lệ.' }, { status: 400 });
      }

      // Check required collections
      if (!Array.isArray(data.users) || !Array.isArray(data.products)) {
        return NextResponse.json(
          { error: 'Tệp sao lưu không đúng định dạng CRM (thiếu dữ liệu người dùng hoặc sản phẩm).' },
          { status: 400 }
        );
      }

      // Create safety pre-restore backup first
      await createServerSnapshot(
        user.name || user.email,
        'Bản lưu tự động trước khi khôi phục từ tệp tin tải lên'
      );

      await restoreDb(data as CrmDatabase);

      await logAuditEvent(
        user.id,
        user.name,
        'UPDATE',
        'SETTINGS',
        `restore_${Date.now()}`,
        'Khôi phục dữ liệu toàn bộ hệ thống CRM từ tệp tin JSON'
      );

      return NextResponse.json({
        success: true,
        message: 'Đã khôi phục dữ liệu hệ thống thành công!',
      });
    }

    return NextResponse.json(
      { error: 'Vui lòng cung cấp mã bản sao lưu máy chủ (snapshotId) hoặc tệp tin dữ liệu (data).' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi khi khôi phục dữ liệu' }, { status: 500 });
  }
}
