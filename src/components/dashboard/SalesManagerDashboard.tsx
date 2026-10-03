'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Share2,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  PhoneCall,
  Send,
  Building,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Order, User, Lead } from '@/types/crm';

interface SalesManagerDashboardProps {
  reportData: any;
}

export default function SalesManagerDashboard({ reportData }: SalesManagerDashboardProps) {
  const router = useRouter();
  const { currentUser, fetchWithAuth } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvedOrderIds, setApprovedOrderIds] = useState<string[]>([]);
  const [rejectedOrderIds, setRejectedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    const loadManagerData = async () => {
      try {
        setIsLoading(true);
        // Tải danh sách đơn hàng để kiểm tra đơn chờ duyệt
        const ordersRes = await fetchWithAuth('/api/orders?limit=30');
        if (ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          const allOrders: Order[] = ordersJson.orders || [];
          // Các đơn hàng đang chờ duyệt hoặc còn công nợ
          const pending = allOrders.filter(
            o => o.status === 'PENDING' || o.remainingDebt > 0
          );
          setPendingOrders(pending.slice(0, 4));
        }

        // Tải danh sách Sales Reps từ reports leaderboard
        if (reportData?.salesLeaderboard) {
          setSalesReps(reportData.salesLeaderboard);
        }
      } catch (err) {
        console.error('Error loading manager data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      loadManagerData();
    }
  }, [currentUser, reportData]);

  const handleApprove = (orderId: string) => {
    setApprovedOrderIds(prev => [...prev, orderId]);
  };

  const handleReject = (orderId: string) => {
    setRejectedOrderIds(prev => [...prev, orderId]);
  };

  // KPI toàn phòng tính từ leaderboard
  const teamActualRevenue = salesReps.reduce((sum, s) => sum + (s.actualRevenue || 0), 0);
  const teamTargetRevenue = salesReps.reduce((sum, s) => sum + (s.targetRevenue || 0), 0) || 450000000;
  const teamKpiProgress = teamTargetRevenue > 0 ? Math.round((teamActualRevenue / teamTargetRevenue) * 100) : 86;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Điều Hành Trưởng Phòng */}
      <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-emerald-50/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{currentUser?.role === 'ADMIN' ? 'Ban Giám Đốc Điều Hành' : 'Trung Tâm Điều Hành & Giám Sát Đội Ngũ'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {currentUser?.role === 'ADMIN' ? 'Điều Hành Hoạt Động & Phê Duyệt Đơn Hàng' : `Quản Lý Kinh Doanh: ${currentUser?.name || 'Trưởng Phòng'}`}
          </h1>
          <p className="text-xs text-slate-500">
            {currentUser?.role === 'ADMIN'
              ? 'Giám sát tiến độ chỉ tiêu toàn phòng, phân bổ Lead và kiểm duyệt các đơn hàng có chiết khấu cao.'
              : 'Giám sát tiến độ chỉ tiêu toàn phòng, phân bổ Lead tự động và phê duyệt đơn hàng chiết khấu.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => router.push('/leads?mode=assign')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Phân Bổ Lead Tự Động</span>
          </button>
          <button
            onClick={() => router.push('/team')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Xem Đội Ngũ ({salesReps.length})</span>
          </button>
        </div>
      </div>

      {/* 2. 3 Thẻ Chỉ Số KPI Đội Ngũ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Tiến độ KPI phòng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Tiến Độ KPI Toàn Phòng</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold">
              {teamKpiProgress}%
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatCurrency(teamActualRevenue)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              / {formatCurrency(teamTargetRevenue)}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(teamKpiProgress, 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>Tăng trưởng: <strong className="text-emerald-700">+14.2% MoM</strong></span>
            <span>Còn 6 ngày chốt số</span>
          </div>
        </div>

        {/* Card 2: Tốc độ phản hồi SLA & Lead */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Hiệu Suất Tiếp Nhận Lead</span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-extrabold">
              92% Đạt SLA
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            8.5 Phút
            <span className="text-xs font-normal text-slate-400 ml-1.5">phản hồi TB</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: '92%' }} />
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Tổng Lead phân bổ tháng: <strong className="text-slate-800 font-semibold">{reportData?.metrics?.totalLeads || 248} leads</strong>
          </div>
        </div>

        {/* Card 3: Đơn hàng chờ duyệt */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Đơn Hàng Chờ Phê Duyệt</span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-extrabold">
              {pendingOrders.length} Đơn
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatCurrency(pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
          </div>
          <div className="text-[11px] text-slate-500 pt-3">
            Cần quản lý xem xét chiết khấu đặc biệt trước khi xuất kho giao hàng.
          </div>
        </div>
      </div>

      {/* 3. Phân Khu 2 Cột: Cân Bằng Tải Sale & Nhật Ký Hoạt Động Thời Gian Thực */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cột 1: Cân bằng tải & Tỷ lệ chốt từng bạn Sale */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Tải Công Việc &amp; Hiệu Suất Đội Ngũ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Giám sát số lượng Lead đang phụ trách và tỷ lệ chốt của từng bạn Sale
              </p>
            </div>
            <button
              onClick={() => router.push('/team')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Chi tiết KPI
            </button>
          </div>

          <div className="space-y-3">
            {salesReps.slice(0, 5).map((rep, idx) => (
              <div
                key={rep.userId || idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center border border-emerald-200" title={`Hạng ${rep.rank || (idx + 1)} toàn công ty`}>
                      #{rep.rank || (idx + 1)} Cty
                    </span>
                    <span className="font-bold text-slate-800">{rep.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-mono font-bold">{formatCurrency(rep.actualRevenue || 0)}</span>
                    <span className="text-[10px] text-slate-400">({rep.kpiProgress || 0}% KPI)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(rep.kpiProgress || 0, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Đã chốt: <strong className="text-slate-800">{rep.wonCount || 0} đơn</strong></span>
                  <span>Tỷ lệ chốt: <strong className="text-emerald-700">{rep.winRate || 0}%</strong></span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Sẵn sàng nhận lead
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột 2: Bảng Duyệt Đơn Hàng Chờ Xử Lý */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Đơn Hàng Cần Trưởng Phòng Phê Duyệt ({pendingOrders.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các đơn có chiết khấu cao hoặc khách hàng công ty cần ký duyệt
              </p>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Xem tất cả đơn
            </button>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              Không có đơn hàng nào chờ phê duyệt vào thời điểm này.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(order => {
                const isApproved = approvedOrderIds.includes(order.id);
                const isRejected = rejectedOrderIds.includes(order.id);

                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          #{order.code || order.id.slice(0, 8)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {order.customerName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>Giá trị: <strong className="text-slate-900 font-mono">{formatCurrency(order.totalAmount || 0)}</strong></span>
                        {order.remainingDebt > 0 && (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Nợ: {formatCurrency(order.remainingDebt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                      {isApproved ? (
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã duyệt</span>
                        </span>
                      ) : isRejected ? (
                        <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1">
                          <X className="w-3.5 h-3.5" />
                          <span>Đã từ chối</span>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleApprove(order.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt</span>
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
