'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { usePwa } from '@/context/PwaInstallContext';
import InstallPwaModal from '@/components/common/InstallPwaModal';
import {
  LayoutDashboard,
  Users2,
  CalendarCheck,
  Award,
  Package,
  FileSpreadsheet,
  History,
  Settings,
  Sparkles,
  ChevronRight,
  X,
  LogOut,
  Smartphone,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  const { isOpen, closeSidebar } = useSidebar();
  const { installApp, showGuide, setShowGuide, isInstalled } = usePwa();

  const navItems = [
    {
      label: 'Tổng quan & Báo cáo',
      href: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'LEADER', 'SALE'],
    },
    {
      label: 'Khách hàng & Lead',
      href: '/leads',
      icon: Users2,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Lịch hẹn & Task',
      href: '/activities',
      icon: CalendarCheck,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Đội ngũ Sale & KPI',
      href: '/team',
      icon: Award,
      roles: ['ADMIN', 'LEADER'],
    },
    {
      label: 'Danh mục Sản phẩm',
      href: '/products',
      icon: Package,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Đơn hàng & Công nợ',
      href: '/orders',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Nhật ký kiểm toán',
      href: '/audit-logs',
      icon: History,
      roles: ['ADMIN', 'LEADER'],
    },
    {
      label: 'Cài đặt hệ thống',
      href: '/settings',
      icon: Settings,
      roles: ['ADMIN', 'LEADER'],
    },
  ];

  const filteredNav = navItems.filter(
    item => currentUser && item.roles.includes(currentUser.role)
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container - Green background, white text */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-emerald-800 border-r border-emerald-750 flex flex-col flex-shrink-0 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-emerald-700/60">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ZEN CRM Logo"
              className="h-10 w-10 rounded-xl object-cover shadow-md flex-shrink-0 ring-2 ring-white/30"
            />
            <div>
              <div className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
                ZEN CRM
                <span className="text-[10px] bg-emerald-700/80 text-emerald-100 border border-emerald-600/60 px-1.5 py-0.5 rounded font-mono font-semibold">
                  v1.0
                </span>
              </div>
              <div className="text-[11px] text-emerald-100/80">Hệ Thống Quản Trị Bán Hàng</div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={closeSidebar}
            className="p-1.5 rounded-lg text-emerald-100/80 hover:text-white hover:bg-emerald-700/60 lg:hidden transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-emerald-200/90 uppercase tracking-wider">
            Phân Hệ Quản Trị
          </div>

          {filteredNav.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white font-bold shadow-sm border border-emerald-600/60 ring-1 ring-emerald-500/30'
                    : 'text-white/90 hover:text-white hover:bg-emerald-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-100'}`} />
                  <span className={isActive ? 'text-white font-bold' : 'text-white font-medium'}>
                    {item.label}
                  </span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </Link>
            );
          })}
        </nav>

        {/* Install PWA Button */}
        <div className="px-3 pb-2">
          <button
            onClick={installApp}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-700/70 hover:bg-emerald-600/80 text-white border border-emerald-600/60 flex items-center justify-between text-xs font-semibold transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
              <span>{isInstalled ? 'Đã cài đặt App' : 'Cài App vào máy'}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500 text-white font-bold">App</span>
          </button>
        </div>

        {/* User Status Footer */}
        <div className="p-3 border-t border-emerald-700/60 bg-emerald-900/30">
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-900/50 border border-emerald-700/50 gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-white text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{currentUser?.name}</div>
                <div className="text-[10px] text-emerald-200 truncate font-medium">
                  {currentUser?.role === 'ADMIN'
                    ? 'Giám đốc (Director)'
                    : currentUser?.role === 'LEADER'
                    ? 'Quản lý (Manager)'
                    : currentUser?.role === 'STAFF'
                    ? 'Nhân viên Kỹ thuật'
                    : 'Chuyên viên Sale'}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Đăng xuất khỏi hệ thống"
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-rose-600/40 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <InstallPwaModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
}
