import { Router } from 'express';
import { get, all, run, logActivity } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { clampText, nowIso, toNumber, httpError, asyncRoute } from '../util.js';

const router = Router();
const fmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

router.get('/leaderboard/global', asyncRoute(async (req, res) => {
  const gameSlug = clampText(req.query.game, 80);

  if (gameSlug) {
    const game = await get('SELECT id, title FROM games WHERE slug = ?', gameSlug);
    if (!game) throw httpError(404, 'Không tìm thấy game này.');

    const rows = await all(`
      SELECT u.id AS user_id, u.display_name, u.username, u.avatar_color, u.avatar_path,
             MAX(s.value) AS total, COUNT(*) AS runs, MAX(s.created_at) AS last_at
      FROM scores s JOIN users u ON u.id = s.user_id
      WHERE s.game_id = ?
      GROUP BY u.id ORDER BY total DESC, last_at ASC LIMIT 50
    `, game.id);

    const sets = (await get('SELECT COUNT(*) AS c FROM scores WHERE game_id = ?', game.id)).c;
    return res.json({ mode: 'game', game: { title: game.title, slug: gameSlug }, rows, totalSubmissions: sets });
  }

  const rows = await all(`
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
  `);

  const totalSubmissions = (await get('SELECT COUNT(*) AS c FROM scores')).c;
  res.json({ mode: 'global', rows, totalSubmissions });
}));

router.post('/games/:id/scores', requireAuth, asyncRoute(async (req, res) => {
  const game = await get('SELECT id, title FROM games WHERE id = ?', Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  const raw = toNumber(req.body?.value);
  if (raw === null || raw < 0) throw httpError(400, 'Điểm phải là một số không âm.');
  if (raw > 1e12) throw httpError(400, 'Điểm quá lớn, vui lòng kiểm tra lại.');

  const value = Math.round(raw * 100) / 100;
  const note = clampText(req.body?.note, 120);

  await run('INSERT INTO scores (game_id, user_id, value, note, created_at) VALUES (?, ?, ?, ?, ?)',
    game.id, req.user.id, value, note, nowIso());

  await logActivity({
    userId: req.user.id,
    gameId: game.id,
    type: 'score',
    message: `đã ghi ${fmt.format(value)} điểm ở ${game.title}`,
  });

  const best = (await get('SELECT MAX(value) AS value FROM scores WHERE game_id = ? AND user_id = ?',
    game.id, req.user.id)).value;

  res.status(201).json({ ok: true, best });
}));

router.delete('/scores/:id', requireAuth, asyncRoute(async (req, res) => {
  const score = await get(`
    SELECT s.*, g.title AS game_title, g.slug AS game_slug
    FROM scores s JOIN games g ON g.id = s.game_id WHERE s.id = ?
  `, Number(req.params.id));
  if (!score) throw httpError(404, 'Không tìm thấy lượt ghi điểm này.');

  const canManage = ['admin', 'editor'].includes(req.user.role) || score.user_id === req.user.id;
  if (!canManage) throw httpError(403, 'Bạn không có quyền xoá điểm này.');

  await run('DELETE FROM scores WHERE id = ?', score.id);
  res.json({ ok: true, gameSlug: score.game_slug });
}));

router.get('/scores/mine', requireRole('admin', 'editor', 'member'), asyncRoute(async (req, res) => {
  const rows = await all(`
    SELECT s.id, s.value, s.note, s.created_at, g.title AS game_title, g.slug AS game_slug
    FROM scores s JOIN games g ON g.id = s.game_id
    WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 30
  `, req.user.id);
  res.json({ scores: rows });
}));

export default router;
