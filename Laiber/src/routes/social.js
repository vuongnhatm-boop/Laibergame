import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { clampText, nowIso, rateLimiter, httpError } from '../util.js';

const router = Router();

const commentLimit = rateLimiter({ windowMs: 5 * 60 * 1000, max: 20 });
const reportLimit = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

const REPORT_REASONS = new Map([
  ['wrong_link', 'Link sai hoặc không mở được'],
  ['stolen', 'Nội dung bị đánh cắp'],
  ['broken', 'Game lỗi, không chơi hoặc tải được'],
  ['other', 'Vấn đề khác'],
]);

const COMMENT_SELECT = `
  SELECT c.id, c.body, c.created_at, u.id AS user_id, u.display_name, u.username,
         u.avatar_color, u.avatar_path
  FROM comments c LEFT JOIN users u ON u.id = c.user_id
`;

function commentCount(gameId) {
  return db.prepare('SELECT COUNT(*) AS c FROM comments WHERE game_id = ?').get(gameId).c;
}

router.post('/games/:id/comments', requireAuth, (req, res) => {
  const game = db.prepare('SELECT id, title FROM games WHERE id = ?').get(Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');
  if (!commentLimit(`comment:${req.user.id}`)) {
    throw httpError(429, 'Bạn bình luận hơi nhanh, chờ vài phút nhé.');
  }

  const body = clampText(req.body?.body, 1000);
  if (body.length < 2) throw httpError(400, 'Bình luận cần ít nhất 2 ký tự.');

  const info = db.prepare('INSERT INTO comments (game_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(game.id, req.user.id, body, nowIso());
  const comment = db.prepare(`${COMMENT_SELECT} WHERE c.id = ?`).get(Number(info.lastInsertRowid));

  res.status(201).json({ comment, commentCount: commentCount(game.id) });
});

router.delete('/comments/:id', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT c.*, g.slug AS game_slug FROM comments c
    JOIN games g ON g.id = c.game_id WHERE c.id = ?
  `).get(Number(req.params.id));
  if (!row) throw httpError(404, 'Không tìm thấy bình luận này.');

  const allowed = ['admin', 'editor'].includes(req.user.role) || row.user_id === req.user.id;
  if (!allowed) throw httpError(403, 'Bạn không có quyền xoá bình luận này.');

  db.prepare('DELETE FROM comments WHERE id = ?').run(row.id);
  res.json({ ok: true, gameSlug: row.game_slug, commentCount: commentCount(row.game_id) });
});

router.post('/games/:id/reports', requireAuth, (req, res) => {
  const game = db.prepare('SELECT id, title FROM games WHERE id = ?').get(Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');
  if (!reportLimit(`report:${req.user.id}`)) {
    throw httpError(429, 'Bạn đã gửi quá nhiều báo cáo, thử lại sau.');
  }

  const reason = String(req.body?.reason || '');
  if (!REPORT_REASONS.has(reason)) throw httpError(400, 'Vui lòng chọn loại vấn đề.');
  const message = clampText(req.body?.message, 1000);
  if (message.length < 5) throw httpError(400, 'Mô tả vấn đề cần ít nhất 5 ký tự.');

  db.prepare(`
    INSERT INTO reports (game_id, user_id, reason, message, status, created_at)
    VALUES (?, ?, ?, ?, 'open', ?)
  `).run(game.id, req.user.id, reason, message, nowIso());

  res.status(201).json({ ok: true, gameTitle: game.title });
});

router.get('/reports', requireRole('admin', 'editor'), (req, res) => {
  const status = String(req.query.status || 'open');
  const filter = ['open', 'resolved'].includes(status) ? status : null;

  const rows = db.prepare(`
    SELECT r.id, r.reason, r.message, r.status, r.created_at, r.resolved_at,
           g.id AS game_id, g.slug AS game_slug, g.title AS game_title,
           u.display_name AS reporter_name, u.username AS reporter_username, u.avatar_color, u.avatar_path,
           ru.display_name AS resolver_name
    FROM reports r
    LEFT JOIN games g ON g.id = r.game_id
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN users ru ON ru.id = r.resolved_by
    ${filter ? 'WHERE r.status = ?' : ''}
    ORDER BY r.created_at DESC LIMIT 100
  `).all(...(filter ? [filter] : []));

  const openCount = db.prepare("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'").get().c;
  res.json({
    reports: rows.map((row) => ({ ...row, reason_label: REPORT_REASONS.get(row.reason) || row.reason })),
    openCount,
  });
});

router.patch('/reports/:id', requireRole('admin', 'editor'), (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(Number(req.params.id));
  if (!report) throw httpError(404, 'Không tìm thấy báo cáo này.');

  const status = String(req.body?.status || '');
  if (!['open', 'resolved'].includes(status)) throw httpError(400, 'Trạng thái không hợp lệ.');

  db.prepare('UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ?')
    .run(status, status === 'resolved' ? req.user.id : null, status === 'resolved' ? nowIso() : null, report.id);

  res.json({ ok: true });
});

router.get('/achievements/me', requireAuth, (req, res) => {
  const uid = req.user.id;
  const one = (sql, ...params) => db.prepare(sql).get(...params).c;

  const gameCount = one('SELECT COUNT(*) AS c FROM games WHERE created_by = ?', uid);
  const ratingsGiven = one('SELECT COUNT(*) AS c FROM ratings WHERE user_id = ?', uid);
  const commentsMade = one('SELECT COUNT(*) AS c FROM comments WHERE user_id = ?', uid);
  const scoresMade = one('SELECT COUNT(*) AS c FROM scores WHERE user_id = ?', uid);
  const likesReceived = one(
    'SELECT COUNT(*) AS c FROM likes l JOIN games g ON g.id = l.game_id WHERE g.created_by = ?',
    uid,
  );

  const bestGame = db.prepare(`
    SELECT g.title, g.slug, ROUND(AVG(r.value), 1) AS avg, COUNT(*) AS count
    FROM ratings r JOIN games g ON g.id = r.game_id
    WHERE g.created_by = ?
    GROUP BY g.id ORDER BY avg DESC, count DESC LIMIT 1
  `).get(uid);

  const top = db.prepare(`
    WITH best AS (
      SELECT user_id, MAX(value) AS value FROM scores GROUP BY user_id, game_id
    )
    SELECT user_id, COALESCE(SUM(value), 0) AS total
    FROM best GROUP BY user_id ORDER BY total DESC LIMIT 1
  `).get();
  const champion = Boolean(top && top.user_id === uid && top.total > 0);

  const achievements = [
    { id: 'first_game', label: 'Người mở kho', desc: 'Đăng game đầu tiên', icon: 'gamepad', unlocked: gameCount >= 1 },
    { id: 'collector', label: 'Sưu tầm gia', desc: 'Đăng 5 game', icon: 'layers', unlocked: gameCount >= 5 },
    { id: 'rater', label: 'Người chấm điểm', desc: 'Chấm sao một game', icon: 'star', unlocked: ratingsGiven >= 1 },
    { id: 'critic', label: 'Nhà phê bình', desc: 'Chấm sao 10 game', icon: 'star', unlocked: ratingsGiven >= 10 },
    { id: 'commenter', label: 'Bắt chuyện', desc: 'Viết bình luận đầu tiên', icon: 'message', unlocked: commentsMade >= 1 },
    { id: 'talkative', label: 'Bình luận viên', desc: 'Viết 10 bình luận', icon: 'message', unlocked: commentsMade >= 10 },
    { id: 'scorer', label: 'Tay chơi', desc: 'Ghi điểm lần đầu', icon: 'trophy', unlocked: scoresMade >= 1 },
    { id: 'champion', label: 'Quán quân', desc: 'Đứng đầu bảng xếp hạng tổng', icon: 'award', unlocked: champion },
    { id: 'loved', label: 'Được yêu thích', desc: 'Game của bạn đạt 5 lượt thích', icon: 'heart', unlocked: likesReceived >= 5 },
    {
      id: 'legend',
      label: 'Game để đời',
      desc: 'Game của bạn đạt 4.5★ với ít nhất 3 đánh giá',
      icon: 'award',
      unlocked: Boolean(bestGame && bestGame.avg >= 4.5 && bestGame.count >= 3),
    },
  ];

  res.json({
    achievements,
    unlockedCount: achievements.filter((item) => item.unlocked).length,
    bestGame: bestGame || null,
    stats: { gameCount, ratingsGiven, commentsMade, scoresMade, likesReceived },
  });
});

export default router;
