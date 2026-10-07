'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Award,
  Users,
  Shield,
  UserCheck,
  Lock,
  Unlock,
  Plus,
  Trophy,
  Target,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Edit2,
  X,
  KeyRound,
  Copy,
  RefreshCw,
  Check,
  Send,
  Trash2,
} from 'lucide-react';
import { User, Team } from '@/types/crm';
import { formatCurrency, generateRandomPassword, copyToClipboard } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';

import DatePeriodFilter from '@/components/common/DatePeriodFilter';

export default function TeamPage() {
  const { fetchWithAuth, currentUser } = useAuth();
  const { dateFrom, dateTo } = useDateFilter();
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Target Modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editTargetRevenue, setEditTargetRevenue] = useState(0);
  const [editTargetDeals, setEditTargetDeals] = useState(0);
  const [editTeamId, setEditTeamId] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState(() => generateRandomPassword(10));
  const [newUserRole, setNewUserRole] = useState<'SALE' | 'LEADER' | 'ADMIN' | 'STAFF'>('SALE');
  const [newUserTeamId, setNewUserTeamId] = useState('');
  const [newUserTarget, setNewUserTarget] = useState(150000000);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const url = params.toString() ? `/api/users?${params.toString()}` : '/api/users';
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser, dateFrom, dateTo]);

  const handleToggleLock = async (user: any) => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      await fetchWithAuth('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isLocked: !user.isLocked }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to lock/unlock user:', err);
    }
  };

  const handleDeleteUser = async (userToDelete: any) => {
    if (currentUser?.role !== 'ADMIN') return;
    if (userToDelete.id === currentUser.id) {
      alert('Không thể xóa tài khoản của chính bạn');
      return;
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa nhân sự "${userToDelete.name}" (${userToDelete.email}) khỏi hệ thống ZEN CRM?`
      )
    ) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa nhân sự thất bại');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await fetchWithAuth('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          targetRevenue: editTargetRevenue,
          targetDeals: editTargetDeals,
          teamId: editTeamId || undefined,
          password: editPassword.trim() || undefined,
        }),
      });
      setEditingUser(null);
      setEditPassword('');
      fetchUsers();
    } catch (err) {
      console.error('Failed to save KPI:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim(),
          role: newUserRole,
          teamId: newUserTeamId || undefined,
          targetRevenue: newUserTarget,
          password: newUserPassword.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword(generateRandomPassword(10));
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Tạo nhân viên thất bại');
      }
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  // Filter users to strictly ensure LEADER never sees ADMIN or other teams in UI
  const displayUsers = users.filter(u => {
    if (currentUser?.role === 'ADMIN') return true;
    if (currentUser?.role === 'LEADER') {
      const leaderTeamId = currentUser.teamId;
      return (u.teamId === leaderTeamId || u.id === currentUser.id) && u.role !== 'ADMIN';
    }
    return u.id === currentUser?.id;
  });

  // Find personal user metrics
  const personalData = displayUsers.find(u => u.id === currentUser?.id) || displayUsers[0];

  // Leaderboard ranking
  const leaderboard = [...displayUsers]
    .filter(u => u.role === 'SALE' || u.role === 'LEADER')
    .sort((a, b) => (b.actualRevenue || 0) - (a.actualRevenue || 0));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>
              {currentUser?.role === 'LEADER'
                ? `Đội Ngũ ${currentUser?.teamName || 'Nhóm Của Bạn'} & Chỉ Tiêu KPI`
                : 'Quản Lý Đội Ngũ Sale & Chỉ Tiêu KPI'}
            </span>
          </h1>
          {currentUser?.role === 'LEADER' && (
            <p className="text-xs text-slate-500 mt-0.5">
              Phạm vi quản lý: Chỉ hiển thị và giám sát các thành viên thuộc {currentUser?.teamName || 'đội nhóm của bạn'}.
            </p>
          )}
        </div>

        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER') && (
          <button
            onClick={() => {
              setNewUserPassword(generateRandomPassword(8));
              if (currentUser?.role === 'LEADER' && currentUser.teamId) {
                setNewUserTeamId(currentUser.teamId);
                setNewUserRole('SALE');
              }
              setShowAddUserModal(true);
            }}
            className="self-start sm:self-auto px-3.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span>Thêm Nhân Viên</span>
          </button>
        )}
      </div>

      {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
      <DatePeriodFilter />

      {/* PERSONAL PERFORMANCE DASHBOARD */}
      {personalData && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                {personalData.name?.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-base flex items-center gap-2">
                  <span>{personalData.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Dashboard Cá Nhân
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {personalData.teamName || 'Phòng Kinh Doanh'} | Email: {personalData.email}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Tiến độ KPI Doanh số:</span>
              <div className="text-xl font-extrabold text-emerald-400 font-futura tracking-tight">
                {personalData.kpiProgress || 0}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Doanh Thu Đã Chốt</span>
              <div className="text-base font-extrabold text-emerald-400 font-futura tracking-tight">
                {formatCurrency(personalData.actualRevenue || 0)}
              </div>
              <div className="text-[10px] text-slate-500">Mục tiêu: {formatCurrency(personalData.targetRevenue || 0)}</div>
            </div>

            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Số Deal Chốt Thành Công</span>
              <div className="text-base font-extrabold text-white font-futura tracking-tight">
                {personalData.wonDealsCount || 0} Deal
              </div>
              <div className="text-[10px] text-slate-500">Mục tiêu: {personalData.targetDeals || 0} Deal</div>
            </div>

            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Khách Hàng Đang Xử Lý</span>
              <div className="text-base font-extrabold text-amber-400 font-futura tracking-tight">
                {personalData.activeLeads || 0} Lead
              </div>
              <div className="text-[10px] text-slate-500">Đang chăm sóc trong quy trình</div>
            </div>

            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Trạng Thái KPI</span>
              <div className="text-base font-bold text-white">
                {personalData.kpiProgress >= 100 ? 'Đã đạt chỉ tiêu' : 'Đang tăng tốc'}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, personalData.kpiProgress || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM LEADERBOARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-800">
              Bảng Xếp Hạng Doanh Số Toàn Team (Leaderboard)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Cập nhật thời gian thực</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chưa có nhân sự kinh doanh tham gia thi đua doanh số. Hãy bấm &quot;Thêm Nhân Viên&quot; để tạo tài khoản nhân sự cho công ty.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
            {leaderboard.slice(0, 3).map((rep, idx) => {
              let medalColor = 'from-amber-400 to-amber-600 border-amber-300';
              let medalLabel = 'Quán Quân (Top 1)';
              if (idx === 1) {
                medalColor = 'from-slate-300 to-slate-500 border-slate-300';
                medalLabel = 'Á Quân (Top 2)';
              } else if (idx === 2) {
                medalColor = 'from-amber-600 to-amber-800 border-amber-500';
                medalLabel = 'Quý Quân (Top 3)';
              }

              return (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl border bg-gradient-to-b from-white to-slate-50 relative overflow-hidden shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{medalLabel}</span>
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${medalColor} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                      #{idx + 1}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{rep.name}</div>
                    <div className="text-[11px] text-slate-500">{rep.teamName || 'Team Sale'}</div>
                    <div className="text-emerald-700 font-extrabold text-base pt-1">
                      {formatCurrency(rep.actualRevenue || 0)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Đã chốt: <strong>{rep.wonDealsCount || 0}</strong> deals | Đạt: <strong>{rep.kpiProgress || 0}%</strong> KPI
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SALES ROSTER & USER MANAGEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Danh Sách Nhân Sự &amp; Phân Quyền Hệ Thống
            </h3>
          </div>
          <span className="text-xs text-slate-500">{users.length} tài khoản</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Nhân sự</th>
                <th className="py-3 px-4 whitespace-nowrap">Vai trò (RBAC)</th>
                <th className="py-3 px-4 whitespace-nowrap">Đội nhóm (Team)</th>
                <th className="py-3 px-4 whitespace-nowrap">Mục tiêu Doanh số (KPI)</th>
                <th className="py-3 px-4 whitespace-nowrap">Doanh thu thực tế</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">% Đạt</th>
                <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border whitespace-nowrap inline-block ${
                      u.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      u.role === 'LEADER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {u.role === 'ADMIN' ? 'Admin' : u.role === 'LEADER' ? 'Trưởng nhóm' : 'Sale'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {u.teamName || 'Ban Quản Trị'}
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-700 font-mono whitespace-nowrap">
                    {formatCurrency(u.targetRevenue)}
                  </td>

                  <td className="py-3 px-4 font-extrabold text-emerald-600 font-mono whitespace-nowrap">
                    {formatCurrency(u.actualRevenue || 0)}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`font-bold ${
                      (u.kpiProgress || 0) >= 100 ? 'text-emerald-600' : 'text-slate-700'
                    }`}>
                      {u.kpiProgress || 0}%
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {u.isLocked ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap inline-block">
                        Đang khóa
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap inline-block">
                        Hoạt động
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER') && (
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditTargetRevenue(u.targetRevenue);
                            setEditTargetDeals(u.targetDeals);
                            setEditTeamId(u.teamId || '');
                          }}
                          className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Đặt KPI & Phân nhóm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {currentUser?.role === 'ADMIN' && u.id !== currentUser.id && (
                        <>
                          <button
                            onClick={() => handleToggleLock(u)}
                            className={`p-1.5 rounded cursor-pointer ${
                              u.isLocked
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                            }`}
                            title={u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {u.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Xóa nhân sự khỏi hệ thống"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit KPI Target */}
      {editingUser && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={e => {
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-xs animate-in zoom-in-95 my-auto flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <span className="font-bold text-sm text-slate-800">Cập Nhật Nhân Sự & KPI: {editingUser.name}</span>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mục tiêu Doanh số tháng (₫):</label>
                  <input
                    type="number"
                    step="10000000"
                    value={editTargetRevenue}
                    onChange={e => setEditTargetRevenue(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mục tiêu số Deal chốt:</label>
                  <input
                    type="number"
                    value={editTargetDeals}
                    onChange={e => setEditTargetDeals(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đội nhóm (Team):</label>
                  <select
                    value={editTeamId}
                    onChange={e => setEditTeamId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="">-- Không gán Team --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {currentUser?.role === 'ADMIN' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Cấp lại mật khẩu mới (để trống nếu giữ nguyên):
                    </label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono text-xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Để trống nếu giữ nguyên. Nếu nhập mật khẩu mới, nhân viên sẽ dùng mật khẩu này để đăng nhập ngay lập tức.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100 cursor-pointer shadow-2xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add User */}
      {showAddUserModal && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={e => {
            if (e.target === e.currentTarget) setShowAddUserModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-xs animate-in zoom-in-95 my-auto flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <span className="font-bold text-sm text-slate-800">Tạo Tài Khoản Nhân Viên Mới</span>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Họ và tên *:</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="VD: Lê Thị Hồng"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email *:</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="hong.le@zencrm.vn"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Vai trò (RBAC):</label>
                    <select
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="SALE">Chuyên viên Sale</option>
                      <option value="STAFF">Nhân viên Kỹ thuật / Kho</option>
                      {currentUser?.role === 'ADMIN' && (
                        <>
                          <option value="LEADER">Trưởng nhóm / Quản lý</option>
                          <option value="ADMIN">Giám đốc (Director / Admin)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Đội nhóm (Team):</label>
                    <select
                      value={newUserTeamId}
                      onChange={e => setNewUserTeamId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      disabled={currentUser?.role === 'LEADER'}
                    >
                      {currentUser?.role === 'ADMIN' && <option value="">-- Chọn Team --</option>}
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Mật khẩu cấp tự sinh (Gồm chữ và số):</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewUserPassword(generateRandomPassword(8))}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Đổi mã khác</span>
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyToClipboard(newUserPassword);
                          if (ok) {
                            setCopiedUserId('modal_add');
                            setTimeout(() => setCopiedUserId(null), 2000);
                          }
                        }}
                        className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        {copiedUserId === 'modal_add' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300/80 rounded-lg outline-none font-mono text-xs sm:text-sm text-slate-900 font-bold tracking-wider"
                    required
                  />
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 flex items-center gap-1.5">
                    <span className="flex-shrink-0">⚠️</span>
                    <span>Mật khẩu này chỉ có hiệu lực sau khi bạn bấm nút <strong>"Tạo nhân sự"</strong> bên dưới.</span>
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chỉ tiêu doanh số (VND):</label>
                  <input
                    type="number"
                    step="10000000"
                    value={newUserTarget}
                    onChange={e => setNewUserTarget(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100 cursor-pointer shadow-2xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  Tạo nhân sự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
