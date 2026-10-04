import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Product } from '@/types/crm';

export async function GET(request: NextRequest) {
  const db = await readDb();
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase().trim();

  // Extract all categories
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

  let products = db.products.map(p => ({
    ...p,
    price: Number(p.price ?? p.retailPrice ?? 0),
    retailPrice: Number(p.price ?? p.retailPrice ?? 0),
    wholesalePrice: Number(p.price ?? p.retailPrice ?? 0),
    vipPrice: Number(p.price ?? p.retailPrice ?? 0),
  }));

  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (dateFrom) {
    const start = new Date(dateFrom);
    products = products.filter(p => !p.createdAt || new Date(p.createdAt).getTime() >= start.getTime());
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    products = products.filter(p => !p.createdAt || new Date(p.createdAt).getTime() <= end.getTime());
  }

  if (category && category !== 'ALL') {
    products = products.filter(p => p.category === category);
  }

  if (search) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.sku && p.sku.toLowerCase().includes(search)) ||
      (p.notes && p.notes.toLowerCase().includes(search)) ||
      (p.description && p.description.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({
    products,
    categories: Array.from(categoriesSet),
    total: products.length,
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Giám đốc (Admin) mới có quyền tạo sản phẩm' }, { status: 403 });
  }

  const db = await readDb();
  const body = await request.json();
  const { name, price, retailPrice, imageUrl, notes, unit, description, sku, category, commissionRate, commissionAmount } = body;

  const finalPrice = Number(price ?? retailPrice ?? 0);

  if (!name || !name.trim() || !finalPrice) {
    return NextResponse.json({ error: 'Tên cây/sản phẩm và Giá bán là bắt buộc' }, { status: 400 });
  }

  const rate = commissionRate !== undefined ? Number(commissionRate) : 10;
  const commAmount = commissionAmount !== undefined ? Number(commissionAmount) : Math.round((finalPrice * rate) / 100);

  const newProduct: Product = {
    id: generateId('prod'),
    name: name.trim(),
    price: finalPrice,
    retailPrice: finalPrice,
    wholesalePrice: finalPrice,
    vipPrice: finalPrice,
    imageUrl: imageUrl || '',
    notes: notes || '',
    unit: unit || 'Chậu',
    commissionRate: rate,
    commissionAmount: commAmount,
    sku: sku ? sku.trim().toUpperCase() : `TS-${Math.floor(100 + Math.random() * 900)}`,
    category: category || 'Cây Thủy Sinh',
    description: description || '',
    isActive: true,
  };

  db.products.push(newProduct);
  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'SETTINGS',
    newProduct.id,
    `Thêm mới sản phẩm cây thủy sinh: ${newProduct.name} - Giá: ${newProduct.price}`
  );

  return NextResponse.json({ product: newProduct }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Giám đốc (Admin) mới có quyền cập nhật bảng giá và sản phẩm' }, { status: 403 });
  }

  const db = await readDb();
  const body = await request.json();
  const { id, price, retailPrice, ...updates } = body;

  const pIndex = db.products.findIndex(p => p.id === id);
  if (pIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
  }

  const finalPrice = price !== undefined ? Number(price) : (retailPrice !== undefined ? Number(retailPrice) : undefined);

  const currentProd = db.products[pIndex];
  const effectivePrice = finalPrice !== undefined ? finalPrice : (currentProd.price ?? currentProd.retailPrice ?? 0);
  const rate = updates.commissionRate !== undefined ? Number(updates.commissionRate) : (currentProd.commissionRate ?? 10);
  const commAmount = updates.commissionAmount !== undefined ? Number(updates.commissionAmount) : Math.round((effectivePrice * rate) / 100);

  db.products[pIndex] = {
    ...currentProd,
    ...updates,
    commissionRate: rate,
    commissionAmount: commAmount,
    ...(finalPrice !== undefined
      ? {
          price: finalPrice,
          retailPrice: finalPrice,
          wholesalePrice: finalPrice,
          vipPrice: finalPrice,
        }
      : {}),
  };

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'SETTINGS',
    id,
    `Cập nhật sản phẩm: ${db.products[pIndex].name}`
  );

  return NextResponse.json({ product: db.products[pIndex] });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Giám đốc (Admin) mới có quyền xóa sản phẩm khỏi danh mục' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  const db = await readDb();
  const pIndex = db.products.findIndex(p => p.id === id);
  if (pIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
  }

  const deletedProd = db.products[pIndex];
  db.products.splice(pIndex, 1);
  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'DELETE',
    'SETTINGS',
    id || '',
    `Xóa sản phẩm cây thủy sinh: ${deletedProd.name} (${deletedProd.sku})`
  );

  return NextResponse.json({ success: true, message: 'Đã xóa sản phẩm thành công' });
}
