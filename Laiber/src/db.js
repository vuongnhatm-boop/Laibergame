import { createClient } from '@libsql/client';
import { mkdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { nowIso } from './util.js';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(SRC_DIR, '..');

// Vercel chỉ cho ghi /tmp; dữ liệu bền nằm ở Turso.
export const STORAGE_ROOT = process.env.VERCEL ? os.tmpdir() : ROOT;
export const DATA_DIR = path.join(STORAGE_ROOT, 'data');
export const UPLOAD_DIR = path.join(STORAGE_ROOT, 'uploads');
export const COVER_DIR = path.join(UPLOAD_DIR, 'covers');
export const FILE_DIR = path.join(UPLOAD_DIR, 'files');
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');

for (const dir of [DATA_DIR, UPLOAD_DIR, COVER_DIR, FILE_DIR, AVATAR_DIR]) mkdirSync(dir, { recursive: true });

const REMOTE_URL = String(process.env.TURSO_DATABASE_URL || '').trim();
export const usingRemoteDb = REMOTE_URL.length > 0;
const DB_URL = usingRemoteDb
  ? REMOTE_URL
  : pathToFileURL(path.join(DATA_DIR, 'vault.db')).href;

export const db = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'member')),
    avatar_color TEXT NOT NULL DEFAULT '#b9ff3d',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'done', 'abandoned')),
    version TEXT NOT NULL DEFAULT '1.0',
    cover_url TEXT,
    play_url TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    external_url TEXT,
    downloads INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS game_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    file_name TEXT,
    file_path TEXT,
    file_size INTEGER,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value REAL NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS likes (
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (game_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS ratings (
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (game_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TEXT NOT NULL,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_id, value DESC)',
  'CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_games_category ON games(category_id)',
  'CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id)',
  'CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC)',
];

const SEED_CATEGORIES = [
  ['Hành động', 'hanh-dong', '#fb7185'],
  ['Phiêu lưu', 'phieu-luu', '#60a5fa'],
  ['Giải đố', 'giai-do', '#34d399'],
  ['Kinh dị', 'kinh-di', '#a78bfa'],
  ['Mô phỏng', 'mo-phong', '#fbbf24'],
  ['Nhập vai', 'nhap-vai', '#22d3ee'],
  ['Chiến thuật', 'chien-thuat', '#8b5cf6'],
  ['Thể thao', 'the-thao', '#b9ff3d'],
];

async function init() {
  try {
    await db.execute('PRAGMA foreign_keys = ON');
  } catch {
    // Turso đã bật khoá ngoại mặc định.
  }

  await db.batch(SCHEMA, 'write');

  const columns = await db.execute("SELECT name FROM pragma_table_info('users')");
  if (!columns.rows.some((col) => col.name === 'avatar_path')) {
    await db.execute('ALTER TABLE users ADD COLUMN avatar_path TEXT');
  }

  const seeded = await db.execute('SELECT COUNT(*) AS c FROM categories');
  if (Number(seeded.rows[0].c) === 0) {
    const createdAt = nowIso();
    await db.batch(SEED_CATEGORIES.map(([name, slug, color]) => ({
      sql: 'INSERT INTO categories (name, slug, color, created_at) VALUES (?, ?, ?, ?)',
      args: [name, slug, color, createdAt],
    })), 'write');
  }
}

let readyPromise = null;
export function ready() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

export async function get(sql, ...args) {
  await ready();
  const result = await db.execute({ sql, args });
  return result.rows[0];
}

export async function all(sql, ...args) {
  await ready();
  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function run(sql, ...args) {
  await ready();
  const result = await db.execute({ sql, args });
  return {
    changes: Number(result.rowsAffected || 0),
    lastInsertRowid: Number(result.lastInsertRowid || 0),
  };
}

export async function logActivity({ userId = null, gameId = null, type, message }) {
  await run(
    'INSERT INTO activity (user_id, game_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)',
    userId, gameId, type, message, nowIso(),
  );
}

export function coverExists(fileName) {
  return existsSync(path.join(COVER_DIR, fileName));
}
