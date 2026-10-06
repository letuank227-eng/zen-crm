import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import type { CrmDatabase } from '../src/types/crm';

async function backup() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const isTurso = !!(tursoUrl && (tursoUrl.startsWith('libsql:') || tursoUrl.startsWith('http')));

  let dbData: Partial<CrmDatabase> = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (isTurso) {
    console.log(`Connecting to Turso: ${tursoUrl.replace(/:[^:@]+@/, ':****@')}`);
    const client = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const res = await client.execute('SELECT name, data, version, updated_at FROM crm_collections ORDER BY name');
    console.log(`Retrieved ${res.rows.length} collections from Turso.`);

    const collections: Record<string, unknown> = {};
    const metadata: Record<string, { version: number; updated_at: string; count: number }> = {};

    for (const row of res.rows) {
      const name = String(row.name);
      try {
        const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        collections[name] = parsed;
        metadata[name] = {
          version: Number(row.version),
          updated_at: String(row.updated_at),
          count: Array.isArray(parsed) ? parsed.length : 1,
        };
      } catch (e) {
        console.error(`Failed parsing ${name}:`, e);
      }
    }

    dbData = collections as Partial<CrmDatabase>;

    const backupDir = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const payload = {
      timestamp: new Date().toISOString(),
      source: 'turso-libsql',
      metadata,
      data: dbData,
    };

    const latestFile = path.join(backupDir, 'turso_backup_latest.json');
    const timestampFile = path.join(backupDir, `turso_backup_${timestamp}.json`);

    fs.writeFileSync(latestFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.writeFileSync(timestampFile, JSON.stringify(payload, null, 2), 'utf-8');

    console.log(`✔ Backup saved to: ${latestFile}`);
    console.log(`✔ Backup timestamped copy: ${timestampFile}`);
    console.log(`Summary: Users=${(dbData.users as any[])?.length || 0}, Leads=${(dbData.leads as any[])?.length || 0}, Orders=${(dbData.orders as any[])?.length || 0}, Products=${(dbData.products as any[])?.length || 0}`);
  } else {
    console.log('Using local JSON file data/zen_crm_db.json');
    const localDbPath = path.join(process.cwd(), 'data', 'zen_crm_db.json');
    if (!fs.existsSync(localDbPath)) {
      throw new Error(`Local DB file not found: ${localDbPath}`);
    }
    const raw = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const payload = {
      timestamp: new Date().toISOString(),
      source: 'local-file',
      data: raw,
    };

    const latestFile = path.join(backupDir, 'local_backup_latest.json');
    const timestampFile = path.join(backupDir, `local_backup_${timestamp}.json`);

    fs.writeFileSync(latestFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.writeFileSync(timestampFile, JSON.stringify(payload, null, 2), 'utf-8');

    console.log(`✔ Local backup saved to: ${latestFile}`);
  }
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
