'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Phone,
  MapPin,
  Building,
  Calendar,
  UserCheck,
  Send,
  Plus,
  Clock,
  History,
  Briefcase,
  MessageSquare,
  Sparkles,
  RefreshCw,
  PhoneCall,
  Save,
  Leaf,
  Trash2,
  ShoppingBag,
  Lock,
  Receipt,
  Truck,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Lead, Note, AuditLog, Deal, InteractionLog, Order } from '@/types/crm';
import { formatDate, formatDateTime, formatCurrency, canViewCustomerPhone, canViewCustomerPersonalInfo, maskPhoneNumber } from '@/lib/utils';

interface LeadDetailModalProps {
  leadId: string;
  onClose: () => void;
  onUpdated: () => void;
  onAssignClick: (lead: Lead) => void;
  products?: any[];
}

export default function LeadDetailModal({
  leadId,
  onClose,
  onUpdated,
  onAssignClick,
  products = [],
}: LeadDetailModalProps) {
  const { fetchWithAuth, currentUser } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>(products);
  const [detailProductSearch, setDetailProductSearch] = useState('');
  const [isDetailProductDropdownOpen, setIsDetailProductDropdownOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'interactions' | 'deals' | 'orders' | 'audit'>('overview');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Interaction state
  const [showLogModal, setShowLogModal] = useState(false);
  const [interactionChannel, setInteractionChannel] = useState<'PHONE' | 'ZALO' | 'MEETING'>('PHONE');
  const [interactionSummary, setInteractionSummary] = useState('');

  // Editable fields
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editDob, setEditDob] = useState('');
  const [newCustomSource, setNewCustomSource] = useState('');

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setNotes(data.notes || []);
        setAuditLogs(data.auditLogs || []);
        setDeals(data.deals || []);
        setOrders(data.orders || []);
        setInteractions(data.interactions || []);
        setSources(data.sources || []);
        setStatuses(data.statuses || []);
        if (data.products && data.products.length > 0) {
          setCatalogProducts(data.products);
        }

        setEditFullName(data.lead.fullName || '');
        setEditPhone(data.lead.phone || '');
        setEditAddress(data.lead.address || '');
        setEditCompany(data.lead.company || '');
        setEditDob(data.lead.dob || '');
      }
    } catch (err) {
      console.error('Error fetching lead details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [leadId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead || lead.status === newStatus) return;
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleSourceChange = async (newSource: string) => {
    if (!lead || lead.source === newSource) return;
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: newSource }),
      });
      if (res.ok) {
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to change source:', err);
    }
  };

  const handleAddCustomSource = async () => {
    if (!newCustomSource.trim() || !lead) return;
    const src = newCustomSource.trim();
    await handleSourceChange(src);
    setNewCustomSource('');
  };

  const handleSaveInfo = async () => {
    if (!lead) return;
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName,
          phone: editPhone,
          address: editAddress,
          company: editCompany,
          dob: editDob,
        }),
      });
      if (res.ok) {
        setIsEditingInfo(false);
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to save info:', err);
    }
  };

  const handleAddProduct = async (productId: string) => {
    if (!lead || !productId) return;
    const currentIds = lead.productIds || [];
    if (currentIds.includes(productId)) return;
    const newProductIds = [...currentIds, productId];
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: newProductIds }),
      });
      if (res.ok) {
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to add product to lead:', err);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!lead) return;
    const currentIds = lead.productIds || [];
    const newProductIds = currentIds.filter(id => id !== productId);
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: newProductIds }),
      });
      if (res.ok) {
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to remove product from lead:', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !lead) return;
    setIsSubmittingNote(true);
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (res.ok) {
        setNewNoteContent('');
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionSummary.trim() || !lead) return;
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: interactionChannel,
          summary: interactionSummary.trim(),
        }),
      });
      if (res.ok) {
        setInteractionSummary('');
        setShowLogModal(false);
        fetchDetails();
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to log interaction:', err);
    }
  };

  if (!lead && isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3 text-slate-600">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Đang tải thông tin khách hàng...</span>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-4xl md:max-w-5xl bg-white h-full sm:h-[92vh] sm:rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
        {/* 1. CLEAN MODERN HEADER */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:pt-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-2xs">
              {lead.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{lead.fullName}</h2>
                {lead.company && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[160px]">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>{lead.company}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {canViewCustomerPhone(currentUser, lead.assignedSaleId) ? (
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 font-mono text-[11px] sm:text-xs"
                    title="Bấm để gọi điện ngay"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{lead.phone}</span>
                  </a>
                ) : (
                  <span className="font-mono text-slate-500 flex items-center gap-1 text-[11px]">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>{maskPhoneNumber(lead.phone)}</span>
                  </span>
                )}
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 text-[11px]">Tạo: {formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {canViewCustomerPhone(currentUser, lead.assignedSaleId) && (
              <a
                href={`tel:${lead.phone}`}
                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Gọi điện cho khách"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Gọi điện</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. CẢNH BÁO BẢO MẬT (NẾU LÀ KHÁCH CỦA SALE KHÁC) */}
        {currentUser?.role === 'SALE' && !!lead.assignedSaleId && lead.assignedSaleId !== currentUser?.id && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-amber-800 flex-shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Khách của {lead.assignedSaleName}:</strong> SĐT &amp; thông tin cá nhân được bảo mật.
            </span>
          </div>
        )}

        {/* 3. SUB-HEADER GỌN GÀNG: TRẠNG THÁI + PHÂN CÔNG SALE + GHI LOG */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          {/* Dropdown Trạng thái nhanh (Thay thế 6 nút cồng kềnh) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">Trạng thái:</span>
            <select
              value={lead.status}
              disabled={currentUser?.role === 'SALE' && !!lead.assignedSaleId && lead.assignedSaleId !== currentUser?.id}
              onChange={e => handleStatusChange(e.target.value)}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs border outline-none cursor-pointer transition-all shadow-2xs ${
                lead.status === 'WON'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : lead.status === 'LOST' || lead.status === 'CANCELLED'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : lead.status === 'CONSULTING'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : lead.status === 'POTENTIAL'
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : lead.status === 'COMPLETED'
                  ? 'bg-teal-50 text-teal-700 border-teal-300'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {statuses.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sale Phụ Trách & Nút Ghi Log */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px]">
              <span className="text-slate-400">Sale:</span>
              <strong className="text-slate-800">{lead.assignedSaleName || 'Chưa phân công'}</strong>
              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER') && (
                <button
                  onClick={() => onAssignClick(lead)}
                  className="text-emerald-600 hover:text-emerald-700 font-bold underline ml-1"
                >
                  Đổi
                </button>
              )}
            </div>

            {!(currentUser?.role === 'SALE' && !!lead.assignedSaleId && lead.assignedSaleId !== currentUser?.id) && (
              <button
                onClick={() => setShowLogModal(true)}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-semibold flex items-center gap-1 transition-colors text-[11px]"
              >
                <PhoneCall className="w-3 h-3 text-blue-600" />
                <span>Ghi log</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. NAVIGATION TABS (DÀNH CHO CẢ MOBILE VÀ DESKTOP) */}
        <div className="flex items-center border-b border-slate-200 px-3 sm:px-6 bg-white overflow-x-auto no-scrollbar flex-shrink-0 text-xs">
          {/* Tab Hồ Sơ: Chỉ hiển thị trên Mobile (< md), trên Desktop ẩn vì cột trái đã hiện sẵn */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 flex-shrink-0 md:hidden ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Hồ sơ &amp; Nợ</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'timeline'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ghi chú ({notes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Đơn hàng &amp; Công nợ ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('interactions')}
            className={`py-3 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'interactions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Tương tác ({interactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`py-3 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'deals'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Cơ hội ({deals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử ({auditLogs.length})</span>
          </button>
        </div>

        {/* 5. MAIN CONTENT LAYOUT */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* CỘT TRÁI: HỒ SƠ & TÀI CHÍNH (Hiển thị thường trực trên Desktop; trên Mobile hiện khi chọn tab 'overview') */}
          <div className={`md:col-span-5 p-3.5 sm:p-5 space-y-3.5 bg-slate-50/60 overflow-y-auto ${
            activeTab === 'overview' ? 'block' : 'hidden md:block'
          }`}>
            
            {/* THẺ TÀI CHÍNH & CÔNG NỢ KPI 3 Ô (Fintech Mini Widget) */}
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Tài Chính &amp; Công Nợ</span>
                </span>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 transition-colors"
                >
                  {orders.length} Đơn hàng &rarr;
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                {(() => {
                  const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
                  const totalPurchased = orders.length > 0
                    ? activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
                    : (lead.status !== 'LOST' ? (lead.totalAmount || 0) : 0);
                  const totalCollected = orders.length > 0
                    ? activeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0)
                    : (lead.status !== 'LOST' ? (lead.deposit || 0) : 0);
                  const totalDebt = orders.length > 0
                    ? activeOrders.reduce((sum, o) => sum + (o.remainingDebt || 0), 0)
                    : (lead.status !== 'LOST' ? (lead.remainingDebt || 0) : 0);

                  return (
                    <>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                        <div className="text-[10px] text-slate-500 font-medium">Tổng mua</div>
                        <div className="font-extrabold text-slate-900 font-futura text-xs mt-0.5 truncate">
                          {formatCurrency(totalPurchased)}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                        <div className="text-[10px] text-slate-500 font-medium">Đã thu (Cọc)</div>
                        <div className="font-extrabold text-emerald-700 font-futura text-xs mt-0.5 truncate">
                          {formatCurrency(totalCollected)}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                        <div className="text-[10px] text-slate-500 font-medium">Dư nợ</div>
                        <div className="font-extrabold font-futura text-xs mt-0.5 truncate">
                          {totalDebt > 0 ? (
                            <span className="text-rose-600 font-bold">{formatCurrency(totalDebt)}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px]">0 ₫</span>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* THẺ THÔNG TIN LIÊN HỆ & NGUỒN (Gom thành 1 card liền mạch) */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Thông Tin Liên Hệ</span>
                {!(currentUser?.role === 'SALE' && !!lead.assignedSaleId && lead.assignedSaleId !== currentUser?.id) && (
                  !isEditingInfo ? (
                    <button
                      onClick={() => setIsEditingInfo(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
                    >
                      Sửa
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveInfo}
                      className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" /> Lưu
                    </button>
                  )
                )}
              </div>

              {isEditingInfo ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Họ và tên</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={e => setEditFullName(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Số điện thoại</label>
                    <input
                      type="text"
                      value={canViewCustomerPhone(currentUser, lead.assignedSaleId) ? editPhone : maskPhoneNumber(editPhone)}
                      onChange={e => setEditPhone(e.target.value)}
                      disabled={!canViewCustomerPhone(currentUser, lead.assignedSaleId)}
                      className={`w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs ${
                        !canViewCustomerPhone(currentUser, lead.assignedSaleId) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Công ty (B2B)</label>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={e => setEditCompany(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Địa chỉ</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Ngày sinh</label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={e => setEditDob(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    {canViewCustomerPhone(currentUser, lead.assignedSaleId) ? (
                      <a href={`tel:${lead.phone}`} className="font-semibold text-slate-800 font-mono hover:underline">
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="font-mono text-slate-500">{maskPhoneNumber(lead.phone)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">
                      {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId)
                        ? (lead.company || 'Khách cá nhân')
                        : '[Đã ẩn]'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="flex-1 leading-relaxed">
                      {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId)
                        ? (lead.address || 'Chưa có địa chỉ')
                        : '[Đã ẩn]'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>
                      {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId)
                        ? (lead.dob ? `Sinh: ${formatDate(lead.dob)}` : 'Chưa nhập ngày sinh')
                        : '[Đã ẩn]'}
                    </span>
                  </div>

                  {/* Nguồn khách hàng tích hợp gọn gàng */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Nguồn:</span>
                    <select
                      value={lead.source}
                      onChange={e => handleSourceChange(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 max-w-[180px]"
                    >
                      {sources.map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* THẺ SẢN PHẨM QUAN TÂM / ĐÃ MUA */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sản Phẩm Quan Tâm ({(lead.productIds || []).length})</span>
                </span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {(lead.productIds || []).map(pid => {
                  const prod = catalogProducts.find(p => p.id === pid);
                  const pName = prod?.name || lead.productNames?.[(lead.productIds || []).indexOf(pid)] || pid;
                  const price = prod?.price ?? prod?.retailPrice;
                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs"
                    >
                      <div className="truncate flex-1 min-w-0 pr-1">
                        <div className="font-semibold text-slate-800 truncate">• {pName}</div>
                        {price !== undefined && (
                          <div className="text-[10px] text-emerald-700 font-medium font-futura">
                            {formatCurrency(price)}
                          </div>
                        )}
                      </div>
                      {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId) && (
                        <button
                          onClick={() => handleRemoveProduct(pid)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {(!lead.productIds || lead.productIds.length === 0) && (
                  <div className="text-center py-2.5 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                    Chưa gắn sản phẩm nào.
                  </div>
                )}
              </div>

              {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId) && (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={detailProductSearch}
                      onChange={e => {
                        setDetailProductSearch(e.target.value);
                        setIsDetailProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsDetailProductDropdownOpen(true)}
                      placeholder="Tìm cây / mệnh giá để gắn thêm..."
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
                    />
                    {detailProductSearch && (
                      <button
                        type="button"
                        onClick={() => setDetailProductSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {isDetailProductDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDetailProductDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50 py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 text-xs">
                        {catalogProducts
                          .filter(p => {
                            if (!detailProductSearch.trim()) return true;
                            const term = detailProductSearch.toLowerCase().trim();
                            const pName = (p.name || '').toLowerCase();
                            const pPrice = String(p.price || 0);
                            return pName.includes(term) || pPrice.includes(term);
                          })
                          .map(p => {
                            const isAttached = (lead.productIds || []).includes(p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  if (!isAttached) {
                                    handleAddProduct(p.id);
                                    setDetailProductSearch('');
                                    setIsDetailProductDropdownOpen(false);
                                  }
                                }}
                                className={`px-2.5 py-1.5 flex items-center justify-between transition-colors ${
                                  isAttached
                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'hover:bg-emerald-50 cursor-pointer text-slate-800'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  {isAttached && <span className="text-emerald-600 font-bold mr-1">✓</span>}
                                  <span className="font-semibold">{p.name}</span>
                                </div>
                                <span className="font-bold text-emerald-700 font-futura flex-shrink-0">
                                  {formatCurrency(p.price || 0)}
                                </span>
                              </div>
                            );
                          })}

                        {catalogProducts.filter(p => {
                          if (!detailProductSearch.trim()) return true;
                          const term = detailProductSearch.toLowerCase().trim();
                          return (p.name || '').toLowerCase().includes(term) || String(p.price || 0).includes(term);
                        }).length === 0 && (
                          <div className="p-3 text-center text-slate-400 text-xs">
                            Không tìm thấy cây nào phù hợp
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: CÁC TAB HOẠT ĐỘNG (GHI CHÚ / ĐƠN HÀNG / TƯƠNG TÁC / DEALS / AUDIT) */}
          <div className={`md:col-span-7 flex flex-col h-full bg-white overflow-y-auto ${
            activeTab === 'overview' ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4">
              
              {/* TAB 1: GHI CHÚ (TIMELINE) */}
              {(activeTab === 'timeline' || (activeTab === 'overview')) && (
                <div className="space-y-4">
                  {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId) ? (
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <div className="relative bg-slate-50 rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500 transition-all p-2">
                        <textarea
                          value={newNoteContent}
                          onChange={e => setNewNoteContent(e.target.value)}
                          placeholder="Nhập ghi chú hoặc biên bản trao đổi với khách..."
                          rows={2}
                          className="w-full text-xs bg-transparent outline-none resize-none placeholder:text-slate-400"
                        />
                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={isSubmittingNote || !newNoteContent.trim()}
                            className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Lưu</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Ghi chú được bảo mật cho Sale phụ trách ({lead.assignedSaleName || 'đồng nghiệp'}).</span>
                    </div>
                  )}

                  {/* Danh sách ghi chú */}
                  <div className="space-y-2.5">
                    {notes.map(note => (
                      <div key={note.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-slate-800">{note.authorName}</span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      </div>
                    ))}

                    {notes.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Chưa có ghi chú nào cho khách hàng này.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ĐƠN HÀNG & CÔNG NỢ */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {orders.map(ord => (
                    <div key={ord.id} className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-xs space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{ord.code}</span>
                            {/* Badge trạng thái 4 mục */}
                            {ord.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                1. Chờ xử lý
                              </span>
                            )}
                            {(ord.status === 'DELIVERED_UNPAID' || ord.status === 'DELIVERING') && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                <Truck className="w-3 h-3 text-blue-600" />
                                2. Đã giao (Chưa TT)
                              </span>
                            )}
                            {ord.status === 'COMPLETED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                3. Hoàn thành
                              </span>
                            )}
                            {ord.status === 'CANCELLED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                4. Đơn hàng hủy
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ngày tạo: {formatDate(ord.createdAt)} — Sale: <strong>{ord.assignedSaleName}</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-slate-500 font-medium">Tổng giá trị:</div>
                          <div className="text-sm font-extrabold text-slate-900 font-futura">
                            {formatCurrency(ord.totalAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết tài chính đơn */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-50 rounded-xl text-center">
                        <div className="p-1">
                          <div className="text-[10px] text-slate-500 font-medium">Tiền hàng gốc</div>
                          <div className="font-bold text-slate-800">{formatCurrency(ord.subtotal || ord.totalAmount)}</div>
                        </div>
                        <div className="p-1">
                          <div className="text-[10px] text-slate-500 font-medium">Giảm / Ship</div>
                          <div className="font-bold text-slate-700">
                            -{(ord.discount || 0) > 0 ? formatCurrency(ord.discount || 0) : '0đ'} / +{(ord.shippingFee || 0) > 0 ? formatCurrency(ord.shippingFee || 0) : '0đ'}
                          </div>
                        </div>
                        <div className="p-1">
                          <div className="text-[10px] text-slate-500 font-medium">Đã thu (Cọc)</div>
                          <div className="font-bold text-emerald-600 font-futura">{formatCurrency(ord.paidAmount)}</div>
                        </div>
                        <div className="p-1">
                          <div className="text-[10px] text-slate-500 font-medium">Dư nợ cần thu</div>
                          <div className="font-extrabold font-futura">
                            {ord.remainingDebt > 0 ? (
                              <span className="text-rose-600">{formatCurrency(ord.remainingDebt)}</span>
                            ) : (
                              <span className="text-emerald-600">0 ₫ (Hết nợ)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Danh sách sản phẩm trong đơn */}
                      {(ord.items || []).length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-700">Sản phẩm chi tiết:</div>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {(ord.items || []).map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg text-xs">
                                <span className="font-medium text-slate-800">• {it.productName}</span>
                                <span className="text-slate-600 font-bold">x{it.quantity}</span>
                                <span className="font-mono text-slate-900 font-semibold">{formatCurrency(it.total || it.quantity * it.unitPrice)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ghi chú hoặc lý do hủy */}
                      {ord.cancelReason && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800">
                          <strong>Lý do hủy đơn:</strong> {ord.cancelReason}
                        </div>
                      )}
                      {ord.notes && !ord.cancelReason && (
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                          <strong>Ghi chú:</strong> {ord.notes}
                        </div>
                      )}
                    </div>
                  ))}

                  {orders.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Khách hàng này hiện chưa có đơn hàng liên kết nào.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: NHẬT KÝ TƯƠNG TÁC */}
              {activeTab === 'interactions' && (
                <div className="space-y-3">
                  {!(currentUser?.role === 'SALE' && !!lead.assignedSaleId && lead.assignedSaleId !== currentUser?.id) && (
                    <div className="flex justify-end pb-1">
                      <button
                        onClick={() => setShowLogModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Thêm tương tác</span>
                      </button>
                    </div>
                  )}

                  {interactions.map(act => (
                    <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                          {act.channel === 'PHONE' ? 'Cuộc gọi' : act.channel === 'ZALO' ? 'Zalo' : act.channel === 'MEETING' ? 'Gặp mặt' : 'Email'}
                        </span>
                        <span className="text-[11px] text-slate-400">{formatDateTime(act.occurredAt)}</span>
                      </div>
                      <p className="text-slate-800 font-medium mt-1">{act.summary}</p>
                      <div className="text-[10px] text-slate-400 mt-1">Người ghi: {act.authorName}</div>
                    </div>
                  ))}

                  {interactions.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Chưa có nhật ký tương tác nào. Bấm nút "Ghi log" ở trên để thêm.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CƠ HỘI BÁN HÀNG */}
              {activeTab === 'deals' && (
                <div className="space-y-3">
                  {deals.map(deal => (
                    <div key={deal.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{deal.title}</span>
                        <span className="font-bold text-emerald-600 text-sm">{formatCurrency(deal.value)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Xác suất: {deal.winProbability}%</span>
                        <span>Dự kiến chốt: {formatDate(deal.expectedCloseDate)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1">Phụ trách: {deal.assignedSaleName}</div>
                    </div>
                  ))}

                  {deals.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Khách hàng này hiện chưa có Deal bán hàng nào.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: LỊCH SỬ THAY ĐỔI */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{log.userName}</span>
                        <span className="text-slate-400">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <div className="text-slate-700">{log.details}</div>
                      {log.reason && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                          Lý do: <em>{log.reason}</em>
                        </div>
                      )}
                    </div>
                  ))}

                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Chưa có sự kiện kiểm toán nào.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Log Interaction Modal */}
        {showLogModal && (
          <div 
            className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={e => {
              if (e.target === e.currentTarget) setShowLogModal(false);
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto flex flex-col max-h-[92vh] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-white">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-blue-600" />
                  <span>Ghi Nhật Ký Tương Tác</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogInteraction} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
                  <div>
                    <label className="text-slate-600 font-semibold mb-1 block">Hình thức liên hệ:</label>
                    <select
                      value={interactionChannel}
                      onChange={e => setInteractionChannel(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="PHONE">Cuộc gọi điện thoại</option>
                      <option value="ZALO">Chat Zalo / Tin nhắn</option>
                      <option value="MEETING">Gặp trực tiếp / Đi thị trường</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 font-semibold mb-1 block">Nội dung tóm tắt cuộc trao đổi:</label>
                    <textarea
                      rows={4}
                      value={interactionSummary}
                      onChange={e => setInteractionSummary(e.target.value)}
                      placeholder="VD: Đã gọi lúc 10h, khách đang họp, hẹn gọi lại sau 15h chiều..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                  >
                    Lưu tương tác
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
