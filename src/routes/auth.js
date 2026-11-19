import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, AVATAR_DIR } from '../db.js';
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

function adminCount() {
  return db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
}

function publicUser(id) {
  return db.prepare('SELECT id, username, display_name, role, avatar_color, avatar_path, created_at FROM users WHERE id = ?').get(id);
}

router.get('/state', (req, res) => {
  res.json({ needsSetup: adminCount() === 0 });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

router.post('/register', (req, res) => {
  if (!registerLimit(req.ip)) throw httpError(429, 'Bạn thử quá nhiều lần, vui lòng chờ vài phút.');

  const username = clampText(req.body?.username, 24).toLowerCase();
  const displayName = clampText(req.body?.displayName, 40);
  const password = String(req.body?.password ?? '');

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw httpError(400, 'Tên đăng nhập cần 3–24 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới.');
  }
  if (displayName.length < 1) throw httpError(400, 'Vui lòng nhập tên hiển thị.');
  if (password.length < 6) throw httpError(400, 'Mật khẩu cần ít nhất 6 ký tự.');

  const exists = db.prepare('SELECT 1 AS hit FROM users WHERE username = ?').get(username);
  if (exists) throw httpError(409, 'Tên đăng nhập này đã có người dùng.');

  const isFirstAdmin = adminCount() === 0;
  const role = isFirstAdmin ? 'admin' : 'member';
  const { hash, salt } = hashPassword(password);

  const info = db.prepare(`
    INSERT INTO users (username, display_name, password_hash, salt, role, avatar_color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username, displayName, hash, salt, role, pickColor(username), nowIso());

  createSession(res, Number(info.lastInsertRowid));
  res.status(201).json({ user: publicUser(Number(info.lastInsertRowid)), wasSetup: isFirstAdmin });
});

router.post('/login', (req, res) => {
  const key = `login:${req.ip}`;
  if (!loginLimit(key)) throw httpError(429, 'Sai quá nhiều lần, vui lòng chờ vài phút rồi thử lại.');

  const username = clampText(req.body?.username, 24).toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    throw httpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }

  createSession(res, user.id);
  res.json({ user: publicUser(user.id) });
});

router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.patch('/me', requireAuth, (req, res) => {
  const displayName = req.body?.displayName === undefined ? null : clampText(req.body.displayName, 40);
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (displayName !== null) {
    if (!displayName) throw httpError(400, 'Tên hiển thị không được để trống.');
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, req.user.id);
  }

  if (newPassword) {
    if (newPassword.length < 6) throw httpError(400, 'Mật khẩu mới cần ít nhất 6 ký tự.');
    const row = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(req.user.id);
    if (!verifyPassword(currentPassword, row.salt, row.password_hash)) {
      throw httpError(400, 'Mật khẩu hiện tại không đúng.');
    }
    const { hash, salt } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, req.user.id);
  }

  res.json({ user: publicUser(req.user.id) });
});

router.post('/avatar', requireAuth, avatarUpload.single('avatar'), asyncRoute(async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw httpError(400, 'Vui lòng chọn ảnh đại diện.');

    const remoteUrl = await uploadImage(file.path, file.originalname);
    const stored = remoteUrl || `/avatars/${path.basename(file.path)}`;
    if (remoteUrl) fs.rm(file.path, { force: true }, () => {});

    const current = db.prepare('SELECT avatar_path FROM users WHERE id = ?').get(req.user.id);
    db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(stored, req.user.id);
    removeAvatarFile(current?.avatar_path);

    res.json({ user: publicUser(req.user.id) });
  } catch (err) {
    if (file) fs.rm(file.path, { force: true }, () => {});
    throw err;
  }
}));

router.delete('/avatar', requireAuth, (req, res) => {
  const current = db.prepare('SELECT avatar_path FROM users WHERE id = ?').get(req.user.id);
  db.prepare('UPDATE users SET avatar_path = NULL WHERE id = ?').run(req.user.id);
  removeAvatarFile(current?.avatar_path);
  res.json({ user: publicUser(req.user.id) });
});

export default router;
