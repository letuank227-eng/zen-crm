'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types/crm';
import { useRouter } from 'next/navigation';

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  companyCode: string;
  teamId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  users: [],
  isLoading: true,
  login: async () => ({ success: false, error: 'Chưa khởi tạo AuthContext' }),
  register: async () => ({ success: false, error: 'Chưa khởi tạo AuthContext' }),
  logout: async () => {},
  changePassword: async () => ({ success: false, error: 'Chưa khởi tạo AuthContext' }),
  fetchWithAuth: async () => new Response(),
  refreshSession: async () => {},
});

/**
 * Session state lives in an httpOnly signed cookie set by /api/auth/login; the browser
 * sends it automatically. The client never chooses which user it is.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsersAndSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/current', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setCurrentUser(data.currentUser || null);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clean up the legacy client-side id from older versions.
    if (typeof window !== 'undefined') localStorage.removeItem('zen_crm_user_id');
    fetchUsersAndSession();
  }, [fetchUsersAndSession]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đăng nhập không thành công' };
      }

      setCurrentUser(data.user);
      await fetchUsersAndSession();
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi đăng nhập' };
    }
  };

  // Self-registration is disabled server-side; kept for API compatibility.
  const register = async (_regData: RegisterData) => ({
    success: false,
    error: 'Chức năng tự đăng ký đã tắt. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.',
  });

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      setUsers([]);
      router.push('/login');
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đổi mật khẩu thất bại' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối' };
    }
  };

  const refreshSession = async () => {
    await fetchUsersAndSession();
  };

  // The session cookie is sent automatically; on 401 the session expired -> back to login.
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const res = await fetch(url, { ...options, credentials: 'same-origin' });
    if (res.status === 401 && currentUser) {
      setCurrentUser(null);
      router.push('/login');
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        fetchWithAuth,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
