/**
 * Upload local data (data/zen_crm_db.json) to the Postgres database in DATABASE_URL.
 *
 *   npx tsx scripts/migrate-to-postgres.ts            # refuses if the DB already has data
 *   npx tsx scripts/migrate-to-postgres.ts --force    # overwrite existing DB data
 *
 * Reads DATABASE_URL (and optionally ADMIN_EMAIL / ADMIN_PASSWORD) from .env.local.
 * All plaintext passwords are converted to bcrypt hashes before upload.
 * If ADMIN_PASSWORD is set, it becomes the password of the first ADMIN account
 * (and ADMIN_EMAIL its email).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { replaceAllCollections } from '../src/lib/storage';
import { hashPassword, isHashed } from '../src/lib/password';
import type { CrmDatabase } from '../src/types/crm';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (put it in .env.local)');

  const file = path.join(process.cwd(), 'data', 'zen_crm_db.json');
  if (!fs.existsSync(file)) throw new Error(`Not found: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as CrmDatabase;

  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS crm_collections (
    name TEXT PRIMARY KEY, data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM crm_collections`) as { n: number }[];
  if (n > 0 && !process.argv.includes('--force')) {
    throw new Error('Database already contains data. Re-run with --force to overwrite.');
  }

  let hashed = 0;
  let cleared = 0;
  for (const u of data.users) {
    if (u.password && !isHashed(u.password)) {
      // Never carry over the old shared default password.
      if (u.password === 'zengarden') {
        u.password = undefined;
        cleared++;
      } else {
        u.password = await hashPassword(u.password);
        hashed++;
      }
    }
  }

  const admin = data.users.find(u => u.role === 'ADMIN');
  if (process.env.ADMIN_PASSWORD && admin) {
    if (process.env.ADMIN_EMAIL) admin.email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    admin.password = await hashPassword(process.env.ADMIN_PASSWORD);
    admin.isLocked = false;
  }

  await replaceAllCollections(data);

  console.log('✔ Migration complete');
  console.log(`  users: ${data.users.length} (hashed ${hashed}, cleared default password on ${cleared})`);
  console.log(`  leads: ${data.leads?.length ?? 0}, orders: ${data.orders?.length ?? 0}, deals: ${data.deals?.length ?? 0}`);
  if (admin) console.log(`  admin login: ${admin.email}${admin.password ? '' : '  ⚠ NO PASSWORD - set ADMIN_PASSWORD and re-run'}`);
  if (cleared) console.log('  ⚠ Users that used "zengarden" need a new password: Settings → "Cấp lại".');
}

main().catch(err => {
  console.error('✖', err.message || err);
  process.exit(1);
});
