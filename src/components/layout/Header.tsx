'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import {
  Bell,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  UserPlus,
  CalendarPlus,
  X,
  ChevronDown,
  ShieldCheck,
  Calendar,
  Menu,
  KeyRound,
  LogOut,
  Lock,
  CheckCircle2,
  Receipt,
  CheckCheck,
  Truck,
  ShoppingCart,
  Smartphone,
} from 'lucide-react';
import { Task, UserNotification } from '@/types/crm';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';
import InstallPwaModal from '@/components/common/InstallPwaModal';
import PushNotificationManager from '@/components/common/PushNotificationManager';
import { usePwa } from '@/context/PwaInstallContext';

export default function Header() {
  const router = useRouter();
  const { currentUser, fetchWithAuth, logout, changePassword } = useAuth();
  const { toggleSidebar } = useSidebar();
  const { installApp, showGuide, setShowGuide, isInstalled } = usePwa();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifTab, setNotifTab] = useState<'ORDERS' | 'TASKS'>('ORDERS');
  const [searchQuery, setSearchQuery] = useState('');

  const createMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetchWithAuth('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const fetchAlerts = async () => {
    if (!currentUser) return;
    try {
      const tasksRes = await fetchWithAuth('/api/activities?status=OVERDUE');
      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setOverdueTasks(tData.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([fetchAlerts(), fetchNotifications()]);

    let lastFetchTime = Date.now();

    // Polling thông minh mỗi 45s: CHỈ chạy khi tab trình duyệt đang hoạt động (visible).
    // Giúp chặn 100% request rác khi nhân viên thu nhỏ hoặc chuyển sang tab khác.
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        lastFetchTime = Date.now();
        fetchNotifications();
      }
    }, 45000);

    // Khi người dùng quay lại tab sau khi làm việc khác, tự động cập nhật ngay nếu đã quá 30s
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        const elapsed = Date.now() - lastFetchTime;
        if (elapsed > 30000) {
          lastFetchTime = Date.now();
          fetchNotifications();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Đóng bảng thông báo, menu tạo nhanh, menu người dùng khi click/tap ra ngoài ô hoặc nhấn phím ESC
  useEffect(() => {
    if (!showNotifications && !showCreateMenu && !showUserMenu) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (showNotifications && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (showCreateMenu && createMenuRef.current && !createMenuRef.current.contains(target)) {
        setShowCreateMenu(false);
      }
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowCreateMenu(false);
        setShowUserMenu(false);
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
  }, [showNotifications, showCreateMenu, showUserMenu]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchWithAuth('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadNotifCount(0);
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleReadNotification = async (notif: UserNotification) => {
    if (!notif.isRead) {
      try {
        await fetchWithAuth('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.id }),
        });
        setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, isRead: true } : n)));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notif as read:', err);
      }
    }
    setShowNotifications(false);
    router.push('/orders');
  };

  const totalAlerts = overdueTasks.length + unreadNotifCount;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors flex-shrink-0"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <img
          src="/logo.png"
          alt="ZEN CRM"
          className="w-8 h-8 rounded-lg object-cover lg:hidden flex-shrink-0 shadow-2xs"
        />

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-[150px] sm:max-w-xs md:max-w-md">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm khách hàng..."
            className="w-full pl-8 sm:pl-9 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 rounded-lg border border-transparent focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none truncate"
          />
        </form>
      </div>

      {/* Center: Quick Time Period Selector in Header (Visible on Desktop) */}
      <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs mr-3">
        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>Thời gian:</span>
        </span>
        <DatePeriodFilter compact />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Quick Create Dropdown */}
        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <span className="hidden sm:inline">Tạo nhanh</span>
          </button>

          {showCreateMenu && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
                onClick={() => setShowCreateMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  router.push('/leads?action=create');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Thêm Lead Mới</span>
              </button>
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  router.push('/activities?action=create_task');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
              >
                <CalendarPlus className="w-4 h-4 text-emerald-600" />
                <span>Lên Lịch Hẹn / Task</span>
              </button>
            </div>
          </>
        )}
        </div>

        {/* Install Mobile App Button */}
        <button
          onClick={installApp}
          title="Cài đặt App ZEN CRM trực tiếp vào máy"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all shadow-xs cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">{isInstalled ? 'Đã cài App' : 'Cài App'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              fetchNotifications();
              fetchAlerts();
            }}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
            title="Thông báo đơn hàng & Cảnh báo công việc"
            aria-label="Thông báo đơn hàng & Cảnh báo công việc"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              {/* Lớp nền trong suốt/mờ nhẹ phủ toàn màn hình: Bấm ra ngoài là tự biến mất ngay */}
              <div
                className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
                onClick={() => setShowNotifications(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                  Trung Tâm Thông Báo ({totalAlerts})
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tabs chuyển đổi giữa Đơn Hàng & Việc Quá Hạn */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-2.5 text-xs">
                <button
                  onClick={() => setNotifTab('ORDERS')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    notifTab === 'ORDERS'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Đơn Hàng</span>
                  {unreadNotifCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setNotifTab('TASKS')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    notifTab === 'TASKS'
                      ? 'bg-white text-rose-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Việc Quá Hạn</span>
                  {overdueTasks.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-extrabold rounded-full">
                      {overdueTasks.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: THÔNG BÁO ĐƠN HÀNG CHUYỂN VỀ MÁY CỦA SALE */}
              {notifTab === 'ORDERS' && (
                <div className="space-y-2">
                  {unreadNotifCount > 0 && (
                    <div className="flex justify-end px-1">
                      <button
                        onClick={handleMarkAllRead}
                        className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Đã đọc tất cả</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Chưa có thông báo đơn hàng nào chuyển về máy của bạn.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleReadNotification(n)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-2xs ${
                            n.isRead
                              ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              : 'bg-emerald-50/70 border-emerald-200 text-slate-900 hover:bg-emerald-50 font-medium'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0 animate-ping"></span>
                              )}
                              <Receipt className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">{n.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                              {formatDateTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CẢNH BÁO VIỆC QUÁ HẠN */}
              {notifTab === 'TASKS' && (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {overdueTasks.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Tuyệt vời! Không có công việc nào bị quá hạn.
                      </div>
                    ) : (
                      overdueTasks.map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setShowNotifications(false);
                            router.push('/activities?status=OVERDUE');
                          }}
                          className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 hover:bg-rose-100/70 cursor-pointer text-xs transition-colors"
                        >
                          <div className="font-semibold text-slate-800 truncate">{t.title}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>Sale: {t.assignedSaleName}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
              )}

              {/* CẤU HÌNH THÔNG BÁO ĐẨY VỀ ĐIỆN THOẠI (WEB PUSH) */}
              <div className="pt-2 mt-2.5 border-t border-slate-100">
                <PushNotificationManager compact />
              </div>
            </div>
          </>
        )}
        </div>

        {/* User Role Badge & Switcher */}
        <div className="h-6 w-px bg-slate-200 mx-0.5 sm:mx-1" />
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
            title="Đổi vai trò tài khoản để kiểm tra phân quyền"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs border border-emerald-300 flex-shrink-0">
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <span className="truncate max-w-[120px]">{currentUser?.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser?.role === 'ADMIN'
                  ? 'Giám đốc (Director)'
                  : currentUser?.role === 'LEADER'
                  ? 'Quản lý (Manager)'
                  : currentUser?.role === 'STAFF'
                  ? 'Kỹ thuật / Kho'
                  : 'Chuyên viên Sale'}
              </div>
            </div>
          </button>

          {/* User & Role Switch Dropdown */}
          {showUserMenu && (
            <>
              {/* Lớp nền trong suốt/mờ nhẹ phủ toàn màn hình: Bấm ra ngoài là tự biến mất ngay */}
              <div
                className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              {/* Current User Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{currentUser?.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{currentUser?.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/80">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowChangePassModal(true);
                      setPassError('');
                      setPassSuccess('');
                    }}
                    className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>Đổi mật khẩu</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={e => {
            if (e.target === e.currentTarget) setShowChangePassModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Đổi Mật Khẩu Tài Khoản</h3>
                  <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                setPassError('');
                setPassSuccess('');

                if (!oldPassword) {
                  setPassError('Vui lòng nhập mật khẩu hiện tại');
                  return;
                }
                if (!newPassword || newPassword.length < 6) {
                  setPassError('Mật khẩu mới phải từ 6 ký tự trở lên');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPassError('Xác nhận mật khẩu mới không khớp');
                  return;
                }

                setIsChangingPass(true);
                const res = await changePassword(oldPassword, newPassword);
                setIsChangingPass(false);

                if (res.success) {
                  setPassSuccess('Đổi mật khẩu thành công!');
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setTimeout(() => setShowChangePassModal(false), 1500);
                } else {
                  setPassError(res.error || 'Đổi mật khẩu thất bại');
                }
              }}
              className="space-y-3.5"
            >
              {passError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu hiện tại / Mật khẩu được cấp
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isChangingPass ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Lưu Mật Khẩu Mới</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <InstallPwaModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </header>
  );
}
