import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { DateFilterProvider } from '@/context/DateFilterContext';
import { SidebarProvider } from '@/context/SidebarContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'ZEN CRM - Hệ Thống Quản Trị Khách Hàng & Bán Hàng Toàn Diện',
  description: 'Giải pháp CRM chuẩn Enterprise: Đăng nhập phân quyền, Quản lý Lead, Pipeline Kanban, Lịch hẹn, Đội Sale & KPI, Báo cáo Funnel, Công nợ và Audit Log.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
        <AuthProvider>
          <DateFilterProvider>
            <SidebarProvider>
              <AppShell>{children}</AppShell>
            </SidebarProvider>
          </DateFilterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
