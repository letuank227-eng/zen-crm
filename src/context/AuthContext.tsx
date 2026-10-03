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
  switchUser: (userId: string) => void;
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
  switchUser: () => {},
  fetchWithAuth: async () => new Response(),
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsersAndSession = useCallback(async (preferredUserId?: string) => {
    try {
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('zen_crm_user_id') : null;
      const activeId = preferredUserId !== undefined ? preferredUserId : storedId;

      const url = activeId ? `/api/auth/current?userId=${encodeURIComponent(activeId)}` : '/api/auth/current';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.currentUser) {
          setCurrentUser(data.currentUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('zen_crm_user_id', data.currentUser.id);
          }
        } else {
          setCurrentUser(null);
          if (typeof window !== 'undefined' && !activeId) {
            localStorage.removeItem('zen_crm_user_id');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('zen_crm_user_id', data.user.id);
      }
      await fetchUsersAndSession(data.user.id);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi đăng nhập' };
    }
  };

  const register = async (regData: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đăng ký không thành công' };
      }

      setCurrentUser(data.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('zen_crm_user_id', data.user.id);
      }
      await fetchUsersAndSession(data.user.id);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi đăng ký' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zen_crm_user_id');
      }
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

  const switchUser = (userId: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zen_crm_user_id', userId);
    }
    fetchUsersAndSession(userId);
  };

  const refreshSession = async () => {
    await fetchUsersAndSession();
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (currentUser?.id) {
      headers.set('x-user-id', currentUser.id);
    }
    return fetch(url, { ...options, headers });
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
        switchUser,
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
