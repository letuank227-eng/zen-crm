import webpush from 'web-push';
import { readDb, writeDb } from './db';
import { generateId, formatCurrency } from './utils';
import { Order, Lead, User, UserNotification, PushSubscriptionItem, CrmDatabase } from '@/types/crm';

const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  'BMlKlOKAbZ1v5BBdnnTs2_GmV5nnYBHMymgq1apGHZR8qBXP-BXBhxtoCbYdwW311SY2SKBdVLkSJdInCaZhZfY';

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '2nP9t3Mc4heNoDwj3N9KyOUy-F3B6ka1xD8XFcKDva8';

const DEFAULT_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@zencrm.vn';

// Cấu hình web-push VAPID
try {
  webpush.setVapidDetails(
    DEFAULT_VAPID_SUBJECT,
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error('Failed to configure webpush VAPID details:', err);
}

export function getVapidPublicKey(): string {
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Lưu hoặc cập nhật Push Subscription của thiết bị người dùng
 */
export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
): Promise<void> {
  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Dữ liệu Subscription không hợp lệ');
  }

  const db = await readDb();
  if (!db.pushSubscriptions) {
    db.pushSubscriptions = [];
  }

  // Loại bỏ endpoint cũ nếu đã tồn tại để tránh trùng lặp
  const existingIdx = db.pushSubscriptions.findIndex(s => s.endpoint === subscription.endpoint);
  const now = new Date().toISOString();

  if (existingIdx !== -1) {
    db.pushSubscriptions[existingIdx] = {
      ...db.pushSubscriptions[existingIdx],
      userId,
      keys: subscription.keys,
      userAgent: userAgent || db.pushSubscriptions[existingIdx].userAgent,
      updatedAt: now,
    };
  } else {
    const newSub: PushSubscriptionItem = {
      id: generateId('psub'),
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      createdAt: now,
      updatedAt: now,
    };
    db.pushSubscriptions.push(newSub);
  }

  await writeDb(db);
}

/**
 * Hủy đăng ký push subscription
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = await readDb();
  if (!db.pushSubscriptions) return;

  const initialCount = db.pushSubscriptions.length;
  db.pushSubscriptions = db.pushSubscriptions.filter(s => s.endpoint !== endpoint);

  if (db.pushSubscriptions.length !== initialCount) {
    await writeDb(db);
  }
}

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

/**
 * Gửi Web Push Notification đến danh sách userId
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ successCount: number; failureCount: number }> {
  if (!userIds || userIds.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const db = await readDb();
  const allSubs = db.pushSubscriptions || [];
  const targetSubs = allSubs.filter(s => userIds.includes(s.userId));

  if (targetSubs.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const messageString = JSON.stringify({
    title: payload.title,
    message: payload.message,
    body: payload.message,
    url: payload.url || '/orders',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    data: payload.data || {},
  });

  let successCount = 0;
  let failureCount = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    targetSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          messageString,
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: 'high',
          }
        );
        successCount++;
      } catch (err: any) {
        failureCount++;
        // 404 hoặc 410 tức subscription đã hết hạn hoặc người dùng gỡ app / revoke quyền
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error(`Lỗi gửi push cho user ${sub.userId}:`, err?.message || err);
        }
      }
    })
  );

  // Dọn dẹp subscription đã chết
  if (expiredEndpoints.length > 0) {
    try {
      const freshDb = await readDb();
      if (freshDb.pushSubscriptions) {
        freshDb.pushSubscriptions = freshDb.pushSubscriptions.filter(
          s => !expiredEndpoints.includes(s.endpoint)
        );
        await writeDb(freshDb);
      }
    } catch (cleanupErr) {
      console.warn('Lỗi dọn dẹp push subscription:', cleanupErr);
    }
  }

  return { successCount, failureCount };
}

/**
 * Tự động gửi thông báo đẩy đến Admin và Leader của nhóm khi có đơn hàng mới
 */
export async function notifyNewOrder({
  order,
  creatorUser,
}: {
  order: Order;
  creatorUser: User;
}): Promise<void> {
  const db = await readDb();

  // 1. Xác định team của người sale chốt đơn
  const saleTeamId = creatorUser.teamId || db.users.find(u => u.id === order.assignedSaleId)?.teamId;

  // 2. Tìm danh sách Admin
  const adminUsers = db.users.filter(u => u.role === 'ADMIN' && !u.isLocked);

  // 3. Tìm Leader của nhóm đó
  const leaderUsers: User[] = [];
  if (saleTeamId) {
    const team = db.teams.find(t => t.id === saleTeamId);
    if (team?.leaderId) {
      const leader = db.users.find(u => u.id === team.leaderId && !u.isLocked);
      if (leader && !leaderUsers.some(l => l.id === leader.id)) {
        leaderUsers.push(leader);
      }
    }
    // Tìm thêm các user có role LEADER thuộc team đó
    db.users
      .filter(u => u.role === 'LEADER' && u.teamId === saleTeamId && !u.isLocked)
      .forEach(leader => {
        if (!leaderUsers.some(l => l.id === leader.id)) {
          leaderUsers.push(leader);
        }
      });
  }

  // 4. Tổng hợp danh sách người nhận (Tránh trùng lặp và không gửi cho chính người tạo nếu người tạo là Admin/Leader)
  const recipientMap = new Map<string, User>();

  adminUsers.forEach(admin => {
    if (admin.id !== creatorUser.id) {
      recipientMap.set(admin.id, admin);
    }
  });

  leaderUsers.forEach(leader => {
    if (leader.id !== creatorUser.id) {
      recipientMap.set(leader.id, leader);
    }
  });

  const recipientIds = Array.from(recipientMap.keys());
  if (recipientIds.length === 0) return;

  const now = new Date().toISOString();
  const formattedAmount = formatCurrency(order.totalAmount);
  const title = `🔔 Đơn hàng mới: ${order.code}`;
  const message = `${creatorUser.name} vừa chốt đơn [${order.code}] cho khách "${order.customerName}" (${formattedAmount}).`;

  // 5. Lưu thông báo vào hệ thống (db.notifications) để hiển thị trong app (chuông thông báo)
  if (!db.notifications) {
    db.notifications = [];
  }

  recipientIds.forEach(recId => {
    const notification: UserNotification = {
      id: generateId('notif'),
      userId: recId,
      title,
      message,
      type: 'ORDER_CREATED',
      orderId: order.id,
      orderCode: order.code,
      leadId: order.leadId,
      isRead: false,
      createdAt: now,
    };
    db.notifications!.unshift(notification);
  });

  await writeDb(db);

  // 6. Bắn Web Push Notification tới điện thoại của Admin và Leader
  try {
    await sendPushToUsers(recipientIds, {
      title,
      message,
      url: `/orders`,
      icon: '/logo.png',
      data: {
        orderId: order.id,
        orderCode: order.code,
      },
    });
  } catch (pushErr) {
    console.error('Lỗi gửi Web Push Notification khi tạo đơn:', pushErr);
  }
}

/**
 * Tự động gửi thông báo đẩy đến Admin, Leader và Sale phụ trách khi có Lead mới
 */
export async function notifyNewLead({
  lead,
  creatorUser,
}: {
  lead: Lead;
  creatorUser: User;
}): Promise<void> {
  const db = await readDb();

  // 1. Xác định team và nhân sự phụ trách
  const assignedSale = lead.assignedSaleId
    ? db.users.find(u => u.id === lead.assignedSaleId && !u.isLocked)
    : null;
  const targetTeamId = assignedSale?.teamId || creatorUser.teamId;

  // 2. Tìm danh sách Admin
  const adminUsers = db.users.filter(u => u.role === 'ADMIN' && !u.isLocked);

  // 3. Tìm Leader của nhóm đó
  const leaderUsers: User[] = [];
  if (targetTeamId) {
    const team = db.teams.find(t => t.id === targetTeamId);
    if (team?.leaderId) {
      const leader = db.users.find(u => u.id === team.leaderId && !u.isLocked);
      if (leader && !leaderUsers.some(l => l.id === leader.id)) {
        leaderUsers.push(leader);
      }
    }
    db.users
      .filter(u => u.role === 'LEADER' && u.teamId === targetTeamId && !u.isLocked)
      .forEach(leader => {
        if (!leaderUsers.some(l => l.id === leader.id)) {
          leaderUsers.push(leader);
        }
      });
  }

  // 4. Tổng hợp danh sách nhận (Admin + Leader + Sale được phân công nếu không phải người tạo)
  const recipientMap = new Map<string, User>();

  adminUsers.forEach(admin => {
    if (admin.id !== creatorUser.id) {
      recipientMap.set(admin.id, admin);
    }
  });

  leaderUsers.forEach(leader => {
    if (leader.id !== creatorUser.id) {
      recipientMap.set(leader.id, leader);
    }
  });

  if (assignedSale && assignedSale.id !== creatorUser.id) {
    recipientMap.set(assignedSale.id, assignedSale);
  }

  const recipientIds = Array.from(recipientMap.keys());
  if (recipientIds.length === 0) return;

  const now = new Date().toISOString();
  const title = `🌟 Khách hàng mới: ${lead.fullName}`;
  const saleName = lead.assignedSaleName || assignedSale?.name || creatorUser.name;
  const message = `Có khách hàng mới [${lead.fullName}] (${lead.source || 'Website/Fanpage'}). Nhân sự phụ trách: ${saleName}.`;

  // 5. Lưu thông báo vào hệ thống
  if (!db.notifications) {
    db.notifications = [];
  }

  recipientIds.forEach(recId => {
    const notification: UserNotification = {
      id: generateId('notif'),
      userId: recId,
      title,
      message,
      type: 'LEAD_CREATED',
      leadId: lead.id,
      isRead: false,
      createdAt: now,
    };
    db.notifications!.unshift(notification);
  });

  await writeDb(db);

  // 6. Bắn Web Push Notification tới điện thoại (rung & chuông ngay cả khi tắt app)
  try {
    await sendPushToUsers(recipientIds, {
      title,
      message,
      url: `/leads`,
      icon: '/logo.png',
      data: {
        leadId: lead.id,
      },
    });
  } catch (pushErr) {
    console.error('Lỗi gửi Web Push Notification khi tạo Lead mới:', pushErr);
  }
}
