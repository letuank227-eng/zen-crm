'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import {
  Users2,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  UserCheck,
  RefreshCw,
  Phone,
  Building,
  Calendar,
  Sparkles,
  AlertCircle,
  Eye,
  Leaf,
  Package,
  Lock,
} from 'lucide-react';
import { Lead } from '@/types/crm';
import { formatDate, formatDateTime, formatCurrency, canViewCustomerPhone, canViewCustomerPersonalInfo, maskPhoneNumber } from '@/lib/utils';
import LeadDetailModal from '@/components/leads/LeadDetailModal';
import ImportExcelModal from '@/components/leads/ImportExcelModal';
import LeadAssignModal from '@/components/leads/LeadAssignModal';
import CreateLeadModal from '@/components/leads/CreateLeadModal';
import { useDateFilter } from '@/context/DateFilterContext';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';

function LeadsContent() {
  const searchParams = useSearchParams();
  const { fetchWithAuth, currentUser } = useAuth();
  const { dateFrom, dateTo, period, label, resetFilter } = useDateFilter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterSale, setFilterSale] = useState('ALL');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Modals state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [notification, setNotification] = useState('');

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterSource !== 'ALL') params.set('source', filterSource);
      if (filterSale !== 'ALL') params.set('saleId', filterSale);
      if (filterProduct !== 'ALL') params.set('productId', filterProduct);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetchWithAuth(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setSources(data.sources || []);
        setStatuses(data.statuses || []);
        setSales(data.sales || []);
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLeads();
    }
  }, [currentUser, filterStatus, filterSource, filterSale, filterProduct, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterSource !== 'ALL') params.set('source', filterSource);
      if (filterSale !== 'ALL') params.set('saleId', filterSale);
      if (filterProduct !== 'ALL') params.set('productId', filterProduct);

      const res = await fetchWithAuth(`/api/leads/export?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        const ws = XLSX.utils.json_to_sheet(result.data || []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KhachHang');
        XLSX.writeFile(wb, `DanhSachKhachHang_ZEN_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setNotification('Đã xuất dữ liệu ra file Excel thành công!');
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      console.error('Failed to export leads:', err);
    }
  };

  const getStatusBadge = (statusId: string) => {
    const st = statuses.find(s => s.id === statusId);
    const name = st?.name || (
      statusId === 'CONSULTING' ? 'Đang tư vấn' :
      statusId === 'WON' ? 'Đã chốt' :
      statusId === 'LOST' || statusId === 'CANCELLED' ? 'Đã hủy' :
      statusId === 'COMPLETED' ? 'Đã hoàn thành' :
      statusId === 'NEW' ? 'Mới tiếp nhận' : statusId
    );
    let colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    if (statusId === 'CONSULTING') colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (statusId === 'POTENTIAL') colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
    else if (statusId === 'WON') colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (statusId === 'LOST' || statusId === 'CANCELLED') colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (statusId === 'COMPLETED') colorClass = 'bg-teal-50 text-teal-700 border-teal-200';

    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap inline-flex items-center ${colorClass}`}>
        {name}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>Quản Lý Khách Hàng &amp; Lead</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>+ Thêm Lead</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
      <DatePeriodFilter />

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Tìm kiếm</label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tên, SĐT, Sản phẩm..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
              />
            </form>
          </div>

          {/* Product Filter */}
          <div>
            <label className="text-[11px] font-semibold text-emerald-700 mb-1 flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-600" />
              <span>Sản phẩm mua/quan tâm</span>
            </label>
            <select
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              className="w-full p-1.5 bg-emerald-50/50 border border-emerald-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">-- Tất cả sản phẩm ({products.length}) --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.price || 0)})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              {statuses.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nguồn khách</label>
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700"
            >
              <option value="ALL">-- Tất cả nguồn --</option>
              {sources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sale Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Sale phụ trách</label>
            <select
              value={filterSale}
              onChange={e => setFilterSale(e.target.value)}
              disabled={currentUser?.role === 'STAFF'}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700 disabled:opacity-60"
            >
              <option value="ALL">-- Tất cả Sale (Toàn cty) --</option>
              {sales.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id === currentUser?.id ? `${s.name} (Khách của tôi)` : s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Tags */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Tìm thấy <strong>{leads.length}</strong> khách hàng phù hợp</span>
          {(filterStatus !== 'ALL' || filterSource !== 'ALL' || filterSale !== 'ALL' || filterProduct !== 'ALL' || searchTerm || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setFilterStatus('ALL');
                setFilterSource('ALL');
                setFilterSale('ALL');
                setFilterProduct('ALL');
                setSearchTerm('');
                resetFilter();
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Leads Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                <th className="py-3.5 px-4 min-w-[180px]">Khách hàng</th>
                <th className="py-3.5 px-4 min-w-[140px]">Số điện thoại</th>
                <th className="py-3.5 px-4 min-w-[200px]">Sản phẩm mua / Quan tâm</th>
                <th className="py-3.5 px-4 min-w-[140px]">Nguồn</th>
                <th className="py-3.5 px-4 min-w-[120px]">Trạng thái</th>
                <th className="py-3.5 px-4 min-w-[130px] text-right">Đơn Hàng / Dư Nợ</th>
                <th className="py-3.5 px-4 min-w-[140px]">Sale phụ trách</th>
                <th className="py-3.5 px-4 min-w-[110px]">Liên hệ cuối</th>
                <th className="py-3.5 px-4 min-w-[100px]">Ngày tạo</th>
                <th className="py-3.5 px-4 text-right min-w-[80px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map(lead => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  {/* Name & Company */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 transition-colors">
                      {lead.fullName}
                    </div>
                    {currentUser?.role === 'SALE' && lead.assignedSaleId === currentUser.id && (
                      <div className="mt-1">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap inline-block">
                          Khách của bạn
                        </span>
                      </div>
                    )}
                    {currentUser?.role === 'SALE' && lead.assignedSaleId && lead.assignedSaleId !== currentUser.id && (
                      <div className="mt-1">
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium whitespace-nowrap inline-block">
                          Khách của {lead.assignedSaleName}
                        </span>
                      </div>
                    )}
                    {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId) && lead.company && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 whitespace-nowrap">
                        <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{lead.company}</span>
                      </div>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="py-3 px-4 align-middle whitespace-nowrap">
                    {canViewCustomerPersonalInfo(currentUser, lead.assignedSaleId) ? (
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="font-mono">{lead.phone}</span>
                      </div>
                    ) : (
                      <div
                        className="font-medium text-slate-500 flex items-center gap-1.5"
                        title="Số điện thoại ẩn theo phân quyền"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-mono text-slate-600">{maskPhoneNumber(lead.phone)}</span>
                      </div>
                    )}
                  </td>

                  {/* Products */}
                  <td className="py-3 px-4 align-middle max-w-[220px]">
                    {lead.productNames && lead.productNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
                        {lead.productNames.slice(0, 2).map((pname, idx) => (
                          <span
                            key={idx}
                            title={pname}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-[180px] whitespace-nowrap"
                          >
                            <Leaf className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{pname}</span>
                          </span>
                        ))}
                        {lead.productNames.length > 2 && (
                          <span
                            title={lead.productNames.slice(2).join(', ')}
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap"
                          >
                            +{lead.productNames.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Chưa gắn SP</span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="py-3 px-4 align-middle whitespace-nowrap">
                    <span className="text-slate-700 font-medium">{lead.source}</span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 align-middle whitespace-nowrap">
                    {getStatusBadge(lead.status)}
                  </td>

                  {/* Order & Debt */}
                  <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                    {(lead.totalAmount || 0) > 0 ? (
                      <div>
                        <div className="font-extrabold text-slate-900 font-futura text-xs">
                          {formatCurrency(lead.totalAmount || 0)}
                        </div>
                        {(lead.remainingDebt || 0) > 0 ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-0.5 inline-block">
                            Nợ: {formatCurrency(lead.remainingDebt || 0)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5 inline-block">
                            ✓ Đã tất toán
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Chưa có đơn</span>
                    )}
                  </td>

                  {/* Assigned Sale */}
                  <td className="py-3 px-4 align-middle whitespace-nowrap">
                    {lead.assignedSaleName ? (
                      <span className="font-semibold text-slate-800">{lead.assignedSaleName}</span>
                    ) : (
                      <span className="text-slate-400 italic">Chưa phân công</span>
                    )}
                  </td>

                  {/* Last Contact */}
                  <td className="py-3 px-4 align-middle whitespace-nowrap font-mono text-[11px] text-slate-600">
                    {formatDate(lead.lastContactAt)}
                  </td>

                  {/* Created Date */}
                  <td className="py-3 px-4 align-middle whitespace-nowrap font-mono text-[11px] text-slate-500">
                    {formatDate(lead.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Xem chi tiết 360°"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER') && (
                        <button
                          onClick={() => setAssigningLead(lead)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Phân công / Chuyển giao"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}


              {leads.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div>Không tìm thấy khách hàng nào phù hợp với bộ lọc.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Lead Detail 360 */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          products={products}
          onClose={() => setSelectedLeadId(null)}
          onUpdated={fetchLeads}
          onAssignClick={lead => {
            setAssigningLead(lead);
          }}
        />
      )}

      {/* Modal 2: Import Excel */}
      {showImportModal && (
        <ImportExcelModal
          onClose={() => setShowImportModal(false)}
          sales={sales}
          onImportSuccess={count => {
            setNotification(`Đã import thành công ${count} khách hàng vào hệ thống!`);
            fetchLeads();
            setTimeout(() => setNotification(''), 4000);
          }}
        />
      )}

      {/* Modal 3: Assign / Transfer Lead */}
      {assigningLead && (
        <LeadAssignModal
          lead={assigningLead}
          sales={sales}
          onClose={() => setAssigningLead(null)}
          onSuccess={() => {
            setNotification(`Đã chuyển giao khách hàng ${assigningLead.fullName} thành công!`);
            fetchLeads();
            setTimeout(() => setNotification(''), 4000);
          }}
        />
      )}

      {/* Modal 4: Create Lead */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          sources={sources}
          sales={sales}
          products={products}
          onSuccess={() => {
            setNotification('Thêm mới khách hàng thành công!');
            fetchLeads();
            setTimeout(() => setNotification(''), 4000);
          }}
        />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang tải danh sách khách hàng...</div>}>
      <LeadsContent />
    </Suspense>
  );
}
