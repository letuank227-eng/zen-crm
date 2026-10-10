import fs from 'fs';
import path from 'path';
import { createClient, Client } from '@libsql/client';
import { usingTurso } from './storage';
import { User, Team } from '@/types/crm';

let clientInstance: Client | null = null;
function getClient(): Client {
  if (!clientInstance) {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    const authToken = process.env.TURSO_AUTH_TOKEN;
    clientInstance = createClient({ url, authToken });
  }
  return clientInstance;
}

const LOCAL_ACTIVITY_FILE = path.join(process.cwd(), 'data', 'user_activity_records.json');

let tablesReady = false;
async function ensureTables(): Promise<void> {
  if (tablesReady) return;
  if (usingTurso()) {
    const client = getClient();
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id TEXT PRIMARY KEY,
        device TEXT,
        last_active_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_daily_activities (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        device TEXT,
        total_seconds INTEGER NOT NULL DEFAULT 0,
        sessions_count INTEGER NOT NULL DEFAULT 1,
        first_active_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        PRIMARY KEY (user_id, date)
      )
    `);
    tablesReady = true;
  }
}

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }
  return `${Math.max(1, minutes)} phút`;
}

/**
 * Ngưỡng kiểm tra trạng thái hoạt động:
 * - ONLINE: tương tác trong vòng 180 giây (3 phút).
 * - AWAY (Vừa rời đi / Treo máy): từ 3 phút tới 8 phút (480s).
 * - OFFLINE: hơn 8 phút.
 */
export function getRelativePresence(isoDate?: string | null): {
  status: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'NEVER';
  text: string;
  secondsAgo: number;
} {
  if (!isoDate) {
    return { status: 'NEVER', text: 'Chưa từng vào app', secondsAgo: 9999999 };
  }

  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const secondsAgo = Math.floor(diffMs / 1000);

  if (secondsAgo <= 180) {
    return { status: 'ONLINE', text: 'Đang trực tuyến', secondsAgo };
  }
  if (secondsAgo <= 480) {
    const mins = Math.max(1, Math.round(secondsAgo / 60));
    return { status: 'AWAY', text: `Vừa hoạt động (${mins} phút trước)`, secondsAgo };
  }

  const hours = Math.floor(secondsAgo / 3600);
  if (hours < 24) {
    const mins = Math.floor(secondsAgo / 60);
    if (mins < 60) {
      return { status: 'OFFLINE', text: `Offline (${mins} phút trước)`, secondsAgo };
    }
    return { status: 'OFFLINE', text: `Offline (${hours} giờ trước)`, secondsAgo };
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    const timeStr = new Date(isoDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return { status: 'OFFLINE', text: `Offline (Hôm qua ${timeStr})`, secondsAgo };
  }

  return { status: 'OFFLINE', text: `Offline (${days} ngày trước)`, secondsAgo };
}

export async function saveHeartbeat(params: {
  userId: string;
  device: string;
  clientTime?: string;
}): Promise<{ ok: boolean; lastActiveAt: string; isOnline: boolean }> {
  const { userId, device } = params;
  const now = new Date();
  const nowIso = now.toISOString();

  // Múi giờ Việt Nam (UTC+7)
  const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (usingTurso()) {
    const client = getClient();

    const runBatch = async () => {
      await client.batch([
        {
          sql: `INSERT INTO user_presence (user_id, device, last_active_at, updated_at)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(user_id) DO UPDATE SET
                  device = excluded.device,
                  last_active_at = excluded.last_active_at,
                  updated_at = datetime('now')`,
          args: [userId, device, nowIso],
        },
        {
          sql: `INSERT INTO user_daily_activities (user_id, date, device, total_seconds, sessions_count, first_active_at, last_active_at)
                VALUES (?, ?, ?, 60, 1, ?, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                  device = excluded.device,
                  total_seconds = user_daily_activities.total_seconds + CASE
                    WHEN (strftime('%s', excluded.last_active_at) - strftime('%s', user_daily_activities.last_active_at)) BETWEEN 1 AND 300
                    THEN MIN(120, (strftime('%s', excluded.last_active_at) - strftime('%s', user_daily_activities.last_active_at)))
                    WHEN (strftime('%s', excluded.last_active_at) - strftime('%s', user_daily_activities.last_active_at)) > 300
                    THEN 60
                    ELSE 20
                  END,
                  sessions_count = user_daily_activities.sessions_count + CASE
                    WHEN (strftime('%s', excluded.last_active_at) - strftime('%s', user_daily_activities.last_active_at)) > 300
                    THEN 1
                    ELSE 0
                  END,
                  last_active_at = excluded.last_active_at`,
          args: [userId, vnDate, device, nowIso, nowIso],
        },
      ], 'write');
    };

    try {
      await runBatch();
    } catch (err: any) {
      if (String(err?.message || '').includes('no such table')) {
        await ensureTables();
        await runBatch();
      } else {
        throw err;
      }
    }

    return { ok: true, lastActiveAt: nowIso, isOnline: true };
  }

  // Local fallback nếu không có Turso
  try {
    const dir = path.dirname(LOCAL_ACTIVITY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let localData: { presence: Record<string, any>; activities: Record<string, any> } = {
      presence: {},
      activities: {},
    };
    if (fs.existsSync(LOCAL_ACTIVITY_FILE)) {
      try {
        localData = JSON.parse(fs.readFileSync(LOCAL_ACTIVITY_FILE, 'utf-8'));
      } catch {}
    }
    localData.presence[userId] = { device, last_active_at: nowIso };
    const actKey = `${userId}_${vnDate}`;
    const prevAct = localData.activities[actKey];
    if (!prevAct) {
      localData.activities[actKey] = {
        user_id: userId,
        date: vnDate,
        device,
        total_seconds: 30,
        sessions_count: 1,
        first_active_at: nowIso,
        last_active_at: nowIso,
      };
    } else {
      const elapsed = Math.round((now.getTime() - new Date(prevAct.last_active_at).getTime()) / 1000);
      if (elapsed > 0 && elapsed <= 120) {
        prevAct.total_seconds += Math.min(elapsed, 45);
      } else if (elapsed > 120) {
        prevAct.total_seconds += 30;
        prevAct.sessions_count += 1;
      }
      prevAct.last_active_at = nowIso;
      prevAct.device = device;
    }
    fs.writeFileSync(LOCAL_ACTIVITY_FILE, JSON.stringify(localData, null, 2), 'utf-8');
  } catch {}

  return { ok: true, lastActiveAt: nowIso, isOnline: true };
}

export async function getUserActivityReportData(params: {
  targetDate: string;
  users: User[];
  teams: Team[];
}): Promise<{
  date: string;
  summary: {
    onlineNowCount: number;
    activeOnDateCount: number;
    totalUsers: number;
    totalCompanySeconds: number;
    totalCompanyDurationFormatted: string;
  };
  users: any[];
}> {
  const { targetDate, users, teams } = params;

  let presenceMap = new Map<string, { device: string; last_active_at: string }>();
  let dayActivitiesMap = new Map<
    string,
    {
      total_seconds: number;
      sessions_count: number;
      first_active_at: string;
      last_active_at: string;
      device: string;
    }
  >();

  if (usingTurso()) {
    const client = getClient();

    try {
      // Chạy song song 2 câu SELECT bằng Promise.all (< 0.4s)
      const [presRes, actRes] = await Promise.all([
        client.execute('SELECT user_id, device, last_active_at FROM user_presence'),
        client.execute({
          sql: `SELECT user_id, device, total_seconds, sessions_count, first_active_at, last_active_at
                FROM user_daily_activities
                WHERE date = ?`,
          args: [targetDate],
        }),
      ]);

      presRes.rows.forEach(r => {
        presenceMap.set(String(r.user_id), {
          device: String(r.device || 'Trình duyệt Web'),
          last_active_at: String(r.last_active_at),
        });
      });

      actRes.rows.forEach(r => {
        dayActivitiesMap.set(String(r.user_id), {
          total_seconds: Number(r.total_seconds || 0),
          sessions_count: Number(r.sessions_count || 1),
          first_active_at: String(r.first_active_at || ''),
          last_active_at: String(r.last_active_at || ''),
          device: String(r.device || 'Trình duyệt Web'),
        });
      });
    } catch (err: any) {
      if (String(err?.message || '').includes('no such table')) {
        await ensureTables();
      } else {
        console.error('Error fetching activity from Turso:', err);
      }
    }
  } else if (fs.existsSync(LOCAL_ACTIVITY_FILE)) {
    try {
      const localData = JSON.parse(fs.readFileSync(LOCAL_ACTIVITY_FILE, 'utf-8'));
      Object.entries(localData.presence || {}).forEach(([uid, val]: [string, any]) => {
        presenceMap.set(uid, val);
      });
      Object.entries(localData.activities || {}).forEach(([key, val]: [string, any]) => {
        if (val.date === targetDate) {
          dayActivitiesMap.set(val.user_id, val);
        }
      });
    } catch {}
  }

  let onlineNowCount = 0;
  let activeOnDateCount = 0;
  let totalCompanySeconds = 0;

  const userList = users.map(u => {
    const presenceData = presenceMap.get(u.id);
    const dayData = dayActivitiesMap.get(u.id);

    // Mốc thời gian hoạt động gần nhất (ưu tiên từ presence, fallback user.lastActiveAt)
    const effectiveLastActive = presenceData?.last_active_at || u.lastActiveAt || null;
    const presence = getRelativePresence(effectiveLastActive);

    if (presence.status === 'ONLINE') {
      onlineNowCount++;
    }

    let totalSeconds = dayData?.total_seconds || 0;
    let sessionsCount = dayData?.sessions_count || 0;
    let firstActiveAt = dayData?.first_active_at || null;
    let lastActiveAtOnDate = dayData?.last_active_at || null;

    // KIỂM TRA ĐỒNG BỘ: Nếu user đã có hoạt động (effectiveLastActive) rơi vào ngày targetDate (giờ VN),
    // nhưng dayData chưa kịp có record hoặc totalSeconds <= 0:
    // Tuyệt đối không hiển thị 'Chưa vào app ngày này', mà tính tối thiểu 1 phút và ghi nhận phiên hoạt động!
    if (effectiveLastActive) {
      try {
        const activeVnDate = new Date(new Date(effectiveLastActive).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (activeVnDate === targetDate && totalSeconds <= 0) {
          totalSeconds = 60; // Ghi nhận tối thiểu 1 phút
          sessionsCount = Math.max(1, sessionsCount);
          firstActiveAt = effectiveLastActive;
          lastActiveAtOnDate = effectiveLastActive;
        }
      } catch {}
    }

    totalCompanySeconds += totalSeconds;
    if (totalSeconds > 0) {
      activeOnDateCount++;
    }

    const team = teams.find(t => t.id === u.teamId);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      teamName: team?.name || (u.role === 'ADMIN' ? 'Ban Giám Đốc' : 'Chưa phân team'),
      avatar: u.avatar,
      phone: u.phone,
      isLocked: u.isLocked,
      presenceStatus: presence.status,
      presenceText: presence.text,
      isOnline: presence.status === 'ONLINE',
      lastActiveAt: effectiveLastActive,
      currentDevice: dayData?.device || presenceData?.device || u.currentDevice || 'Trình duyệt Web',
      dateStats: {
        date: targetDate,
        totalSeconds,
        formattedDuration: formatDuration(totalSeconds),
        sessionsCount,
        firstActiveAt,
        lastActiveAtOnDate,
        device: dayData?.device || presenceData?.device || u.currentDevice || 'Trình duyệt Web',
        workdayPercentage: Math.min(100, Math.round((totalSeconds / (8 * 3600)) * 100)),
      },
    };
  });

  // Sắp xếp:
  // 1. Đang Online lên đầu
  // 2. Tiếp theo là Vừa hoạt động (AWAY)
  // 3. Tiếp theo là có thời gian sử dụng trong ngày cao nhất
  // 4. Cuối cùng là Offline
  userList.sort((a, b) => {
    if (a.presenceStatus === 'ONLINE' && b.presenceStatus !== 'ONLINE') return -1;
    if (a.presenceStatus !== 'ONLINE' && b.presenceStatus === 'ONLINE') return 1;
    if (a.presenceStatus === 'AWAY' && b.presenceStatus === 'OFFLINE') return -1;
    if (a.presenceStatus === 'OFFLINE' && b.presenceStatus === 'AWAY') return 1;
    return (b.dateStats.totalSeconds || 0) - (a.dateStats.totalSeconds || 0);
  });

  return {
    date: targetDate,
    summary: {
      onlineNowCount,
      activeOnDateCount,
      totalUsers: users.length,
      totalCompanySeconds,
      totalCompanyDurationFormatted: formatDuration(totalCompanySeconds),
    },
    users: userList,
  };
}

export async function getPresenceMap(): Promise<Map<string, { device: string; last_active_at: string }>> {
  const map = new Map<string, { device: string; last_active_at: string }>();
  if (usingTurso()) {
    await ensureTables();
    try {
      const client = getClient();
      const res = await client.execute('SELECT user_id, device, last_active_at FROM user_presence');
      res.rows.forEach(r => {
        map.set(String(r.user_id), {
          device: String(r.device || 'Trình duyệt Web'),
          last_active_at: String(r.last_active_at),
        });
      });
    } catch {}
  } else if (fs.existsSync(LOCAL_ACTIVITY_FILE)) {
    try {
      const localData = JSON.parse(fs.readFileSync(LOCAL_ACTIVITY_FILE, 'utf-8'));
      Object.entries(localData.presence || {}).forEach(([uid, val]: [string, any]) => {
        map.set(uid, val);
      });
    } catch {}
  }
  return map;
}
