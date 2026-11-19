import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { get, run, AVATAR_DIR } from '../db.js';
import { createSession, destroySession, requireAuth } from '../auth.js';
import { hashPassword, verifyPassword, pickColor, nowIso, clampText, rateLimiter, httpError, asyncRoute } from '../util.js';
import { uploadImage } from '../cloudinary.js';

const router = Router();
const loginLimit = rateLimiter({ windowMs: 10 * 60 * 1000, max: 15 });
const registerLimit = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

const AVATAR_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename(req, file, cb) {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!AVATAR_EXTS.has(ext)) return cb(httpError(400, 'Ảnh đại diện chỉ nhận .png, .jpg, .webp hoặc .gif.'));
    cb(null, true);
  },
});

function removeAvatarFile(avatarPath) {
  if (!avatarPath || !avatarPath.startsWith('/avatars/')) return;
  const abs = path.join(AVATAR_DIR, path.basename(avatarPath));
  if (abs.startsWith(AVATAR_DIR + path.sep)) fs.rm(abs, { force: true }, () => {});
}

async function adminCount() {
  const row = await get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
  return row.c;
}

function publicUser(id) {
  return get('SELECT id, username, display_name, role, avatar_color, avatar_path, created_at FROM users WHERE id = ?', id);
}

router.get('/state', asyncRoute(async (req, res) => {
  res.json({ needsSetup: (await adminCount()) === 0 });
}));

router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

router.post('/register', asyncRoute(async (req, res) => {
  if (!registerLimit(req.ip)) throw httpError(429, 'Bạn thử quá nhiều lần, vui lòng chờ vài phút.');

  const username = clampText(req.body?.username, 24).toLowerCase();
  const displayName = clampText(req.body?.displayName, 40);
  const password = String(req.body?.password ?? '');

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw httpError(400, 'Tên đăng nhập cần 3–24 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới.');
  }
  if (displayName.length < 1) throw httpError(400, 'Vui lòng nhập tên hiển thị.');
  if (password.length < 6) throw httpError(400, 'Mật khẩu cần ít nhất 6 ký tự.');

  const exists = await get('SELECT 1 AS hit FROM users WHERE username = ?', username);
  if (exists) throw httpError(409, 'Tên đăng nhập này đã có người dùng.');

  const isFirstAdmin = (await adminCount()) === 0;
  const role = isFirstAdmin ? 'admin' : 'member';
  const { hash, salt } = hashPassword(password);

  const info = await run(`
    INSERT INTO users (username, display_name, password_hash, salt, role, avatar_color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, username, displayName, hash, salt, role, pickColor(username), nowIso());

  await createSession(res, info.lastInsertRowid);
  res.status(201).json({ user: await publicUser(info.lastInsertRowid), wasSetup: isFirstAdmin });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const key = `login:${req.ip}`;
  if (!loginLimit(key)) throw httpError(429, 'Sai quá nhiều lần, vui lòng chờ vài phút rồi thử lại.');

  const username = clampText(req.body?.username, 24).toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = await get('SELECT * FROM users WHERE username = ?', username);

  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    throw httpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }

  await createSession(res, user.id);
  res.json({ user: await publicUser(user.id) });
}));

router.post('/logout', asyncRoute(async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
}));

router.patch('/me', requireAuth, asyncRoute(async (req, res) => {
  const displayName = req.body?.displayName === undefined ? null : clampText(req.body.displayName, 40);
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (displayName !== null) {
    if (!displayName) throw httpError(400, 'Tên hiển thị không được để trống.');
    await run('UPDATE users SET display_name = ? WHERE id = ?', displayName, req.user.id);
  }

  if (newPassword) {
    if (newPassword.length < 6) throw httpError(400, 'Mật khẩu mới cần ít nhất 6 ký tự.');
    const row = await get('SELECT password_hash, salt FROM users WHERE id = ?', req.user.id);
    if (!verifyPassword(currentPassword, row.salt, row.password_hash)) {
      throw httpError(400, 'Mật khẩu hiện tại không đúng.');
    }
    const { hash, salt } = hashPassword(newPassword);
    await run('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', hash, salt, req.user.id);
  }

  res.json({ user: await publicUser(req.user.id) });
}));

router.post('/avatar', requireAuth, avatarUpload.single('avatar'), asyncRoute(async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw httpError(400, 'Vui lòng chọn ảnh đại diện.');

    const remoteUrl = await uploadImage(file.path, file.originalname);
    const stored = remoteUrl || `/avatars/${path.basename(file.path)}`;
    if (remoteUrl) fs.rm(file.path, { force: true }, () => {});

    const current = await get('SELECT avatar_path FROM users WHERE id = ?', req.user.id);
    await run('UPDATE users SET avatar_path = ? WHERE id = ?', stored, req.user.id);
    removeAvatarFile(current?.avatar_path);

    res.json({ user: await publicUser(req.user.id) });
  } catch (err) {
    if (file) fs.rm(file.path, { force: true }, () => {});
    throw err;
  }
}));

router.delete('/avatar', requireAuth, asyncRoute(async (req, res) => {
  const current = await get('SELECT avatar_path FROM users WHERE id = ?', req.user.id);
  await run('UPDATE users SET avatar_path = NULL WHERE id = ?', req.user.id);
  removeAvatarFile(current?.avatar_path);
  res.json({ user: await publicUser(req.user.id) });
}));

export default router;
