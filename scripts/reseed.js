const fs = require('fs');
const path = require('path');

// Read the fresh seed data directly
const seedTs = fs.readFileSync(path.join(__dirname, '../src/lib/seed.ts'), 'utf-8');

// We can execute TypeScript or directly generate data/zen_crm_db.json
const dataDir = path.join(__dirname, '../data');
const dbFile = path.join(dataDir, 'zen_crm_db.json');

// Let's delete the old db file so db.ts automatically re-creates it on next request with getInitialSeedData()
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('Old db file deleted. db.ts will re-seed on next API access.');
}
