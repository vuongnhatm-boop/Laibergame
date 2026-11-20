import express from 'express';
import path from 'node:path';
import { ready, get, usingRemoteDb, ROOT, COVER_DIR, AVATAR_DIR } from './src/db.js';
import { sessionUser } from './src/auth.js';
import authRoutes from './src/routes/auth.js';
import gameRoutes from './src/routes/games.js';
import scoreRoutes from './src/routes/scores.js';
import socialRoutes from './src/routes/social.js';
import adminRoutes from './src/routes/admin.js';
import previewRoutes from './src/routes/preview.js';

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "script-src 'self'",
    "frame-src 'self' https: http:",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  next();
});

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
app.use((req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.headers.host) {
      return res.status(403).json({ error: 'Yêu cầu bị chặn do khác nguồn gốc.' });
    }
  } catch {
    return res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
  }
  next();
});

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

app.use((req, res, next) => {
  ready().then(() => next(), next);
});

app.use(sessionUser);

app.use('/covers', express.static(COVER_DIR, { maxAge: '7d', fallthrough: true, index: false }));
app.use('/avatars', express.static(AVATAR_DIR, { maxAge: '7d', fallthrough: true, index: false }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'), (err) => {
    if (err && !res.headersSent) res.redirect(302, '/index.html');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', gameRoutes);
app.use('/api', scoreRoutes);
app.use('/api', socialRoutes);
app.use('/api', adminRoutes);
app.use('/api', previewRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Không tìm thấy API này.' });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });
  }
  if (err?.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File vượt quá giới hạn 700MB.'
      : 'Không thể tải file lên, vui lòng thử lại.';
    return res.status(status).json({ error: message });
  }

  const status = err?.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Lỗi máy chủ, vui lòng thử lại.' : err.message });
});

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 4321;
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log(`\n  Laiber đang chạy: http://localhost:${PORT}`);
    console.log(`  Database: ${usingRemoteDb ? 'Turso (remote)' : path.join(ROOT, 'data', 'vault.db')}`);
    get('SELECT COUNT(*) AS c FROM users').then((row) => {
      if (row.c === 0) console.log('  Chưa có tài khoản — người đăng ký đầu tiên sẽ là quản trị viên.');
      console.log('');
    });
  });
}

export default app;
