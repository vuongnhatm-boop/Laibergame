import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { ready, db as remote } from '../src/db.js';

const TABLES = [
  'users',
  'categories',
  'games',
  'game_versions',
  'scores',
  'likes',
  'ratings',
  'comments',
  'reports',
  'activity',
];

const srcArg = process.argv[2] || 'D:/Khám phá/game-vault/data/vault.db';
const srcPath = path.resolve(srcArg);

if (!existsSync(srcPath)) {
  console.error(`Không thấy database nguồn: ${srcPath}`);
  process.exit(1);
}

const remoteUrl = String(process.env.TURSO_DATABASE_URL || '').trim();
if (!remoteUrl) {
  console.error('Thiếu TURSO_DATABASE_URL (đặt trong .env hoặc biến môi trường).');
  process.exit(1);
}

const source = createClient({ url: pathToFileURL(srcPath).href });

await ready();

for (const table of TABLES) {
  const cols = await source.execute(`SELECT name FROM pragma_table_info('${table}')`);
  const names = cols.rows.map((row) => row.name);
  const rows = await source.execute(`SELECT * FROM ${table}`);
  if (rows.rows.length === 0) {
    console.log(`${table}: 0`);
    continue;
  }

  const placeholders = names.map(() => '?').join(', ');
  const statements = rows.rows.map((row) => ({
    sql: `INSERT OR REPLACE INTO ${table} (${names.join(', ')}) VALUES (${placeholders})`,
    args: names.map((name) => row[name]),
  }));

  for (let i = 0; i < statements.length; i += 100) {
    await remote.batch(statements.slice(i, i + 100), 'write');
  }
  console.log(`${table}: ${statements.length}`);
}

console.log('\nKiểm tra trên Turso:');
for (const table of TABLES) {
  const result = await remote.execute(`SELECT COUNT(*) AS c FROM ${table}`);
  console.log(`  ${table}: ${Number(result.rows[0].c)}`);
}

const srcFile = srcPath;
console.log(`\nNguồn: ${srcFile}`);
console.log('Xong. Phiên đăng nhập không được chuyển — mọi người chỉ cần đăng nhập lại.');
