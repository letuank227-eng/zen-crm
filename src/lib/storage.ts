/**
 * Persistence layer for the CRM document.
 *
 * - When DATABASE_URL is set: Postgres (Neon serverless HTTP driver). Each top-level
 *   collection of CrmDatabase is stored as one JSONB row with a version number.
 *   Writes only touch collections that changed and use optimistic locking, so two
 *   users editing different collections never overwrite each other, and conflicting
 *   edits on the same collection are rejected instead of silently lost.
 * - Otherwise: local JSON file in ./data (development only).
 */
import fs from 'fs';
import path from 'path';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
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

let sqlClient: NeonQueryFunction<false, false> | null = null;
function sql() {
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL as string);
  return sqlClient;
}

export function usingPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

let schemaReady: Promise<void> | null = null;
async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql()`CREATE TABLE IF NOT EXISTS crm_collections (
        name TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      const rows = (await sql()`SELECT count(*)::int AS n FROM crm_collections`) as { n: number }[];
      if (rows[0].n === 0) {
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
  const queries = Object.entries(data).map(
    ([name, value]) =>
      sql()`INSERT INTO crm_collections (name, data) VALUES (${name}, ${JSON.stringify(value)}::jsonb)
            ON CONFLICT (name) DO NOTHING`
  );
  await sql().transaction(queries);
}

/** Overwrites every collection (used by the migration script / restore). */
export async function replaceAllCollections(data: CrmDatabase): Promise<void> {
  await ensureSchemaTableOnly();
  const queries = Object.entries(data).map(
    ([name, value]) =>
      sql()`INSERT INTO crm_collections (name, data) VALUES (${name}, ${JSON.stringify(value)}::jsonb)
            ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data,
              version = crm_collections.version + 1, updated_at = now()`
  );
  await sql().transaction(queries);
}

async function ensureSchemaTableOnly(): Promise<void> {
  await sql()`CREATE TABLE IF NOT EXISTS crm_collections (
    name TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
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
// Postgres implementation
// ---------------------------------------------------------------------------

// In-memory cache for fast burst queries (e.g. concurrent API calls on page load)
interface MemoryCache {
  db: CrmDatabase;
  snap: Snapshot;
  expiresAt: number;
}
let memoryCache: MemoryCache | null = null;
const BURST_CACHE_TTL_MS = 2500;

async function pgRead(): Promise<CrmDatabase> {
  const now = Date.now();
  if (memoryCache && now < memoryCache.expiresAt) {
    const cloned = JSON.parse(JSON.stringify(memoryCache.db));
    snapshots.set(cloned, memoryCache.snap);
    return cloned;
  }

  let rows: {
    name: string;
    data: unknown;
    version: number;
  }[];

  try {
    rows = (await sql()`SELECT name, data, version FROM crm_collections`) as any;
  } catch (err: any) {
    // Only initialize schema if the table does not exist
    if (err?.code === '42P01' || String(err?.message || '').includes('does not exist')) {
      await ensureSchema();
      rows = (await sql()`SELECT name, data, version FROM crm_collections`) as any;
    } else {
      throw err;
    }
  }

  const raw: Record<string, unknown> = {};
  const snap: Snapshot = { versions: {}, json: {} };
  for (const r of rows) {
    raw[r.name] = r.data;
    snap.versions[r.name] = r.version;
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

async function pgWrite(db: CrmDatabase): Promise<void> {
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

  // Each statement divides by the number of rows it updated: if the version moved
  // underneath us, it updates 0 rows -> division by zero -> whole transaction rolls back.
  const queries = changed.map(c =>
    c.version === undefined
      ? sql()`INSERT INTO crm_collections (name, data) VALUES (${c.name}, ${c.json}::jsonb)
              ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data,
                version = crm_collections.version + 1, updated_at = now()
              RETURNING version`
      : sql()`WITH u AS (
                UPDATE crm_collections SET data = ${c.json}::jsonb, version = version + 1, updated_at = now()
                WHERE name = ${c.name} AND version = ${c.version}
                RETURNING version
              )
              SELECT (SELECT version FROM u) AS version, 1 / (SELECT count(*) FROM u)::int AS ok`
  );

  let results: { version: number }[][];
  try {
    results = (await sql().transaction(queries)) as { version: number }[][];
  } catch (err: any) {
    if (String(err?.message || '').includes('division by zero') || err?.code === '22012') {
      throw new DbConflictError();
    }
    throw err;
  }

  // Refresh snapshot so a second writeDb() on the same object works.
  const newSnap: Snapshot = snap ?? { versions: {}, json: {} };
  changed.forEach((c, i) => {
    newSnap.versions[c.name] = results[i][0].version;
    newSnap.json[c.name] = c.json;
  });
  snapshots.set(db, newSnap);
}

// ---------------------------------------------------------------------------
// Local file implementation (development without DATABASE_URL)
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
  return usingPostgres() ? pgRead() : fileRead();
}

export async function saveDb(db: CrmDatabase): Promise<void> {
  return usingPostgres() ? pgWrite(db) : fileWrite(db);
}
