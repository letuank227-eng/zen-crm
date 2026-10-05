'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  UserPlus,
  AlertCircle,
  Leaf,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Truck,
  Tag,
  Receipt,
  FileSpreadsheet,
  Building2,
  Phone,
  MapPin,
  FileText,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SelectedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface CreateLeadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  sources: string[];
  sales: any[];
  products?: any[];
}

export default function CreateLeadModal({
  onClose,
  onSuccess,
  sources,
  sales,
  products = [],
}: CreateLeadModalProps) {
  const { fetchWithAuth, currentUser } = useAuth();

  // 1. Thông tin khách hàng & công ty
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  // 2. Nguồn lead & Trạng thái
  const [source, setSource] = useState(sources[0] || 'Website / Tự đến');
  const [customSource, setCustomSource] = useState('');
  const [status, setStatus] = useState('CONSULTING');

  // 3. Phân công Sale (Mặc định chính người đang tạo đơn dù là Sale, Leader, Admin hay Giám đốc)
  const [assignedSaleId, setAssignedSaleId] = useState(currentUser?.id || '');
  const [autoRoundRobin, setAutoRoundRobin] = useState(false);

  // 4. Sản phẩm khách mua
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [showCustomItemInput, setShowCustomItemInput] = useState(false);

  // 5. 3 ô tài chính (mặc định = 0)
  const [discount, setDiscount] = useState<number | string>(0);
  const [deposit, setDeposit] = useState<number | string>(0);
  const [shippingFee, setShippingFee] = useState<number | string>(0);

  // 6. Ghi chú
  const [initialNote, setInitialNote] = useState('');

  // Trạng thái submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle chọn sản phẩm từ catalog
  const handleSelectProduct = (productId: string) => {
    if (!productId) return;
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setSelectedItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.price ?? prod.retailPrice ?? 0,
        },
      ];
    });
  };

  // Thêm dòng sản phẩm custom
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const price = Math.max(0, Number(customItemPrice) || 0);
    setSelectedItems(prev => [
      ...prev,
      {
        productId: `custom_${Date.now()}`,
        productName: customItemName.trim(),
        quantity: 1,
        unitPrice: price,
      },
    ]);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItemInput(false);
  };

  // Update item quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedItems(prev =>
      prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as SelectedItem[]
    );
  };

  // Update item unit price
  const handleUpdatePrice = (productId: string, newPrice: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, unitPrice: Math.max(0, newPrice) } : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.productId !== productId));
  };

  // THUẬT TOÁN TÍNH TOÁN TÀI CHÍNH
  const subtotal = selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const numDiscount = Math.max(0, Number(discount) || 0);
  const numShipping = Math.max(0, Number(shippingFee) || 0);
  const numDeposit = Math.max(0, Number(deposit) || 0);

  // Tổng tiền của đơn = Tiền hàng + Tiền ship - Giảm giá
  const totalAmount = Math.max(0, subtotal + numShipping - numDiscount);
  // Tiền cọc đã thu (tối đa bằng tổng tiền)
  const paidAmount = Math.min(numDeposit, totalAmount);
  // Công nợ còn lại = Tổng tiền - Đã thu
  const remainingDebt = Math.max(0, totalAmount - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() && !company.trim()) {
      setErrorMsg('Vui lòng nhập Họ tên hoặc Tên công ty khách hàng');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Vui lòng nhập Số điện thoại');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const finalSource = customSource.trim() || source;

      const res = await fetchWithAuth('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim() || company.trim(),
          company: company.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: email.trim(),
          source: finalSource,
          status,
          assignedSaleId: autoRoundRobin ? undefined : assignedSaleId,
          autoRoundRobin,
          tags: [],
          orderItems: selectedItems.map(it => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.quantity * it.unitPrice,
          })),
          productIds: selectedItems.map(it => it.productId),
          discount: numDiscount,
          deposit: numDeposit,
          shippingFee: numShipping,
          initialNote: initialNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Có lỗi xảy ra khi tạo khách hàng');
      }
    } catch (err) {
      console.error('Failed to create lead & order:', err);
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal-backdrop z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" style={{ zIndex: 999 }}>
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden relative" style={{ zIndex: 1000 }}>
        {/* Header (Sticky top) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Đăng Ký Khách Hàng &amp; Đơn Hàng Mới</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form id="create-lead-form" onSubmit={handleSubmit} className="space-y-4">
            {/* THÔNG TIN KHÁCH HÀNG */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Thông Tin Khách Hàng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Tên Khách Hàng <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="VD: Anh Nam, Chị Lan..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Tên Công Ty / Cửa Hàng (nếu có):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="VD: AquaStyle Garden, Quán Cafe..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 pl-8"
                  />
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Số Điện Thoại <span className="text-rose-500">*</span>:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 pl-8 font-mono"
                    required
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Địa Chỉ Nhận Hàng / Công Trình:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Địa chỉ số nhà, đường, quận/huyện..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 pl-8"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Nguồn Lead:</label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                >
                  {sources.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customSource}
                  onChange={e => setCustomSource(e.target.value)}
                  placeholder="Hoặc nhập nguồn mới khác..."
                  className="mt-1.5 w-full p-1.5 text-[11px] bg-white border border-slate-200 rounded outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Trạng Thái Tư Vấn:</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 cursor-pointer appearance-none pr-8"
                  >
                    <option value="CONSULTING">Đang tư vấn</option>
                    <option value="NEW">Mới tiếp nhận</option>
                    <option value="POTENTIAL">Tiềm năng cao</option>
                    <option value="WON">Đã chốt đơn</option>
                    <option value="LOST">Đã hủy / Không mua</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="mt-2">
                  <span className="font-semibold text-slate-700 block mb-1">Người phụ trách đơn &amp; khách hàng:</span>
                  {currentUser?.role === 'SALE' ? (
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 font-semibold text-xs flex items-center justify-between">
                      <span>{currentUser.name} (Chính bạn)</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-mono">Người tạo đơn</span>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={assignedSaleId}
                        onChange={e => setAssignedSaleId(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-slate-800"
                      >
                        <option value={currentUser?.id || ''}>
                          {currentUser?.name} (Chính bạn - Mặc định)
                        </option>
                        {sales.filter(s => s.id !== currentUser?.id).map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role || 'SALE'})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Đơn hàng sẽ ghi nhận doanh số và KPI cho người được chọn ở trên.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SẢN PHẨM KHÁCH MUA */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sản Phẩm Khách Mua ({selectedItems.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomItemInput(prev => !prev)}
                className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm món tự nhập</span>
              </button>
            </div>

            {/* Dropdown chọn từ catalog có sẵn */}
            <div className="relative">
              <select
                onChange={e => {
                  handleSelectProduct(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700 cursor-pointer"
              >
                <option value="" disabled>
                  -- Chọn cây thủy sinh / vật liệu / gói setup có sẵn --
                </option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - Giá niêm yết: {formatCurrency(p.price || p.retailPrice || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Input thêm sản phẩm tùy chỉnh nếu cần */}
            {showCustomItemInput && (
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in-50">
                <div className="font-bold text-emerald-900 text-[11px]">Nhập sản phẩm hoặc dịch vụ tùy chỉnh:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={customItemName}
                      onChange={e => setCustomItemName(e.target.value)}
                      placeholder="Tên cây, lũa, đá hoặc dịch vụ setup riêng..."
                      className="w-full p-1.5 bg-white border border-emerald-200 rounded-lg outline-none text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={customItemPrice}
                      onChange={e => setCustomItemPrice(e.target.value)}
                      placeholder="Đơn giá (₫)..."
                      className="w-full p-1.5 bg-white border border-emerald-200 rounded-lg outline-none text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowCustomItemInput(false)}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                  >
                    + Thêm vào đơn
                  </button>
                </div>
              </div>
            )}

            {/* Danh sách các sản phẩm đã chọn */}
            {selectedItems.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.productId || idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{item.productName}</div>
                      <div className="text-[11px] text-slate-400">
                        Đơn giá: {formatCurrency(item.unitPrice)}
                      </div>
                    </div>

                    {/* Số lượng */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.productId, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-slate-800 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.productId, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Thành tiền */}
                    <div className="text-right min-w-[90px]">
                      <div className="font-extrabold text-slate-900 font-futura text-xs">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                    </div>

                    {/* Xóa */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa món này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 px-1 text-slate-700 font-bold border-t border-slate-200/80">
                  <span>Tổng tiền hàng (Tạm tính):</span>
                  <span className="text-sm font-extrabold text-slate-900 font-futura">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200 text-xs">
                Chưa chọn sản phẩm nào. Chọn sản phẩm ở danh sách trên hoặc nhập món tùy ý.
              </div>
            )}
          </div>

          {/* CHIẾT KHẤU & ĐẶT CỌC */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chiết Khấu, Tiền Cọc &amp; Phí Ship</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Ô 1: Giảm giá */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <label className="font-semibold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>Giảm giá (₫):</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={discount}
                  onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 font-futura font-bold text-slate-800"
                />
              </div>

              {/* Ô 2: Tiền cọc */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <label className="font-semibold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-600" />
                    <span>Tiền cọc (₫):</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-futura font-bold text-emerald-700"
                />
              </div>

              {/* Ô 3: Tiền ship */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <label className="font-semibold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-600" />
                    <span>Tiền ship (₫):</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={shippingFee}
                  onChange={e => setShippingFee(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-futura font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* TỔNG KẾT ĐƠN HÀNG & CÔNG NỢ */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Tổng Kết Đơn Hàng &amp; Công Nợ</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400">Tiền hàng:</div>
                <div className="font-bold font-futura text-slate-200">{formatCurrency(subtotal)}</div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400">Phí giao hàng:</div>
                <div className="font-bold font-futura text-blue-300">+{formatCurrency(numShipping)}</div>
              </div>

              <div className="space-y-0.5 bg-slate-800/90 p-2 rounded-lg">
                <div className="text-[10px] text-amber-300 font-semibold">TỔNG ĐƠN HÀNG:</div>
                <div className="font-extrabold font-futura text-sm sm:text-base text-amber-400">
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              <div className="space-y-0.5 bg-slate-800/90 p-2 rounded-lg">
                <div className="text-[10px] text-rose-300 font-semibold">CÔNG NỢ CẦN THU:</div>
                <div className="font-extrabold font-futura text-sm sm:text-base text-rose-400">
                  {formatCurrency(remainingDebt)}
                </div>
              </div>
            </div>
          </div>

          {/* GHI CHÚ */}
          <div>
            <label className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Ghi chú đơn hàng:</span>
            </label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={e => setInitialNote(e.target.value)}
              placeholder="Yêu cầu riêng của khách, thỏa thuận thanh toán..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            />
          </div>
        </form>
      </div>

      {/* Footer (Sticky bottom - Luôn luôn cố định ở đáy, không bao giờ bị che/mất nút trên Mobile) */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-slate-50/90 sm:bg-white border-t border-slate-200 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 sm:py-2.5 bg-slate-200/80 hover:bg-slate-300 active:scale-95 text-slate-700 rounded-xl font-semibold transition-all text-xs"
        >
          Hủy
        </button>
        <button
          type="submit"
          form="create-lead-form"
          disabled={isSubmitting}
          className="px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 text-xs"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSubmitting ? 'Đang tạo đơn...' : '+ Lưu Đơn Hàng & Lead'}</span>
        </button>
      </div>
    </div>
  </div>
);
}
