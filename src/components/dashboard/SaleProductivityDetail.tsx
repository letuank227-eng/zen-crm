'use client';

import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Award,
  Sparkles,
  Calendar,
  CheckCircle2,
  UserCheck,
  UserPlus,
  Users,
  Percent,
  Activity,
  Flame,
  Clock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface SaleProductivityDetailProps {
  data: any;
  saleList?: any[];
  selectedSaleId?: string | null;
  onSelectSale?: (saleId: string) => void;
  onClose?: () => void;
  isSelf?: boolean;
}

export default function SaleProductivityDetail({
  data,
  saleList = [],
  selectedSaleId,
  onSelectSale,
  onClose,
  isSelf = false,
}: SaleProductivityDetailProps) {
  if (!data) return null;

  const {
    user,
    monthRevenue = 0,
    monthDealsCount = 0,
    totalDeals = 0,
    totalRevenue = 0,
    previousRevenue = 0,
    growthPercent = 0,
    avgRevenuePerDeal = 0,
    peakDay = 'Chưa có',
    customerStats = {
      totalCustomers: 0,
      newCustomersCount: 0,
      returningCustomersCount: 0,
      newCustomerRevenue: 0,
      returningCustomerRevenue: 0,
      retentionRate: 0,
    },
    topCustomers = [],
    commission = {
      totalCommission: 0,
      monthCommission: 0,
      avgRate: 8,
    },
    topProducts = [],
    timeline = [],
    allDeals = [],
  } = data;

  return (
    <div className="space-y-6 pt-1 animate-in fade-in slide-in-from-bottom-3 duration-300">

      {/* 2. 4 HERO KPI METRIC TILES (Doanh thu tháng, Hoa hồng, Khách cũ/mới, AOV) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Doanh Thu Tháng Này & Số Đơn */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Doanh Thu Tháng Này</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(monthRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
            <span className="text-[11px] text-slate-600">
              Đã chốt: <strong className="text-slate-900 font-bold">{monthDealsCount} đơn hàng</strong>
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              Kỳ này: {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Card 2: Hoa Hồng Thực Nhận Của Bạn Sale */}
        <div className="p-4 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 rounded-2xl border border-amber-200 shadow-xs space-y-2 hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span className="flex items-center gap-1.5">
              <span>💰 Hoa Hồng Thực Nhận</span>
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 font-extrabold">
              ~{commission.avgRate}% Doanh Số
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
            {formatCurrency(commission.monthCommission || commission.totalCommission)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-100 text-[11px]">
            <span className="text-slate-600">Hoa hồng kỳ này:</span>
            <strong className="text-amber-800 font-mono font-bold">{formatCurrency(commission.totalCommission)}</strong>
          </div>
        </div>

        {/* Card 3: Khách Cũ vs Khách Mới */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Tỷ Lệ Khách Cũ Quay Lại</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">
            {customerStats.retentionRate}%
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-[11px]">
            <span className="text-emerald-700 font-semibold">
              Mới: <strong>{customerStats.newCustomersCount}</strong>
            </span>
            <span className="text-blue-700 font-semibold">
              Quay lại: <strong>{customerStats.returningCustomersCount}</strong>
            </span>
            <span className="text-slate-400">
              Tổng: {customerStats.totalCustomers} khách
            </span>
          </div>
        </div>

        {/* Card 4: Giá Trị Trung Bình / Đơn & Đỉnh Doanh Số */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Trung Bình / Đơn (AOV)</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(avgRevenuePerDeal)}
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Ngày đạt đỉnh:</span>
            <span className="font-bold text-purple-700 truncate max-w-[140px]">{peakDay}</span>
          </div>
        </div>
      </div>

      {/* 3. BIỂU ĐỒ SÓNG DOANH THU & ĐƠN HÀNG HÀNG NGÀY */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Biểu Đồ Sóng Doanh Thu &amp; Tiến Độ Đơn Hàng Từng Ngày Của {user.name}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rê chuột vào các điểm sóng để xem số tiền doanh thu và chi tiết từng đơn hàng phát sinh trong ngày.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đỉnh: {peakDay}
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="saleWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={timeline.length > 20 ? 1 : 0}
              />
              <YAxis
                yAxisId="rev"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={val => `${val / 1000000}tr`}
              />
              <YAxis
                yAxisId="cnt"
                orientation="right"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={val => `${val} đơn`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dData = payload[0].payload;
                    const hasDeals = dData.dealsCount > 0;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/50 space-y-2 text-xs max-w-xs animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                          <span className="font-extrabold text-amber-300">
                            {dData.displayDate} ({dData.dayOfWeek})
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            hasDeals
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {dData.dealsCount} Đơn Chốt
                          </span>
                        </div>

                        <div className="text-sm font-black text-white font-mono">
                          Doanh Thu: {formatCurrency(dData.revenue)}
                        </div>

                        {hasDeals ? (
                          <div className="space-y-1.5 pt-1.5 border-t border-white/10 text-[11px]">
                            <div className="font-bold text-slate-300">Chi tiết đơn hàng:</div>
                            {dData.dealsList?.map((deal: any, i: number) => (
                              <div key={i} className="bg-white/10 p-2 rounded-xl space-y-1">
                                <div className="font-semibold text-emerald-200">{deal.title}</div>
                                <div className="text-[10px] text-slate-300">
                                  Khách: <strong className="text-white">{deal.customerName}</strong> ({deal.customerPhone})
                                </div>
                                <div className="text-[10px] text-amber-300 font-mono font-bold">
                                  Giá trị: {formatCurrency(deal.value)}
                                </div>
                                {deal.products && deal.products.length > 0 && (
                                  <div className="text-[10px] text-slate-300 pt-0.5 border-t border-white/10">
                                    Sản phẩm: {deal.products.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-white/10">
                            Không phát sinh đơn chốt trong ngày này
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area
                yAxisId="rev"
                type="monotone"
                dataKey="revenue"
                name="Doanh thu ngày (VNĐ)"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#saleWaveGrad)"
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 7 }}
              />
              <Line
                yAxisId="cnt"
                type="monotone"
                dataKey="dealsCount"
                name="Số đơn chốt"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#8b5cf6' }}
                activeDot={{ r: 7 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. PHÂN KHU 2 CỘT: 
          CỘT TRÁI: BIỂU ĐỒ SẢN PHẨM BÁN CHẠY & HOA HỒNG
          CỘT PHẢI: PHÂN TÍCH KHÁCH CŨ VS MỚI & TOP KHÁCH MUA NHIỀU NHẤT 
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CỘT 1: SẢN PHẨM BÁN CHẠY NHẤT & HOA HỒNG TỪNG SẢN PHẨM */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Sản Phẩm Bán Chạy &amp; Hoa Hồng Từng Sản Phẩm</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Các mặt hàng mang lại doanh thu và hoa hồng cao nhất cho {user.name}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex-shrink-0">
              {topProducts.length} sản phẩm
            </span>
          </div>

          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p: any, idx: number) => (
                <div
                  key={p.productId || idx}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">{p.productName}</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex-shrink-0">
                      Đã bán: {p.quantity} {p.quantity > 5 ? 'chậu' : 'gói/bộ'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-500">
                        Doanh thu: <strong className="text-slate-900 font-mono">{formatCurrency(p.revenue)}</strong>
                      </div>
                      <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +HH: {formatCurrency(p.commissionEarned || 0)}
                      </div>
                    </div>

                    {/* Progress Bar for revenue share */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(p.percentage || 0, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right text-slate-400 font-medium">
                      Chiếm {p.percentage}% tổng doanh thu của {user.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Chưa có dữ liệu sản phẩm bán ra của bạn Sale này trong kỳ.
            </div>
          )}
        </div>

        {/* CỘT 2: KHÁCH CŨ VS MỚI & TOP KHÁCH MUA HÀNG NHIỀU NHẤT */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Khách Cũ vs Khách Mới &amp; Top Khách Thân Thiết</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Các khách hàng mang lại doanh thu lớn và quay lại mua nhiều nhất
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 flex-shrink-0">
              Quay lại: {customerStats.retentionRate}%
            </span>
          </div>

          {/* 2 Khối Tóm Tắt Khách Mới vs Khách Cũ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-1">
              <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Khách Mới</span>
                </span>
                <span className="text-sm font-black text-blue-700">{customerStats.newCustomersCount} khách</span>
              </div>
              <div className="text-xs font-bold text-slate-900 font-mono">
                {formatCurrency(customerStats.newCustomerRevenue)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
              <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Khách Cũ Quay Lại</span>
                </span>
                <span className="text-sm font-black text-emerald-700">{customerStats.returningCustomersCount} khách</span>
              </div>
              <div className="text-xs font-bold text-slate-900 font-mono">
                {formatCurrency(customerStats.returningCustomerRevenue)}
              </div>
            </div>
          </div>

          {/* Danh Sách TOP Khách Hàng Thân Thiết Nhất Của Bạn Sale */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Khách hàng chi tiêu &amp; mua lại nhiều nhất:
            </div>
            {topCustomers.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {topCustomers.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all flex items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-2 truncate">
                        <span>{c.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                            c.isReturning
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {c.typeLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        <span>{c.phone}</span>
                        <span>• Đã mua: <strong className="text-slate-800 font-sans">{c.totalOrders} đơn</strong></span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-slate-900 font-mono text-xs">
                        {formatCurrency(c.totalRevenue)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Gần nhất: {c.lastOrderDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                Chưa có dữ liệu khách hàng thân thiết.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. BẢNG DANH SÁCH CHI TIẾT TẤT CẢ ĐƠN HÀNG HOÀN THÀNH KÈM HOA HỒNG */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Danh Sách Đơn Hàng Hoàn Thành &amp; Hoa Hồng Từng Đơn ({allDeals.length} đơn)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Chi tiết giá trị đơn hàng và hoa hồng thực tế được tính cho từng giao dịch.
            </p>
          </div>
          <div className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            Tổng hoa hồng: <strong className="font-mono text-sm">{formatCurrency(commission.totalCommission)}</strong>
          </div>
        </div>

        {allDeals.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3.5">Tên Đơn / Cơ Hội</th>
                  <th className="py-3 px-3.5">Khách Hàng</th>
                  <th className="py-3 px-3.5">Số Điện Thoại</th>
                  <th className="py-3 px-3.5">Sản Phẩm Đã Mua</th>
                  <th className="py-3 px-3.5">Ngày Chốt</th>
                  <th className="py-3 px-3.5 text-right">Giá Trị Đơn</th>
                  <th className="py-3 px-3.5 text-right">Hoa Hồng Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDeals.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-800">{d.title}</td>
                    <td className="py-3 px-3.5 font-medium text-slate-700">{d.customerName}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">{d.customerPhone}</td>
                    <td className="py-3 px-3.5 text-slate-500 max-w-xs truncate">{d.products?.join(', ') || '-'}</td>
                    <td className="py-3 px-3.5 text-slate-500">{d.date}</td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900 font-mono">
                      {formatCurrency(d.value)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-emerald-600 font-mono bg-emerald-50/40">
                      +{formatCurrency(d.commission || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            Chưa có đơn hàng hoàn thành nào trong kỳ này.
          </div>
        )}
      </div>
    </div>
  );
}
