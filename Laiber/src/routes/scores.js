import { Router } from 'express';
import { db, logActivity } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { clampText, nowIso, toNumber, httpError } from '../util.js';

const router = Router();
const fmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

router.get('/leaderboard/global', (req, res) => {
  const gameSlug = clampText(req.query.game, 80);

  if (gameSlug) {
    const game = db.prepare('SELECT id, title FROM games WHERE slug = ?').get(gameSlug);
    if (!game) throw httpError(404, 'Không tìm thấy game này.');

    const rows = db.prepare(`
      SELECT u.id AS user_id, u.display_name, u.username, u.avatar_color, u.avatar_path,
             MAX(s.value) AS total, COUNT(*) AS runs, MAX(s.created_at) AS last_at
      FROM scores s JOIN users u ON u.id = s.user_id
      WHERE s.game_id = ?
      GROUP BY u.id ORDER BY total DESC, last_at ASC LIMIT 50
    `).all(game.id);

    const sets = db.prepare('SELECT COUNT(*) AS c FROM scores WHERE game_id = ?').get(game.id).c;
    return res.json({ mode: 'game', game: { title: game.title, slug: gameSlug }, rows, totalSubmissions: sets });
  }

  const rows = db.prepare(`
    WITH best AS (
      SELECT user_id, game_id, MAX(value) AS value, COUNT(*) AS runs
      FROM scores GROUP BY user_id, game_id
    )
    SELECT u.id AS user_id, u.display_name, u.username, u.avatar_color, u.avatar_path,
           COUNT(b.game_id) AS games_played,
           COALESCE(SUM(b.value), 0) AS total,
           COALESCE(MAX(b.value), 0) AS best,
           COALESCE(SUM(b.runs), 0) AS runs
    FROM users u LEFT JOIN best b ON b.user_id = u.id
    GROUP BY u.id
    ORDER BY total DESC, best DESC, u.display_name ASC
    LIMIT 50
  `).all();

  const totalSubmissions = db.prepare('SELECT COUNT(*) AS c FROM scores').get().c;
  res.json({ mode: 'global', rows, totalSubmissions });
});

router.post('/games/:id/scores', requireAuth, (req, res) => {
  const game = db.prepare('SELECT id, title FROM games WHERE id = ?').get(Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  const raw = toNumber(req.body?.value);
  if (raw === null || raw < 0) throw httpError(400, 'Điểm phải là một số không âm.');
  if (raw > 1e12) throw httpError(400, 'Điểm quá lớn, vui lòng kiểm tra lại.');

  const value = Math.round(raw * 100) / 100;
  const note = clampText(req.body?.note, 120);

  db.prepare('INSERT INTO scores (game_id, user_id, value, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(game.id, req.user.id, value, note, nowIso());

  logActivity({
    userId: req.user.id,
    gameId: game.id,
    type: 'score',
    message: `đã ghi ${fmt.format(value)} điểm ở ${game.title}`,
  });

  const best = db.prepare('SELECT MAX(value) AS value FROM scores WHERE game_id = ? AND user_id = ?')
    .get(game.id, req.user.id).value;

  res.status(201).json({ ok: true, best });
});

router.delete('/scores/:id', requireAuth, (req, res) => {
  const score = db.prepare(`
    SELECT s.*, g.title AS game_title, g.slug AS game_slug
    FROM scores s JOIN games g ON g.id = s.game_id WHERE s.id = ?
  `).get(Number(req.params.id));
  if (!score) throw httpError(404, 'Không tìm thấy lượt ghi điểm này.');

  const canManage = ['admin', 'editor'].includes(req.user.role) || score.user_id === req.user.id;
  if (!canManage) throw httpError(403, 'Bạn không có quyền xoá điểm này.');

  db.prepare('DELETE FROM scores WHERE id = ?').run(score.id);
  res.json({ ok: true, gameSlug: score.game_slug });
});

router.get('/scores/mine', requireRole('admin', 'editor', 'member'), (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.value, s.note, s.created_at, g.title AS game_title, g.slug AS game_slug
    FROM scores s JOIN games g ON g.id = s.game_id
    WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 30
  `).all(req.user.id);
  res.json({ scores: rows });
});

export default router;
