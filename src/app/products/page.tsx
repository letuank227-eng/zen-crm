'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Search,
  Download,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { Product } from '@/types/crm';
import { formatCurrency, compressImageFile } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';

export default function ProductsPage() {
  const { fetchWithAuth, currentUser } = useAuth();
  const { dateFrom, dateTo } = useDateFilter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState('');

  // Add/Edit Product Modal (4 fields: Ảnh -> Tên -> Giá & Hoa hồng -> Ghi chú)
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(85000);
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [commissionAmount, setCommissionAmount] = useState<number>(8500);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isDirector = currentUser?.role === 'ADMIN';

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const url = params.toString() ? `/api/products?${params.toString()}` : '/api/products';
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [dateFrom, dateTo]);

  // Handle local image file upload in Add/Edit modal with automatic client-side compression
  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 800, 0.82);
        setImageUrl(compressed);
      } catch (err) {
        console.error('Lỗi khi nén ảnh sản phẩm:', err);
      }
    }
  };

  const handleOpenAdd = () => {
    if (!isDirector) return;
    setEditingProd(null);
    setName('');
    setPrice(85000);
    setCommissionRate(10);
    setCommissionAmount(8500);
    setImageUrl('https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80');
    setNotes('• Ánh sáng: Yếu - Vừa (0.5W/L)\n• CO2: Không bắt buộc, có CO2 lá căng mướt\n• Bảo hành 1 đổi 1 trong 48h nếu dập úng khi ship tỉnh xa');
    setShowProductModal(true);
    setErrorMsg('');
  };

  const handleOpenProduct = (p: Product) => {
    const prodPrice = p.price ?? p.retailPrice ?? 85000;
    const prodRate = p.commissionRate !== undefined ? p.commissionRate : 10;
    const prodAmount = p.commissionAmount !== undefined ? p.commissionAmount : Math.round((prodPrice * prodRate) / 100);

    setEditingProd(p);
    setName(p.name);
    setPrice(prodPrice);
    setCommissionRate(prodRate);
    setCommissionAmount(prodAmount);
    setImageUrl(p.imageUrl || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80');
    setNotes(p.notes || p.description || '');
    setShowProductModal(true);
    setErrorMsg('');
  };

  const handleOpenEdit = handleOpenProduct;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setErrorMsg('Chỉ Giám đốc mới có quyền thêm hoặc chỉnh sửa sản phẩm');
      return;
    }
    if (!name.trim() || !price) {
      setErrorMsg('Vui lòng điền đầy đủ Tên sản phẩm và Giá bán');
      return;
    }

    const calculatedCommission = Math.round((price * commissionRate) / 100);

    try {
      if (editingProd) {
        // PUT
        const res = await fetchWithAuth('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProd.id,
            name: name.trim(),
            price,
            retailPrice: price,
            wholesalePrice: price,
            vipPrice: price,
            commissionRate,
            commissionAmount: calculatedCommission,
            imageUrl,
            notes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.product) {
            setProducts(prev => prev.map(p => (p.id === data.product.id ? data.product : p)));
          }
          setNotification(`Đã cập nhật sản phẩm "${name}" thành công!`);
        }
      } else {
        // POST
        const res = await fetchWithAuth('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            price,
            retailPrice: price,
            wholesalePrice: price,
            vipPrice: price,
            commissionRate,
            commissionAmount: calculatedCommission,
            imageUrl,
            notes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.product) {
            setProducts(prev => [data.product, ...prev]);
          }
          setNotification(`Đã thêm mới cây thủy sinh "${name}" thành công!`);
        }
      }

      setShowProductModal(false);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      console.error('Failed to save product:', err);
      setErrorMsg('Có lỗi xảy ra khi lưu sản phẩm');
    }
  };


  const handleDeleteProduct = async (p: Product) => {
    if (!isDirector) {
      alert('Chỉ Giám đốc mới có quyền xóa sản phẩm khỏi danh mục');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa "${p.name}" khỏi danh mục không?`)) return;

    // Optimistic UI update: Xóa ngay lập tức khỏi màn hình (0ms phản hồi)
    setProducts(prev => prev.filter(prod => prod.id !== p.id));
    setNotification(`Đã xóa sản phẩm "${p.name}".`);
    setTimeout(() => setNotification(''), 4000);

    try {
      const res = await fetchWithAuth(`/api/products?id=${p.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        // Rollback nếu server trả lỗi
        fetchProducts();
        alert('Không thể xóa sản phẩm. Đang tải lại dữ liệu...');
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      fetchProducts();
    }
  };

  const debouncedSearch = useDebounce(searchTerm, 250);

  // Pagination / Lazy rendering: show 15 items initially so initial DOM is light and fast
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Filtered Products by search (memoized for fast rendering)
  const filteredProducts = useMemo(() => {
    if (!debouncedSearch.trim()) return products;
    const term = debouncedSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.notes && p.notes.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [products, debouncedSearch]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>Danh Mục Sản Phẩm</span>
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            {isDirector
              ? '👑 Quyền Giám đốc: Toàn quyền thêm, sửa bảng giá và hoa hồng sản phẩm'
              : 'Bảng giá niêm yết và hoa hồng thực nhận cho nhân sự'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirector && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span>Thêm Sản Phẩm</span>
            </button>
          )}
        </div>
      </div>

      {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
      <DatePeriodFilter />

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên cây, ghi chú chăm sóc..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          />
        </div>

        <div className="text-slate-500 font-medium">
          Hiển thị <strong>{filteredProducts.length}</strong> / {products.length} sản phẩm
        </div>
      </div>

      {/* PRODUCTS GRID - EXACT LAYOUT: 1. ẢNH -> 2. TÊN SẢN PHẨM -> 3. GIÁ BÁN -> 4. NỘI DUNG GHI CHÚ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {displayedProducts.map((p, idx) => {
          const displayPrice = p.price ?? p.retailPrice ?? 0;
          const commRate = p.commissionRate !== undefined ? p.commissionRate : 10;
          const commAmount = p.commissionAmount !== undefined ? p.commissionAmount : Math.round((displayPrice * commRate) / 100);

          return (
            <div
              key={p.id}
              onClick={() => handleOpenProduct(p)}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between group pb-4 cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20"
              title={isDirector ? 'Nhấn để chỉnh sửa hoặc xóa sản phẩm này' : 'Nhấn để xem chi tiết sản phẩm'}
            >
              <div className="space-y-3.5">
                {/* [ 1. ẢNH SẢN PHẨM - UPLOAD ] */}
                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden group/img flex items-center justify-center">
                  {/* Nút thao tác góc trái ảnh */}
                  {isDirector ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProduct(p);
                      }}
                      className="absolute top-2.5 left-2.5 z-10 bg-slate-900/85 hover:bg-emerald-600 text-white backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-white/20"
                      title="Chỉnh sửa thông tin sản phẩm"
                    >
                      <Edit2 className="w-3 h-3 text-emerald-300" />
                      <span>Sửa</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProduct(p);
                      }}
                      className="absolute top-2.5 left-2.5 z-10 bg-slate-900/85 hover:bg-emerald-600 text-white backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-white/20"
                      title="Xem chi tiết sản phẩm"
                    >
                      <Eye className="w-3 h-3 text-emerald-300" />
                      <span>Chi tiết</span>
                    </button>
                  )}

                  {/* Badge góc nhỏ hoa hồng Sale */}
                  {commAmount > 0 && (
                    <div className="absolute top-2.5 right-2.5 z-10 bg-slate-900/90 backdrop-blur-xs text-white border border-emerald-400/40 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 text-[11px] font-bold pointer-events-none">
                      <span className="text-amber-400">💰</span>
                      <span className="text-emerald-300 font-semibold">HH Sale:</span>
                      <span className="font-futura text-white font-extrabold tracking-wide">+{formatCurrency(commAmount)}</span>
                      <span className="text-[9px] text-emerald-400 font-normal">({commRate}%)</span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-1 bg-slate-900">
                    <Package className="w-8 h-8 opacity-40 text-slate-400" />
                    <span className="text-[10px] text-slate-500">Chưa có ảnh</span>
                  </div>
                  <img
                    src={p.imageUrl || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80'}
                    alt={p.name}
                    loading={idx > 2 ? 'lazy' : 'eager'}
                    decoding="async"
                    className="w-full h-full object-cover object-center relative z-1 group-hover/img:scale-105 transition-transform duration-500"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* [ 2. TÊN SẢN PHẨM ] */}
                <div className="px-5 pt-1">
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2 min-h-[2.6rem] flex items-center">
                    {p.name}
                  </h3>
                </div>

                {/* [ 3. GIÁ BÁN & HOA HỒNG SALE ] */}
                <div className="px-5">
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Giá bán:
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-700 font-futura leading-none">
                        {formatCurrency(displayPrice)}
                      </span>
                    </div>

                    <div className="text-right pl-3 border-l border-emerald-200/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Sale thực nhận:
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-800 font-futura">
                        +{formatCurrency(commAmount)}
                        <span className="text-[10px] text-emerald-600 font-medium ml-1">
                          ({commRate}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* [ 4. NỘI DUNG GHI CHÚ ] */}
                <div className="px-5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">
                      Nội dung ghi chú:
                    </span>
                    <p className="text-slate-600 whitespace-pre-line leading-relaxed line-clamp-3 min-h-[3.6rem]">
                      {p.notes || p.description || 'Chưa có ghi chú'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && !isLoading && (
          <div className="col-span-3 text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-slate-500 font-medium">Không tìm thấy sản phẩm cây thủy sinh nào phù hợp.</div>
            {isDirector && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                Thêm Sản Phẩm Mới
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nút Xem Thêm (Load More) Khi Có Nhiều Sản Phẩm */}
      {displayedProducts.length < filteredProducts.length && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + 18)}
            className="px-6 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-500 font-bold rounded-xl shadow-2xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer text-xs"
          >
            <span>Xem thêm sản phẩm ({displayedProducts.length}/{filteredProducts.length})</span>
            <ChevronDown className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* MODAL 1: THÊM / SỬA / XEM CHI TIẾT SẢN PHẨM */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 text-xs animate-in zoom-in-95 my-auto flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">
                  {isDirector
                    ? (editingProd ? 'Cập Nhật Sản Phẩm' : 'Thêm Mới Sản Phẩm')
                    : 'Chi Tiết Sản Phẩm'}
                </h3>
                {!isDirector && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Chỉ xem
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* [ 1. ẢNH SẢN PHẨM ] */}
                {isDirector ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                      1. Ảnh Sản Phẩm (Tải lên từ máy tính):
                    </label>

                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleModalFileUpload}
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start">
                      {/* Image Preview Thumbnail */}
                      <div
                        onClick={() => modalFileInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 relative flex-shrink-0 group shadow-2xs"
                      >
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Đổi ảnh
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-500 font-medium">Chọn ảnh</span>
                          </>
                        )}
                      </div>

                      {/* Upload button & URL input */}
                      <div className="flex-1 w-full space-y-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => modalFileInputRef.current?.click()}
                          className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Chọn file ảnh từ thiết bị</span>
                        </button>
                        <input
                          type="text"
                          value={imageUrl.startsWith('data:') ? 'Ảnh đã tải từ máy tính' : imageUrl}
                          onChange={e => {
                            if (!e.target.value.startsWith('Ảnh đã')) {
                              setImageUrl(e.target.value);
                            }
                          }}
                          placeholder="Hoặc dán đường dẫn ảnh (URL)..."
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none text-[11px] focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                      1. Ảnh Sản Phẩm:
                    </label>
                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center shadow-xs">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                          <Package className="w-8 h-8 opacity-50" />
                          <span className="text-[11px]">Chưa có hình ảnh sản phẩm</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* [ 2. TÊN SẢN PHẨM ] */}
                <div>
                  <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block mb-1">
                    2. Tên Sản Phẩm {isDirector ? '*' : ''}:
                  </label>
                  {isDirector ? (
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="VD: Ráy Nana Petite (Anubias nana 'Petite')..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  ) : (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs select-all">
                      {name}
                    </div>
                  )}
                </div>

                {/* [ 3. GIÁ BÁN & CHÍNH SÁCH HOA HỒNG SALE ] */}
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Giá bán */}
                    <div>
                      <label className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block mb-1">
                        3. Giá Bán (VND) {isDirector ? '*' : ''}:
                      </label>
                      {isDirector ? (
                        <input
                          type="number"
                          step="1000"
                          value={price}
                          onChange={e => {
                            const newP = Number(e.target.value);
                            setPrice(newP);
                            setCommissionAmount(Math.round((newP * commissionRate) / 100));
                          }}
                          placeholder="Nhập giá bán..."
                          className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-black text-emerald-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      ) : (
                        <div className="p-2.5 bg-white border border-emerald-200 rounded-xl font-black text-emerald-700 text-sm font-futura">
                          {formatCurrency(price)}
                        </div>
                      )}
                    </div>

                    {/* % Hoa hồng Sale */}
                    <div>
                      <label className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block mb-1">
                        Hoa Hồng Sale (%):
                      </label>
                      {isDirector ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={commissionRate}
                            onChange={e => {
                              const newRate = Number(e.target.value);
                              setCommissionRate(newRate);
                              setCommissionAmount(Math.round((price * newRate) / 100));
                            }}
                            placeholder="VD: 10"
                            className="w-full p-2.5 pr-8 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-emerald-600 text-xs">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white border border-emerald-200 rounded-xl font-bold text-emerald-800 text-sm font-futura">
                          {commissionRate}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kết quả tính toán Sale thực nhận */}
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200/90 flex items-center justify-between text-xs shadow-2xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span className="text-sm">💰</span>
                      <span>Sale thực nhận về:</span>
                    </span>
                    <div className="text-right">
                      <span className="font-black text-emerald-700 text-base font-futura">
                        {formatCurrency(commissionAmount)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium ml-1.5">
                        ({commissionRate}% của giá gốc)
                      </span>
                    </div>
                  </div>
                </div>

                {/* [ 4. NỘI DUNG GHI CHÚ ] */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                    4. Nội Dung Ghi Chú:
                  </label>
                  {isDirector ? (
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ghi chú về ánh sáng, CO2, vị trí trồng lũa/đá, bảo hành khi ship xa..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs leading-relaxed focus:ring-1 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-700 whitespace-pre-line select-all min-h-[4.5rem]">
                      {notes || 'Chưa có ghi chú.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons (Sticky/Always Visible at Bottom) */}
              {isDirector ? (
                <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0 gap-2">
                  {editingProd ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (editingProd) {
                          handleDeleteProduct(editingProd);
                          setShowProductModal(false);
                        }
                      }}
                      className="px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition-colors flex items-center gap-1.5 border border-rose-200 text-xs cursor-pointer"
                      title="Xóa sản phẩm này khỏi danh sách"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa sản phẩm này</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowProductModal(false)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors text-xs cursor-pointer shadow-2xs"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors text-xs cursor-pointer"
                    >
                      Lưu Sản Phẩm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-sm transition-colors text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
