'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Package,
  Award,
  Crown,
  Sparkles,
  Calendar,
  CheckCircle2,
  UserCheck,
  UserPlus,
  RefreshCw,
  Search,
  ArrowRight,
  X,
  Eye,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Layers,
  Info,
  ChevronDown,
  Check,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import SaleProductivityDetail from './SaleProductivityDetail';

export default function DirectorAnalyticsSuite() {
  const { fetchWithAuth, currentUser } = useAuth();
  const [period, setPeriod] = useState<'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('NONE');
  const [saleSearchKeyword, setSaleSearchKeyword] = useState<string>('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowPeriodDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth(`/api/director-analytics?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Keep existing selectedSaleId if still valid, or auto select top sale
        if (selectedSaleId && !json.saleDrilldowns?.[selectedSaleId]) {
          setSelectedSaleId(json.saleDonut?.[0]?.userId || null);
        } else if (!selectedSaleId && json.saleDonut?.length > 0) {
          setSelectedSaleId(json.saleDonut[0].userId);
        }
      }
    } catch (err) {
      console.error('Failed to load director analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex items-center justify-center min-h-[350px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-semibold text-slate-600">Đang tổng hợp dữ liệu phân tích chuyên sâu cho Giám Đốc...</div>
        </div>
      </div>
    );
  }

  const { comparison, saleDonut, productTop, customerRetention, saleDrilldowns } = data;
  const activeSaleDrilldown = selectedSaleId ? saleDrilldowns[selectedSaleId] : null;

  // Danh sách các đội nhóm duy nhất và số lượng nhân sự trong mỗi nhóm
  const teamListWithCount = (() => {
    if (!saleDonut || !Array.isArray(saleDonut)) return [];
    const map = new Map<string, number>();
    saleDonut.forEach((s: any) => {
      const tName = s.teamName?.trim() || 'Chưa phân nhóm';
      map.set(tName, (map.get(tName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([teamName, count]) => ({ teamName, count }));
  })();

  // Lọc danh sách nhân sự sale theo Team và Search Keyword
  const filteredSales = (!saleDonut || !Array.isArray(saleDonut))
    ? []
    : saleDonut.filter((s: any) => {
        const tName = s.teamName?.trim() || 'Chưa phân nhóm';
        const matchesTeam =
          selectedTeamFilter === 'NONE' || selectedTeamFilter === 'ALL'
            ? true
            : tName === selectedTeamFilter;

        const kw = saleSearchKeyword.trim().toLowerCase();
        const matchesSearch = !kw ||
          (s.name && s.name.toLowerCase().includes(kw)) ||
          (s.email && s.email.toLowerCase().includes(kw)) ||
          (tName.toLowerCase().includes(kw));

        return matchesTeam && matchesSearch;
      });

  const isExpanded = selectedTeamFilter !== 'NONE' || saleSearchKeyword.trim().length > 0;

  const periodsList: { id: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'; label: string; desc: string }[] = [
    { id: 'DAY', label: 'Hôm nay', desc: 'So với Hôm qua' },
    { id: 'WEEK', label: 'Tuần này', desc: 'So với Tuần trước' },
    { id: 'MONTH', label: 'Tháng này', desc: 'So với Tháng trước' },
    { id: 'QUARTER', label: 'Quý này', desc: 'So với Quý trước' },
    { id: 'YEAR', label: 'Năm nay', desc: 'So với Năm trước' },
  ];
  const currentPeriodObj = periodsList.find((p) => p.id === period) || periodsList[2];

  const RETENTION_COLORS = ['#3b82f6', '#10b981'];

  return (
    <div className="space-y-6">
      {/* EXECUTIVE HEADER BANNER */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-slate-900 shadow-xs border border-emerald-200/90 bg-gradient-to-r from-white via-white to-emerald-50/40 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Crown className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{currentUser?.role === 'ADMIN' ? 'BÁO CÁO PHÂN TÍCH CHUYÊN SÂU GIÁM ĐỐC' : 'BÁO CÁO PHÂN TÍCH DOANH THU & TĂNG TRƯỞNG'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Hệ Thống Phân Tích &amp; Biểu Đồ Đa Chiều Nâng Cao</span>
            </h2>
          </div>

          {/* Consolidated Period Selector Dropdown */}
          <div className="relative self-start lg:self-auto flex-shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 leading-tight">
                    <span className="text-slate-500">Kỳ so sánh:</span>
                    <span className="text-emerald-700 font-extrabold">{currentPeriodObj.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                    {currentPeriodObj.desc}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-1 ${showPeriodDropdown ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showPeriodDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowPeriodDropdown(false)}
                  aria-hidden="true"
                />
                <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Chọn kỳ báo cáo so sánh
                  </div>
                  {periodsList.map((p) => {
                    const isActive = period === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPeriod(p.id);
                          setShowPeriodDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">{p.label}</span>
                          <span className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {p.desc}
                          </span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-white flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 4 COMPARISON KPI METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Tile 1: Doanh thu & Tăng trưởng */}
          <div className="bg-slate-50/70 border border-slate-200/90 p-4 rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Doanh Thu ({comparison.current.label})</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatCurrency(comparison.current.revenue)}
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">Kỳ trước: {formatCurrency(comparison.previous.revenue)}</span>
              <span
                className={`inline-flex items-center gap-1 font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                  comparison.diff.revenueGrowth >= 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {comparison.diff.revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{comparison.diff.revenueGrowth >= 0 ? `+${comparison.diff.revenueGrowth}%` : `${comparison.diff.revenueGrowth}%`}</span>
              </span>
            </div>
          </div>

          {/* Tile 2: Số đơn chốt (Won Deals) */}
          <div className="bg-slate-50/70 border border-slate-200/90 p-4 rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Số Đơn Hàng Đã Chốt</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {comparison.current.wonCount} <span className="text-sm font-normal text-slate-500">đơn</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">Kỳ trước: {comparison.previous.wonCount} đơn</span>
              <span
                className={`inline-flex items-center gap-1 font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                  comparison.diff.wonCountGrowth >= 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {comparison.diff.wonCountGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{comparison.diff.wonCountGrowth >= 0 ? `+${comparison.diff.wonCountGrowth}%` : `${comparison.diff.wonCountGrowth}%`}</span>
              </span>
            </div>
          </div>

          {/* Tile 3: Giá trị trung bình đơn (AOV) */}
          <div className="bg-slate-50/70 border border-slate-200/90 p-4 rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Giá Trị Trung Bình / Đơn (AOV)</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatCurrency(comparison.current.avgDealSize)}
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">Kỳ trước: {formatCurrency(comparison.previous.avgDealSize)}</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                Chuẩn hóa đơn
              </span>
            </div>
          </div>

          {/* Tile 4: Tỷ lệ khách cũ quay lại */}
          <div className="bg-slate-50/70 border border-slate-200/90 p-4 rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Tỷ Lệ Khách Cũ Quay Lại</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {customerRetention.returningCustomerPercent}%
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                {customerRetention.returningCustomersCount}/{customerRetention.totalCustomers} khách thân thiết
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                Mới: {customerRetention.newCustomerPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRID 2 BIỂU ĐỒ TRÊN: 1. DOANH THU SO SÁNH (%) & 2. BẢN ĐỒ TRÒN SALE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BIỂU ĐỒ 1: SO SÁNH DOANH THU & TĂNG TRƯỞNG (%) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>1. Biểu Đồ So Sánh Doanh Thu Giữa 2 Kỳ ({comparison.periodLabel})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cột màu xanh là doanh thu kỳ hiện tại, cột xám là kỳ trước để so sánh % biến động.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-emerald-700">Tăng trưởng:</span>
              <span className={`font-mono ${comparison.diff.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {comparison.diff.revenueGrowth >= 0 ? `+${comparison.diff.revenueGrowth}%` : `${comparison.diff.revenueGrowth}%`}
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison.trendData} margin={{ top: 15, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeKey" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={val => `${val / 1000000}tr`}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    formatCurrency(Number(val)),
                    name === 'currentRevenue' ? `Kỳ hiện tại (${comparison.current.label})` : `Kỳ trước (${comparison.previous.label})`,
                  ]}
                  labelFormatter={label => `Thời gian: ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  formatter={value => (value === 'currentRevenue' ? `Kỳ hiện tại (${comparison.current.label})` : `Kỳ trước (${comparison.previous.label})`)}
                />
                <Bar dataKey="currentRevenue" name="currentRevenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="previousRevenue" name="previousRevenue" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: BẢN ĐỒ TRÒN CƠ CẤU DOANH THU SALE */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <span>2. Bản Đồ Tròn Cơ Cấu Doanh Thu Đội Ngũ Sale</span>
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Tổng {saleDonut.length} nhân sự
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Donut Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={saleDonut}
                    dataKey="currentRevenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {saleDonut.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: string, props: any) => [
                      `${formatCurrency(Number(val))} (${props.payload.percentage}%)`,
                      `${name} - ${props.payload.wonCount} deal chốt`,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sale Breakdown Table & Clickable Rows */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {saleDonut.map((s: any) => {
                const isSelected = selectedSaleId === s.userId;
                return (
                  <button
                    key={s.userId}
                    onClick={() => setSelectedSaleId(s.userId)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-1 ring-emerald-400/40'
                        : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 flex items-center gap-1 truncate">
                          <span>{s.name}</span>
                          {isSelected && <span className="text-[9px] bg-emerald-600 text-white px-1 rounded">Đang xem</span>}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {s.wonCount} deal chốt • Tăng: {s.growthPercent >= 0 ? `+${s.growthPercent}%` : `${s.growthPercent}%`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-black text-slate-900 font-mono">{formatCurrency(s.currentRevenue)}</div>
                      <div className="text-[11px] font-bold text-emerald-700">{s.percentage}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* GRID 2 BIỂU ĐỒ TIẾP THEO: 3. SẢN PHẨM BÁN CHẠY & 4. KHÁCH CŨ VS KHÁCH MỚI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BIỂU ĐỒ 3: SẢN PHẨM BÁN CHẠY NHẤT (HORIZONTAL BAR) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                <span>3. Sản Phẩm Bán Chạy &amp; Tỷ Lệ Tăng Trưởng</span>
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">Top {productTop.length} sản phẩm</span>
          </div>

          <div className="space-y-3">
            {productTop.map((prod: any, idx: number) => {
              const maxRev = Math.max(...productTop.map((p: any) => p.currentRevenue), 1);
              const barPercent = Math.max(15, Math.round((prod.currentRevenue / maxRev) * 100));

              return (
                <div key={prod.productId || idx} className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{prod.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Số lượng: <strong>{prod.currentQty}</strong></span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          prod.growthPercent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {prod.growthPercent >= 0 ? `+${prod.growthPercent}%` : `${prod.growthPercent}%`}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-200/70 h-5 rounded-lg overflow-hidden flex items-center">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-lg flex items-center justify-end pr-2 text-[10px] font-black text-white transition-all duration-700"
                      style={{ width: `${barPercent}%` }}
                    >
                      {formatCurrency(prod.currentRevenue)}
                    </div>
                  </div>
                </div>
              );
            })}

            {productTop.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Chưa có dữ liệu sản phẩm trong kỳ này.
              </div>
            )}
          </div>
        </div>

        {/* BIỂU ĐỒ 4: PHÂN TÍCH KHÁCH CŨ VS KHÁCH MỚI */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>4. Phân Tích Khách Hàng Cũ vs Khách Hàng Mới</span>
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
              <span>Tỷ lệ quay lại: <strong>{customerRetention.repeatPurchaseRate}%</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
            {/* Donut Chart Retention */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Khách Mới', value: customerRetention.newCustomersCount, revenue: customerRetention.newCustomerRevenue },
                      { name: 'Khách Cũ Quay Lại', value: customerRetention.returningCustomersCount, revenue: customerRetention.returningCustomerRevenue },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: string, props: any) => [
                      `${val} khách (${formatCurrency(props.payload.revenue)})`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Retention Stat Cards */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1">
                <div className="flex items-center justify-between text-blue-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Khách Hàng Mới</span>
                  </span>
                  <span className="text-base font-black text-blue-700">{customerRetention.newCustomerPercent}%</span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Số lượng: <strong>{customerRetention.newCustomersCount} khách</strong></span>
                  <span className="font-bold text-slate-800">{formatCurrency(customerRetention.newCustomerRevenue)}</span>
                </div>
                <div className="text-[10px] text-slate-500">Đơn trung bình: {formatCurrency(customerRetention.newCustomerAov)}</div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Khách Cũ Quay Lại</span>
                  </span>
                  <span className="text-base font-black text-emerald-700">{customerRetention.returningCustomerPercent}%</span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Số lượng: <strong>{customerRetention.returningCustomersCount} khách</strong></span>
                  <span className="font-bold text-slate-800">{formatCurrency(customerRetention.returningCustomerRevenue)}</span>
                </div>
                <div className="text-[10px] text-slate-500">Đơn trung bình: {formatCurrency(customerRetention.returningCustomerAov)}</div>
              </div>
            </div>
          </div>

          {/* Customer Log Table */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Khách hàng giao dịch trong kỳ:</span>
              <span className="text-slate-400 font-normal">SĐT và Tên đối soát minh bạch</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {customerRetention.customerList.map((c: any, idx: number) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <span className="font-mono text-slate-500">{c.phone}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        c.type === 'RETURNING'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {c.typeLabel}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 font-mono">
                    {formatCurrency(c.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 5: BIỂU ĐỒ NĂNG SUẤT HÀNG NGÀY & CHI TIẾT TỪNG BẠN SALE */}
      <div id="sale-productivity-section" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>5. Biểu Đồ Năng Suất Hàng Ngày &amp; Chi Tiết Từng Bạn Sale</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {currentUser?.role === 'LEADER' ? 'Thành viên đội nhóm của bạn' : 'Click Tên Sale'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentUser?.role === 'LEADER'
                ? `Giám sát chi tiết doanh thu tháng, hoa hồng, sản phẩm bán chạy và top khách thân thiết của ${saleDonut.length} bạn Sale trong nhóm.`
                : 'Theo dõi chi tiết doanh thu tháng, hoa hồng thực nhận, cơ cấu khách cũ/mới và top khách mua nhiều nhất của từng bạn Sale.'}
            </p>
          </div>

          {selectedSaleId && (
            <button
              onClick={() => setSelectedSaleId(null)}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Đóng biểu đồ chi tiết</span>
            </button>
          )}
        </div>

        {/* BỘ LỌC ĐỘI NHÓM & TÌM KIẾM NHÂN SỰ SALE - THIẾT KẾ GỌN GÀNG TIẾT KIỆM KHÔNG GIAN */}
        <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* 1. Ô tìm kiếm nhanh */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={saleSearchKeyword}
                onChange={(e) => setSaleSearchKeyword(e.target.value)}
                placeholder="Tìm tên, email bạn Sale..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 font-medium shadow-2xs"
              />
              {saleSearchKeyword && (
                <button
                  type="button"
                  onClick={() => setSaleSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Dropdown chọn Đội nhóm */}
            <div className="relative">
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="w-full appearance-none pl-8 pr-8 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="NONE">🏢 Chọn đội nhóm để hiển thị...</option>
                <option value="ALL">Tất cả đội nhóm ({saleDonut.length} bạn)</option>
                {teamListWithCount.map((t) => (
                  <option key={t.teamName} value={t.teamName}>
                    👥 {t.teamName} ({t.count} bạn)
                  </option>
                ))}
              </select>
              <Filter className="w-4 h-4 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 3. Dropdown chọn nhanh bạn Sale xem biểu đồ ngay */}
            <div className="relative">
              <select
                value={selectedSaleId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSaleId(val || null);
                  if (val) {
                    const sObj = saleDonut.find((s: any) => s.userId === val);
                    if (sObj && sObj.teamName) {
                      setSelectedTeamFilter(sObj.teamName);
                    }
                    const el = document.getElementById('sale-productivity-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full appearance-none pl-8 pr-8 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="">👤 Chọn nhanh bạn Sale xem biểu đồ...</option>
                {saleDonut.map((s: any) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name} ({s.teamName}) - {formatCurrency(s.currentRevenue)}
                  </option>
                ))}
              </select>
              <Users className="w-4 h-4 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* NẾU CHƯA CHỌN ĐỘI NHÓM VÀ CHƯA TÌM KIẾM: ẨN TOÀN BỘ CÁC THẺ SALE ĐỂ TRÁNH MẤT KHÔNG GIAN */}
        {!isExpanded ? (
          <div className="py-3 px-4 sm:px-5 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-600">
              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0 text-emerald-600">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600">
                Danh sách thẻ Sale đang được thu gọn. Hãy chọn <strong>Đội nhóm</strong> hoặc tìm <strong>Tên Sale</strong> ở trên để hiển thị.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTeamFilter('ALL')}
              className="self-start sm:self-auto px-3 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xem tất cả ({saleDonut.length} bạn)</span>
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          /* TRƯỜNG HỢP LỌC HOẶC TÌM KIẾM KHÔNG CÓ KẾT QUẢ */
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Không tìm thấy nhân sự phù hợp với bộ lọc
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn đội nhóm khác.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedTeamFilter('NONE');
                setSaleSearchKeyword('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              Đóng bộ lọc
            </button>
          </div>
        ) : (
          /* TRƯỜNG HỢP ĐÃ CHỌN ĐỘI NHÓM HOẶC CÓ TỪ KHÓA TÌM KIẾM -> HIỂN THỊ CÁC THẺ SALE */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <div>
                Đang hiển thị <strong className="text-slate-900 font-extrabold">{filteredSales.length}</strong> bạn Sale
                {selectedTeamFilter !== 'NONE' && selectedTeamFilter !== 'ALL' && (
                  <span className="ml-1 text-emerald-700 font-semibold">
                    thuộc nhóm <span className="underline">{selectedTeamFilter}</span>
                  </span>
                )}
                {saleSearchKeyword.trim() && (
                  <span className="ml-1 text-slate-700">
                    với từ khóa &quot;<strong>{saleSearchKeyword}</strong>&quot;
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTeamFilter('NONE');
                  setSaleSearchKeyword('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Thu gọn / Ẩn danh sách</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSales.map((s: any) => {
                const isSelected = selectedSaleId === s.userId;
                return (
                  <button
                    key={s.userId}
                    onClick={() => {
                      setSelectedSaleId(s.userId);
                      const el = document.getElementById('sale-productivity-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`text-left p-4 rounded-2xl border-2 transition-all group flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/70 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 hover:shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl shadow-xs">
                        Đang xem biểu đồ
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl text-white font-extrabold text-base flex items-center justify-center shadow-sm flex-shrink-0"
                        style={{ backgroundColor: s.color || '#10b981' }}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                          <span className="underline decoration-emerald-400/60 decoration-2 underline-offset-2">{s.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {s.teamName}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Doanh thu</div>
                        <div className="font-black text-slate-900 font-mono text-sm">{formatCurrency(s.currentRevenue)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Đơn chốt</div>
                        <div className="font-extrabold text-emerald-700">{s.wonCount} đơn ({s.percentage}%)</div>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Bấm vào tên để xem biểu đồ &amp; sản phẩm bán chạy</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* NẾU CHƯA CHỌN SALE: HIỂN THỊ HỘP NHẮC */}
        {!activeSaleDrilldown && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Chưa chọn nhân sự Sale để hiển thị biểu đồ
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy bấm chuột vào tên của bất kỳ bạn Sale nào ở danh sách trên để mở biểu đồ sóng lên xuống từng ngày, kiểm tra doanh thu và danh sách các sản phẩm bán chạy nhất!
            </p>
          </div>
        )}

        {/* NẾU ĐÃ CHỌN SALE: HIỂN THỊ CHI TIẾT ĐẦY ĐỦ VỚI HOA HỒNG, KHÁCH CŨ/MỚI, SẢN PHẨM BÁN CHẠY */}
        {activeSaleDrilldown && (
          <SaleProductivityDetail
            data={activeSaleDrilldown}
            saleList={saleDonut}
            selectedSaleId={selectedSaleId}
            onSelectSale={(id) => setSelectedSaleId(id)}
            onClose={() => setSelectedSaleId(null)}
          />
        )}
      </div>
    </div>
  );
}
