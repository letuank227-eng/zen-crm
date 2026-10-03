import fs from 'fs';
import path from 'path';
import { CrmDatabase, User, Lead, Deal, Task, Note, AuditLog, Product, Order, Role } from '@/types/crm';
import { getInitialSeedData } from './seed';
import { generateId } from './utils';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'zen_crm_db.json');

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

export function readDb(): CrmDatabase {
  ensureDbFile();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading CRM DB, re-seeding:', err);
    const seed = getInitialSeedData();
    writeDb(seed);
    return seed;
  }
}

export function writeDb(data: CrmDatabase): void {
  ensureDbFile();
  const tempFile = `${DB_FILE}.tmp_${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// User & Role Resolution Helper
export function getCurrentUser(userIdOrRole?: string): User {
  const db = readDb();
  if (!userIdOrRole) {
    return db.users.find(u => u.role === 'ADMIN') || db.users[0];
  }
  const userById = db.users.find(u => u.id === userIdOrRole);
  if (userById) return userById;
  const userByRole = db.users.find(u => u.role === userIdOrRole.toUpperCase());
  if (userByRole) return userByRole;
  return db.users[0];
}

// RBAC Filter Helpers
export function canAccessLead(user: User, lead: Lead, db: CrmDatabase): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    if (!lead.assignedSaleId) return true;
    const assignedUser = db.users.find(u => u.id === lead.assignedSaleId);
    if (!assignedUser || assignedUser.role === 'ADMIN') return false;
    return assignedUser.teamId === leaderTeamId || lead.assignedSaleId === user.id;
  }
  if (user.role === 'STAFF') {
    const staffLeadIds = new Set(db.tasks.filter(t => t.assignedSaleId === user.id && t.leadId).map(t => t.leadId as string));
    const staffPhones = new Set(db.orders.map(o => o.customerPhone));
    return staffLeadIds.has(lead.id) || staffPhones.has(lead.phone);
  }
  // SALE role: Sale vẫn có thể xem khách hàng của những bạn sale khác (nhưng bị che thông tin cá nhân)
  return true;
}

export function canEditLead(user: User, lead: Lead, db: CrmDatabase): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    if (!lead.assignedSaleId) return true;
    const assignedUser = db.users.find(u => u.id === lead.assignedSaleId);
    if (!assignedUser || assignedUser.role === 'ADMIN') return false;
    return assignedUser.teamId === leaderTeamId || lead.assignedSaleId === user.id;
  }
  if (user.role === 'STAFF') return false;
  // SALE role: Chỉ được chỉnh sửa khách hàng do chính mình phụ trách!
  return lead.assignedSaleId === user.id;
}

export function filterLeadsByRole(leads: Lead[], user: User, db: CrmDatabase): Lead[] {
  if (user.role === 'ADMIN') return leads;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const teamUserIds = db.users.filter(u => u.teamId === leaderTeamId && u.role !== 'ADMIN').map(u => u.id);
    return leads.filter(l => !l.assignedSaleId || teamUserIds.includes(l.assignedSaleId) || l.assignedSaleId === user.id);
  }
  if (user.role === 'STAFF') {
    const staffLeadIds = new Set(db.tasks.filter(t => t.assignedSaleId === user.id && t.leadId).map(t => t.leadId as string));
    const staffPhones = new Set(db.orders.map(o => o.customerPhone));
    return leads.filter(l => staffLeadIds.has(l.id) || staffPhones.has(l.phone));
  }
  // SALE role: Sale vẫn có thể xem khách hàng của những bạn sale khác
  return leads;
}

export function filterDealsByRole(deals: Deal[], user: User, db: CrmDatabase): Deal[] {
  if (user.role === 'ADMIN') return deals;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const teamUserIds = db.users.filter(u => u.teamId === leaderTeamId && u.role !== 'ADMIN').map(u => u.id);
    return deals.filter(d => teamUserIds.includes(d.assignedSaleId) || d.assignedSaleId === user.id);
  }
  if (user.role === 'STAFF') {
    return []; // Staff không xem cơ hội / deal bán hàng
  }
  return deals.filter(d => d.assignedSaleId === user.id);
}

export function filterOrdersByRole(orders: Order[], user: User, db: CrmDatabase): Order[] {
  if (user.role === 'ADMIN') return orders;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const teamUserIds = db.users.filter(u => u.teamId === leaderTeamId && u.role !== 'ADMIN').map(u => u.id);
    return orders.filter(o => teamUserIds.includes(o.assignedSaleId) || o.assignedSaleId === user.id);
  }
  if (user.role === 'STAFF') {
    return orders; // Staff (Kho / Kỹ thuật) xem đơn để đóng hàng và giao nhận
  }
  return orders.filter(o => o.assignedSaleId === user.id);
}

export function filterTasksByRole(tasks: Task[], user: User, db: CrmDatabase): Task[] {
  if (user.role === 'ADMIN') return tasks;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const teamUserIds = db.users.filter(u => u.teamId === leaderTeamId && u.role !== 'ADMIN').map(u => u.id);
    return tasks.filter(t => teamUserIds.includes(t.assignedSaleId) || t.assignedSaleId === user.id);
  }
  // SALE & STAFF xem công việc được giao cho chính mình
  return tasks.filter(t => t.assignedSaleId === user.id);
}

// Audit Log Helper
export function logAuditEvent(
  userId: string,
  userName: string,
  action: AuditLog['action'],
  entityType: AuditLog['entityType'],
  entityId: string,
  details: string,
  options?: { previousValue?: string; newValue?: string; reason?: string }
): void {
  const db = readDb();
  const log: AuditLog = {
    id: generateId('aud'),
    userId,
    userName,
    action,
    entityType,
    entityId,
    details,
    previousValue: options?.previousValue,
    newValue: options?.newValue,
    reason: options?.reason,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  writeDb(db);
}

// Round-Robin Assignment Logic
export function getNextRoundRobinSale(db: CrmDatabase, teamId?: string): User | null {
  let sales = db.users.filter(u => u.role === 'SALE' && !u.isLocked);
  if (teamId) {
    const teamSales = sales.filter(u => u.teamId === teamId);
    if (teamSales.length > 0) sales = teamSales;
  }
  if (sales.length === 0) return null;

  // Find sales rep with minimum active leads
  const activeStatuses = ['NEW', 'CONSULTING', 'POTENTIAL'];
  let minCount = Infinity;
  let chosenSale: User = sales[0];

  for (const sale of sales) {
    const count = db.leads.filter(
      l => l.assignedSaleId === sale.id && activeStatuses.includes(l.status)
    ).length;
    if (count < minCount) {
      minCount = count;
      chosenSale = sale;
    }
  }

  return chosenSale;
}
