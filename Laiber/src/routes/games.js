import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { get, all, run, STORAGE_ROOT, COVER_DIR, FILE_DIR, logActivity } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import {
  clampText, uniqueSlug, nowIso, isHttpUrl, safeFileName, httpError, toNumber, asyncRoute,
} from '../util.js';
import { uploadImage } from '../cloudinary.js';

const router = Router();

const COVER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const GAME_EXTS = new Set([
  '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.exe', '.apk', '.html', '.htm',
  '.iso', '.dmg', '.jar', '.unitypackage', '.love', '.bin', '.pdf',
]);
const STATUSES = new Set(['in_progress', 'done', 'abandoned']);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, file.fieldname === 'cover' ? COVER_DIR : FILE_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 700 * 1024 * 1024, files: 2 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'cover') {
      if (!COVER_EXTS.has(ext)) {
        const err = httpError(400, 'Ảnh bìa chỉ nhận .png, .jpg, .webp hoặc .gif.');
        return cb(err);
      }
    } else if (!GAME_EXTS.has(ext)) {
      const err = httpError(400, `Định dạng ${ext || 'này'} chưa được hỗ trợ cho file game.`);
      return cb(err);
    }
    cb(null, true);
  },
});

const uploadOne = multer({
  storage,
  limits: { fileSize: 700 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!GAME_EXTS.has(ext)) return cb(httpError(400, `Định dạng ${ext || 'này'} chưa được hỗ trợ.`));
    cb(null, true);
  },
});

const uploadCover = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!COVER_EXTS.has(ext)) {
      return cb(httpError(400, 'Ảnh đại diện game chỉ nhận .png, .jpg, .webp hoặc .gif.'));
    }
    cb(null, true);
  },
});

function diskPath(relPath) {
  if (!relPath) return null;
  const clean = String(relPath).replace(/^\/+/, '');
  if (clean.startsWith('covers/')) return path.join(COVER_DIR, clean.slice('covers/'.length));
  return path.resolve(STORAGE_ROOT, clean.split('/').join(path.sep));
}

function removeStored(relPath) {
  const abs = diskPath(relPath);
  if (!abs) return;
  if (!abs.startsWith(COVER_DIR + path.sep) && !abs.startsWith(FILE_DIR + path.sep)) return;
  fs.rm(abs, { force: true }, () => {});
}

function cleanupUploads(files) {
  if (!files) return;
  for (const list of Object.values(files)) {
    for (const file of list) fs.rm(file.path, { force: true }, () => {});
  }
}

function relPathOf(file) {
  return path.relative(STORAGE_ROOT, file.path).split(path.sep).join('/');
}

function readFiles(req) {
  const cover = req.files?.cover?.[0] || null;
  const gameFile = req.files?.file?.[0] || null;
  if (cover && cover.size > 12 * 1024 * 1024) throw httpError(400, 'Ảnh bìa tối đa 12MB.');
  return { cover, gameFile };
}

async function storeCover(file) {
  if (!file) return null;
  const url = await uploadImage(file.path, file.originalname);
  if (url) {
    fs.rm(file.path, { force: true }, () => {});
    return url;
  }
  return `/covers/${path.basename(file.path)}`;
}

async function categoryExists(id) {
  if (!id) return true;
  return Boolean(await get('SELECT 1 AS hit FROM categories WHERE id = ?', id));
}

const LIST_SELECT = `
  SELECT g.id, g.slug, g.title, g.tagline, g.description, g.status, g.version,
         g.category_id, g.cover_url, g.play_url, g.external_url, g.downloads,
         g.file_path, g.file_size, g.file_name, g.created_by, g.created_at, g.updated_at,
         c.name AS category_name, c.slug AS category_slug, c.color AS category_color,
         (SELECT COUNT(*) FROM likes l WHERE l.game_id = g.id) AS like_count,
         (SELECT ROUND(AVG(r.value), 1) FROM ratings r WHERE r.game_id = g.id) AS rating_avg,
         (SELECT COUNT(*) FROM ratings r WHERE r.game_id = g.id) AS rating_count,
         (SELECT COUNT(*) FROM comments cm WHERE cm.game_id = g.id) AS comment_count,
         (SELECT COUNT(*) FROM scores s WHERE s.game_id = g.id) AS score_count,
         (SELECT MAX(value) FROM scores s WHERE s.game_id = g.id) AS top_score,
         (SELECT COUNT(*) FROM game_versions v WHERE v.game_id = g.id) AS version_count
  FROM games g LEFT JOIN categories c ON c.id = g.category_id
`;

router.get('/games', asyncRoute(async (req, res) => {
  const q = clampText(req.query.q, 80);
  const category = clampText(req.query.category, 60);
  const status = clampText(req.query.status, 20);
  const sort = String(req.query.sort || 'newest');

  const where = [];
  const params = [];
  if (q) {
    where.push('(g.title LIKE ? OR g.tagline LIKE ? OR g.description LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (STATUSES.has(status)) {
    where.push('g.status = ?');
    params.push(status);
  }

  const order = {
    newest: 'g.created_at DESC',
    updated: 'g.updated_at DESC',
    popular: 'g.downloads DESC, like_count DESC',
    likes: 'like_count DESC, g.downloads DESC',
    rating: 'rating_avg DESC, rating_count DESC',
    alpha: 'g.title COLLATE NOCASE ASC',
  }[sort] || 'g.created_at DESC';

  const sql = `${LIST_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order} LIMIT 300`;
  res.json({ games: await all(sql, ...params) });
}));

router.get('/games/mine', requireAuth, asyncRoute(async (req, res) => {
  const games = await all(`
    SELECT m.*,
      (SELECT v.version FROM game_versions v WHERE v.game_id = m.id ORDER BY v.created_at DESC LIMIT 1) AS latest_version,
      (SELECT v.notes FROM game_versions v WHERE v.game_id = m.id ORDER BY v.created_at DESC LIMIT 1) AS latest_note,
      (SELECT v.created_at FROM game_versions v WHERE v.game_id = m.id ORDER BY v.created_at DESC LIMIT 1) AS latest_version_at
    FROM (${LIST_SELECT} WHERE g.created_by = ?) m
    ORDER BY m.updated_at DESC
  `, req.user.id);

  const count = (status) => games.filter((game) => game.status === status).length;
  res.json({
    games,
    summary: {
      total: games.length,
      in_progress: count('in_progress'),
      done: count('done'),
      abandoned: count('abandoned'),
    },
  });
}));

router.get('/games/:slug', asyncRoute(async (req, res) => {
  const game = await get(`${LIST_SELECT} WHERE g.slug = ?`, String(req.params.slug));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  const versions = await all(`
    SELECT v.id, v.version, v.notes, v.file_name, v.file_size, v.created_at,
           u.display_name AS author_name
    FROM game_versions v LEFT JOIN users u ON u.id = v.created_by
    WHERE v.game_id = ? ORDER BY v.created_at DESC
  `, game.id);

  const leaderboard = await all(`
    SELECT u.id AS user_id, u.display_name, u.username, u.avatar_color, u.avatar_path,
           MAX(s.value) AS value, COUNT(*) AS runs, MAX(s.created_at) AS last_at
    FROM scores s JOIN users u ON u.id = s.user_id
    WHERE s.game_id = ?
    GROUP BY u.id ORDER BY value DESC, last_at ASC LIMIT 10
  `, game.id);

  const comments = await all(`
    SELECT c.id, c.body, c.created_at, u.id AS user_id, u.display_name, u.username,
           u.avatar_color, u.avatar_path
    FROM comments c LEFT JOIN users u ON u.id = c.user_id
    WHERE c.game_id = ? ORDER BY c.created_at DESC LIMIT 100
  `, game.id);

  const myRating = req.user
    ? (await get('SELECT value FROM ratings WHERE game_id = ? AND user_id = ?', game.id, req.user.id))?.value ?? null
    : null;

  const creator = game.created_by
    ? await get('SELECT display_name FROM users WHERE id = ?', game.created_by)
    : null;

  const liked = req.user
    ? Boolean(await get('SELECT 1 AS hit FROM likes WHERE game_id = ? AND user_id = ?', game.id, req.user.id))
    : false;

  const myBest = req.user
    ? (await get('SELECT MAX(value) AS value FROM scores WHERE game_id = ? AND user_id = ?', game.id, req.user.id)).value
    : null;

  const myRuns = req.user
    ? (await get('SELECT COUNT(*) AS c FROM scores WHERE game_id = ? AND user_id = ?', game.id, req.user.id)).c
    : 0;

  res.json({
    game: { ...game, creator_name: creator?.display_name || null },
    versions,
    leaderboard,
    comments,
    myRating,
    liked,
    myBest,
    myRuns,
  });
}));

router.post('/games/submit', requireAuth, uploadCover.single('cover'), asyncRoute(async (req, res) => {
  const coverFile = req.file || null;
  try {
    const title = clampText(req.body?.title, 80);
    const url = clampText(req.body?.url, 500);
    const tagline = clampText(req.body?.tagline, 160);
    const description = clampText(req.body?.description, 6000);
    const categoryId = toNumber(req.body?.category_id);
    const coverUrl = clampText(req.body?.cover_url, 500);
    const playUrl = clampText(req.body?.play_url, 500);
    const externalUrl = clampText(req.body?.external_url, 500);

    if (title.length < 2) throw httpError(400, 'Tên game cần ít nhất 2 ký tự.');
    if (!isHttpUrl(url)) throw httpError(400, 'Link game phải là URL http/https.');
    if (!(await categoryExists(categoryId))) throw httpError(400, 'Thể loại không hợp lệ.');
    if (coverUrl && !isHttpUrl(coverUrl)) throw httpError(400, 'Ảnh minh hoạ phải là URL http/https.');
    if (playUrl && !isHttpUrl(playUrl)) throw httpError(400, 'Link chơi không hợp lệ.');
    if (externalUrl && !isHttpUrl(externalUrl)) throw httpError(400, 'Link ngoài không hợp lệ.');
    const openUrl = externalUrl || (playUrl ? '' : url);

    const storedCover = (await storeCover(coverFile)) || coverUrl || null;
    const slug = await uniqueSlug(get, 'games', title);
    const now = nowIso();
    const info = await run(`
      INSERT INTO games (slug, title, tagline, description, category_id, status, version,
        cover_url, play_url, file_path, file_name, file_size, external_url, downloads,
        created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'in_progress', '1.0', ?, ?, NULL, NULL, NULL, ?, 0, ?, ?, ?)
    `,
      slug, title, tagline, description, categoryId,
      storedCover,
      playUrl || null,
      openUrl || null,
      req.user.id, now, now,
    );

    const game = await get(`${LIST_SELECT} WHERE g.id = ?`, info.lastInsertRowid);
    await logActivity({ userId: req.user.id, gameId: game.id, type: 'game_added', message: `đã đăng game ${title}` });
    res.status(201).json({ game });
  } catch (err) {
    if (coverFile) fs.rm(coverFile.path, { force: true }, () => {});
    throw err;
  }
}));

router.post('/games/:id/rating', requireAuth, asyncRoute(async (req, res) => {
  const game = await get('SELECT id, title FROM games WHERE id = ?', Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  const value = toNumber(req.body?.value);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw httpError(400, 'Số sao phải là số nguyên từ 1 đến 5.');
  }

  const now = nowIso();
  await run(`
    INSERT INTO ratings (game_id, user_id, value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (game_id, user_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `, game.id, req.user.id, value, now, now);

  const stats = await get(`
    SELECT ROUND(AVG(value), 1) AS avg, COUNT(*) AS count FROM ratings WHERE game_id = ?
  `, game.id);

  res.json({ myRating: value, avg: stats.avg, count: stats.count });
}));

router.post('/games', requireRole('admin', 'editor'),
  upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'file', maxCount: 1 }]),
  asyncRoute(async (req, res) => {
    const files = req.files || {};
    try {
      const title = clampText(req.body.title, 80);
      const tagline = clampText(req.body.tagline, 160);
      const description = clampText(req.body.description, 6000);
      const version = clampText(req.body.version, 24) || '1.0';
      const status = STATUSES.has(req.body.status) ? req.body.status : 'in_progress';
      const categoryId = toNumber(req.body.category_id);
      const playUrl = clampText(req.body.play_url, 500);
      const externalUrl = clampText(req.body.external_url, 500);
      const coverUrl = clampText(req.body.cover_url, 500);

      if (title.length < 2) throw httpError(400, 'Tên game cần ít nhất 2 ký tự.');
      if (!(await categoryExists(categoryId))) throw httpError(400, 'Thể loại không hợp lệ.');
      if (playUrl && !isHttpUrl(playUrl)) throw httpError(400, 'Link chơi phải là URL http/https.');
      if (externalUrl && !isHttpUrl(externalUrl)) throw httpError(400, 'Link tải ngoài phải là URL http/https.');
      if (coverUrl && !isHttpUrl(coverUrl)) throw httpError(400, 'Ảnh bìa từ link phải là URL http/https.');

      const { cover, gameFile } = readFiles(req);
      const storedCover = (await storeCover(cover)) || coverUrl || null;
      const slug = await uniqueSlug(get, 'games', title);
      const now = nowIso();

      const info = await run(`
        INSERT INTO games (slug, title, tagline, description, category_id, status, version,
          cover_url, play_url, file_path, file_name, file_size, external_url, downloads,
          created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `,
        slug, title, tagline, description, categoryId, status, version,
        storedCover,
        playUrl || null,
        gameFile ? relPathOf(gameFile) : null,
        gameFile ? safeFileName(gameFile.originalname) : null,
        gameFile ? gameFile.size : null,
        externalUrl || null,
        req.user.id, now, now,
      );

      const game = await get(`${LIST_SELECT} WHERE g.id = ?`, info.lastInsertRowid);
      await logActivity({ userId: req.user.id, gameId: game.id, type: 'game_added', message: `đã thêm game ${title}` });
      res.status(201).json({ game });
    } catch (err) {
      cleanupUploads(files);
      throw err;
    }
  }));

router.patch('/games/:id', requireAuth,
  upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'file', maxCount: 1 }]),
  asyncRoute(async (req, res) => {
    const files = req.files || {};
    try {
      const game = await get('SELECT * FROM games WHERE id = ?', Number(req.params.id));
      if (!game) throw httpError(404, 'Không tìm thấy game này.');
      const isManager = ['admin', 'editor'].includes(req.user.role);
      if (!isManager && game.created_by !== req.user.id) {
        throw httpError(403, 'Bạn chỉ có thể chỉnh sửa game do mình đăng.');
      }

      const updates = {};
      const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

      if (has('title')) {
        const title = clampText(req.body.title, 80);
        if (title.length < 2) throw httpError(400, 'Tên game cần ít nhất 2 ký tự.');
        updates.title = title;
      }
      if (has('tagline')) updates.tagline = clampText(req.body.tagline, 160);
      if (has('description')) updates.description = clampText(req.body.description, 6000);
      if (has('status')) {
        if (!STATUSES.has(req.body.status)) throw httpError(400, 'Trạng thái không hợp lệ.');
        updates.status = req.body.status;
      }
      if (has('version')) updates.version = clampText(req.body.version, 24) || '1.0';
      if (has('category_id')) {
        const categoryId = toNumber(req.body.category_id);
        if (!(await categoryExists(categoryId))) throw httpError(400, 'Thể loại không hợp lệ.');
        updates.category_id = categoryId;
      }
      if (has('play_url')) {
        const value = clampText(req.body.play_url, 500);
        if (value && !isHttpUrl(value)) throw httpError(400, 'Link chơi phải là URL http/https.');
        updates.play_url = value || null;
      }
      if (has('external_url')) {
        const value = clampText(req.body.external_url, 500);
        if (value && !isHttpUrl(value)) throw httpError(400, 'Link tải ngoài phải là URL http/https.');
        updates.external_url = value || null;
      }

      let requestedCoverUrl = null;
      if (has('cover_url')) {
        requestedCoverUrl = clampText(req.body.cover_url, 500);
        if (requestedCoverUrl && !isHttpUrl(requestedCoverUrl)) {
          throw httpError(400, 'Ảnh bìa từ link phải là URL http/https.');
        }
      }

      const { cover, gameFile } = readFiles(req);
      const storedCover = await storeCover(cover);
      if (storedCover) updates.cover_url = storedCover;
      else if (requestedCoverUrl) updates.cover_url = requestedCoverUrl;
      if (gameFile) {
        updates.file_path = relPathOf(gameFile);
        updates.file_name = safeFileName(gameFile.originalname);
        updates.file_size = gameFile.size;
      }
      if (req.body.clear_file === '1' && !gameFile) {
        updates.file_path = null;
        updates.file_name = null;
        updates.file_size = null;
      }

      updates.updated_at = nowIso();

      const keys = Object.keys(updates);
      const values = keys.map((key) => updates[key]);
      await run(`UPDATE games SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`,
        ...values, game.id);

      if (cover && game.cover_url) removeStored(game.cover_url.replace(/^\//, ''));
      if (!cover && requestedCoverUrl && game.cover_url && game.cover_url !== requestedCoverUrl && game.cover_url.startsWith('/covers/')) {
        removeStored(game.cover_url.replace(/^\//, ''));
      }
      if ((gameFile || req.body.clear_file === '1') && game.file_path) removeStored(game.file_path);

      const fresh = await get(`${LIST_SELECT} WHERE g.id = ?`, game.id);
      const versionChanged = updates.version && updates.version !== game.version;
      await logActivity({
        userId: req.user.id,
        gameId: game.id,
        type: versionChanged ? 'version' : 'edit',
        message: versionChanged
          ? `đã cập nhật ${fresh.title} lên v${updates.version}`
          : `đã chỉnh sửa ${fresh.title}`,
      });
      res.json({ game: fresh });
    } catch (err) {
      cleanupUploads(files);
      throw err;
    }
  }));

router.delete('/games/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const game = await get('SELECT * FROM games WHERE id = ?', Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  const versionFiles = await all('SELECT file_path FROM game_versions WHERE game_id = ?', game.id);
  await run('DELETE FROM games WHERE id = ?', game.id);

  removeStored(game.cover_url?.replace(/^\//, ''));
  removeStored(game.file_path);
  for (const row of versionFiles) removeStored(row.file_path);

  await logActivity({ userId: req.user.id, type: 'delete', message: `đã xoá game ${game.title}` });
  res.json({ ok: true });
}));

router.post('/games/:id/like', requireAuth, asyncRoute(async (req, res) => {
  const game = await get('SELECT id, title FROM games WHERE id = ?', Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  const existing = await get('SELECT 1 AS hit FROM likes WHERE game_id = ? AND user_id = ?', game.id, req.user.id);
  if (existing) {
    await run('DELETE FROM likes WHERE game_id = ? AND user_id = ?', game.id, req.user.id);
  } else {
    await run('INSERT INTO likes (game_id, user_id, created_at) VALUES (?, ?, ?)', game.id, req.user.id, nowIso());
    await logActivity({ userId: req.user.id, gameId: game.id, type: 'like', message: `đã thích ${game.title}` });
  }

  const likes = (await get('SELECT COUNT(*) AS c FROM likes WHERE game_id = ?', game.id)).c;
  res.json({ liked: !existing, likes });
}));

router.post('/games/:id/versions', requireAuth, uploadOne.single('file'), asyncRoute(async (req, res) => {
  const file = req.file || null;
  try {
    const game = await get('SELECT id, title, created_by FROM games WHERE id = ?', Number(req.params.id));
    if (!game) throw httpError(404, 'Không tìm thấy game này.');
    const isManager = ['admin', 'editor'].includes(req.user.role);
    if (!isManager && game.created_by !== req.user.id) {
      throw httpError(403, 'Bạn chỉ có thể cập nhật bản mới cho game do mình đăng.');
    }

    const version = clampText(req.body.version, 24);
    const notes = clampText(req.body.notes, 3000);
    if (!version) throw httpError(400, 'Vui lòng nhập số phiên bản.');

    await run(`
      INSERT INTO game_versions (game_id, version, notes, file_name, file_path, file_size, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      game.id, version, notes,
      file ? safeFileName(file.originalname) : null,
      file ? relPathOf(file) : null,
      file ? file.size : null,
      req.user.id, nowIso(),
    );

    await run('UPDATE games SET version = ?, updated_at = ? WHERE id = ?', version, nowIso(), game.id);
    await logActivity({
      userId: req.user.id, gameId: game.id, type: 'version',
      message: `đã cập nhật ${game.title} lên v${version}`,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (file) fs.rm(file.path, { force: true }, () => {});
    throw err;
  }
}));

router.delete('/versions/:id', requireRole('admin', 'editor'), asyncRoute(async (req, res) => {
  const row = await get(`
    SELECT v.*, g.title AS game_title FROM game_versions v
    JOIN games g ON g.id = v.game_id WHERE v.id = ?
  `, Number(req.params.id));
  if (!row) throw httpError(404, 'Không tìm thấy bản cập nhật này.');

  await run('DELETE FROM game_versions WHERE id = ?', row.id);
  removeStored(row.file_path);
  await logActivity({
    userId: req.user.id, gameId: row.game_id, type: 'edit',
    message: `đã xoá bản v${row.version} của ${row.game_title}`,
  });
  res.json({ ok: true });
}));

router.get('/download/version/:id', asyncRoute(async (req, res) => {
  const version = await get(`
    SELECT v.*, g.title AS game_title FROM game_versions v
    JOIN games g ON g.id = v.game_id WHERE v.id = ?
  `, Number(req.params.id));
  if (!version || !version.file_path) throw httpError(404, 'Bản cập nhật này không có file đính kèm.');

  const abs = diskPath(version.file_path);
  if (!abs.startsWith(FILE_DIR + path.sep) || !fs.existsSync(abs)) {
    throw httpError(404, 'File không còn trên máy chủ.');
  }
  res.download(abs, version.file_name || path.basename(abs));
}));

router.get('/download/:id', asyncRoute(async (req, res) => {
  const game = await get('SELECT * FROM games WHERE id = ?', Number(req.params.id));
  if (!game) throw httpError(404, 'Không tìm thấy game này.');

  if (game.file_path) {
    const abs = diskPath(game.file_path);
    if (!abs.startsWith(FILE_DIR + path.sep) || !fs.existsSync(abs)) {
      throw httpError(404, 'File game không còn trên máy chủ.');
    }
    await run('UPDATE games SET downloads = downloads + 1 WHERE id = ?', game.id);
    return res.download(abs, game.file_name || path.basename(abs));
  }

  if (game.external_url) {
    await run('UPDATE games SET downloads = downloads + 1 WHERE id = ?', game.id);
    return res.redirect(game.external_url);
  }

  throw httpError(404, 'Game này chưa có file hoặc link tải.');
}));

export default router;
