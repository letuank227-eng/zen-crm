'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  History,
  Shield,
  Search,
  Filter,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { AuditLog } from '@/types/crm';
import { formatDateTime } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';

export default function AuditLogsPage() {
  const { fetchWithAuth, currentUser } = useAuth();
  const { dateFrom, dateTo } = useDateFilter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (entityFilter !== 'ALL') params.set('entityType', entityFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetchWithAuth(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLogs();
    }
  }, [currentUser, actionFilter, entityFilter, dateFrom, dateTo]);

  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredLogs = useMemo(() => {
    if (!debouncedSearch.trim()) return logs;
    const term = debouncedSearch.toLowerCase();
    return logs.filter(
      l =>
        l.userName.toLowerCase().includes(term) ||
        l.details.toLowerCase().includes(term) ||
        (l.reason && l.reason.toLowerCase().includes(term))
    );
  }, [logs, debouncedSearch]);

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-flex items-center">TẠO MỚI</span>;
      case 'UPDATE':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap inline-flex items-center">CẬP NHẬT</span>;
      case 'TRANSFER':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap inline-flex items-center">CHUYỂN GIAO</span>;
      case 'STAGE_CHANGE':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap inline-flex items-center">ĐỔI GIAI ĐOẠN</span>;
      case 'DELETE':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap inline-flex items-center">XÓA DỮ LIỆU</span>;
      case 'IMPORT':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap inline-flex items-center">IMPORT EXCEL</span>;
      case 'EXPORT':
        return <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap inline-flex items-center">XUẤT FILE</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
            <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Bảo mật 24/7</span>
          </span>
        </div>
      </div>

      {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
      <DatePeriodFilter />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo người thực hiện, nội dung..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700"
          >
            <option value="ALL">-- Tất cả hành động --</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="TRANSFER">Chuyển giao khách</option>
            <option value="STAGE_CHANGE">Đổi giai đoạn Deal</option>
            <option value="DELETE">Xóa</option>
            <option value="IMPORT">Import Excel</option>
            <option value="EXPORT">Xuất file</option>
          </select>

          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700"
          >
            <option value="ALL">-- Tất cả phân hệ --</option>
            <option value="LEAD">Khách hàng / Lead</option>
            <option value="DEAL">Cơ hội bán hàng</option>
            <option value="ORDER">Đơn hàng</option>
            <option value="TASK">Công việc &amp; Lịch hẹn</option>
            <option value="USER">Nhân viên / User</option>
            <option value="SETTINGS">Cấu hình hệ thống</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-500">
          Tổng số <strong>{filteredLogs.length}</strong> bản ghi
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Thời gian</th>
                <th className="py-3 px-4 whitespace-nowrap">Người thực hiện</th>
                <th className="py-3 px-4 whitespace-nowrap">Hành động</th>
                <th className="py-3 px-4 whitespace-nowrap">Phân hệ</th>
                <th className="py-3 px-4">Chi tiết thao tác</th>
                <th className="py-3 px-4 whitespace-nowrap">Lý do / Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-800">{log.userName}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded text-[10px] whitespace-nowrap inline-block">
                      {log.entityType}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-800 font-medium">
                    {log.details}
                    {log.previousValue && log.newValue && (
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="line-through">{log.previousValue}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-emerald-700">{log.newValue}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {log.reason ? (
                      <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-medium">
                        {log.reason}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy bản ghi kiểm toán nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
