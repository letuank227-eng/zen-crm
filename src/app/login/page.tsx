'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePwa } from '@/context/PwaInstallContext';
import InstallPwaModal from '@/components/common/InstallPwaModal';
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Smartphone,
  Download,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { installApp, showGuide, setShowGuide, isInstalled } = usePwa();

  // Login form state - all fields initially empty
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');

    if (!loginIdentifier.trim()) {
      setLoginError('Vui lòng nhập địa chỉ Gmail hoặc Email');
      return;
    }
    if (!loginPassword) {
      setLoginError('Vui lòng nhập mật khẩu');
      return;
    }

    setLoginLoading(true);
    const result = await login(loginIdentifier.trim(), loginPassword.trim());
    setLoginLoading(false);

    if (result.success) {
      setLoginSuccess('Đăng nhập thành công! Đang chuyển hướng vào hệ thống...');
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } else {
      setLoginError(result.error || 'Đăng nhập không thành công');
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-emerald-50/30 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-slate-800 overflow-hidden">
      {/* Decorative subtle green ambient glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-80 h-80 bg-teal-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md text-center mb-7">
        <div className="inline-block relative mb-3">
          <img
            src="/logo.png"
            alt="ZEN CRM"
            className="w-20 h-20 rounded-3xl shadow-xl shadow-emerald-900/15 mx-auto object-cover ring-4 ring-emerald-500/20 transition-transform hover:scale-105"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-2">
          <span>ZEN CRM</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Enterprise
          </span>
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          Hệ thống Quản trị Khách hàng &amp; Bán hàng Doanh nghiệp
        </p>
      </div>

      {/* Login Card */}
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-emerald-100 rounded-2xl shadow-xl shadow-emerald-950/5 overflow-hidden p-6 sm:p-8">
          {/* Card Header Title */}
          <div className="flex items-center justify-center pb-4 border-b border-emerald-100 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <KeyRound className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Đăng Nhập Hệ Thống
              </h2>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Error Message */}
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Success Message */}
            {loginSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{loginSuccess}</span>
              </div>
            )}

            {/* Input Gmail / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gmail hoặc Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  placeholder="Nhập địa chỉ Gmail hoặc Email"
                  className="block w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                  aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Direct Install App Button on Mobile & PC */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={installApp}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>{isInstalled ? '✓ Ứng Dụng Đã Cài Đặt Trên Máy' : 'Cài Đặt App Vào Điện Thoại (1 Chạm)'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center text-xs text-slate-400">
          ZEN CRM Cloud &copy; 2026. Chuẩn bảo mật phân quyền Role-Based Access Control (RBAC).
        </div>
      </div>

      <InstallPwaModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
}
