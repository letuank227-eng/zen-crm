'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Sparkles } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!isLoading && !currentUser && !isAuthPage) {
      router.push('/login');
    }
  }, [isLoading, currentUser, isAuthPage, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
        <img
          src="/logo.png"
          alt="ZEN CRM Logo"
          className="w-16 h-16 rounded-2xl shadow-xl shadow-emerald-500/20 mb-4 animate-pulse object-cover ring-4 ring-emerald-500/20"
        />
        <div className="text-sm font-semibold tracking-wide text-white">Đang kết nối hệ thống ZEN CRM...</div>
        <div className="text-xs text-slate-400 mt-1">Đang xác thực thông tin tài khoản</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
        <div className="text-xs text-slate-400">Đang chuyển hướng tới trang Đăng nhập...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-screen overflow-hidden relative">
      {/* Left Sidebar (Desktop fixed, Mobile responsive drawer) */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 lg:pb-6 bg-slate-50">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
}
