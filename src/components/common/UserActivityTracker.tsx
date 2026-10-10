'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function UserActivityTracker() {
  const { currentUser, fetchWithAuth } = useAuth();
  const lastActionRef = useRef<number>(Date.now());
  const isHeartbeatInFlight = useRef<boolean>(false);

  useEffect(() => {
    if (!currentUser) return;

    // Cập nhật mốc thời gian khi người dùng có thao tác trên màn hình
    const handleUserInteraction = () => {
      lastActionRef.current = Date.now();
    };

    const sendHeartbeat = async () => {
      // Nếu tab đang ẩn hoặc đang có 1 request heartbeat khác đang gửi thì bỏ qua
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      // Nếu người dùng không có thao tác chuột/chạm trong hơn 5 phút (treo máy) thì tạm ngưng tính thời gian
      const idleTime = Date.now() - lastActionRef.current;
      if (idleTime > 5 * 60 * 1000) {
        return;
      }

      if (isHeartbeatInFlight.current) return;
      isHeartbeatInFlight.current = true;

      try {
        await fetchWithAuth('/api/user-activity/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientTime: new Date().toISOString(),
          }),
        });
      } catch (err) {
        // Heartbeat fail nhẹ không ảnh hưởng người dùng
      } finally {
        isHeartbeatInFlight.current = false;
      }
    };

    // Gửi heartbeat ngay khi vừa mở app
    sendHeartbeat();

    // Lắng nghe các thao tác của người dùng
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    // Khi người dùng quay lại tab app (từ ứng dụng khác chuyển sang)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastActionRef.current = Date.now();
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Gửi định kỳ mỗi 45 giây một lần khi đang dùng app
    const intervalId = setInterval(sendHeartbeat, 45000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, fetchWithAuth]);

  return null;
}
