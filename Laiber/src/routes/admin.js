import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { get, all, run, AVATAR_DIR, logActivity } from '../db.js';
import { requireRole } from '../auth.js';
import { clampText, slugify, nowIso, hashPassword, httpError, asyncRoute } from '../util.js';

const router = Router();

router.get('/categories', asyncRoute(async (req, res) => {
  const categories = await all(`
    SELECT c.id, c.name, c.slug, c.color,
           (SELECT COUNT(*) FROM games g WHERE g.category_id = c.id) AS game_count
    FROM categories c ORDER BY c.name COLLATE NOCASE ASC
  `);
  res.json({ categories });
}));

router.post('/categories', requireRole('admin', 'editor'), asyncRoute(async (req, res) => {
  const name = clampText(req.body?.name, 40);
  const color = String(req.body?.color || '#8b5cf6');
  if (!name) throw httpError(400, 'Vui lòng nhập tên thể loại.');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw httpError(400, 'Màu phải ở dạng #rrggbb.');

  const slug = slugify(name);
  if (!slug) throw httpError(400, 'Tên thể loại không hợp lệ.');
  if (await get('SELECT 1 AS hit FROM categories WHERE name = ? OR slug = ?', name, slug)) {
    throw httpError(409, 'Thể loại này đã tồn tại.');
  }

  await run('INSERT INTO categories (name, slug, color, created_at) VALUES (?, ?, ?, ?)',
    name, slug, color.toLowerCase(), nowIso());
  res.status(201).json({ ok: true });
}));

router.delete('/categories/:id', requireRole('admin', 'editor'), asyncRoute(async (req, res) => {
  const category = await get('SELECT * FROM categories WHERE id = ?', Number(req.params.id));
  if (!category) throw httpError(404, 'Không tìm thấy thể loại này.');
  await run('DELETE FROM categories WHERE id = ?', category.id);
  res.json({ ok: true });
}));

router.get('/stats', asyncRoute(async (req, res) => {
  const one = async (sql) => (await get(sql)).c;
  res.json({
    stats: {
      games: await one('SELECT COUNT(*) AS c FROM games'),
      users: await one('SELECT COUNT(*) AS c FROM users'),
      scores: await one('SELECT COUNT(*) AS c FROM scores'),
      downloads: await one('SELECT COALESCE(SUM(downloads), 0) AS c FROM games'),
      likes: await one('SELECT COUNT(*) AS c FROM likes'),
      versions: await one('SELECT COUNT(*) AS c FROM game_versions'),
      ratings: await one('SELECT COUNT(*) AS c FROM ratings'),
      comments: await one('SELECT COUNT(*) AS c FROM comments'),
      openReports: await one("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'"),
    },
  });
}));

router.get('/activity', asyncRoute(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 40);
  const rows = await all(`
    SELECT a.id, a.type, a.message, a.created_at,
           u.display_name, u.avatar_color, u.avatar_path, u.username,
           g.slug AS game_slug
    FROM activity a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN games g ON g.id = a.game_id
    ORDER BY a.created_at DESC LIMIT ?
  `, limit);
  res.json({ activity: rows });
}));

router.get('/users', requireRole('admin'), asyncRoute(async (req, res) => {
  const users = await all(`
    SELECT u.id, u.username, u.display_name, u.role, u.avatar_color, u.avatar_path, u.created_at,
      (SELECT COUNT(*) FROM scores s WHERE s.user_id = u.id) AS score_count,
      (SELECT COUNT(DISTINCT game_id) FROM scores s WHERE s.user_id = u.id) AS games_played,
      (SELECT COALESCE(SUM(value), 0) FROM (
          SELECT MAX(value) AS value FROM scores WHERE user_id = u.id GROUP BY game_id
      )) AS total_points
    FROM users u ORDER BY u.created_at ASC
  `);
  res.json({ users });
}));

router.patch('/users/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const target = await get('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!target) throw httpError(404, 'Không tìm thấy người dùng này.');

  const body = req.body || {};

  if (body.role !== undefined) {
    if (!['admin', 'editor', 'member'].includes(body.role)) throw httpError(400, 'Vai trò không hợp lệ.');
    if (target.role === 'admin' && body.role !== 'admin') {
      const admins = (await get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")).c;
      if (admins <= 1) throw httpError(400, 'Không thể hạ quyền quản trị viên duy nhất.');
    }
    await run('UPDATE users SET role = ? WHERE id = ?', body.role, target.id);
    await logActivity({
      userId: req.user.id,
      type: 'role',
      message: `đã đổi vai trò của ${target.display_name} thành ${body.role === 'admin' ? 'quản trị viên' : body.role === 'editor' ? 'quản lý nội dung' : 'thành viên'}`,
    });
  }

  if (body.displayName !== undefined) {
    const name = clampText(body.displayName, 40);
    if (!name) throw httpError(400, 'Tên hiển thị không được để trống.');
    await run('UPDATE users SET display_name = ? WHERE id = ?', name, target.id);
  }

  if (body.password !== undefined && String(body.password).length > 0) {
    if (String(body.password).length < 6) throw httpError(400, 'Mật khẩu cần ít nhất 6 ký tự.');
    const { hash, salt } = hashPassword(String(body.password));
    await run('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', hash, salt, target.id);
  }

  const user = await get('SELECT id, username, display_name, role, avatar_color, created_at FROM users WHERE id = ?',
    target.id);
  res.json({ user });
}));

router.delete('/users/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const target = await get('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!target) throw httpError(404, 'Không tìm thấy người dùng này.');
  if (target.id === req.user.id) throw httpError(400, 'Bạn không thể xoá chính mình.');
  if (target.role === 'admin') {
    const admins = (await get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")).c;
    if (admins <= 1) throw httpError(400, 'Không thể xoá quản trị viên duy nhất.');
  }
  await run('DELETE FROM users WHERE id = ?', target.id);
  if (target.avatar_path?.startsWith('/avatars/')) {
    fs.rm(path.join(AVATAR_DIR, path.basename(target.avatar_path)), { force: true }, () => {});
  }
  res.json({ ok: true });
}));

export default router;
