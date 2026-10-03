'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import {
  Settings,
  Shield,
  Database,
  Plus,
  Trash2,
  Sparkles,
  UserPlus,
  Mail,
  User as UserIcon,
  Briefcase,
  Users,
  Wrench,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Send,
  Edit2,
  Building2,
  Target,
  Award,
  X,
} from 'lucide-react';
import { User, Team, Role } from '@/types/crm';
import { generateRandomPassword, copyToClipboard, formatCurrency } from '@/lib/utils';

export default function SettingsPage() {
  const { fetchWithAuth, currentUser, refreshSession } = useAuth();
  const [sources, setSources] = useState<string[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [notification, setNotification] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Users & Gmail Access Management
  const [userList, setUserList] = useState<User[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [addGmail, setAddGmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<Role>('SALE');
  const [addTeamId, setAddTeamId] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Team Management (Admin only)
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeaderId, setNewTeamLeaderId] = useState('');
  const [newTeamTarget, setNewTeamTarget] = useState(300000000);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamLeaderId, setEditTeamLeaderId] = useState('');
  const [editTeamTarget, setEditTeamTarget] = useState(300000000);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

  // Track created user to show quick share card
  const [lastCreatedUser, setLastCreatedUser] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
  } | null>(null);

  // Copy feedback state
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [copiedShareMsg, setCopiedShareMsg] = useState(false);
  const [copiedFormPass, setCopiedFormPass] = useState(false);

  // Auto initialize random alphanumeric password on mount
  useEffect(() => {
    setAddPassword(generateRandomPassword(8));
  }, []);

  const fetchSettingsAndUsers = async () => {
    try {
      setIsLoading(true);
      const [leadsRes, usersRes, teamsRes] = await Promise.all([
        fetchWithAuth('/api/leads'),
        fetchWithAuth('/api/users'),
        fetchWithAuth('/api/teams'),
      ]);

      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setSources(lData.sources || []);
      }

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUserList(uData.users || []);
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeams(tData.teams || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchSettingsAndUsers();
      // If leader, default role is SALE and team is their team
      if (currentUser.role === 'LEADER') {
        setAddRole('SALE');
        if (currentUser.teamId) {
          setAddTeamId(currentUser.teamId);
        }
      }
    }
  }, [currentUser]);

  // Generate new random alphanumeric password
  const handleRegeneratePassword = () => {
    const newPass = generateRandomPassword(8);
    setAddPassword(newPass);
    setCopiedFormPass(false);
  };

  // Copy current form password
  const handleCopyFormPassword = async () => {
    if (!addPassword) return;
    const ok = await copyToClipboard(addPassword);
    if (ok) {
      setCopiedFormPass(true);
      setTimeout(() => setCopiedFormPass(false), 2000);
    }
  };

  // Handle Add Member by Gmail
  const handleAddGmailAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    const cleanGmail = addGmail.trim().toLowerCase();
    const cleanName = addName.trim();
    const finalPassword = addPassword.trim() || generateRandomPassword(8);

    if (!cleanGmail) {
      setAddError('Vui lòng nhập địa chỉ Gmail');
      return;
    }
    if (!cleanName) {
      setAddError('Vui lòng nhập họ và tên của nhân sự');
      return;
    }

    try {
      setIsAdding(true);
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanGmail,
          role: currentUser?.role === 'LEADER' && (addRole === 'ADMIN' || addRole === 'LEADER') ? 'SALE' : addRole,
          teamId: addTeamId || (currentUser?.role === 'LEADER' ? currentUser.teamId : undefined),
          phone: addPhone.trim() || undefined,
          password: finalPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Thêm quyền truy cập thất bại');
        setIsAdding(false);
        return;
      }

      setLastCreatedUser({
        name: cleanName,
        email: cleanGmail,
        password: finalPassword,
        role: addRole,
      });

      setAddSuccess(`Đã tạo tài khoản và cấp quyền thành công cho ${cleanGmail}!`);
      setAddGmail('');
      setAddName('');
      setAddPhone('');
      setAddPassword(generateRandomPassword(8));
      if (currentUser?.role === 'ADMIN') {
        setAddRole('SALE');
        setAddTeamId('');
      }

      fetchSettingsAndUsers();
      refreshSession();
    } catch (err: any) {
      setAddError(err.message || 'Lỗi kết nối mạng');
    } finally {
      setIsAdding(false);
    }
  };

  // Build message to send to staff
  const buildShareMessage = (email: string, pass: string, name?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `Chào ${name || 'bạn'}, thông tin đăng nhập hệ thống ZEN CRM của bạn đã sẵn sàng:\n- Link đăng nhập: ${origin}/login\n- Tài khoản: ${email}\n- Mật khẩu: ${pass}\n(Sau khi đăng nhập bạn có thể đổi mật khẩu theo ý muốn).`;
  };

  // Copy full message for newly created user
  const handleCopyNewUserMessage = async () => {
    if (!lastCreatedUser) return;
    const msg = buildShareMessage(lastCreatedUser.email, lastCreatedUser.password, lastCreatedUser.name);
    const ok = await copyToClipboard(msg);
    if (ok) {
      setCopiedShareMsg(true);
      setTimeout(() => setCopiedShareMsg(false), 2500);
    }
  };

  // Copy password of a specific user in table
  const handleCopyUserPassword = async (user: User) => {
    const pass = user.password || 'zengarden';
    const ok = await copyToClipboard(pass);
    if (ok) {
      setCopiedUserId(user.id);
      setTimeout(() => setCopiedUserId(null), 2000);
    }
  };

  // Copy full credentials of a specific user in table
  const handleCopyUserFullCreds = async (user: User) => {
    const pass = user.password || 'zengarden';
    const msg = buildShareMessage(user.email, pass, user.name);
    const ok = await copyToClipboard(msg);
    if (ok) {
      setNotification(`Đã sao chép thông tin đăng nhập của ${user.name}!`);
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Handle Quick Role Change (Admin only)
  const handleChangeRole = async (targetUserId: string, newRole: Role) => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const res = await fetchWithAuth('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUserId, role: newRole }),
      });
      if (res.ok) {
        setNotification('Đã cập nhật vai trò thành công!');
        fetchSettingsAndUsers();
        refreshSession();
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (err) {
      console.error('Update role error:', err);
    }
  };

  // Handle Toggle Lock User
  const handleToggleLock = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('Không thể khóa tài khoản của chính bạn');
      return;
    }
    if (currentUser?.role !== 'ADMIN' && targetUser.role === 'ADMIN') {
      alert('Không có quyền thay đổi trạng thái của Giám đốc');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, isLocked: !targetUser.isLocked }),
      });
      if (res.ok) {
        fetchSettingsAndUsers();
      }
    } catch (err) {
      console.error('Toggle lock error:', err);
    }
  };

  // Handle Remove Member (Gỡ quyền truy cập)
  const handleRemoveMember = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('Không thể gỡ quyền tài khoản của chính bạn');
      return;
    }
    if (currentUser?.role === 'LEADER' && (targetUser.role === 'ADMIN' || targetUser.role === 'LEADER')) {
      alert('Quản lý không có quyền gỡ tài khoản Giám đốc hoặc Quản lý khác');
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn gỡ quyền truy cập của ${targetUser.name} (${targetUser.email}) khỏi hệ thống ZEN CRM?`
      )
    ) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/users?id=${targetUser.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotification(`Đã gỡ quyền truy cập của ${targetUser.name}!`);
        fetchSettingsAndUsers();
        refreshSession();
        setTimeout(() => setNotification(''), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Gỡ quyền thất bại');
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  // ================= TEAM MANAGEMENT (ADMIN ONLY) =================
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError('');
    if (!newTeamName.trim()) {
      setTeamError('Vui lòng nhập tên nhóm kinh doanh');
      return;
    }

    try {
      setIsAddingTeam(true);
      const res = await fetchWithAuth('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          leaderId: newTeamLeaderId || undefined,
          targetRevenue: Number(newTeamTarget) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || 'Tạo nhóm thất bại');
        setIsAddingTeam(false);
        return;
      }

      setNotification(`Đã tạo nhóm "${newTeamName.trim()}" thành công!`);
      setNewTeamName('');
      setNewTeamLeaderId('');
      setNewTeamTarget(300000000);
      fetchSettingsAndUsers();
      setTimeout(() => setNotification(''), 3000);
    } catch (err: any) {
      setTeamError(err.message || 'Lỗi mạng khi tạo nhóm');
    } finally {
      setIsAddingTeam(false);
    }
  };

  const handleStartEditTeam = (team: any) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamLeaderId(team.leaderId || '');
    setEditTeamTarget(team.targetRevenue || 300000000);
  };

  const handleSaveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    try {
      setIsUpdatingTeam(true);
      const res = await fetchWithAuth('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTeam.id,
          name: editTeamName.trim(),
          leaderId: editTeamLeaderId || '',
          targetRevenue: Number(editTeamTarget) || 0,
        }),
      });

      if (res.ok) {
        setNotification(`Đã cập nhật thông tin nhóm "${editTeamName}" thành công!`);
        setEditingTeam(null);
        fetchSettingsAndUsers();
        setTimeout(() => setNotification(''), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Cập nhật nhóm thất bại');
      }
    } catch (err) {
      console.error('Update team error:', err);
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleDeleteTeam = async (team: any) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa nhóm "${team.name}"? Các nhân sự trong nhóm sẽ được chuyển sang trạng thái chưa gán nhóm.`
      )
    ) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/teams?id=${team.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotification(`Đã xóa nhóm "${team.name}" thành công!`);
        fetchSettingsAndUsers();
        setTimeout(() => setNotification(''), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Xóa nhóm thất bại');
      }
    } catch (err) {
      console.error('Delete team error:', err);
    }
  };

  // Backup data to Excel (Admin only)
  const handleBackupAllData = async () => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const res = await fetchWithAuth('/api/settings/backup');
      if (res.ok) {
        const backupPayload = await res.json();
        const db = backupPayload.data;

        const wb = XLSX.utils.book_new();

        if (db.leads) {
          const wsLeads = XLSX.utils.json_to_sheet(db.leads);
          XLSX.utils.book_append_sheet(wb, wsLeads, 'KhachHang_Leads');
        }
        if (db.deals) {
          const wsDeals = XLSX.utils.json_to_sheet(db.deals);
          XLSX.utils.book_append_sheet(wb, wsDeals, 'CoHoi_Deals');
        }
        if (db.orders) {
          const wsOrders = XLSX.utils.json_to_sheet(db.orders);
          XLSX.utils.book_append_sheet(wb, wsOrders, 'DonHang_Orders');
        }
        if (db.auditLogs) {
          const wsAudit = XLSX.utils.json_to_sheet(db.auditLogs);
          XLSX.utils.book_append_sheet(wb, wsAudit, 'NhatKy_AuditLog');
        }

        XLSX.writeFile(wb, `BACKUP_TOAN_BO_ZEN_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);

        setNotification('Đã sao lưu và tải xuống toàn bộ dữ liệu CRM thành công!');
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      console.error('Backup failed:', err);
    }
  };

  const handleAddSource = () => {
    if (!newSourceName.trim() || sources.includes(newSourceName.trim())) return;
    setSources([...sources, newSourceName.trim()]);
    setNewSourceName('');
    setNotification('Đã thêm nguồn khách hàng mới!');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleRemoveSource = (srcToRemove: string) => {
    setSources(sources.filter(s => s !== srcToRemove));
  };

  // Role check: Only ADMIN and LEADER can access
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'LEADER') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <Shield className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Quyền Truy Cập Giới Hạn</h2>
        <p className="text-xs text-slate-500">
          Chỉ Giám đốc (Admin) và Quản lý (Leader) mới có quyền truy cập khu vực cài đặt và cấp tài khoản.
        </p>
      </div>
    );
  }

  const isLeader = currentUser?.role === 'LEADER';
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6 text-xs max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>
              {isLeader
                ? 'Cài Đặt & Cấp Quyền Tài Khoản Nhân Viên'
                : 'Cài Đặt Hệ Thống & Phân Quyền Truy Cập'}
            </span>
            {isLeader && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                Dành Cho Quản Lý
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isLeader
              ? 'Thêm nhanh tài khoản bằng Gmail, hệ thống tự sinh mật khẩu gồm chữ và số để copy gửi nhân sự đăng nhập ngay.'
              : 'Tạo nhóm sale mới, cấp quyền tài khoản qua Gmail, tự động tạo mật khẩu, quản trị thành viên và cấu hình CRM.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleBackupAllData}
            className="self-start sm:self-auto px-3.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 flex-shrink-0" />
            <span>Sao Lưu Toàn Bộ Dữ Liệu (Excel)</span>
          </button>
        )}
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* ================= THÔNG BÁO TÀI KHOẢN VỪA TẠO (KÈM NÚT COPY GỬI NHÂN VIÊN) ================= */}
      {lastCreatedUser && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-2 border-emerald-500/40 rounded-2xl shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Tài khoản đã tạo thành công! Sẵn sàng copy gửi cho nhân viên:</span>
            </div>
            <button
              onClick={() => setLastCreatedUser(null)}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Đóng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Họ tên &amp; Chức vụ:</div>
              <div className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5">
                {lastCreatedUser.name} ({lastCreatedUser.role})
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 font-medium">Gmail đăng nhập:</div>
              <div className="font-mono font-bold text-emerald-700 text-xs sm:text-sm mt-0.5 truncate">
                {lastCreatedUser.email}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 font-medium">Mật khẩu tự động (chữ &amp; số):</div>
              <div className="font-mono font-black text-amber-700 text-sm sm:text-base mt-0.5 tracking-wider">
                {lastCreatedUser.password}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="text-[11px] text-slate-600">
              💡 Bấm nút bên phải để sao chép toàn bộ thông tin đã soạn sẵn, dán (Paste) gửi qua Zalo/Tin nhắn cho nhân viên.
            </div>

            <button
              onClick={handleCopyNewUserMessage}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer flex-shrink-0"
            >
              {copiedShareMsg ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>✓ Đã sao chép vào bộ nhớ!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>📋 Sao chép thông tin gửi nhân viên</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION: QUẢN TRỊ NHÓM SALE (SALE TEAMS) - CHỈ DÀNH CHO ADMIN ================= */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Quản Trị Nhóm Kinh Doanh (Sale Teams)</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                    {teams.length} Nhóm
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tạo nhóm sale mới, chỉ định Quản lý (Leader) trưởng nhóm và thiết lập chỉ tiêu KPI cho từng nhóm.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] self-start sm:self-auto text-slate-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Chỉ Giám đốc có quyền tùy biến nhóm</span>
            </div>
          </div>

          {/* Form tạo nhóm sale mới */}
          <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200">
            <form onSubmit={handleCreateTeam} className="space-y-4">
              {teamError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{teamError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tên nhóm */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên nhóm kinh doanh mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="VD: Team Setup Thủy Sinh Miền Trung"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Chọn Quản lý trưởng nhóm */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quản lý / Trưởng nhóm (Leader)
                  </label>
                  <select
                    value={newTeamLeaderId}
                    onChange={e => setNewTeamLeaderId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chưa chỉ định (Gán sau) --</option>
                    {userList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - {u.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chỉ tiêu doanh số */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chỉ tiêu doanh số nhóm / Tháng (VND)
                  </label>
                  <input
                    type="number"
                    step="10000000"
                    value={newTeamTarget}
                    onChange={e => setNewTeamTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isAddingTeam}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isAddingTeam ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>+ Tạo Nhóm Kinh Doanh Mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Danh sách các nhóm sale hiện có */}
          <div className="p-5 sm:p-6">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4 font-bold">Tên nhóm</th>
                    <th className="py-2.5 px-4 font-bold">Quản lý (Leader)</th>
                    <th className="py-2.5 px-4 font-bold text-center">Số lượng nhân sự</th>
                    <th className="py-2.5 px-4 font-bold text-right">Chỉ tiêu doanh số (KPI)</th>
                    <th className="py-2.5 px-4 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map(t => {
                    const leader = userList.find(u => u.id === t.leaderId);
                    const membersCount = userList.filter(u => u.teamId === t.id).length;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span>{t.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {leader ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{leader.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold border border-amber-200">
                                Quản lý
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa chỉ định</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200 text-[11px]">
                            {membersCount} nhân sự
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                          {formatCurrency(t.targetRevenue || 0)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEditTeam(t)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin nhóm"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(t)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="Xóa nhóm kinh doanh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa nhóm kinh doanh */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Tùy Chỉnh Nhóm Kinh Doanh</span>
              </span>
              <button
                onClick={() => setEditingTeam(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTeam} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên nhóm *:</label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={e => setEditTeamName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quản lý / Trưởng nhóm:</label>
                <select
                  value={editTeamLeaderId}
                  onChange={e => setEditTeamLeaderId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {userList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chỉ tiêu doanh số tháng (VND):
                </label>
                <input
                  type="number"
                  step="10000000"
                  required
                  value={editTeamTarget}
                  onChange={e => setEditTeamTarget(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTeam}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {isUpdatingTeam ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SECTION: CẤP QUYỀN TRUY CẬP BẰNG GMAIL ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cấp Quyền Truy Cập CRM Bằng Gmail</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  Drive Style
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Nhập Gmail nhân viên, hệ thống sẽ tự động tạo mật khẩu gồm chữ và số để copy gửi nhân viên đăng nhập ngay.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] self-start sm:self-auto text-slate-300">
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mật khẩu: <strong>Tự sinh mã chữ &amp; số</strong></span>
          </div>
        </div>

        {/* Form Add Gmail Access */}
        <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200">
          <form onSubmit={handleAddGmailAccess} className="space-y-4">
            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{addError}</span>
              </div>
            )}

            {addSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{addSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Input Gmail */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa chỉ Gmail nhân viên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={addGmail}
                    onChange={e => setAddGmail(e.target.value)}
                    placeholder="VD: nhanvien@gmail.com"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Input Họ Tên */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và Tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder="VD: Trần Văn Bình"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Select Vai trò */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vị trí / Phân quyền <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as Role)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="SALE">💼 Chuyên viên Sale</option>
                  <option value="STAFF">🔧 Kỹ thuật / Kho / Vận hành</option>
                  {isAdmin && (
                    <>
                      <option value="LEADER">👔 Quản lý nhóm (Leader)</option>
                      <option value="ADMIN">👑 Giám đốc (Admin)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Select Đội nhóm */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đội nhóm kinh doanh
                </label>
                <select
                  value={addTeamId}
                  disabled={isLeader}
                  onChange={e => setAddTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                >
                  {isLeader ? (
                    <option value={currentUser?.teamId || ''}>
                      {teams.find(t => t.id === currentUser?.teamId)?.name || 'Team của Quản lý'}
                    </option>
                  ) : (
                    <>
                      <option value="">-- Không gán Team --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Mật khẩu tự tạo gồm chữ và số */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mật khẩu cấp tự sinh (Gồm chữ và số)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      title="Sinh mật khẩu ngẫu nhiên mới"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Đổi mã khác</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleCopyFormPassword}
                      className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedFormPass ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy mật khẩu</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    className="w-full pl-3 pr-24 py-2 bg-white border border-amber-300/80 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <div className="absolute inset-y-0 right-1 flex items-center pr-1.5">
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      title="Sinh ngẫu nhiên mã mới"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-500">
                💡 Hệ thống tự tạo chuỗi chữ và số an toàn. Khi tạo xong bạn chỉ việc bấm <strong>"Copy gửi nhân viên"</strong> là nhân sự đăng nhập được ngay.
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
              >
                {isAdding ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>+ Thêm &amp; Cấp Quyền Ngay</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* List of Granted Accounts */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Danh Sách Tài Khoản Đã Cấp Quyền ({userList.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Bấm nút "Copy" để lấy mật khẩu gửi lại cho nhân viên bất kỳ lúc nào
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[850px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">Thành viên / Gmail</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">Vai trò</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">Đội nhóm</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">Mật khẩu cấp (Chữ &amp; Số)</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">Trạng thái</th>
                  <th className="py-2.5 px-4 font-bold text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map(u => {
                  const isCurrent = u.id === currentUser?.id;
                  const userPassword = u.password || 'zengarden';
                  const isCopied = copiedUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold whitespace-nowrap">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isAdmin ? (
                          <select
                            value={u.role}
                            disabled={isCurrent}
                            onChange={e => handleChangeRole(u.id, e.target.value as Role)}
                            className={`text-xs font-bold py-1 px-2 rounded-lg border focus:outline-none cursor-pointer whitespace-nowrap ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : u.role === 'LEADER'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : u.role === 'STAFF'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            <option value="SALE">Chuyên viên Sale</option>
                            <option value="LEADER">Quản lý (Leader)</option>
                            <option value="ADMIN">Giám đốc (Admin)</option>
                            <option value="STAFF">Kỹ thuật / Kho</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[11px] font-bold py-1 px-2 rounded-lg border inline-block whitespace-nowrap ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : u.role === 'LEADER'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : u.role === 'STAFF'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {u.role === 'ADMIN'
                              ? 'Giám đốc'
                              : u.role === 'LEADER'
                              ? 'Quản lý'
                              : u.role === 'STAFF'
                              ? 'Kỹ thuật / Kho'
                              : 'Chuyên viên Sale'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {u.teamName || 'Ban Quản Trị'}
                      </td>

                      {/* Mật khẩu cấp: Có nút Copy tiện lợi */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 rounded-lg px-2.5 py-1 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                            {userPassword}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUserPassword(u)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition-colors cursor-pointer"
                            title="Sao chép mật khẩu"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {u.isLocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap inline-block">
                            Đang khóa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-block">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút gửi thông tin đăng nhập */}
                          <button
                            type="button"
                            onClick={() => handleCopyUserFullCreds(u)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            title="Sao chép toàn bộ thông tin đăng nhập để gửi nhân viên"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Khóa/Mở khóa */}
                          {!isCurrent && (isAdmin || (isLeader && u.role !== 'ADMIN' && u.role !== 'LEADER')) && (
                            <button
                              onClick={() => handleToggleLock(u)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                u.isLocked
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={u.isLocked ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản'}
                            >
                              {u.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Gỡ tài khoản */}
                          {!isCurrent && (isAdmin || (isLeader && u.role !== 'ADMIN' && u.role !== 'LEADER')) && (
                            <button
                              onClick={() => handleRemoveMember(u)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="Gỡ quyền truy cập (Xóa khỏi hệ thống)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: CẤU HÌNH NGUỒN KHÁCH HÀNG (CHỈ DÀNH CHO ADMIN) ================= */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Cấu Hình Nguồn Khách Hàng (Lead Sources)</h3>
              <p className="text-xs text-slate-500">Các tùy chọn nguồn xuất hiện trong dropdown thêm/sửa khách hàng</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sources.map(src => (
              <span
                key={src}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                <span>{src}</span>
                <button
                  onClick={() => handleRemoveSource(src)}
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                  title="Xóa nguồn"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md pt-2">
            <input
              type="text"
              value={newSourceName}
              onChange={e => setNewSourceName(e.target.value)}
              placeholder="Nhập tên nguồn mới (VD: TikTok Shop, Sự kiện Q3)..."
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            />
            <button
              onClick={handleAddSource}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
            >
              + Thêm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
