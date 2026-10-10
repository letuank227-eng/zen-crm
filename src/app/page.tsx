'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  Target,
  Download,
  Filter,
  ArrowDownRight,
  Package,
  Award,
  Sparkles,
  Calendar,
  Trophy,
  Lock,
  ShieldCheck,
  Crown,
  Building2,
  BarChart3,
} from 'lucide-react';
import { formatCurrency, maskSaleName } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';
import DirectorAnalyticsSuite from '@/components/dashboard/DirectorAnalyticsSuite';
import SalesRepDashboard from '@/components/dashboard/SalesRepDashboard';
import SalesManagerDashboard from '@/components/dashboard/SalesManagerDashboard';

export type DashboardTabType = 'analytics' | 'leaderboard' | 'operations' | 'sale-desk';

export default function DashboardReportsPage() {
  const { fetchWithAuth, currentUser } = useAuth();
  const { dateFrom, dateTo, period, label } = useDateFilter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<DashboardTabType>('analytics');

  useEffect(() => {
    if (currentUser?.role === 'LEADER') {
      setDashboardTab('operations');
    } else if (currentUser?.role === 'ADMIN') {
      setDashboardTab('analytics');
    } else if (currentUser?.role === 'SALE') {
      setDashboardTab('sale-desk');
    }
  }, [currentUser?.role]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const url = params.toString() ? `/api/reports?${params.toString()}` : '/api/reports';
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchReports();
    }
  }, [currentUser, dateFrom, dateTo]);

  const handleExportReport = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Sources
    const wsSources = XLSX.utils.json_to_sheet(
      data.sourceReport.map((s: any) => ({
        'Nguồn Lead': s.source,
        'Số Lead': s.leadsCount,
        'Số Đơn Chốt': s.wonCount,
        'Tỷ Lệ Chuyển Đổi (%)': `${s.conversionRate}%`,
        'Doanh Thu (₫)': s.revenue,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsSources, 'BaoCao_NguonLead');

    // Sheet 2: Sales
    const wsSales = XLSX.utils.json_to_sheet(
      data.salesLeaderboard.map((s: any) => ({
        'Nhân viên': s.name,
        'Team': s.teamName,
        'Doanh thu thực tế (₫)': s.actualRevenue,
        'Hoa hồng nhận (₫)': s.totalCommission || 0,
        'Mục tiêu (₫)': s.targetRevenue,
        'Tỷ lệ chốt (%)': `${s.winRate}%`,
        'Tiến độ KPI (%)': `${s.kpiProgress}%`,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsSales, 'BaoCao_Sale');

    // Sheet 3: Products
    const wsProducts = XLSX.utils.json_to_sheet(
      data.productReport.map((p: any) => ({
        'Sản phẩm': p.name,
        'Số lượng bán': p.quantity,
        'Doanh thu (₫)': p.revenue,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsProducts, 'BaoCao_SanPham');

    XLSX.writeFile(wb, `BaoCao_DoanhSo_ZEN_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2 text-slate-500 text-xs">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>Đang tổng hợp báo cáo và chỉ số kinh doanh...</div>
        </div>
      </div>
    );
  }

  if (currentUser?.role === 'STAFF') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cổng Thông Tin Vận Hành &amp; Kỹ Thuật</span>
          </div>
          <h1 className="text-xl font-bold">Xin chào, {currentUser.name}!</h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Chào mừng bạn đến với khu vực điều phối công việc kỹ thuật, thi công bể thủy sinh và quản lý đóng gói giao nhận đơn hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/activities"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800">Lịch Hẹn &amp; Task Kỹ Thuật</div>
              <div className="text-xs text-slate-500 mt-1">Xem lịch đi cắm bể, khảo sát không gian và lịch bảo dưỡng bể định kỳ.</div>
            </div>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span>Mở danh sách task</span> &rarr;
            </div>
          </a>

          <a
            href="/orders"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800">Đơn Hàng &amp; Đóng Gói</div>
              <div className="text-xs text-slate-500 mt-1">Kiểm tra danh mục cây thủy sinh cần xuất kho và chuyển trạng thái giao hàng.</div>
            </div>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span>Xem đơn hàng</span> &rarr;
            </div>
          </a>

          <a
            href="/products"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800">Danh Mục Cây Thủy Sinh</div>
              <div className="text-xs text-slate-500 mt-1">Tra cứu quy cách đóng gói, thông số ánh sáng, CO2 và cách chăm sóc cây.</div>
            </div>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span>Xem danh mục</span> &rarr;
            </div>
          </a>
        </div>
      </div>
    );
  }

  const { metrics, funnelStages, sourceReport, salesLeaderboard, productReport, top3Sales, teamReports = [] } = data;
  const isExecutive = currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER';

  if (currentUser?.role === 'SALE' && dashboardTab !== 'leaderboard') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Giao diện tối ưu theo vai trò Chuyên viên Kinh doanh
          </div>
          <button
            onClick={() => setDashboardTab('leaderboard')}
            className="text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <span>Xem Báo Cáo Phễu &amp; Thi Đua Toàn Cty</span>
            <span>&rarr;</span>
          </button>
        </div>
        <SalesRepDashboard reportData={data} />
      </div>
    );
  }

  // Cấu hình các Tab điều hướng theo vai trò (Giám Đốc vs Trưởng Phòng)
  const getTabs = () => {
    if (currentUser?.role === 'LEADER') {
      return [
        {
          id: 'operations' as const,
          label: 'Điều Hành Đội Nhóm',
          shortLabel: 'Điều Hành',
          icon: ShieldCheck,
          iconColor: 'text-blue-600',
          badge: 'Đơn chờ & Lead',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          id: 'leaderboard' as const,
          label: 'Vinh Danh & Hiệu Suất Sale',
          shortLabel: 'Thi Đua Sale',
          icon: Trophy,
          iconColor: 'text-amber-500',
          badge: 'Top 3 & KPI Nhóm',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
          id: 'analytics' as const,
          label: 'Phân Tích & Biểu Đồ Doanh Thu',
          shortLabel: 'Biểu Đồ',
          icon: BarChart3,
          iconColor: 'text-emerald-600',
          badge: 'Tăng trưởng & Xu hướng',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
      ];
    }

    // Default: ADMIN (Giám Đốc)
    return [
      {
        id: 'analytics' as const,
        label: 'Phân Tích & Biểu Đồ Doanh Thu',
        shortLabel: 'Biểu Đồ',
        icon: BarChart3,
        iconColor: 'text-emerald-600',
        badge: 'Tăng trưởng & Xu hướng',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      {
        id: 'leaderboard' as const,
        label: 'Vinh Danh & Đội Ngũ Sale',
        shortLabel: 'Thi Đua Sale',
        icon: Trophy,
        iconColor: 'text-amber-500',
        badge: 'Top 3 & KPI Toàn Cty',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      {
        id: 'operations' as const,
        label: 'Điều Hành & Phê Duyệt Đơn',
        shortLabel: 'Duyệt Đơn',
        icon: ShieldCheck,
        iconColor: 'text-blue-600',
        badge: 'Công nợ & Phân bổ Lead',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Return to Sales rep view button if sale switched to leaderboard */}
      {currentUser?.role === 'SALE' && dashboardTab === 'leaderboard' && (
        <div className="flex justify-start">
          <button
            onClick={() => setDashboardTab('sale-desk')}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <span>&larr;</span>
            <span>Quay Lại Bàn Làm Việc Sale</span>
          </button>
        </div>
      )}

      {/* Page Title, Role Badge & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          {isExecutive && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                currentUser?.role === 'ADMIN'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {currentUser?.role === 'ADMIN' ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>BAN GIÁM ĐỐC</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>TRƯỞNG PHÒNG KINH DOANH</span>
                  </>
                )}
              </span>
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>
              {currentUser?.role === 'ADMIN'
                ? 'Tổng Quan Điều Hành Doanh Nghiệp'
                : currentUser?.role === 'LEADER'
                ? 'Trung Tâm Điều Hành & Giám Sát Đội Ngũ'
                : 'Báo Cáo & Phân Tích Hiệu Suất'}
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            {currentUser?.role === 'ADMIN'
              ? 'Theo dõi doanh thu toàn diện, so sánh tăng trưởng qua các kỳ, tỷ trọng sản phẩm và thi đua đội ngũ.'
              : currentUser?.role === 'LEADER'
              ? 'Giám sát chỉ tiêu KPI toàn phòng, phân bổ Lead, phê duyệt đơn hàng chiết khấu và thi đua doanh số.'
              : 'Tổng quan doanh thu, phễu chuyển đổi qua từng giai đoạn, hiệu quả từng nguồn lead và sản phẩm.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={handleExportReport}
            className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 flex-shrink-0" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>
      </div>

      {/* Segmented Tab Navigation Bar cho Giám Đốc & Trưởng Phòng */}
      {isExecutive && (
        <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
          {getTabs().map(t => {
            const Icon = t.icon;
            const isActive = dashboardTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setDashboardTab(t.id)}
                className={`flex-1 min-w-[150px] sm:min-w-0 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 ring-1 ring-slate-950/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? t.iconColor : 'text-slate-400'}`} />
                <span>
                  <span className="sm:hidden">{t.shortLabel}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </span>
                <span className={`hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border ${t.badgeClass}`}>
                  {t.badge}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 1. TAB PHÂN TÍCH & BIỂU ĐỒ DOANH THU CHUYÊN SÂU */}
      {isExecutive && dashboardTab === 'analytics' && (
        <DirectorAnalyticsSuite />
      )}

      {/* 2. TAB ĐIỀU HÀNH ĐỘI NHÓM & PHÊ DUYỆT ĐƠN */}
      {isExecutive && dashboardTab === 'operations' && (
        <SalesManagerDashboard reportData={data} />
      )}

      {/* 3. TAB VINH DANH & BÁO CÁO HIỆU SUẤT SALE (HOẶC VAI TRÒ CHUNG) */}
      {(dashboardTab === 'leaderboard' || !isExecutive) && (
        <div className="space-y-6">
          {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
          <DatePeriodFilter />

          {/* 4 PRIMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Tổng Doanh Thu Thực Tế</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <span>{metrics.wonDealsCount} Deal đã chốt thành công</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Giá Trị Pipeline Đang Mở</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-700">
            {formatCurrency(metrics.totalOpenValue)}
          </div>
          <div className="text-[11px] text-slate-500">
            Dự kiến thu: <strong className="text-slate-800">{formatCurrency(metrics.weightedPipelineForecast)}</strong>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Tỷ Lệ Chốt Thành Công (Win Rate)</span>
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold text-purple-700">
            {metrics.conversionRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            Dựa trên tổng các deal đã đóng
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Giá Trị Trung Bình / Deal (AOV)</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-600">
            {formatCurrency(metrics.averageDealSize)}
          </div>
          <div className="text-[11px] text-slate-500">
            Trung bình mỗi đơn hàng thành công
          </div>
        </div>
      </div>

      {/* BẢNG VINH DANH DOANH THU - TOP 3 SALE XUẤT SẮC */}
      {top3Sales && top3Sales.length > 0 && (
        <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-xs border border-emerald-200/90 bg-gradient-to-br from-white via-white to-emerald-50/40 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                  <Trophy className="w-4 h-4 text-amber-700" />
                </div>
                <h2 className="text-base font-bold text-slate-900 tracking-wide flex items-center gap-2">
                  <span>Bảng Vinh Danh Doanh Thu — TOP 3 Sale Xuất Sắc</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold uppercase">
                    Leaderboard
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentUser?.role === 'SALE' ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Chế độ xem Sale: Chỉ hiển thị tên chính, họ và tên lót được bảo mật (<strong>******** Tên</strong>).
                  </span>
                ) : (
                  <span>
                    Chỉ số doanh thu thực tế được vinh danh từ các deal chốt thành công trong hệ thống.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                Cập nhật theo thời gian thực
              </span>
            </div>
          </div>

          {/* 3 Top Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3Sales.map((topSale: any, idx: number) => {
              const rank = topSale.rank || (idx + 1);
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;

              // Tên hiển thị: Sale chỉ thấy tên chính, họ tên lót thành ********
              // Giám đốc / Quản lý thấy đầy đủ họ tên
              const displayName =
                currentUser?.role === 'SALE'
                  ? (topSale.isSelf ? `${topSale.fullName || topSale.name} (Bạn)` : maskSaleName(topSale.fullName || topSale.name))
                  : (topSale.fullName || topSale.name);

              const badgeColors = isGold
                ? 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-xs'
                : isSilver
                ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-xs';

              const rankTitle = isGold ? 'QUÁN QUÂN DOANH SỐ' : isSilver ? 'Á QUÂN 1' : 'Á QUÂN 2';

              return (
                <div
                  key={topSale.userId || idx}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${badgeColors} ${
                    isGold ? 'ring-1 ring-amber-300' : ''
                  }`}
                >
                  {/* Top Rank Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black tracking-wider flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-800">
                      <span>TOP {rank}</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      {rankTitle}
                    </span>
                  </div>

                  {/* User Profile - Hiển thị tên, không hiển thị ảnh */}
                  <div className="mt-3 space-y-1">
                    <div className="font-extrabold text-base text-slate-900 truncate flex items-center gap-2">
                      <span className="tracking-wide">{displayName}</span>
                      {topSale.isSelf && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 font-semibold">
                          Bạn
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate font-medium">
                      {topSale.teamName || 'Team Kinh Doanh'}
                    </div>
                  </div>

                  {/* Revenue display */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Doanh Thu Đạt Được
                    </div>
                    <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
                      {formatCurrency(topSale.actualRevenue)}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Đã chốt: <strong className="text-slate-800">{topSale.wonCount || 0} Deal</strong></span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        {topSale.kpiProgress || 0}% KPI
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-amber-800 font-semibold text-[11px]">💰 Hoa hồng:</span>
                      <span className="font-extrabold text-amber-600 font-mono">
                        +{formatCurrency(topSale.totalCommission || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* THÔNG SỐ HIỆU SUẤT TỪNG NHÓM SALE (SALE TEAMS PERFORMANCE) */}
      {teamReports && teamReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Building2 className="w-4 h-4 text-blue-700" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-wide flex items-center gap-2">
                  <span>Hiệu Suất Kinh Doanh Từng Đội Nhóm (Sale Teams)</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full font-bold">
                    {teamReports.length} Nhóm
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi doanh thu thực tế, tiến độ KPI, tỷ lệ chốt và quy mô nhân sự của từng nhóm sale.
              </p>
            </div>
          </div>

          {/* Cards Grid cho từng nhóm */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamReports.map((t: any) => {
              const isOverTarget = t.kpiProgress >= 100;
              const isNearTarget = t.kpiProgress >= 70 && t.kpiProgress < 100;

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:shadow-md transition-all space-y-4"
                >
                  {/* Team Title & Leader */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 truncate flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>Trưởng nhóm:</span>
                        <span className="font-semibold text-slate-800">{t.leaderName}</span>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 flex-shrink-0">
                      {t.membersCount} nhân sự
                    </span>
                  </div>

                  {/* Revenue & KPI Target */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Doanh thu đạt được:</span>
                      <span className="font-extrabold text-emerald-600 font-mono text-sm">
                        {formatCurrency(t.actualRevenue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Chỉ tiêu (KPI):</span>
                      <span className="font-bold text-slate-700 font-mono">
                        {formatCurrency(t.targetRevenue)}
                      </span>
                    </div>

                    {/* KPI Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Tiến độ KPI:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            isOverTarget
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isNearTarget
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {t.kpiProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOverTarget
                              ? 'bg-emerald-500'
                              : isNearTarget
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(t.kpiProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deal Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-200/70">
                    <div>
                      <div className="text-slate-400 text-[10px]">Deal chốt</div>
                      <div className="font-bold text-slate-800 mt-0.5">{t.wonDealsCount} đơn</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Tỷ lệ chốt</div>
                      <div className="font-bold text-purple-700 mt-0.5">{t.winRate}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Lead nhận</div>
                      <div className="font-bold text-blue-700 mt-0.5">{t.leadsCount} lead</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP CLOSERS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Báo Cáo Hiệu Suất &amp; Tỷ Lệ Chốt Đơn Của Từng Sale
            </h3>
          </div>
          {currentUser?.role === 'SALE' ? (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Chế độ Sale: Ẩn họ và tên lót (******** Tên)
            </span>
          ) : (
            <span className="text-xs text-slate-500">Số liệu thực tế</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-3 px-3 text-center">Hạng Cty</th>
                <th className="py-3 px-4">Nhân sự</th>
                <th className="py-3 px-4">Đội ngũ</th>
                <th className="py-3 px-4 text-center">Số Deal Thắng</th>
                <th className="py-3 px-4 text-center">Tỷ Lệ Chốt (%)</th>
                <th className="py-3 px-4 text-right">Doanh Thu Đạt Được</th>
                <th className="py-3 px-4 text-right text-amber-700">Hoa Hồng Nhận</th>
                <th className="py-3 px-4 text-center">Tiến Độ KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesLeaderboard.map((rep: any) => (
                <tr key={rep.userId} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      rep.rank === 1
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : rep.rank === 2
                        ? 'bg-slate-200 text-slate-800 border border-slate-300'
                        : rep.rank === 3
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{rep.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className={currentUser?.role === 'SALE' && !rep.isSelf ? 'font-mono text-slate-700' : ''}>
                        {rep.name}
                      </span>
                      {rep.role === 'LEADER' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Leader
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{rep.teamName}</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-800">{rep.wonCount}</td>
                  <td className="py-3 px-4 text-center font-bold text-purple-700">{rep.winRate}%</td>
                  <td className="py-3 px-4 text-right font-extrabold text-emerald-600">{formatCurrency(rep.actualRevenue)}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-amber-600 font-mono">+{formatCurrency(rep.totalCommission || 0)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rep.kpiProgress}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}
