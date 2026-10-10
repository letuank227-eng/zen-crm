import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

async function check() {
  console.log('========================================================');
  console.log('           BÁO CÁO DỮ LIỆU DATABASE ZEN CRM             ');
  console.log('========================================================\n');

  // 1. Kiểm tra Cloud Database (Turso / libSQL)
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  console.log('1. CLOUD DATABASE (TURSO / LIBSQL):');
  console.log('------------------------------------');
  console.log(`URL kết nối: ${url ? url.replace(/libsql:\/\//, '') : 'Chưa thiết lập'}`);
  
  if (url) {
    try {
      const client = createClient({ url, authToken });
      
      const allTables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      const tableNames = allTables.rows.map(r => String(r.name));
      console.log(`Các bảng trong cơ sở dữ liệu: ${tableNames.join(', ')}`);

      if (tableNames.includes('crm_collections')) {
        const result = await client.execute("SELECT name, length(data) as bytes, version, updated_at FROM crm_collections ORDER BY length(data) DESC");
        
        let totalCloudBytes = 0;
        let totalRecords = 0;
        const details: any[] = [];

        for (const row of result.rows) {
          const bytes = Number(row.bytes);
          totalCloudBytes += bytes;
          
          let count = 0;
          try {
            const dataRow = await client.execute({
              sql: 'SELECT data FROM crm_collections WHERE name = ?',
              args: [row.name]
            });
            const parsed = JSON.parse(String(dataRow.rows[0].data));
            if (Array.isArray(parsed)) {
              count = parsed.length;
              totalRecords += count;
            } else if (typeof parsed === 'object' && parsed !== null) {
              count = Object.keys(parsed).length;
            }
          } catch {}

          details.push({
            collection: row.name,
            records: count,
            sizeKb: (bytes / 1024).toFixed(2),
            version: row.version,
            updatedAt: row.updated_at
          });
        }

        console.log('\nThống kê theo danh mục (Turso Cloud):');
        console.table(details);

        console.log(`=> Tổng số bản ghi (ước tính): ${totalRecords.toLocaleString('vi-VN')} bản ghi`);
        console.log(`=> Dung lượng dữ liệu thô (JSON in DB): ${(totalCloudBytes / 1024).toFixed(2)} KB (~${(totalCloudBytes / (1024 * 1024)).toFixed(3)} MB)`);
      }

      // Check server snapshots table if exists
      if (tableNames.includes('crm_snapshots')) {
        const snapRes = await client.execute("SELECT count(*) as count, sum(length(data)) as total_bytes FROM crm_snapshots");
        const snapCount = Number(snapRes.rows[0]?.count ?? 0);
        const snapBytes = Number(snapRes.rows[0]?.total_bytes ?? 0);
        console.log(`\nBảng sao lưu Cloud (crm_snapshots): ${snapCount} bản snapshot (~${(snapBytes / 1024).toFixed(2)} KB)`);
      }

    } catch (e: any) {
      console.error('Lỗi khi truy vấn Turso Cloud:', e.message);
    }
  }

  // 2. Kiểm tra File JSON Cục Bộ
  console.log('\n\n2. FILE DATABASE CỤC BỘ (LOCAL FILE):');
  console.log('------------------------------------');
  const localDbPath = path.resolve('data/zen_crm_db.json');
  if (fs.existsSync(localDbPath)) {
    const stat = fs.statSync(localDbPath);
    console.log(`Đường dẫn: data/zen_crm_db.json`);
    console.log(`Dung lượng file: ${(stat.size / 1024).toFixed(2)} KB (${stat.size.toLocaleString('vi-VN')} bytes)`);
    console.log(`Thời gian cập nhật gần nhất: ${stat.mtime.toLocaleString('vi-VN')}`);

    try {
      const localData = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
      const localDetails: any[] = [];
      let totalLocalRecords = 0;

      for (const [key, value] of Object.entries(localData)) {
        let count = 0;
        let type: string = typeof value;
        if (Array.isArray(value)) {
          count = value.length;
          totalLocalRecords += count;
          type = 'array';
        } else if (typeof value === 'object' && value !== null) {
          count = Object.keys(value).length;
          type = 'object';
        }
        localDetails.push({
          collection: key,
          records: count,
          type: type
        });
      }
      console.table(localDetails);
      console.log(`=> Tổng số bản ghi cục bộ: ${totalLocalRecords.toLocaleString('vi-VN')} bản ghi`);
    } catch (e: any) {
      console.error('Lỗi khi đọc file json cục bộ:', e.message);
    }
  } else {
    console.log('Không tìm thấy file data/zen_crm_db.json');
  }

  // 3. Kiểm tra Sao lưu (Backups)
  console.log('\n\n3. THƯ MỤC SAO LƯU (BACKUPS):');
  console.log('------------------------------------');
  const backupDir = path.resolve('data/backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    let totalBackupSize = 0;
    for (const f of files) {
      totalBackupSize += fs.statSync(path.join(backupDir, f)).size;
    }
    console.log(`Số file backup: ${files.length} file`);
    console.log(`Tổng dung lượng backup: ${(totalBackupSize / 1024).toFixed(2)} KB (~${(totalBackupSize / (1024 * 1024)).toFixed(3)} MB)`);
    if (files.length > 0) {
      console.log(`File mới nhất: ${files[files.length - 1]}`);
    }
  }
}

check();
