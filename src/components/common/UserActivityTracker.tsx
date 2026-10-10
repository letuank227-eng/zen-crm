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
      // Nếu đã hơn 20s kể từ lần ping gần nhất, gửi ngay lập tức để cập nhật trạng thái
      if (Date.now() - lastHeartbeatSentRef.current > 20000) {
        sendHeartbeat();
      }
    };

    const sendHeartbeat = async () => {
      // Nếu tab đang ẩn hoặc đang có 1 request heartbeat khác đang gửi thì bỏ qua
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      // Nếu người dùng không có thao tác chuột/chạm trong hơn 3 phút (treo máy) thì tạm ngưng tính giờ
      const idleTime = Date.now() - lastActionRef.current;
      if (idleTime > 3 * 60 * 1000) {
        return;
      }

      if (isHeartbeatInFlight.current) return;
      isHeartbeatInFlight.current = true;
      lastHeartbeatSentRef.current = Date.now();

      try {
        await fetchWithAuth('/api/user-activity/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientTime: new Date().toISOString(),
          }),
        });
      } catch (err) {
        // Heartbeat fail nhẹ trong background
      } finally {
        isHeartbeatInFlight.current = false;
      }
    };

    // Gửi heartbeat ngay khi vừa mở app (tức thì trong 1 giây đầu)
    const initTimer = setTimeout(sendHeartbeat, 500);

    // Lắng nghe các thao tác của người dùng
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    // Khi người dùng quay lại tab app (chuyển từ app khác sang)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastActionRef.current = Date.now();
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleFocus = () => {
      if (Date.now() - lastHeartbeatSentRef.current > 15000) {
        lastActionRef.current = Date.now();
        sendHeartbeat();
      }
    };
    window.addEventListener('focus', handleFocus);

    // Chu kỳ định kỳ mỗi 25 giây khi đang dùng app (nhanh, chuẩn và cực kỳ nhẹ nhàng)
    const intervalId = setInterval(sendHeartbeat, 25000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, fetchWithAuth]);

  return null;
}
