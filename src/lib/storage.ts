/**
 * Persistence layer for the CRM document.
 *
 * - When TURSO_DATABASE_URL is set: Turso Database (libSQL). Each top-level
 *   collection of CrmDatabase is stored as one JSON string row with a version number.
 *   Writes only touch collections that changed and use optimistic locking inside
 *   libSQL transactions, so two users editing different collections never overwrite
 *   each other, and conflicting edits on the same collection are rejected.
 * - Otherwise: local JSON file in ./data (development fallback).
 */
import fs from 'fs';
import path from 'path';
import { createClient, Client } from '@libsql/client';
import { CrmDatabase } from '@/types/crm';
import { getInitialSeedData } from './seed';

export class DbConflictError extends Error {
  constructor() {
    super('Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại và thử lại.');
    this.name = 'DbConflictError';
  }
}

interface Snapshot {
  versions: Record<string, number>;
  json: Record<string, string>;
}

// Remembers what each loaded db object looked like, to diff on write.
const snapshots = new WeakMap<object, Snapshot>();

let clientInstance: Client | null = null;
function getClient(): Client {
  if (!clientInstance) {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    const authToken = process.env.TURSO_AUTH_TOKEN;
    clientInstance = createClient({
      url,
      authToken,
    });
  }
  return clientInstance;
}

export function usingTurso(): boolean {
  return !!(process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('libsql:') || process.env.DATABASE_URL.startsWith('http'))));
}

// Backward compatibility alias
export function usingPostgres(): boolean {
  return usingTurso();
}

let schemaReady: Promise<void> | null = null;
async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = getClient();
      await client.execute(`
        CREATE TABLE IF NOT EXISTS crm_collections (
          name TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      const res = await client.execute('SELECT count(*) AS n FROM crm_collections');
      const count = Number(res.rows[0]?.n ?? 0);
      if (count === 0) {
        await seedCollections(await buildInitialData());
      }
    })().catch(err => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** Initial data for a brand-new database. The first ADMIN account comes from env vars. */
async function buildInitialData(): Promise<CrmDatabase> {
  const seed = getInitialSeedData();
  const { hashPassword } = await import('./password');
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD (and ADMIN_EMAIL) must be set to initialize a new production database');
  }
  for (const u of seed.users) {
    if (u.role === 'ADMIN') {
      if (adminEmail) u.email = adminEmail.trim().toLowerCase();
      // Dev fallback: keep the seed password (hashed) so local setup works out of the box.
      const plain = adminPassword || u.password;
      u.password = plain ? await hashPassword(plain) : undefined;
    } else {
      u.password = undefined;
    }
  }
  return seed;
}

export async function seedCollections(data: CrmDatabase): Promise<void> {
  const client = getClient();
  const stmts = Object.entries(data).map(([name, value]) => ({
    sql: `INSERT INTO crm_collections (name, data, version, updated_at) 
          VALUES (?, ?, 1, datetime('now'))
          ON CONFLICT (name) DO NOTHING`,
    args: [name, JSON.stringify(value)],
  }));
  await client.batch(stmts, 'write');
}

/** Overwrites every collection (used by migration / restore). */
export async function replaceAllCollections(data: CrmDatabase): Promise<void> {
  await ensureSchemaTableOnly();
  const client = getClient();
  const stmts = Object.entries(data).map(([name, value]) => ({
    sql: `INSERT INTO crm_collections (name, data, version, updated_at)
          VALUES (?, ?, 1, datetime('now'))
          ON CONFLICT (name) DO UPDATE SET
            data = excluded.data,
            version = crm_collections.version + 1,
            updated_at = datetime('now')`,
    args: [name, JSON.stringify(value)],
  }));
  await client.batch(stmts, 'write');
}

async function ensureSchemaTableOnly(): Promise<void> {
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS crm_collections (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function fillDefaults(raw: Record<string, unknown>): CrmDatabase {
  const defaults = getInitialSeedData() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(defaults)) {
    out[key] = raw[key] !== undefined ? raw[key] : Array.isArray(defaults[key]) ? [] : defaults[key];
  }
  for (const key of Object.keys(raw)) {
    if (!(key in out)) out[key] = raw[key];
  }
  return out as unknown as CrmDatabase;
}

// ---------------------------------------------------------------------------
// Turso (libSQL) implementation
// ---------------------------------------------------------------------------

// In-memory cache for fast burst queries (e.g. concurrent API calls on page load)
interface MemoryCache {
  db: CrmDatabase;
  snap: Snapshot;
  expiresAt: number;
}
let memoryCache: MemoryCache | null = null;
const BURST_CACHE_TTL_MS = 2500;

async function tursoRead(): Promise<CrmDatabase> {
  const now = Date.now();
  if (memoryCache && now < memoryCache.expiresAt) {
    const cloned = JSON.parse(JSON.stringify(memoryCache.db));
    const isolatedSnap: Snapshot = {
      versions: { ...memoryCache.snap.versions },
      json: { ...memoryCache.snap.json },
    };
    snapshots.set(cloned, isolatedSnap);
    return cloned;
  }

  const client = getClient();
  let rows: Array<{ name: unknown; data: unknown; version: unknown }>;

  try {
    const rs = await client.execute('SELECT name, data, version FROM crm_collections');
    rows = rs.rows as any;
  } catch (err: any) {
    // If table doesn't exist, ensure schema
    if (String(err?.message || '').includes('no such table')) {
      await ensureSchema();
      const rs = await client.execute('SELECT name, data, version FROM crm_collections');
      rows = rs.rows as any;
    } else {
      throw err;
    }
  }

  const raw: Record<string, unknown> = {};
  const snap: Snapshot = { versions: {}, json: {} };
  for (const r of rows) {
    const name = String(r.name);
    try {
      raw[name] = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    } catch {
      raw[name] = [];
    }
    snap.versions[name] = Number(r.version);
  }
  const db = fillDefaults(raw);
  for (const [k, v] of Object.entries(db)) snap.json[k] = JSON.stringify(v);
  snapshots.set(db, snap);

  memoryCache = {
    db,
    snap,
    expiresAt: now + BURST_CACHE_TTL_MS,
  };

  return db;
}

async function tursoWrite(db: CrmDatabase): Promise<void> {
  memoryCache = null; // Invalidate cache immediately on write
  const snap = snapshots.get(db);
  const changed: { name: string; json: string; version: number | undefined }[] = [];
  for (const [name, value] of Object.entries(db)) {
    const json = JSON.stringify(value ?? null);
    if (!snap || snap.json[name] !== json) {
      changed.push({ name, json, version: snap?.versions[name] });
    }
  }
  if (changed.length === 0) return;

  const client = getClient();
  const tx = await client.transaction('write');
  try {
    const newVersions: Record<string, number> = {};
    for (const c of changed) {
      if (c.version === undefined) {
        await tx.execute({
          sql: `INSERT INTO crm_collections (name, data, version, updated_at)
                VALUES (?, ?, 1, datetime('now'))
                ON CONFLICT (name) DO UPDATE SET
                  data = excluded.data,
                  version = crm_collections.version + 1,
                  updated_at = datetime('now')`,
          args: [c.name, c.json],
        });
        const vRes = await tx.execute({
          sql: `SELECT version FROM crm_collections WHERE name = ?`,
          args: [c.name],
        });
        newVersions[c.name] = Number(vRes.rows[0]?.version ?? 1);
      } else {
        const updateRes = await tx.execute({
          sql: `UPDATE crm_collections 
                SET data = ?, version = version + 1, updated_at = datetime('now')
                WHERE name = ? AND version = ?`,
          args: [c.json, c.name, c.version],
        });
        if (updateRes.rowsAffected === 0) {
          throw new DbConflictError();
        }
        newVersions[c.name] = c.version + 1;
      }
    }
    await tx.commit();

    // Refresh snapshot so subsequent writeDb() calls on the same object work
    const newSnap: Snapshot = snap ?? { versions: {}, json: {} };
    changed.forEach(c => {
      newSnap.versions[c.name] = newVersions[c.name] ?? (c.version ? c.version + 1 : 1);
      newSnap.json[c.name] = c.json;
    });
    snapshots.set(db, newSnap);
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
}

// ---------------------------------------------------------------------------
// Local file implementation (development without TURSO_DATABASE_URL)
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'zen_crm_db.json');

async function fileRead(): Promise<CrmDatabase> {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    await fileWrite(await buildInitialData());
  }
  try {
    return fillDefaults(JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')));
  } catch (err) {
    console.error('Error reading CRM DB file:', err);
    throw err;
  }
}

async function fileWrite(data: CrmDatabase): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${DB_FILE}.tmp_${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// ---------------------------------------------------------------------------

export async function loadDb(): Promise<CrmDatabase> {
  return usingTurso() ? tursoRead() : fileRead();
}

export async function saveDb(db: CrmDatabase): Promise<void> {
  return usingTurso() ? tursoWrite(db) : fileWrite(db);
}
