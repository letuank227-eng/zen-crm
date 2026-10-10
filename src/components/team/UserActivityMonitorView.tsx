'use client';

import React, { useState } from 'react';
import {
  Clock,
  Activity,
  Users,
  Smartphone,
  Laptop,
  CalendarDays,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Radio,
  Flame,
} from 'lucide-react';
import { formatDurationSeconds } from '@/lib/utils';

interface UserActivityMonitorViewProps {
  activityData: {
    date: string;
    summary: {
      onlineNowCount: number;
      activeOnDateCount: number;
      totalUsers: number;
      totalCompanySeconds: number;
      totalCompanyDurationFormatted: string;
    };
    users: any[];
  } | null;
  activityDate: string;
  setActivityDate: (date: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function UserActivityMonitorView({
  activityData,
  activityDate,
  setActivityDate,
  isLoading,
  onRefresh,
}: UserActivityMonitorViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ONLINE' | 'ACTIVE_TODAY'>('ALL');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  React.useEffect(() => {
    if (activityData) {
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN'));
    }
  }, [activityData]);

  const getTodayVn = () => {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 10);
  };

  const getYesterdayVn = () => {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 10);
  };

  const formatVnDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateString;
    }
  };

  const formatTimeOnly = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const usersList = activityData?.users || [];

  const filteredUsers = usersList.filter(u => {
    if (filterType === 'ONLINE' && !u.isOnline) return false;
    if (filterType === 'ACTIVE_TODAY' && (u.dateStats?.totalSeconds || 0) <= 0) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchTeam = u.teamName?.toLowerCase().includes(q);
      return matchName || matchEmail || matchTeam;
    }
    return true;
  });

  const avgSeconds =
    activityData?.summary?.activeOnDateCount && activityData.summary.activeOnDateCount > 0
      ? Math.round(
          (activityData.summary.totalCompanySeconds || 0) / activityData.summary.activeOnDateCount
        )
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Đang Online Realtime */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Đang Trực Tuyến
            </span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {activityData?.summary?.onlineNowCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {activityData?.summary?.totalUsers ?? usersList.length} nhân sự
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Đang mở app và thao tác realtime</span>
          </p>
        </div>

        {/* Card 2: Số nhân sự có vào app ngày này */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Có Vào App Ngày Này
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {activityData?.summary?.activeOnDateCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {activityData?.summary?.totalUsers ?? usersList.length} nhân sự
            </span>
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">
            {activityData?.summary?.totalUsers
              ? `${Math.round(
                  ((activityData.summary.activeOnDateCount || 0) /
                    activityData.summary.totalUsers) *
                    100
                )}% tổng nhân sự ngày ${formatVnDateDisplay(activityDate)}`
              : '0% tổng nhân sự'}
          </p>
        </div>

        {/* Card 3: Tổng thời gian sử dụng toàn công ty */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Thời Gian Dùng
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {activityData?.summary?.totalCompanyDurationFormatted || '0 phút'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tổng cộng toàn bộ nhân sự trong ngày
          </p>
        </div>

        {/* Card 4: Trung bình thời gian mỗi người */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              TB Thời Gian / Người
            </span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {formatDurationSeconds(avgSeconds)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tính trên các nhân sự có đăng nhập vào app
          </p>
        </div>
      </div>

      {/* 2. TOOLBAR: DATE SELECTION & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Quick Date Buttons + Custom Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Xem ngày:</span>
          </span>

          <button
            type="button"
            onClick={() => setActivityDate(getTodayVn())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activityDate === getTodayVn()
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Hôm nay
          </button>

          <button
            type="button"
            onClick={() => setActivityDate(getYesterdayVn())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activityDate === getYesterdayVn()
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Hôm qua
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <span className="text-[11px] text-slate-500 font-medium">Chọn ngày khác:</span>
            <input
              type="date"
              value={activityDate}
              onChange={e => e.target.value && setActivityDate(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              title="Làm mới dữ liệu tức thì"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
              <span>Làm Mới</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tự động cập nhật 15s</span>
            </span>
          </div>
        </div>

        {/* Right: Search and Presence Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, team..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả nhân sự ({usersList.length})</option>
            <option value="ONLINE">Đang online ({activityData?.summary?.onlineNowCount || 0})</option>
            <option value="ACTIVE_TODAY">
              Có vào app ngày này ({activityData?.summary?.activeOnDateCount || 0})
            </option>
          </select>
        </div>
      </div>

      {/* 3. DETAILED TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Chi Tiết Thời Gian Sử Dụng App Ngày {formatVnDateDisplay(activityDate)}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {lastUpdatedTime && (
              <span className="text-[11px] text-slate-500">
                Lần đồng bộ: <strong className="text-slate-800 font-mono">{lastUpdatedTime}</strong>
              </span>
            )}
            <span className="font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              {filteredUsers.length} / {usersList.length} nhân sự
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Nhân sự</th>
                <th className="py-3 px-4 whitespace-nowrap">Trạng thái Realtime</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[220px]">
                  Thời gian dùng ({formatVnDateDisplay(activityDate)})
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Số phiên mở app</th>
                <th className="py-3 px-4 whitespace-nowrap">Lần đầu vào app</th>
                <th className="py-3 px-4 whitespace-nowrap">Lần cuối hoạt động</th>
                <th className="py-3 px-4 whitespace-nowrap">Thiết bị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Không tìm thấy nhân sự phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const stats = u.dateStats || {};
                  const totalSec = stats.totalSeconds || 0;
                  const workdayPct = stats.workdayPercentage || 0;

                  // Màu thanh tiến độ dựa theo thời gian làm việc
                  let barColor = 'bg-slate-300';
                  if (workdayPct >= 50) barColor = 'bg-emerald-500';
                  else if (workdayPct >= 25) barColor = 'bg-blue-500';
                  else if (workdayPct > 0) barColor = 'bg-amber-500';

                  const isMobile =
                    u.currentDevice &&
                    (u.currentDevice.includes('iPhone') ||
                      u.currentDevice.includes('iOS') ||
                      u.currentDevice.includes('Android'));

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Cột 1: Nhân sự */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              u.name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full font-semibold text-[9px] border whitespace-nowrap inline-block ${
                                  u.role === 'ADMIN'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : u.role === 'LEADER'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {u.role === 'ADMIN'
                                  ? 'Admin'
                                  : u.role === 'LEADER'
                                  ? 'Leader'
                                  : 'Sale'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {u.email} • {u.teamName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Trạng thái Realtime */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {u.presenceStatus === 'ONLINE' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span>Đang Online</span>
                            </span>
                          ) : u.presenceStatus === 'AWAY' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-semibold text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>{u.presenceText}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>{u.presenceText}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Tổng thời gian vào app trong ngày */}
                      <td className="py-3 px-4">
                        {totalSec > 0 ? (
                          <div className="space-y-1.5 max-w-[240px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-emerald-700 font-mono text-sm">
                                {stats.formattedDuration}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ~{workdayPct}% chuẩn 8h
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.min(100, Math.max(5, workdayPct))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
                            Chưa vào app ngày này
                          </span>
                        )}
                      </td>

                      {/* Cột 4: Số phiên mở app */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {stats.sessionsCount > 0 ? (
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {stats.sessionsCount} lần
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Cột 5: Lần đầu vào app trong ngày */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                        {formatTimeOnly(stats.firstActiveAt)}
                      </td>

                      {/* Cột 6: Lần cuối hoạt động */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                        {formatTimeOnly(stats.lastActiveAtOnDate || u.lastActiveAt)}
                      </td>

                      {/* Cột 7: Thiết bị */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5">
                          {isMobile ? (
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          )}
                          <span className="text-[11px] font-medium truncate max-w-[120px]">
                            {u.currentDevice || 'Trình duyệt Web'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
