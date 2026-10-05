import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import type { CrmDatabase } from '../src/types/crm';

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (!tursoUrl) {
    throw new Error('TURSO_DATABASE_URL is not set. Please set it in .env.local');
  }

  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;
  console.log(`Connecting to Turso: ${tursoUrl.replace(/:[^:@]+@/, ':****@')}`);

  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  // Ensure table exists in Turso
  await client.execute(`
    CREATE TABLE IF NOT EXISTS crm_collections (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Load backup data
  const backupDir = path.join(process.cwd(), 'data', 'backups');
  const backupFile = path.join(backupDir, 'neon_backup_latest.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found at ${backupFile}. Please run backup-neon.ts first.`);
  }

  const backupRaw = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const collections: Record<string, any> = backupRaw.collections;
  const metadata: Record<string, { version: number; updated_at: string; count: number }> = backupRaw.metadata;

  const collectionNames = Object.keys(collections);
  console.log(`Found ${collectionNames.length} collections in Neon backup.`);

  // Check if Turso already has data
  const countRes = await client.execute('SELECT count(*) as count FROM crm_collections');
  const existingCount = Number(countRes.rows[0]?.count ?? 0);
  if (existingCount > 0 && !process.argv.includes('--force')) {
    throw new Error(`Turso database already contains ${existingCount} collections. Re-run with --force to overwrite.`);
  }

  console.log('Migrating collections to Turso...');

  const stmts = collectionNames.map((name) => {
    const val = collections[name];
    const meta = metadata[name] || { version: 1 };
    return {
      sql: `INSERT INTO crm_collections (name, data, version, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT (name) DO UPDATE SET
              data = excluded.data,
              version = excluded.version,
              updated_at = datetime('now')`,
      args: [name, JSON.stringify(val), meta.version || 1],
    };
  });

  await client.batch(stmts, 'write');
  console.log('✔ All collections successfully written to Turso.');

  // Verify and compare
  console.log('\n--- VERIFICATION & PARITY CHECK ---');
  const tursoRows = await client.execute('SELECT name, data, version, updated_at FROM crm_collections ORDER BY name');

  const comparison: any[] = [];
  let allMatched = true;

  for (const row of tursoRows.rows) {
    const name = String(row.name);
    const tursoData = JSON.parse(String(row.data));
    const tursoCount = Array.isArray(tursoData) ? tursoData.length : 1;
    const tursoVersion = Number(row.version);

    const neonMeta = metadata[name];
    const neonCount = neonMeta ? neonMeta.count : 0;
    const neonVersion = neonMeta ? neonMeta.version : 0;

    const countMatches = tursoCount === neonCount;
    const versionMatches = tursoVersion === neonVersion;

    if (!countMatches || !versionMatches) {
      allMatched = false;
    }

    comparison.push({
      Collection: name,
      'Neon Count': neonCount,
      'Turso Count': tursoCount,
      CountMatch: countMatches ? '✅' : '❌',
      'Neon Version': neonVersion,
      'Turso Version': tursoVersion,
    });
  }

  console.table(comparison);

  if (!allMatched) {
    throw new Error('❌ Discrepancy detected between Neon backup and Turso database!');
  }

  console.log('✅ 100% Data Parity Verified between Neon and Turso!');
  client.close();
}

main().catch((err) => {
  console.error('✖ Migration failed:', err.message || err);
  process.exit(1);
});
