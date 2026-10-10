import { Product } from '@/types/crm';

/**
 * Tính hoa hồng cho từng sản phẩm trong deal/đơn hàng:
 * - Ưu tiên commissionAmount (VND cố định trên mỗi đơn vị sản phẩm).
 * - Nếu không có commissionAmount, lấy theo tỷ lệ commissionRate (%) trên tổng tiền dòng sản phẩm.
 * - Mặc định fallback là 8% nếu sản phẩm chưa cài đặt tỷ lệ riêng.
 */
export function calcProductCommission(
  item: {
    productId?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    price?: number;
    total?: number;
  },
  products: Product[] = []
): number {
  const dbProd = products.find(
    prod => (item.productId && prod.id === item.productId) || (item.productName && prod.name === item.productName)
  );
  const qty = Number(item.quantity) || 1;
  const lineTotal = Number(item.total) || ((Number(item.unitPrice) || Number((item as any).price) || 0) * qty);

  if (dbProd?.commissionAmount && dbProd.commissionAmount > 0) {
    return Math.round(dbProd.commissionAmount * qty);
  }

  const rate = dbProd?.commissionRate !== undefined && dbProd.commissionRate !== null ? dbProd.commissionRate : 8;
  return Math.round(lineTotal * (rate / 100));
}

/**
 * Tính tổng hoa hồng thực nhận của một Deal đã chốt:
 * - Duyệt qua tất cả products trong deal.
 * - Nếu deal không có danh mục sản phẩm chi tiết, tính 8% trên tổng giá trị deal.
 */
export function calcDealCommission(
  deal: {
    products?: any[];
    value?: number;
  },
  products: Product[] = []
): number {
  if (deal.products && Array.isArray(deal.products) && deal.products.length > 0) {
    return deal.products.reduce((sum: number, p: any) => sum + calcProductCommission(p, products), 0);
  }
  return Math.round((deal.value || 0) * 0.08); // Fallback 8%
}
