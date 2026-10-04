'use client';

import React, { useState } from 'react';
import { Smartphone, Download, X, QrCode, Share2, PlusSquare, Check, Copy } from 'lucide-react';
import { usePwa } from '@/context/PwaInstallContext';

export default function InstallPwaModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isIOS, isInstalled, installApp } = usePwa();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://zen-crm-two.vercel.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectInstall = async () => {
    await installApp();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cài Đặt App ZEN CRM</h3>
              <p className="text-xs text-emerald-200">Tự động cài đặt thẳng vào máy của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-emerald-900">
                Ứng dụng ZEN CRM đã được cài trên máy của bạn!
              </p>
              <p className="text-xs text-emerald-700">
                Bạn có thể mở trực tiếp từ biểu tượng trên màn hình chính bất cứ lúc nào.
              </p>
            </div>
          ) : (
            <>
              {/* Direct Install Button */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <p className="text-xs text-emerald-800 font-medium">
                  Bấm nút bên dưới để hệ thống tự động cài đặt ứng dụng thẳng vào máy:
                </p>
                <button
                  onClick={handleDirectInstall}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Bấm Vào Đây Để Cài Đặt Thẳng Vào Máy
                </button>
              </div>

              {/* iOS Safari Special Step (Only on iOS because Apple does not allow 1-click JS install) */}
              {isIOS && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Thao tác trên iPhone / iPad (Safari)
                  </div>
                  <ol className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Bấm nút <strong>Chia sẻ</strong> (biểu tượng hình vuông có mũi tên{' '}
                        <Share2 className="inline w-3.5 h-3.5 text-blue-600" /> ở dưới cùng Safari).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Cuộn xuống chọn <strong>&quot;Thêm vào MH chính&quot;</strong> (Add to Home Screen{' '}
                        <PlusSquare className="inline w-3.5 h-3.5 text-emerald-600" />) rồi bấm <strong>Thêm</strong>.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* QR Code Section for scanning from Computer to Phone */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Hoặc quét mã để tải về điện thoại:
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fzen-crm-two.vercel.app"
                  alt="QR Code ZEN CRM"
                  className="w-28 h-28 rounded-xl bg-white p-2 shadow-sm border border-slate-200"
                />
                <p className="text-[11px] text-slate-500">
                  Dùng Camera điện thoại quét mã để mở và cài App ngay lập tức.
                </p>
              </div>

              {/* Copy Link button */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value="https://zen-crm-two.vercel.app"
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Đã sao chép' : 'Sao chép link'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
