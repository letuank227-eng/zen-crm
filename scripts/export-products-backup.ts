import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import fs from 'fs';
import path from 'path';

const fullBackupPath = path.join(process.cwd(), 'data', 'backups', 'turso_backup_latest.json');
if (fs.existsSync(fullBackupPath)) {
  const fullBackup = JSON.parse(fs.readFileSync(fullBackupPath, 'utf-8'));
  const products = fullBackup.data?.products || [];
  const categories = fullBackup.data?.productCategories || [];

  const productsPayload = {
    timestamp: new Date().toISOString(),
    totalProducts: products.length,
    totalCategories: categories.length,
    categories,
    products,
  };

  const outPath = path.join(process.cwd(), 'data', 'backups', 'products_backup_latest.json');
  fs.writeFileSync(outPath, JSON.stringify(productsPayload, null, 2), 'utf-8');
  console.log(`Saved ${products.length} products to ${outPath}`);
}
