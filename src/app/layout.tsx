import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { DateFilterProvider } from '@/context/DateFilterContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { PwaProvider } from '@/context/PwaInstallContext';
import AppShell from '@/components/layout/AppShell';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#065f46',
};

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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#065f46" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ZEN CRM" />
        <meta name="application-name" content="ZEN CRM" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }

              // Khóa hoàn toàn phóng to / thu nhỏ (Pinch-to-zoom) trên iOS & Android
              document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
              document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
              document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 w-full overflow-x-hidden touch-manipulation">
        <PwaProvider>
          <AuthProvider>
            <DateFilterProvider>
              <SidebarProvider>
                <AppShell>{children}</AppShell>
              </SidebarProvider>
            </DateFilterProvider>
          </AuthProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
