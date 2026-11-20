import crypto from 'node:crypto';

export const AVATAR_COLORS = [
  '#b9ff3d', '#8b5cf6', '#22d3ee', '#fb7185',
  '#fbbf24', '#34d399', '#f472b6', '#60a5fa',
];

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function pickColor(seed) {
  const text = String(seed || '');
  let n = 0;
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function uniqueSlug(getRow, table, value, excludeId = null) {
  const base = slugify(value) || 'game';
  let slug = base;
  let i = 2;
  const sql = `SELECT 1 AS hit FROM ${table} WHERE slug = ?${excludeId ? ' AND id <> ?' : ''}`;
  for (;;) {
    const row = excludeId ? await getRow(sql, slug, excludeId) : await getRow(sql, slug);
    if (!row) return slug;
    slug = `${base}-${i++}`;
  }
}

export const nowIso = () => new Date().toISOString();

export function clampText(value, max) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

export function toNumber(value, fallback = null) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function safeFileName(name) {
  return String(name || 'file')
    .replace(/[\\/:*?"<>|\r\n]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || 'file';
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function rateLimiter({ windowMs = 10 * 60 * 1000, max = 12 } = {}) {
  const hits = new Map();
  return function check(key) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}
