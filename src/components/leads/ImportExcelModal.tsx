'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';

interface ImportExcelModalProps {
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  sales: any[];
}

export default function ImportExcelModal({
  onClose,
  onImportSuccess,
  sales,
}: ImportExcelModalProps) {
  const { fetchWithAuth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);

  // Column Mapping
  const [mapping, setMapping] = useState<{
    fullName: string;
    phone: string;
    email: string;
    company: string;
    address: string;
    source: string;
    tags: string;
  }>({
    fullName: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    source: '',
    tags: '',
  });

  // Assignment Options
  const [assignmentMode, setAssignmentMode] = useState<'round_robin' | 'manual'>('round_robin');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [defaultSource, setDefaultSource] = useState<string>('Import Excel');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (!data || data.length < 2) {
          setErrorMsg('File Excel không có dữ liệu hàng.');
          return;
        }

        const headers = (data[0] || []).map(h => String(h).trim()).filter(Boolean);
        setSheetHeaders(headers);

        const rows = data.slice(1).map(r => {
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = r[idx] !== undefined ? String(r[idx]).trim() : '';
          });
          return rowObj;
        });
        setRawData(rows);

        // Auto guess mappings
        const newMap = { ...mapping };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('họ tên') || lower.includes('tên') || lower.includes('name')) newMap.fullName = h;
          else if (lower.includes('sđt') || lower.includes('điện thoại') || lower.includes('phone')) newMap.phone = h;
          else if (lower.includes('mail')) newMap.email = h;
          else if (lower.includes('công ty') || lower.includes('company')) newMap.company = h;
          else if (lower.includes('địa chỉ') || lower.includes('address')) newMap.address = h;
          else if (lower.includes('nguồn') || lower.includes('source')) newMap.source = h;
          else if (lower.includes('tag') || lower.includes('nhãn')) newMap.tags = h;
        });
        setMapping(newMap);
      } catch (err) {
        console.error('Failed to parse excel file:', err);
        setErrorMsg('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleStartImport = async () => {
    if (!mapping.fullName || !mapping.phone) {
      setErrorMsg('Bắt buộc phải chọn mapping cho cột Họ tên và Số điện thoại!');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const mappedRows = rawData.map(r => ({
        fullName: r[mapping.fullName] || '',
        phone: r[mapping.phone] || '',
        email: mapping.email ? r[mapping.email] : '',
        company: mapping.company ? r[mapping.company] : '',
        address: mapping.address ? r[mapping.address] : '',
        source: mapping.source ? r[mapping.source] : defaultSource,
        tags: mapping.tags ? r[mapping.tags] : '',
      }));

      const res = await fetchWithAuth('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: mappedRows,
          autoRoundRobin: assignmentMode === 'round_robin',
          assignedSaleId: assignmentMode === 'manual' ? selectedSaleId : undefined,
          defaultSource,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        onImportSuccess(result.importedCount || 0);
        onClose();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Có lỗi khi import dữ liệu');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg('Lỗi kết nối khi gửi dữ liệu lên máy chủ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <h3 className="font-bold text-sm sm:text-base truncate">Import Danh Sách Khách Hàng (Excel/CSV)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD FILE */}
          {!file ? (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
              <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-3 animate-bounce" />
              <div className="font-bold text-slate-800 text-sm mb-1">
                Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây
              </div>
              <div className="text-slate-500 text-xs mb-4">Hỗ trợ file danh sách khách hàng từ các chiến dịch, landing page</div>
              <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer shadow-sm">
                Chọn file từ máy tính
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã nạp file: <strong>{file.name}</strong> ({rawData.length} hàng dữ liệu)</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setRawData([]);
                    setSheetHeaders([]);
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600 underline"
                >
                  Chọn file khác
                </button>
              </div>

              {/* STEP 2: COLUMN MAPPING */}
              <div className="space-y-3">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Cấu hình Mapping cột (Trường CRM &lt;-&gt; Cột trong Excel)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">
                      Họ và tên khách hàng <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mapping.fullName}
                      onChange={e => setMapping({ ...mapping, fullName: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Chọn cột Họ tên --</option>
                      {sheetHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mapping.phone}
                      onChange={e => setMapping({ ...mapping, phone: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Chọn cột Số điện thoại --</option>
                      {sheetHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">Email</label>
                    <select
                      value={mapping.email}
                      onChange={e => setMapping({ ...mapping, email: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- (Không bắt buộc) --</option>
                      {sheetHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">Tên Công ty (B2B)</label>
                    <select
                      value={mapping.company}
                      onChange={e => setMapping({ ...mapping, company: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- (Không bắt buộc) --</option>
                      {sheetHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">Địa chỉ</label>
                    <select
                      value={mapping.address}
                      onChange={e => setMapping({ ...mapping, address: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- (Không bắt buộc) --</option>
                      {sheetHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">Nguồn khách hàng</label>
                    <select
                      value={mapping.source}
                      onChange={e => setMapping({ ...mapping, source: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Chọn cột nguồn hoặc dùng mặc định --</option>
                      {sheetHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 3: ASSIGNMENT OPTIONS */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  Cơ chế Phân công cho Sale
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setAssignmentMode('round_robin')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                      assignmentMode === 'round_robin'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={assignmentMode === 'round_robin'}
                      onChange={() => setAssignmentMode('round_robin')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Tự động chia đều (Round-Robin)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Chia xoay vòng cho các Sale đang trực tuyến / ít việc nhất.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setAssignmentMode('manual')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                      assignmentMode === 'manual'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={assignmentMode === 'manual'}
                      onChange={() => setAssignmentMode('manual')}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800">Gán cho 1 Sale cụ thể</div>
                      <select
                        disabled={assignmentMode !== 'manual'}
                        value={selectedSaleId}
                        onChange={e => setSelectedSaleId(e.target.value)}
                        className="mt-1 w-full p-1.5 bg-white border border-slate-300 rounded text-xs outline-none"
                      >
                        <option value="">-- Chọn nhân viên Sale --</option>
                        {sales.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
              </div>

              {/* STEP 4: PREVIEW FIRST 3 ROWS */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Xem trước 3 dòng dữ liệu sau khi Map:
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="p-2">Họ tên</th>
                        <th className="p-2">SĐT</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Công ty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {rawData.slice(0, 3).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-medium">{r[mapping.fullName] || <span className="text-rose-500 font-semibold">[Thiếu]</span>}</td>
                          <td className="p-2 font-medium">{r[mapping.phone] || <span className="text-rose-500 font-semibold">[Thiếu]</span>}</td>
                          <td className="p-2 text-slate-500">{mapping.email ? r[mapping.email] : '-'}</td>
                          <td className="p-2 text-slate-500">{mapping.company ? r[mapping.company] : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-medium"
          >
            Đóng
          </button>

          {file && (
            <button
              type="button"
              disabled={isProcessing || !mapping.fullName || !mapping.phone}
              onClick={handleStartImport}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              {isProcessing ? (
                <span>Đang xử lý import...</span>
              ) : (
                <>
                  <span>Bắt đầu Import ({rawData.length} dòng)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
