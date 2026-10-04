'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Bell, BellRing, BellOff, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePwa } from '@/context/PwaInstallContext';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager({ compact = false }: { compact?: boolean }) {
  const { currentUser, fetchWithAuth } = useAuth();
  const { isIOS, isInstalled, setShowGuide } = usePwa();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      if (supported) {
        checkCurrentSubscription();
      }
    }
  }, []);

  const checkCurrentSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err) {
      console.warn('Lỗi kiểm tra subscription:', err);
    }
  };

  const subscribePush = async () => {
    setLoading(true);
    setErrorMsg('');
    setTestStatus('');

    try {
      if (!isSupported) {
        if (isIOS && !isInstalled) {
          setShowGuide(true);
          throw new Error('Trên iPhone/iPad, bạn cần bấm Chia sẻ -> "Thêm vào Màn hình chính" trước khi bật thông báo.');
        }
        throw new Error('Trình duyệt hoặc thiết bị này không hỗ trợ Web Push Notification.');
      }

      // Xin quyền Notification nếu chưa cấp
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        throw new Error('Quyền thông báo bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt của bạn.');
      }

      // Đăng ký Service Worker nếu chưa sẵn sàng
      const reg = await navigator.serviceWorker.ready;

      // Lấy VAPID public key
      const keyRes = await fetch('/api/push/public-key');
      if (!keyRes.ok) throw new Error('Không thể tải mã bảo mật VAPID từ server');
      const { publicKey } = await keyRes.json();

      // Subscribe với PushManager
      const convertedKey = urlBase64ToUint8Array(publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // Gửi subscription lên Backend lưu vào DB
      const saveRes = await fetchWithAuth('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || 'Lỗi khi lưu thông tin thiết bị lên máy chủ');
      }

      setIsSubscribed(true);
      setTestStatus('Đã kết nối thành công! Thiết bị sẽ nhận thông báo khi có đơn mới.');
    } catch (err: any) {
      console.error('Lỗi bật thông báo:', err);
      setErrorMsg(err.message || 'Không thể bật thông báo.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribePush = async () => {
    setLoading(true);
    setErrorMsg('');
    setTestStatus('');

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await fetchWithAuth('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
      setTestStatus('Đã tắt nhận thông báo đẩy trên thiết bị này.');
    } catch (err: any) {
      console.error('Lỗi hủy thông báo:', err);
      setErrorMsg(err.message || 'Lỗi khi hủy thông báo');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    setLoading(true);
    setErrorMsg('');
    setTestStatus('');

    try {
      const res = await fetchWithAuth('/api/push/test', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Không thể gửi thông báo thử nghiệm');
      }
      setTestStatus(data.message || 'Đã gửi thông báo thử nghiệm thành công! Hãy kiểm tra thanh thông báo điện thoại.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gửi test');
    } finally {
      setLoading(false);
    }
  };

  const isAdminOrLeader = currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER';

  if (compact) {
    return (
      <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200/80 text-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-emerald-950">
            <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Thông báo đẩy trên điện thoại</span>
          </div>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Đã bật
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
              Chưa bật
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
          {isAdminOrLeader
            ? 'Khi Sale chốt đơn hàng mới, máy điện thoại của bạn sẽ rung và sáng màn hình báo ngay lập tức.'
            : 'Nhận thông báo khi đơn hàng được duyệt, chuyển giao hoặc hoàn thành.'}
        </p>

        {errorMsg && (
          <div className="mb-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px] flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {testStatus && (
          <div className="mb-2 p-2 bg-emerald-100/70 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>{testStatus}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isSubscribed ? (
            <button
              onClick={subscribePush}
              disabled={loading}
              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              <span>Bật thông báo máy này</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleTestPush}
                disabled={loading}
                className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 active:scale-98 text-emerald-700 border border-emerald-300 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Gửi thử báo rung</span>
              </button>
              <button
                onClick={unsubscribePush}
                disabled={loading}
                title="Tắt thông báo"
                className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs transition-colors"
              >
                <BellOff className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Full view (for settings or dashboard)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Thông Báo Đẩy Về Điện Thoại (Web Push)
              {isSubscribed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Đang hoạt động
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                  Chưa kích hoạt
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động gửi thông báo đẩy đến điện thoại của <strong>Admin</strong> và{' '}
              <strong>Leader</strong> khi có đơn hàng mới được tạo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSubscribed ? (
            <button
              onClick={subscribePush}
              disabled={loading}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
              <span>Bật nhận thông báo trên máy này</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestPush}
                disabled={loading}
                className="py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Gửi thử báo rung</span>
              </button>
              <button
                onClick={unsubscribePush}
                disabled={loading}
                className="py-2 px-3 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Tắt
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {testStatus && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <span>{testStatus}</span>
        </div>
      )}

      {isIOS && !isInstalled && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>
              <strong>Lưu ý cho iPhone/iPad:</strong> Apple yêu cầu bạn bấm nút Chia sẻ trên Safari và chọn <strong>"Thêm vào Màn hình chính"</strong> trước để kích hoạt tính năng thông báo đẩy.
            </span>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className="text-amber-900 font-bold underline whitespace-nowrap hover:opacity-80"
          >
            Xem hướng dẫn
          </button>
        </div>
      )}
    </div>
  );
}
