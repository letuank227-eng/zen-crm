'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { Lead } from '@/types/crm';

interface LeadAssignModalProps {
  lead: Lead;
  sales: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadAssignModal({
  lead,
  sales,
  onClose,
  onSuccess,
}: LeadAssignModalProps) {
  const { fetchWithAuth } = useAuth();
  const [mode, setMode] = useState<'transfer' | 'round_robin'>('transfer');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'transfer') {
      if (!selectedSaleId) {
        setErrorMsg('Vui lòng chọn nhân viên Sale mới!');
        return;
      }
      if (!reason.trim()) {
        setErrorMsg('Bắt buộc phải nhập lý do chuyển giao khách hàng!');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetchWithAuth(`/api/leads/${lead.id}/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newSaleId: selectedSaleId,
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          onSuccess();
          onClose();
        } else {
          const data = await res.json();
          setErrorMsg(data.error || 'Có lỗi xảy ra khi chuyển giao');
        }
      } catch (err) {
        console.error('Failed to transfer lead:', err);
        setErrorMsg('Lỗi kết nối');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Round-robin
      setIsSubmitting(true);
      try {
        const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoRoundRobin: true,
          }),
        });

        if (res.ok) {
          onSuccess();
          onClose();
        } else {
          const data = await res.json();
          setErrorMsg(data.error || 'Có lỗi xảy ra');
        }
      } catch (err) {
        console.error('Failed to auto assign lead:', err);
        setErrorMsg('Lỗi kết nối');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 text-xs max-h-[95vh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-800">Phân Công &amp; Chuyển Giao Khách</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
          <div>Khách hàng: <strong className="text-slate-900">{lead.fullName}</strong> ({lead.phone})</div>
          <div>Sale phụ trách hiện tại: <strong className="text-emerald-700">{lead.assignedSaleName || 'Chưa phân công'}</strong></div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab switch mode */}
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('transfer')}
            className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
              mode === 'transfer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Chuyển giao chỉ định
          </button>
          <button
            type="button"
            onClick={() => setMode('round_robin')}
            className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
              mode === 'round_robin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Chia đều Round-Robin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'transfer' ? (
            <>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Chọn Sale nhận bàn giao <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={selectedSaleId}
                  onChange={e => setSelectedSaleId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                  required
                >
                  <option value="">-- Chọn nhân viên kinh doanh --</option>
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.teamName || 'Sale'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Lý do chuyển giao (Ghi vào Audit Log) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="VD: Phân bổ lại theo khu vực địa bàn; Sale cũ chuyển công tác; Khách hàng yêu cầu..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </>
          ) : (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                Tự động chia đều cho Sale ít việc nhất
              </div>
              <p className="text-[11px] text-emerald-700">
                Thuật toán sẽ tự động quét số lượng Lead đang xử lý của tất cả nhân viên kinh doanh đang hoạt động và gán cho người có ít việc nhất để đảm bảo tính công bằng và thời gian phản hồi nhanh nhất.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận chuyển giao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
