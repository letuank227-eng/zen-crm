import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser, filterLeadsByRole, logAuditEvent } from '@/lib/db';
import { formatDate, canViewCustomerPhone, canViewCustomerPersonalInfo, maskPhoneNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  let leads = filterLeadsByRole(db.leads, user, db);

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const saleId = searchParams.get('saleId');
  const productId = searchParams.get('productId');

  if (status && status !== 'ALL') {
    leads = leads.filter(l => l.status === status);
  }
  if (source && source !== 'ALL') {
    leads = leads.filter(l => l.source === source);
  }
  if (saleId && saleId !== 'ALL') {
    leads = leads.filter(l => l.assignedSaleId === saleId);
  }
  if (productId && productId !== 'ALL') {
    leads = leads.filter(l => l.productIds && l.productIds.includes(productId));
  }

  await logAuditEvent(
    user.id,
    user.name,
    'EXPORT',
    'LEAD',
    `export_${Date.now()}`,
    `Xuất file Excel danh sách khách hàng (${leads.length} bản ghi)`
  );

  const exportData = leads.map((l, index) => {
    const hasFullAccess = canViewCustomerPersonalInfo(user, l.assignedSaleId);
    return {
      STT: index + 1,
      'Họ và Tên': l.fullName,
      'Số điện thoại': hasFullAccess ? l.phone : maskPhoneNumber(l.phone),
      Email: hasFullAccess ? l.email : '*** Bảo mật ***',
      'Công ty': hasFullAccess ? (l.company || '') : '',
      'Địa chỉ': hasFullAccess ? (l.address || '') : '*** Bảo mật ***',
      'Sản phẩm mua/quan tâm': (l.productNames || []).join(', '),
      'Nguồn khách': l.source,
      'Trạng thái': l.status,
      'Sale phụ trách': l.assignedSaleName || 'Chưa phân công',
      'Tags': (l.tags || []).join(', '),
      'Lần liên hệ cuối': formatDate(l.lastContactAt),
      'Ngày tạo': formatDate(l.createdAt),
    };
  });

  return NextResponse.json({ data: exportData });
}
