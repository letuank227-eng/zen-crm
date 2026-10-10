'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function UserActivityTracker() {
  const { currentUser, fetchWithAuth } = useAuth();
  const lastActionRef = useRef<number>(Date.now());
  const lastHeartbeatSentRef = useRef<number>(0);
  const isHeartbeatInFlight = useRef<boolean>(false);

  useEffect(() => {
    if (!currentUser) return;

    // Cập nhật mốc thời gian khi người dùng có thao tác trên màn hình
    const handleUserInteraction = () => {
      lastActionRef.current = Date.now();
      // Nếu đã hơn 15s kể từ lần ping gần nhất, gửi ngay lập tức để cập nhật trạng thái
      if (Date.now() - lastHeartbeatSentRef.current > 15000) {
        sendHeartbeat();
      }
    };

    const sendHeartbeat = async () => {
      // Nếu tab đang ẩn hoàn toàn thì bỏ qua
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      // Ngưỡng treo máy / rời máy: 15 phút không có thao tác (cho phép đọc báo cáo thoải mái)
      const idleTime = Date.now() - lastActionRef.current;
      if (idleTime > 15 * 60 * 1000) {
        return;
      }

      if (isHeartbeatInFlight.current) return;
      isHeartbeatInFlight.current = true;
      lastHeartbeatSentRef.current = Date.now();

      // Dùng AbortController để chống treo request trên mobile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        await fetchWithAuth('/api/user-activity/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientTime: new Date().toISOString(),
          }),
          signal: controller.signal,
        });
      } catch (err) {
        // Heartbeat fail nhẹ trong background
      } finally {
        clearTimeout(timeoutId);
        isHeartbeatInFlight.current = false;
      }
    };

    // 1. Gửi heartbeat NGAY LẬP TỨC khi vừa vào app (trong 150ms)
    const initTimer = setTimeout(sendHeartbeat, 150);

    // 2. Lắng nghe các thao tác người dùng (dùng capture: true để bắt cả scroll trong thẻ <main>)
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true, capture: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true, capture: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true, capture: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true, capture: true });
    window.addEventListener('touchmove', handleUserInteraction, { passive: true, capture: true });
    window.addEventListener('click', handleUserInteraction, { passive: true, capture: true });

    // 3. Khi người dùng mở lại tab app (từ app khác chuyển sang hoặc mở khóa màn hình)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastActionRef.current = Date.now();
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleFocus = () => {
      lastActionRef.current = Date.now();
      if (Date.now() - lastHeartbeatSentRef.current > 10000) {
        sendHeartbeat();
      }
    };
    window.addEventListener('focus', handleFocus);

    // 4. Chu kỳ định kỳ mỗi 20 giây khi đang mở app
    const intervalId = setInterval(sendHeartbeat, 20000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleUserInteraction, { capture: true });
      window.removeEventListener('keydown', handleUserInteraction, { capture: true });
      window.removeEventListener('scroll', handleUserInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction, { capture: true });
      window.removeEventListener('touchmove', handleUserInteraction, { capture: true });
      window.removeEventListener('click', handleUserInteraction, { capture: true });
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, fetchWithAuth]);

  return null;
}
