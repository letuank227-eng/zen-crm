'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  FileSpreadsheet,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building,
  User,
  Phone,
  Edit2,
  X,
  Sparkles,
  Package,
  Lock,
  Search,
  Download,
  Plus,
  Truck,
  Tag,
  MapPin,
  FileText,
  Receipt,
  Info,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/crm';
import { formatCurrency, formatDate, canViewCustomerPhone, maskPhoneNumber } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';
import CreateLeadModal from '@/components/leads/CreateLeadModal';

export default function OrdersPage() {
  const { fetchWithAuth, currentUser } = useAuth();
  const isDirector = currentUser?.role === 'ADMIN';
  const { dateFrom, dateTo } = useDateFilter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hasDebtFilter, setHasDebtFilter] = useState('ALL');

  // Edit / Details Modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('PENDING');
  const [orderAddress, setOrderAddress] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Create Lead & Order Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMeta, setModalMeta] = useState<{ sources: string[]; sales: any[]; products: any[] }>({
    sources: ['Website / Tự đến', 'Facebook Fanpage', 'Zalo OA', 'Giới thiệu', 'Showroom'],
    sales: [],
    products: [],
  });

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (hasDebtFilter === 'DEBT') params.set('hasDebt', 'true');
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetchWithAuth(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await fetchWithAuth('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setModalMeta({
          sources: data.sources || ['Website / Tự đến', 'Facebook Fanpage', 'Zalo OA', 'Giới thiệu'],
          sales: data.sales || [],
          products: data.products || [],
        });
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser, statusFilter, hasDebtFilter, dateFrom, dateTo]);

  // Chỉ tải metadata danh mục khi mở modal tạo mới đơn hàng
  useEffect(() => {
    if (currentUser && showCreateModal) {
      fetchMetadata();
    }
  }, [currentUser, showCreateModal]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!isDirector) {
      alert('Chỉ Giám đốc (Admin) mới có quyền chỉnh sửa đơn hàng.');
      return;
    }
    setIsUpdating(true);

    try {
      const res = await fetchWithAuth('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrder.id,
          status: orderStatus,
          customerAddress: orderAddress,
          cancelReason: orderStatus === 'CANCELLED' ? cancelReason.trim() : undefined,
          paidAmount: orderStatus === 'COMPLETED' ? editingOrder.totalAmount : undefined,
        }),
      });

      if (res.ok) {
        const saleName = editingOrder.assignedSaleName || 'Sale phụ trách';
        setToastMessage(`✓ Cập nhật đơn ${editingOrder.code} thành công! Đã tự động chuyển thông báo về máy của bạn ${saleName}.`);
        setTimeout(() => setToastMessage(null), 5000);
      }

      setEditingOrder(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportExcel = () => {
    if (orders.length === 0) return;

    const exportRows = filteredOrders.map(o => ({
      'Mã Đơn': o.code,
      'Ngày Tạo': formatDate(o.createdAt),
      'Tên Khách Hàng': o.customerName,
      'Công Ty / Cửa Hàng': o.company || '',
      'Số Điện Thoại': canViewCustomerPhone(currentUser, o.assignedSaleId) ? o.customerPhone : maskPhoneNumber(o.customerPhone),
      'Địa Chỉ Giao Hàng': o.customerAddress || '',
      'Sản Phẩm': (o.items || []).map(i => `${i.productName} (x${i.quantity})`).join('; '),
      'Tiền Hàng (VNĐ)': o.subtotal || o.totalAmount,
      'Giảm Giá (VNĐ)': o.discount || 0,
      'Phí Ship (VNĐ)': o.shippingFee || 0,
      'Tổng Tiền Đơn (VNĐ)': o.totalAmount,
      'Đã Thu / Cọc (VNĐ)': o.paidAmount,
      'Công Nợ Còn Lại (VNĐ)': o.remainingDebt,
      'Trạng Thái Đơn': o.status === 'COMPLETED' ? 'Hoàn thành' : o.status === 'DELIVERING' ? 'Đang giao' : o.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xử lý',
      'Sale Phụ Trách': o.assignedSaleName,
      'Nguồn Lead': o.leadSource || '',
      'Ghi Chú': o.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DonHang_CongNo');
    XLSX.writeFile(wb, `ZenCRM_DonHang_CongNo_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getOrderStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>1. Chờ xử lý</span>
          </span>
        );
      case 'DELIVERED_UNPAID':
      case 'DELIVERING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap inline-flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-600" />
            <span>2. Đã giao (Chưa TT)</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>3. Hoàn thành</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>4. Đơn hàng hủy</span>
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{st}</span>;
    }
  };

  const debouncedSearch = useDebounce(searchTerm, 250);

  // Filter orders by search term (memoized for optimal rendering performance)
  const filteredOrders = useMemo(() => {
    if (!debouncedSearch.trim()) return orders;
    const term = debouncedSearch.toLowerCase();
    return orders.filter(o =>
      o.code.toLowerCase().includes(term) ||
      o.customerName.toLowerCase().includes(term) ||
      (o.company && o.company.toLowerCase().includes(term)) ||
      o.customerPhone.includes(term) ||
      (o.assignedSaleName && o.assignedSaleName.toLowerCase().includes(term)) ||
      (o.notes && o.notes.toLowerCase().includes(term))
    );
  }, [orders, debouncedSearch]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>Quản Lý Đơn Hàng &amp; Công Nợ</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={orders.length === 0}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
            title="Xuất file Excel cho Kế toán đối soát"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel Kế Toán</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo Đơn &amp; Khách Hàng Mới</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
      <DatePeriodFilter />

      {/* Debt Summary Cards - Hide for STAFF */}
      {metrics && currentUser?.role !== 'STAFF' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Tổng Doanh Số Đơn Hàng</span>
              <DollarSign className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-futura tracking-tight">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{metrics.orderCount} đơn hàng ghi nhận</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Số Tiền Đã Thu Thực Tế (Cọc + Thanh Toán)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-600 font-futura tracking-tight">
              {formatCurrency(metrics.totalCollected)}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">Đã nhập quỹ an toàn</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Công Nợ Còn Phải Thu</span>
              <CreditCard className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-extrabold text-rose-600 font-futura tracking-tight">
              {formatCurrency(metrics.totalDebt)}
            </div>
            <div className="text-[11px] text-rose-600 font-semibold">Cần đôn đốc kế toán thu hồi</div>
          </div>
        </div>
      )}

      {/* Operational Packing Banner for STAFF */}
      {currentUser?.role === 'STAFF' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Khu Vực Soạn Cây &amp; Đóng Gói Đơn Hàng (Kỹ Thuật / Kho)</div>
              <div className="text-[11px] text-emerald-700">Kiểm tra số lượng cây thủy sinh, phụ kiện theo từng đơn và bấm đổi trạng thái khi giao hàng.</div>
            </div>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg font-bold border border-emerald-200">
            {orders.length} Đơn hàng
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã đơn, Khách hàng, Cty, SĐT..."
              className="w-full p-2 pl-8 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700 text-xs"
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="PENDING">1/ Chờ xử lý</option>
            <option value="DELIVERED_UNPAID">2/ Đã giao hàng thành công (chưa thanh toán)</option>
            <option value="COMPLETED">3/ Hoàn thành</option>
            <option value="CANCELLED">4/ Đơn hàng hủy</option>
          </select>

          <select
            value={hasDebtFilter}
            onChange={e => setHasDebtFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700 text-xs"
          >
            <option value="ALL">-- Tất cả công nợ --</option>
            <option value="DEBT">Chỉ đơn còn nợ</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Mã Đơn &amp; Ngày</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Khách Hàng / Công Ty</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Chi Tiết Tiền</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Tổng Giá Trị</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Đã Thu (Cọc)</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Còn Nợ (Debt)</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Sale Phụ Trách</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(o => (
                <tr
                  key={o.id}
                  onClick={() => {
                    setEditingOrder(o);
                    setOrderStatus(o.status === 'DELIVERING' ? 'DELIVERED_UNPAID' : o.status);
                    setOrderAddress(o.customerAddress || '');
                    setCancelReason(o.cancelReason || '');
                  }}
                  className="hover:bg-emerald-50/50 cursor-pointer transition-colors group select-none"
                  title="Nhấp chuột vào đơn hàng để xem chi tiết sản phẩm, ghi chú & đối soát công nợ"
                >
                  {/* Mã đơn & Ngày */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <div className="font-bold text-slate-900 font-mono group-hover:text-emerald-700 transition-colors">
                      {o.code}
                    </div>
                    <div className="text-[11px] text-slate-400">{formatDate(o.createdAt)}</div>
                    {o.leadSource && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {o.leadSource}
                      </span>
                    )}
                  </td>

                  {/* Khách hàng & Công ty */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {o.customerName}
                    </div>
                    {o.company && (
                      <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{o.company}</span>
                      </div>
                    )}
                    {canViewCustomerPhone(currentUser, o.assignedSaleId) || currentUser?.role === 'STAFF' ? (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{o.customerPhone}</span>
                      </div>
                    ) : (
                      <div
                        className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"
                        title="Bảo mật SĐT"
                      >
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span className="font-mono text-slate-600">{maskPhoneNumber(o.customerPhone)}</span>
                      </div>
                    )}
                    {o.customerAddress && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[160px] mt-0.5" title={o.customerAddress}>
                        <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                        <span>{o.customerAddress}</span>
                      </div>
                    )}
                  </td>

                  {/* Chi tiết tiền (Giảm giá, Ship, Tiền hàng) */}
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap text-[11px]">
                    <div className="text-slate-500 font-medium">
                      Tiền hàng: <span className="font-mono">{formatCurrency(o.subtotal || o.totalAmount)}</span>
                    </div>
                    {(o.discount || 0) > 0 && (
                      <div className="text-amber-700 font-medium">
                        Giảm: -<span className="font-mono">{formatCurrency(o.discount || 0)}</span>
                      </div>
                    )}
                    {(o.shippingFee || 0) > 0 && (
                      <div className="text-blue-700 font-medium">
                        Ship: +<span className="font-mono">{formatCurrency(o.shippingFee || 0)}</span>
                      </div>
                    )}
                  </td>

                  {/* Tổng giá trị đơn hàng */}
                  <td className="py-3.5 px-3.5 text-right font-extrabold text-slate-900 font-futura text-xs sm:text-sm whitespace-nowrap">
                    {formatCurrency(o.totalAmount)}
                  </td>

                  {/* Đã thanh toán (Cọc) */}
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                    <div className="font-bold text-emerald-600 font-futura text-xs">
                      {formatCurrency(o.paidAmount)}
                    </div>
                    {o.deposit !== undefined && o.deposit > 0 && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        (Cọc: {formatCurrency(o.deposit)})
                      </div>
                    )}
                  </td>

                  {/* Còn nợ */}
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                    {o.remainingDebt > 0 ? (
                      <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-futura inline-block whitespace-nowrap text-xs shadow-2xs">
                        {formatCurrency(o.remainingDebt)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đã tất toán</span>
                      </span>
                    )}
                  </td>

                  {/* Sale phụ trách */}
                  <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                    <div className="font-semibold text-slate-800 text-[11px]">{o.assignedSaleName}</div>
                  </td>

                  {/* Trạng thái đơn */}
                  <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                    {getOrderStatusBadge(o.status)}
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div>Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Kế Toán Thu Tiền, Đối Soát & Cập Nhật Công Nợ (Hiển thị chi tiết sản phẩm + ghi chú) */}
      {editingOrder && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 text-xs animate-in zoom-in-95 my-auto max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>
                    {currentUser?.role === 'STAFF'
                      ? 'Thông Tin Đơn Hàng'
                      : 'Chi Tiết Đơn Hàng & Công Nợ'}
                  </span>
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Đơn: <strong className="text-slate-800 font-mono">{editingOrder.code}</strong> — Khách:{' '}
                  <strong className="text-slate-800">{editingOrder.customerName}</strong>
                  {editingOrder.company ? ` (${editingOrder.company})` : ''}
                </div>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MỤC SẢN PHẨM CHI TIẾT */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/90 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sản Phẩm Trong Đơn ({(editingOrder.items || []).length})</span>
                </span>
                <span className="text-slate-600 font-medium text-[11px]">
                  Sale: <strong>{editingOrder.assignedSaleName}</strong>
                </span>
              </div>

              {/* Danh sách các sản phẩm */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {(editingOrder.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">• {it.productName}</div>
                      {it.unitPrice > 0 && (
                        <div className="text-[10px] text-slate-400">
                          Đơn giá: {formatCurrency(it.unitPrice)}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-700 font-bold text-center min-w-[50px] bg-slate-100 py-0.5 px-1.5 rounded">
                      x{it.quantity}
                    </div>
                    <div className="text-right font-extrabold text-slate-900 font-futura min-w-[90px]">
                      {formatCurrency(it.total || it.quantity * it.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ghi chú đơn hàng (chuyển từ Ảnh 1 vào) */}
              {editingOrder.notes && (
                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-0.5 mt-2">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <FileText className="w-3 h-3 text-amber-600" />
                    <span>Ghi chú đơn hàng:</span>
                  </div>
                  <div className="pl-4 whitespace-pre-wrap">{editingOrder.notes}</div>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdatePayment} className="space-y-3.5">
              {/* Bảng phân tích tài chính của đơn */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Chi Tiết Thanh Toán:
                </div>
                <div className="space-y-1 text-slate-600 text-xs">
                  <div className="flex justify-between">
                    <span>Tiền hàng (Subtotal):</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(editingOrder.subtotal || editingOrder.totalAmount)}
                    </span>
                  </div>
                  {(editingOrder.discount || 0) > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Giảm giá (Chiết khấu):</span>
                      <span className="font-semibold">-{formatCurrency(editingOrder.discount || 0)}</span>
                    </div>
                  )}
                  {(editingOrder.shippingFee || 0) > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>Phí vận chuyển (Ship):</span>
                      <span className="font-semibold">+{formatCurrency(editingOrder.shippingFee || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                    <span>Tổng giá trị đơn hàng:</span>
                    <span className="font-futura text-sm">{formatCurrency(editingOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Đã thu ban đầu (Cọc):</span>
                    <span className="font-semibold font-futura">
                      {formatCurrency(editingOrder.paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Công nợ hiện tại:</span>
                    <span className="font-futura">
                      {editingOrder.remainingDebt > 0 ? formatCurrency(editingOrder.remainingDebt) : 'Đã tất toán (0 ₫)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cảnh báo chế độ chỉ xem đối với nhân sự không phải Giám đốc */}
              {!isDirector && (
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>
                    Chế độ chỉ xem: Chỉ <strong>Giám đốc</strong> mới có quyền chỉnh sửa thông tin, địa chỉ và trạng thái đơn hàng.
                  </span>
                </div>
              )}

              {/* Địa chỉ giao hàng */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Địa chỉ giao hàng:</label>
                <input
                  type="text"
                  value={orderAddress}
                  disabled={!isDirector}
                  onChange={e => setOrderAddress(e.target.value)}
                  placeholder="Địa chỉ giao hàng..."
                  className={`w-full p-2 border rounded-lg outline-none text-xs ${
                    isDirector
                      ? 'bg-white border-slate-200 focus:ring-1 focus:ring-emerald-500 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Trạng thái đơn hàng */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Trạng thái đơn hàng:</label>
                <select
                  value={orderStatus === 'DELIVERING' ? 'DELIVERED_UNPAID' : orderStatus}
                  disabled={!isDirector}
                  onChange={e => setOrderStatus(e.target.value as OrderStatus)}
                  className={`w-full p-2.5 border rounded-xl outline-none font-bold text-xs shadow-2xs ${
                    isDirector
                      ? 'bg-white border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer'
                      : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <option value="PENDING">1/ Chờ xử lý</option>
                  <option value="DELIVERED_UNPAID">2/ Đã giao hàng thành công (chưa thanh toán)</option>
                  <option value="COMPLETED">3/ Hoàn thành</option>
                  <option value="CANCELLED">4/ Đơn hàng hủy</option>
                </select>

                {/* CHỈ KHI TRẠNG THÁI LÀ ĐÃ HỦY ĐƠN: MỚI HIỆN MỤC GHI CHÚ LÝ DO HỦY (TINH GỌN, KHÔNG CHÚ THÍCH DÀI DÒNG) */}
                {orderStatus === 'CANCELLED' && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in-50">
                    <label className="font-semibold text-slate-700 block text-xs">
                      Lý do hủy đơn <span className="text-rose-500">*</span>:
                    </label>
                    <textarea
                      rows={2}
                      value={cancelReason}
                      disabled={!isDirector}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Nhập lý do khách hủy đơn..."
                      className={`w-full p-2 border rounded-xl outline-none text-xs placeholder:text-slate-400 ${
                        isDirector
                          ? 'bg-white border-slate-300 text-slate-800 focus:ring-1 focus:ring-rose-500'
                          : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                {isDirector ? (
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-sm transition-colors text-xs cursor-pointer"
                  >
                    {isUpdating ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-medium text-xs cursor-not-allowed flex items-center gap-1.5"
                    title="Chỉ Giám đốc mới có quyền chỉnh sửa đơn hàng"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chỉ Giám đốc được sửa</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tạo Đơn Hàng & Lead Mới Ngay Tại Phân Hệ Đơn Hàng */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          sources={modalMeta.sources}
          sales={modalMeta.sales}
          products={modalMeta.products}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
