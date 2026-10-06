'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Database,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  History,
  Layers,
  Sparkles,
  RotateCcw,
  HardDrive,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ServerSnapshot {
  id: string;
  createdAt: string;
  createdBy: string;
  description: string;
  summary: {
    usersCount: number;
    leadsCount: number;
    ordersCount: number;
    productsCount: number;
    dealsCount: number;
  };
}

interface BackupStatus {
  storageEngine: string;
  connected: boolean;
  stats: {
    usersCount: number;
    leadsCount: number;
    ordersCount: number;
    productsCount: number;
    dealsCount: number;
    teamsCount: number;
    tasksCount: number;
    auditLogsCount: number;
  };
  snapshots: ServerSnapshot[];
  lastBackupAt: string | null;
}

export default function ServerBackupManager() {
  const { fetchWithAuth, currentUser } = useAuth();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [targetRestore, setTargetRestore] = useState<{
    type: 'snapshot' | 'file';
    snapshotId?: string;
    fileData?: any;
    label: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/settings/backup?action=status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err: any) {
      console.error('Failed fetching backup status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchStatus();
    }
  }, [currentUser]);

  // Handle creating a new snapshot on the server
  const handleCreateSnapshot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (creating) return;
    try {
      setCreating(true);
      const res = await fetchWithAuth('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: customNote.trim() || 'Bản sao lưu thủ công an toàn máy chủ',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg('✔ Đã tạo bản sao lưu Snapshot trên máy chủ thành công!', 'success');
        setCustomNote('');
        fetchStatus();
      } else {
        showMsg(data.error || 'Không thể tạo bản sao lưu máy chủ', 'error');
      }
    } catch (err: any) {
      showMsg(err.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle downloading JSON backup file
  const handleDownloadJson = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/backup?action=download');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZEN_CRM_BACKUP_FULL_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showMsg('✔ Đã tải tệp tin sao lưu JSON toàn bộ CRM về máy!', 'success');
      } else {
        showMsg('Lỗi khi tải tệp sao lưu JSON', 'error');
      }
    } catch (err: any) {
      showMsg('Không thể tải tệp tin: ' + err.message, 'error');
    }
  };

  // Handle downloading Excel backup file
  const handleDownloadExcel = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/backup');
      if (res.ok) {
        const backupPayload = await res.json();
        const db = backupPayload.data;
        const wb = XLSX.utils.book_new();

        if (db.leads) {
          const wsLeads = XLSX.utils.json_to_sheet(db.leads);
          XLSX.utils.book_append_sheet(wb, wsLeads, 'KhachHang_Leads');
        }
        if (db.deals) {
          const wsDeals = XLSX.utils.json_to_sheet(db.deals);
          XLSX.utils.book_append_sheet(wb, wsDeals, 'CoHoi_Deals');
        }
        if (db.orders) {
          const wsOrders = XLSX.utils.json_to_sheet(db.orders);
          XLSX.utils.book_append_sheet(wb, wsOrders, 'DonHang_Orders');
        }
        if (db.products) {
          const wsProducts = XLSX.utils.json_to_sheet(db.products);
          XLSX.utils.book_append_sheet(wb, wsProducts, 'SanPham_Products');
        }
        if (db.users) {
          const wsUsers = XLSX.utils.json_to_sheet(
            db.users.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              phone: u.phone,
              teamId: u.teamId,
              isLocked: u.isLocked,
            }))
          );
          XLSX.utils.book_append_sheet(wb, wsUsers, 'NhanVien_Users');
        }
        if (db.auditLogs) {
          const wsAudit = XLSX.utils.json_to_sheet(db.auditLogs);
          XLSX.utils.book_append_sheet(wb, wsAudit, 'NhatKy_AuditLog');
        }

        XLSX.writeFile(wb, `BACKUP_TOAN_BO_ZEN_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showMsg('✔ Đã xuất tệp báo cáo Excel sao lưu toàn bộ dữ liệu!', 'success');
      }
    } catch (err: any) {
      showMsg('Lỗi khi xuất file Excel: ' + err.message, 'error');
    }
  };

  // Handle file upload for JSON restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const dataToRestore = parsed.data || parsed;

        if (!dataToRestore.users || !dataToRestore.products) {
          showMsg('Tệp tin không đúng định dạng CRM (thiếu bảng dữ liệu cần thiết)', 'error');
          return;
        }

        setTargetRestore({
          type: 'file',
          fileData: dataToRestore,
          label: `Tệp tải lên: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        });
        setRestoreModalOpen(true);
      } catch (err) {
        showMsg('Tệp tin JSON không hợp lệ, không thể đọc dữ liệu', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute restore
  const handleConfirmRestore = async () => {
    if (!targetRestore || restoring) return;
    try {
      setRestoring(true);
      const payload =
        targetRestore.type === 'snapshot'
          ? { snapshotId: targetRestore.snapshotId }
          : { data: targetRestore.fileData };

      const res = await fetchWithAuth('/api/settings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        showMsg('🎉 Khôi phục dữ liệu thành công! Đang tải lại dữ liệu...', 'success');
        setRestoreModalOpen(false);
        setTargetRestore(null);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showMsg(resData.error || 'Khôi phục dữ liệu thất bại', 'error');
      }
    } catch (err: any) {
      showMsg('Lỗi khi khôi phục: ' + err.message, 'error');
    } finally {
      setRestoring(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Hidden file input for restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Mục Quản Trị: Sao Lưu &amp; Khôi Phục Dữ Liệu Máy Chủ
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Bảo vệ chống mất dữ liệu
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Lưu trữ snapshot dự phòng định kỳ trên máy chủ, tải tệp tin sao lưu và khôi phục dữ liệu CRM an toàn tuyệt đối.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Làm mới trạng thái"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Notification banner */}
      {msg && (
        <div
          className={`p-3.5 text-xs font-semibold flex items-center gap-2 border-b ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Status Engine Banner & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Storage Engine Status */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Hạ tầng lưu trữ máy chủ:</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
              <div className="mt-2 text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{status?.storageEngine || 'Đang kết nối...'}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Dữ liệu được lưu trữ trực tiếp trên đám mây máy chủ phân tán có mã hóa và kiểm soát phiên bản (Version Locking).
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Snapshot gần nhất:
              </span>
              <span className="font-semibold text-emerald-300">
                {status?.lastBackupAt
                  ? new Date(status.lastBackupAt).toLocaleString('vi-VN')
                  : 'Chưa có bản snapshot'}
              </span>
            </div>
          </div>

          {/* Quick Metrics of DB */}
          <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Số lượng dữ liệu thực tế đang vận hành trên máy chủ:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Khách hàng</div>
                  <div className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                    {status?.stats?.leadsCount ?? '...'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Đơn hàng</div>
                  <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                    {status?.stats?.ordersCount ?? '...'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Sản phẩm</div>
                  <div className="text-base sm:text-lg font-black text-blue-600 mt-0.5">
                    {status?.stats?.productsCount ?? '...'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Tài khoản &amp; Nhóm</div>
                  <div className="text-base sm:text-lg font-black text-purple-600 mt-0.5">
                    {status?.stats?.usersCount ?? '...'} ({status?.stats?.teamsCount ?? '0'} nhóm)
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>
                Toàn bộ dữ liệu trên luôn được bao gồm trong mỗi tệp tin sao lưu và mỗi snapshot máy chủ.
              </span>
            </div>
          </div>
        </div>

        {/* Action Panel: Create Snapshot & Export Buttons */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Tạo Bản Sao Lưu Snapshot Ngay Trên Máy Chủ</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Lưu lại trạng thái toàn bộ dữ liệu hiện thời vào kho sao lưu máy chủ để sẵn sàng khôi phục nếu cần.
              </p>
            </div>

            <form
              onSubmit={handleCreateSnapshot}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto"
            >
              <input
                type="text"
                placeholder="Ghi chú snapshot (VD: Chốt số cuối tuần...)"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs min-w-[220px]"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                {creating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                <span>+ Tạo Snapshot Máy Chủ</span>
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-emerald-200/60 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-700 mr-1 flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Tải tệp dự phòng về máy tính:
            </span>

            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-600" />
              <span>Tải Full CRM (.JSON)</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Báo Cáo Excel (.XLSX)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Khôi Phục Từ Tệp JSON...</span>
            </button>
          </div>
        </div>

        {/* Snapshots Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <span>Lịch Sử Bản Sao Lưu Snapshot Trên Máy Chủ</span>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {status?.snapshots?.length || 0} bản lưu
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Hệ thống tự động lưu trữ tối đa 10 bản snapshot mới nhất
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              <span>Đang tải danh sách bản sao lưu máy chủ...</span>
            </div>
          ) : !status?.snapshots || status.snapshots.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
              <Database className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600">
                Chưa có bản sao lưu snapshot nào trên máy chủ.
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Bấm vào nút <strong>&quot;Tạo Snapshot Máy Chủ&quot;</strong> ở trên để tạo ngay bản sao lưu an toàn đầu tiên.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Mã Snapshot</th>
                    <th className="py-2.5 px-3">Thời Gian Tạo</th>
                    <th className="py-2.5 px-3">Người Tạo</th>
                    <th className="py-2.5 px-3">Ghi Chú</th>
                    <th className="py-2.5 px-3">Quy Mô Dữ Liệu</th>
                    <th className="py-2.5 px-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {status.snapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-[11px] font-bold text-slate-700">
                        {snap.id}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {new Date(snap.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {snap.createdBy}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate" title={snap.description}>
                        {snap.description || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          {snap.summary?.leadsCount ?? 0}
                        </span>{' '}
                        khách •{' '}
                        <span className="font-semibold text-slate-700">
                          {snap.summary?.ordersCount ?? 0}
                        </span>{' '}
                        đơn •{' '}
                        <span className="font-semibold text-slate-700">
                          {snap.summary?.productsCount ?? 0}
                        </span>{' '}
                        SP
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => {
                            setTargetRestore({
                              type: 'snapshot',
                              snapshotId: snap.id,
                              label: `Bản snapshot máy chủ: ${snap.id} (${new Date(
                                snap.createdAt
                              ).toLocaleString('vi-VN')})`,
                            });
                            setRestoreModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          <span>Khôi phục</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {restoreModalOpen && targetRestore && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setTargetRestore(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                Xác nhận khôi phục dữ liệu hệ thống?
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Bạn đang chuẩn bị khôi phục cơ sở dữ liệu CRM về:
              </p>
              <div className="mt-2 p-3 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800 border border-slate-200">
                {targetRestore.label}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo vệ an toàn tuyệt đối:</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Hệ thống sẽ <strong>tự động tạo 1 bản Snapshot dự phòng ngay lập tức</strong> trước khi khôi phục, nên bạn luôn có thể quay ngược lại bất cứ lúc nào.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreModalOpen(false);
                  setTargetRestore(null);
                }}
                disabled={restoring}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer transition-all"
              >
                {restoring ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Xác nhận khôi phục ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
