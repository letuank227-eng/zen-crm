'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import {
  LayoutDashboard,
  Users2,
  CalendarCheck,
  FileSpreadsheet,
  Menu,
} from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { toggleSidebar, isOpen } = useSidebar();

  if (!currentUser) return null;

  const navItems = [
    {
      label: 'Tổng quan',
      href: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Khách hàng',
      href: '/leads',
      icon: Users2,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Lịch hẹn',
      href: '/activities',
      icon: CalendarCheck,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
    {
      label: 'Đơn hàng',
      href: '/orders',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'LEADER', 'SALE', 'STAFF'],
    },
  ];

  const visibleItems = navItems.filter(item =>
    item.roles.includes(currentUser.role)
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-area-pb" style={{ zIndex: 40 }}>
      <div className="grid grid-cols-5 h-14 items-center">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center h-full py-1 transition-colors ${
                isActive
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-500'} transition-transform`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu toggle button */}
        <button
          onClick={toggleSidebar}
          className={`flex flex-col items-center justify-center h-full py-1 transition-colors ${
            isOpen
              ? 'text-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
          aria-label="Mở menu hệ thống"
        >
          <Menu className={`w-5 h-5 ${isOpen ? 'text-emerald-600 scale-110' : 'text-slate-500'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}
