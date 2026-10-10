'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Users,
  CalendarDays,
  RefreshCw,
  Search,
  Radio,
  ChevronDown,
  ChevronUp,
  Filter,
  Eye,
  EyeOff,
  Layers,
  List,
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatDurationSeconds } from '@/lib/utils';

interface TeamItem {
  id: string;
  name: string;
}

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
  teams?: TeamItem[];
}

export default function UserActivityMonitorView({
  activityData,
  activityDate,
  setActivityDate,
  isLoading,
  onRefresh,
  teams = [],
}: UserActivityMonitorViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'ONLINE' | 'ACTIVE_TODAY'>('ALL');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  
  // Nút thu gọn / ẩn bớt cards thống kê để tiết kiệm không gian theo yêu cầu người dùng
  const [showSummaryCards, setShowSummaryCards] = useState<boolean>(true);

  // Chế độ xem: GROUPED (Theo từng nhóm - gập mở gọn gàng) hoặc FLAT (Bảng phẳng tổng hợp)
  const [viewMode, setViewMode] = useState<'GROUPED' | 'FLAT'>('GROUPED');

  // Trạng thái thu gọn của từng nhóm (teamId -> boolean: true là đang thu gọn)
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});

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

  // Danh sách các nhóm thực tế xuất hiện trong dữ liệu
  const teamOptions = useMemo(() => {
    const namesSet = new Set<string>();
    teams.forEach(t => {
      if (t.name) namesSet.add(t.name.trim());
    });
    usersList.forEach(u => {
      if (u.teamName) namesSet.add(u.teamName.trim());
    });
    return Array.from(namesSet).sort();
  }, [teams, usersList]);

  // Lọc danh sách nhân sự
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      // 1. Lọc theo trạng thái
      if (filterType === 'ONLINE' && !u.isOnline) return false;
      if (filterType === 'ACTIVE_TODAY' && (u.dateStats?.totalSeconds || 0) <= 0) return false;

      // 2. Lọc theo Đội Nhóm
      if (selectedTeamFilter !== 'ALL') {
        const uTeam = (u.teamName || 'Chưa phân team').trim();
        if (uTeam !== selectedTeamFilter.trim()) return false;
      }

      // 3. Lọc theo Từ khóa tìm kiếm (tên, email, số điện thoại)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchTeam = u.teamName?.toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchTeam;
      }
      return true;
    });
  }, [usersList, filterType, selectedTeamFilter, searchTerm]);

  // Gom nhóm theo từng Team
  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      {
        teamName: string;
        users: any[];
        onlineCount: number;
        totalSeconds: number;
      }
    > = {};

    filteredUsers.forEach(u => {
      const groupKey = (u.teamName || (u.role === 'ADMIN' ? 'Ban Giám Đốc' : 'Chưa phân team')).trim();
      if (!groups[groupKey]) {
        groups[groupKey] = {
          teamName: groupKey,
          users: [],
          onlineCount: 0,
          totalSeconds: 0,
        };
      }
      groups[groupKey].users.push(u);
      if (u.isOnline) {
        groups[groupKey].onlineCount += 1;
      }
      groups[groupKey].totalSeconds += u.dateStats?.totalSeconds || 0;
    });

    // Sắp xếp các nhóm: Nhóm có nhiều người online lên trước, sau đó tới Ban Giám Đốc
    return Object.values(groups).sort((a, b) => {
      if (a.onlineCount !== b.onlineCount) return b.onlineCount - a.onlineCount;
      return b.users.length - a.users.length;
    });
  }, [filteredUsers]);

  const toggleTeamCollapse = (teamName: string) => {
    setCollapsedTeams(prev => ({
      ...prev,
      [teamName]: !prev[teamName],
    }));
  };

  const avgSeconds =
    activityData?.summary?.activeOnDateCount && activityData.summary.activeOnDateCount > 0
      ? Math.round(
          (activityData.summary.totalCompanySeconds || 0) / activityData.summary.activeOnDateCount
        )
      : 0;

  // Render bảng danh sách user
  const renderUserTable = (users: any[]) => {
    if (users.length === 0) {
      return (
        <div className="py-8 text-center text-slate-400 text-xs">
          Không có nhân sự nào phù hợp với bộ lọc
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
              <th className="py-3 px-4 whitespace-nowrap">Nhân sự</th>
              <th className="py-3 px-4 whitespace-nowrap">Trạng thái Realtime</th>
              <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">
                Thời gian dùng ({formatVnDateDisplay(activityDate)})
              </th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Số phiên mở app</th>
              <th className="py-3 px-4 whitespace-nowrap">Lần đầu vào app</th>
              <th className="py-3 px-4 whitespace-nowrap">Lần cuối hoạt động</th>
              <th className="py-3 px-4 whitespace-nowrap">Thiết bị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              const stats = u.dateStats || {};
              const totalSec = stats.totalSeconds || 0;
              const workdayPct = stats.workdayPercentage || 0;

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
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full font-bold text-[11px] shadow-2xs">
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
                      <div className="space-y-1.5 max-w-[220px]">
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

                  {/* Cột 5: Lần đầu vào app */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                    {formatTimeOnly(stats.firstActiveAt)}
                  </td>

                  {/* Cột 6: Lần cuối hoạt động */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                    {formatTimeOnly(stats.lastActiveAtOnDate || u.lastActiveAt)}
                  </td>

                  {/* Cột 7: Thiết bị */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                        isMobile
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isMobile ? (
                        <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <Laptop className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{u.currentDevice}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. TOP STATS CARDS (Cho phép ẩn/hiện để tiết kiệm không gian) */}
      {showSummaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 transition-all">
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
                    ((activityData?.summary?.activeOnDateCount || 0) /
                      activityData.summary.totalUsers) *
                      100
                  )}% tỷ lệ tham gia trong ngày`
                : 'Cập nhật realtime'}
            </p>
          </div>

          {/* Card 3: Tổng thời gian toàn công ty */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tổng Thời Lượng Dùng
              </span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
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
      )}

      {/* 2. TOOLBAR: CHỌN NGÀY & BỘ LỌC TÌM KIẾM THEO NHÓM */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Hàng 1: Chọn ngày + Nút làm mới + Nút ẩn/hiện thẻ tổng quan */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
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
              <span className="text-[11px] text-slate-500 font-medium">Khác:</span>
              <input
                type="date"
                value={activityDate}
                onChange={e => e.target.value && setActivityDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>
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

            {/* Nút Toggle ẩn/hiện thẻ thống kê để tiết kiệm không gian */}
            <button
              type="button"
              onClick={() => setShowSummaryCards(prev => !prev)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={showSummaryCards ? 'Thu gọn thẻ thống kê để rộng chỗ' : 'Mở lại thẻ thống kê'}
            >
              {showSummaryCards ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
              <span className="hidden sm:inline">{showSummaryCards ? 'Ẩn thống kê' : 'Hiện thống kê'}</span>
            </button>

            {/* Nút Toggle Chế độ xem Phân nhóm / Toàn bộ */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('GROUPED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'GROUPED'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gom nhóm theo từng Đội Nhóm (Gọn gàng)"
              >
                <Layers className="w-3 h-3" />
                <span>Theo Nhóm</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('FLAT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'FLAT'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem toàn bộ trên một bảng phẳng"
              >
                <List className="w-3 h-3" />
                <span>Tất Cả</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc Đội nhóm & Tìm kiếm Sale (Đáp ứng yêu cầu: không bị rối khi nhiều sale) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* 1. Lọc theo TỪNG NHÓM (Team Filter) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Đội nhóm:</span>
            <select
              value={selectedTeamFilter}
              onChange={e => setSelectedTeamFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">-- Tất cả các nhóm ({teamOptions.length}) --</option>
              {teamOptions.map(tName => (
                <option key={tName} value={tName}>
                  🏢 {tName}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Ô tìm kiếm nhân sự */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên Sale, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* 3. Lọc theo trạng thái trực tuyến */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-xl outline-none font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái ({usersList.length})</option>
            <option value="ONLINE">🟢 Đang online ({activityData?.summary?.onlineNowCount || 0})</option>
            <option value="ACTIVE_TODAY">
              🔵 Có vào app ngày này ({activityData?.summary?.activeOnDateCount || 0})
            </option>
          </select>
        </div>
      </div>

      {/* 3. DANH SÁCH NHÂN SỰ THEO TỪNG NHÓM (GROUPED ACCORDION) HOẶC BẢNG TỔNG HỢP (FLAT) */}
      {viewMode === 'GROUPED' ? (
        <div className="space-y-4">
          {groupedData.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Không tìm thấy nhân sự phù hợp với bộ lọc tìm kiếm.
            </div>
          ) : (
            groupedData.map(group => {
              const isCollapsed = !!collapsedTeams[group.teamName];
              return (
                <div
                  key={group.teamName}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* Team Header Bar */}
                  <div
                    onClick={() => toggleTeamCollapse(group.teamName)}
                    className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-800">
                        {group.teamName}
                      </h3>

                      <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {group.users.length} nhân sự
                      </span>

                      {group.onlineCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>{group.onlineCount} đang online</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          (Chưa có ai online)
                        </span>
                      )}

                      {group.totalSeconds > 0 && (
                        <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                          • Tổng thời lượng dùng: <strong className="text-emerald-700">{formatDurationSeconds(group.totalSeconds)}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                        {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Team Members Table */}
                  {!isCollapsed && renderUserTable(group.users)}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* FLAT VIEW: Bảng phẳng tổng hợp */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Toàn Bộ Nhân Sự Ngày {formatVnDateDisplay(activityDate)}
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

          {renderUserTable(filteredUsers)}
        </div>
      )}
    </div>
  );
}
