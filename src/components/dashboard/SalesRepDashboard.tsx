'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  Target,
  Award,
  Phone,
  PhoneCall,
  UserPlus,
  ShoppingCart,
  CalendarCheck,
  Clock,
  MapPin,
  ChevronRight,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Users,
  Activity,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Lead, Task } from '@/types/crm';
import SaleProductivityDetail from './SaleProductivityDetail';

interface SalesRepDashboardProps {
  reportData: any;
}

export default function SalesRepDashboard({ reportData }: SalesRepDashboardProps) {
  const router = useRouter();
  const { currentUser, fetchWithAuth } = useAuth();
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [myDrilldown, setMyDrilldown] = useState<any>(null);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(true);

  // Tìm thông số KPI cá nhân trong reportData
  const myPerformance = reportData?.salesLeaderboard?.find(
    (s: any) => s.userId === currentUser?.id || s.isSelf
  ) || {
    actualRevenue: 0,
    targetRevenue: currentUser?.targetRevenue || 120000000,
    kpiProgress: 0,
    wonCount: 0,
    winRate: 0,
    rank: 1,
  };

  // Tính thứ hạng chuẩn xác của bạn trong toàn bộ đội ngũ kinh doanh công ty
  const myRank = Number(myPerformance?.rank) || (
    reportData?.salesLeaderboard && reportData.salesLeaderboard.findIndex(
      (s: any) => s.userId === currentUser?.id || s.isSelf
    ) >= 0
      ? reportData.salesLeaderboard.findIndex((s: any) => s.userId === currentUser?.id || s.isSelf) + 1
      : 1
  );
  const totalCompanySales = reportData?.salesLeaderboard?.length || 3;

  useEffect(() => {
    const loadMyLeadsAndTasks = async () => {
      try {
        setIsLoadingLeads(true);
        // Tải leads được gán cho sale hiện tại
        const leadsRes = await fetchWithAuth('/api/leads?limit=50');
        if (leadsRes.ok) {
          const leadsJson = await leadsRes.json();
          const allLeads: Lead[] = leadsJson.leads || [];
          // Lọc ra các leads của sale này đang ở trạng thái cần tương tác gấp
          const urgent = allLeads.filter(
            l => l.assignedSaleId === currentUser?.id && (l.status === 'NEW' || l.status === 'CONTACTED')
          );
          setMyLeads(urgent.slice(0, 5));
        }

        // Tải công việc/lịch hẹn hôm nay
        const tasksRes = await fetchWithAuth('/api/activities?status=PENDING');
        if (tasksRes.ok) {
          const tasksJson = await tasksRes.json();
          const allTasks: Task[] = tasksJson.tasks || [];
          setMyTasks(allTasks.slice(0, 4));
        }

        // Tải số liệu phân tích & năng suất cá nhân của chính bạn Sale
        try {
          setIsLoadingDrilldown(true);
          const analyticsRes = await fetchWithAuth('/api/director-analytics?period=MONTH');
          if (analyticsRes.ok) {
            const analyticsJson = await analyticsRes.json();
            if (currentUser?.id && analyticsJson.saleDrilldowns?.[currentUser.id]) {
              setMyDrilldown(analyticsJson.saleDrilldowns[currentUser.id]);
            } else if (analyticsJson.saleDrilldowns && Object.values(analyticsJson.saleDrilldowns).length > 0) {
              setMyDrilldown(Object.values(analyticsJson.saleDrilldowns)[0]);
            }
          }
        } catch (analyticsErr) {
          console.error('Failed to load my analytics:', analyticsErr);
        } finally {
          setIsLoadingDrilldown(false);
        }
      } catch (err) {
        console.error('Error loading sales rep data:', err);
      } finally {
        setIsLoadingLeads(false);
      }
    };

    if (currentUser) {
      loadMyLeadsAndTasks();
    }
  }, [currentUser]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* 1. Header & Lời chào thân thiện */}
      <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-emerald-50/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Khu Vực Làm Việc Chuyên Viên Kinh Doanh</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Chào buổi sáng, {currentUser?.name || 'Bạn'}!
          </h1>
          <p className="text-xs text-slate-500">
            Hôm nay bạn có <strong className="text-emerald-700 font-bold">{myLeads.length} khách hàng</strong> cần liên hệ và <strong className="text-slate-800 font-bold">{myTasks.length} lịch hẹn</strong> cần hoàn thành.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => router.push('/leads?action=create')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ KPI Cá Nhân & Thứ Hạng Trong Tháng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI Tiến độ */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tiến Độ KPI Tháng Này</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(myPerformance.actualRevenue || 0)}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    / {formatCurrency(myPerformance.targetRevenue || 50000000)}
                  </span>
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {myPerformance.kpiProgress || 0}% Chỉ Tiêu
            </span>
          </div>

          {/* Thanh tiến độ */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(myPerformance.kpiProgress || 0, 100)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
            <span>Đã chốt: <strong className="text-slate-800 font-semibold">{myPerformance.wonCount || 0} đơn hàng</strong></span>
            <span className="text-amber-900 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <span>💰 Hoa hồng:</span>
              <strong className="text-amber-600 font-mono text-xs">
                +{formatCurrency(myPerformance.totalCommission || myDrilldown?.commission?.monthCommission || myDrilldown?.commission?.totalCommission || 0)}
              </strong>
            </span>
            <span>Tỷ lệ: <strong className="text-emerald-700 font-semibold">{myPerformance.winRate || 0}%</strong></span>
          </div>
        </div>

        {/* Thứ Hạng Thi Đua */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-2.5 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xếp Hạng Thi Đua</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
              myRank === 1 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
              myRank === 2 ? 'bg-slate-100 text-slate-700 border border-slate-300' :
              myRank === 3 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1.5">
              <span className={myRank === 1 ? 'text-amber-600 font-extrabold' : myRank === 2 ? 'text-slate-800 font-extrabold' : 'text-slate-900 font-bold'}>
                Hạng #{myRank}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {totalCompanySales} Sale
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Thứ hạng doanh số toàn công ty
            </div>
          </div>
          <div className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${
            myRank === 1 ? 'text-amber-800 bg-amber-50/90 border-amber-200 font-bold' :
            myRank === 2 ? 'text-blue-800 bg-blue-50/90 border-blue-200 font-semibold' :
            myRank === 3 ? 'text-emerald-800 bg-emerald-50/90 border-emerald-200 font-semibold' :
            'text-slate-700 bg-slate-50 border-slate-200'
          }`}>
            {myRank === 1 && '🏆 Quán quân - Đang dẫn đầu doanh số toàn công ty!'}
            {myRank === 2 && '🥈 Á quân 1 - Bám sát nút Quán quân, tăng tốc nào!'}
            {myRank === 3 && '🥉 Á quân 2 - Top 3 toàn công ty, giữ vững phong độ!'}
            {myRank > 3 && `🎯 Đang đứng thứ ${myRank} / ${totalCompanySales} - Tăng tốc bứt phá Top 3!`}
          </div>
        </div>
      </div>

      {/* 3. Thanh Thao Tác Nhanh 1-Chạm (Quick Actions) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => {
            if (myLeads.length > 0 && myLeads[0].phone) {
              window.location.href = `tel:${myLeads[0].phone}`;
            } else {
              router.push('/leads');
            }
          }}
          className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-3 transition-all cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">Gọi Khách Tiếp</div>
            <div className="text-[10px] text-emerald-100 truncate">1-chạm gọi điện</div>
          </div>
        </button>

        <button
          onClick={() => router.push('/leads?action=create')}
          className="p-3.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 transition-all cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">Thêm Lead Mới</div>
            <div className="text-[10px] text-slate-400 truncate">Nhập số & nhu cầu</div>
          </div>
        </button>

        <button
          onClick={() => router.push('/orders?action=create')}
          className="p-3.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 transition-all cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">Tạo Đơn Hàng</div>
            <div className="text-[10px] text-slate-400 truncate">Lên đơn & chiết khấu</div>
          </div>
        </button>

        <button
          onClick={() => router.push('/activities')}
          className="p-3.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 transition-all cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">Lịch Hẹn ({myTasks.length})</div>
            <div className="text-[10px] text-slate-400 truncate">Xem việc hôm nay</div>
          </div>
        </button>
      </div>

      {/* 4. Khách Hàng Cần Chăm Sóc Hôm Nay & Lịch Hẹn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cột trái: Khách hàng cần liên hệ (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Khách Hàng Cần Chăm Sóc Hôm Nay ({myLeads.length})
              </h3>
            </div>
            <button
              onClick={() => router.push('/leads')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Xem tất cả khách</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingLeads ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách khách hàng...</div>
          ) : myLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              Tuyệt vời! Bạn không có khách hàng nào bị trễ hạn chăm sóc hôm nay.
            </div>
          ) : (
            <div className="space-y-3">
              {myLeads.map(lead => (
                <div
                  key={lead.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">{lead.fullName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        lead.status === 'NEW'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {lead.status === 'NEW' ? 'Mới tiếp cận' : 'Đang tư vấn'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Nguồn: {lead.source || 'Facebook'}</span>
                      {lead.company && <span>Đơn vị: {lead.company}</span>}
                    </div>
                  </div>

                  {/* Quick actions for lead */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Gọi điện"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Gọi</span>
                      </a>
                    )}
                    {lead.phone && (
                      <a
                        href={`https://zalo.me/${lead.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Chat Zalo"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Zalo</span>
                      </a>
                    )}
                    <button
                      onClick={() => router.push(`/leads?selected=${lead.id}`)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cột phải: Lịch hẹn & Task hôm nay (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Lịch Hẹn Hôm Nay</span>
            </h3>
            <button
              onClick={() => router.push('/activities')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Xem tất cả
            </button>
          </div>

          {myTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              Chưa có lịch hẹn nào được ghi nhận cho hôm nay.
            </div>
          ) : (
            <div className="space-y-2.5">
              {myTasks.map(t => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="truncate">{t.title}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                      {t.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatDate(t.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip bán hàng */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-1 text-slate-700">
            <span className="font-bold text-emerald-800 block text-[11px] uppercase tracking-wider">Mẹo chốt đơn nhanh:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Khách hỏi mua cây cắt cắm thường cần thêm phân nước vi lượng và đèn quang hợp. Hãy đề xuất combo để tăng giá trị đơn hàng!
            </p>
          </div>
        </div>
      </div>

      {/* 5. BIỂU ĐỒ NĂNG SUẤT HÀNG NGÀY & PHÂN TÍCH HIỆU SUẤT CÁ NHÂN CỦA BẠN */}
      <div className="pt-2">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span>Biểu Đồ Năng Suất Hàng Ngày &amp; Hiệu Suất Cá Nhân Của Bạn</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi chi tiết doanh thu tháng, hoa hồng thực nhận, cơ cấu khách cũ/mới, sản phẩm bán chạy và top khách thân thiết nhất của riêng bạn.
              </p>
            </div>
          </div>

          {isLoadingDrilldown ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>Đang tổng hợp số liệu doanh thu và hoa hồng của bạn...</div>
            </div>
          ) : myDrilldown ? (
            <SaleProductivityDetail data={myDrilldown} isSelf={true} />
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Chưa có dữ liệu giao dịch phát sinh trong tháng này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
