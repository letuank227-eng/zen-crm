'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Users, UserCheck, Wrench } from 'lucide-react';

export default function DemoRoleSwitcher() {
  const { currentUser, users, switchUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="bg-slate-900 text-slate-100 text-xs py-1.5 px-3 sm:px-4 border-b border-slate-800 flex items-center justify-between gap-2 z-40 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-slate-300 text-[11px] sm:text-xs">DEMO ROLES:</span>
        <span className="text-slate-400 hidden lg:inline text-[11px]">Chuyển đổi vai trò test phân quyền RBAC:</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap flex-shrink-0">
        {users.map(u => {
          const isActive = u.id === currentUser.id;
          let roleBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
          if (u.role === 'ADMIN') roleBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
          if (u.role === 'LEADER') roleBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
          if (u.role === 'STAFF') roleBadge = 'bg-teal-500/20 text-teal-300 border-teal-500/40';

          return (
            <button
              key={u.id}
              onClick={() => switchUser(u.id)}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 border font-medium text-[11px] flex-shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={`${u.name} - ${u.email}`}
            >
              {u.role === 'ADMIN' && <Shield className="w-3 h-3 text-rose-400" />}
              {u.role === 'LEADER' && <Users className="w-3 h-3 text-amber-400" />}
              {u.role === 'STAFF' && <Wrench className="w-3 h-3 text-teal-400" />}
              {u.role === 'SALE' && <UserCheck className="w-3 h-3 text-blue-400" />}
              <span className="truncate max-w-[90px] sm:max-w-none">{u.name}</span>
              <span className={`text-[9px] sm:text-[10px] px-1 py-0.2 rounded border ${roleBadge}`}>
                {u.role === 'ADMIN' ? 'Admin' : u.role === 'LEADER' ? 'Quản lý' : u.role === 'STAFF' ? 'Kỹ thuật' : 'Sale'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
