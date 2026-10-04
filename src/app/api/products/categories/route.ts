import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';

export async function GET() {
  const db = await readDb();
  const categoriesSet = new Set<string>(db.productCategories || [
    'Ráy & Dương Xỉ',
    'Bucephalandra & Tiêu Thảo',
    'Cây Tiền Cảnh (Trải thảm)',
    'Cây Cắt Cắm Hậu Cảnh',
    'Rêu Thủy Sinh (Moss)',
    'Setup Hồ Trọn Gói & Bảo Dưỡng',
  ]);

  db.products.forEach(p => {
    if (p.category) categoriesSet.add(p.category);
  });

  return NextResponse.json({
    categories: Array.from(categoriesSet),
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Chỉ Giám đốc (Admin) mới có quyền thêm hoặc chỉnh sửa nhóm danh mục sản phẩm' },
      { status: 403 }
    );
  }

  const db = await readDb();
  const body = await request.json();
  const categoryName = body.categoryName || body.name;

  if (!categoryName || !categoryName.trim()) {
    return NextResponse.json({ error: 'Tên nhóm danh mục không được để trống' }, { status: 400 });
  }

  const name = categoryName.trim();
  if (!db.productCategories) {
    db.productCategories = [];
  }

  if (!db.productCategories.includes(name)) {
    db.productCategories.push(name);
    await writeDb(db);

    await logAuditEvent(
      user.id,
      user.name,
      'CREATE',
      'SETTINGS',
      `cat_${Date.now()}`,
      `Thêm nhóm danh mục sản phẩm thủy sinh mới: ${name}`
    );
  }

  return NextResponse.json({ success: true, categories: db.productCategories }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Quản trị viên mới có quyền xóa nhóm danh mục' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Thiếu tên danh mục cần xóa' }, { status: 400 });
  }

  const db = await readDb();
  if (db.productCategories) {
    db.productCategories = db.productCategories.filter(c => c !== name);
    await writeDb(db);

    await logAuditEvent(
      user.id,
      user.name,
      'DELETE',
      'SETTINGS',
      `cat_del_${Date.now()}`,
      `Xóa nhóm danh mục sản phẩm: ${name}`
    );
  }

  return NextResponse.json({ success: true });
}
