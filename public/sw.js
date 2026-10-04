// Service Worker for ZEN CRM (PWA & Web Push Notifications)
const CACHE_NAME = 'zen-crm-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all network requests by default
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// LẮNG NGHE THÔNG BÁO ĐẨY TỪ SERVER KHI CÓ ĐƠN HÀNG MỚI (WEB PUSH)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: 'ZEN CRM',
    message: 'Bạn có thông báo mới từ hệ thống.',
    url: '/orders',
    icon: '/logo.png',
  };

  try {
    payload = event.data.json();
  } catch (err) {
    try {
      payload.message = event.data.text();
    } catch (e) {
      // ignore
    }
  }

  const title = payload.title || '🔔 ZEN CRM';
  const options = {
    body: payload.message || payload.body || 'Bạn có thông báo mới từ ZEN CRM.',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    // Nhịp rung dồn dập báo hiệu có đơn/lead mới y như thông báo biến động số dư ngân hàng
    vibrate: [300, 150, 300, 150, 300],
    data: {
      url: payload.url || '/orders',
      ...payload.data,
    },
    actions: [
      {
        action: 'open_url',
        title: 'Xem chi tiết ngay',
      },
    ],
    tag: payload.tag || 'zen-crm-' + Date.now(),
    renotify: true,
    requireInteraction: true, // Giữ thông báo nổi bật trên màn hình khóa
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// KHI NGƯỜI DÙNG BẤM VÀO THÔNG BÁO TRÊN ĐIỆN THOẠI
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Nếu đã có tab/app đang mở sẵn, focus vào đó và navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Nếu app đang đóng, mở cửa sổ mới
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
