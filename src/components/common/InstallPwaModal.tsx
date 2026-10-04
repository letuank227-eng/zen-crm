'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, QrCode, Share2, PlusSquare, Check, Copy } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPwaModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if already in standalone (app mode)
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isApp);

    // Capture beforeinstallprompt for Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://zen-crm-two.vercel.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
              <p className="text-xs text-emerald-200">Sử dụng mượt mà như app gốc trên điện thoại</p>
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
          {isStandalone ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-emerald-900">
                Bạn đang sử dụng phiên bản App ZEN CRM!
              </p>
              <p className="text-xs text-emerald-700">
                Ứng dụng đã được cài đặt thành công trên màn hình thiết bị của bạn.
              </p>
            </div>
          ) : (
            <>
              {/* Native Prompt button if supported */}
              {deferredPrompt && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <p className="text-xs text-emerald-800 font-medium">
                    Thiết bị của bạn hỗ trợ cài đặt tự động chỉ với 1 chạm:
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Cài Đặt App Lên Màn Hình Ngay
                  </button>
                </div>
              )}

              {/* iPhone / iPad (iOS) Instructions */}
              {isIOS ? (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Hướng dẫn cài đặt trên iPhone / iPad (Safari)
                  </div>
                  <ol className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Mở bằng trình duyệt <strong>Safari</strong> trên iPhone.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Bấm nút <strong>Chia sẻ</strong> (biểu tượng hình vuông có mũi tên{' '}
                        <Share2 className="inline w-3.5 h-3.5 text-blue-600" /> ở thanh dưới cùng).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Cuộn xuống chọn <strong>&quot;Thêm vào MH chính&quot;</strong> (Add to Home Screen{' '}
                        <PlusSquare className="inline w-3.5 h-3.5 text-emerald-600" />) rồi bấm <strong>Thêm</strong>.
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome Instructions if native prompt not triggered */
                !deferredPrompt && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Hướng dẫn cài đặt trên Android / Google Chrome
                    </div>
                    <ol className="space-y-2.5 text-xs text-slate-700">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Nhấn vào biểu tượng <strong>Menu 3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Chọn <strong>&quot;Cài đặt ứng dụng&quot;</strong> hoặc <strong>&quot;Thêm vào Màn hình chính&quot;</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          Biểu tượng <strong>ZEN CRM</strong> sẽ xuất hiện trên màn hình điện thoại như một App thông thường!
                        </span>
                      </li>
                    </ol>
                  </div>
                )
              )}

              {/* QR Code Section for scanning from Computer to Phone */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center text-center space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  Quét mã mở trên Điện thoại:
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fzen-crm-two.vercel.app"
                  alt="QR Code ZEN CRM"
                  className="w-32 h-32 rounded-xl bg-white p-2 shadow-sm border border-emerald-200"
                />
                <p className="text-[11px] text-slate-500">
                  Dùng Camera điện thoại quét mã trên để mở trang đăng nhập và cài app ngay lập tức.
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
