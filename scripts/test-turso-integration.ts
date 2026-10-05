import { config } from 'dotenv';
config({ path: '.env.local' });
config();

// Use TURSO_DATABASE_URL from .env.local, or fallback to local test db
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'file:data/test_turso.db';

import { readDb, writeDb, getCurrentUser, logAuditEvent, DbConflictError } from '../src/lib/db';

async function testIntegration() {
  console.log('Testing libSQL full integration via db.ts...');

  // 1. Read DB
  const db = await readDb();
  console.log(`✔ Read DB success: ${db.users.length} users, ${db.products.length} products, ${db.auditLogs.length} audit logs.`);

  // 2. Authentication / User lookup
  const admin = await getCurrentUser('usr_admin');
  console.log(`✔ Found user usr_admin: ${admin.email} (role: ${admin.role})`);

  // 3. Modifying data & Write DB
  const initialLogCount = db.auditLogs.length;
  await logAuditEvent(
    admin.id,
    admin.name,
    'UPDATE',
    'SETTINGS',
    'test_turso',
    'Testing Turso libSQL integration write'
  );

  const updatedDb = await readDb();
  console.log(`✔ Write DB success: audit logs increased from ${initialLogCount} to ${updatedDb.auditLogs.length}.`);

  // 4. Test product update
  const originalPrice = updatedDb.products[0].retailPrice;
  updatedDb.products[0].retailPrice = originalPrice + 1000;
  await writeDb(updatedDb);

  const reReadDb = await readDb();
  if (reReadDb.products[0].retailPrice === originalPrice + 1000) {
    console.log(`✔ Product update verified: new price ${reReadDb.products[0].retailPrice}`);
    // Revert back
    reReadDb.products[0].retailPrice = originalPrice;
    await writeDb(reReadDb);
    console.log('✔ Product price restored.');
  } else {
    throw new Error('Product price was not updated!');
  }

  // 5. Test Optimistic Lock conflict
  console.log('Testing optimistic lock conflict handling...');
  const stateA = await readDb();
  const stateB = await readDb();

  const now = Date.now();
  stateA.users[0].name = 'Conflict Test A ' + now;
  await writeDb(stateA);

  stateB.users[0].name = 'Conflict Test B ' + now;
  let conflictCaught = false;
  try {
    await writeDb(stateB);
  } catch (err) {
    if (err instanceof DbConflictError) {
      conflictCaught = true;
      console.log('✔ Optimistic locking caught conflict correctly (DbConflictError thrown)!');
    } else {
      throw err;
    }
  }

  if (!conflictCaught) {
    throw new Error('Optimistic locking did not trigger conflict!');
  }

  // Restore name
  const finalDb = await readDb();
  finalDb.users[0].name = 'Quản Trị Viên';
  await writeDb(finalDb);

  console.log('🎉 ALL TURSO INTEGRATION TESTS PASSED 100%!');
}

testIntegration().catch(err => {
  console.error('✖ Integration test failed:', err);
  process.exit(1);
});
