import { api } from './api.js';

const state = {
  me: null,
  needsSetup: false,
  categories: [],
  confirmResolve: null,
};

const filters = { q: '', cat: '', status: '', sort: 'newest' };

const ROLE_LABEL = { admin: 'Quản trị viên', editor: 'Quản lý nội dung', member: 'Thành viên' };

const STATUS = {
  done: { label: 'Hoàn thành', cls: 'done' },
  in_progress: { label: 'Đang phát triển', cls: 'in_progress' },
  abandoned: { label: 'Tạm dừng', cls: 'abandoned' },
};

const ICONS = {
  vault: '<path d="M12 2.5 21 7v10l-9 4.5L3 17V7z"/><path d="M12 8v8M8 12h8"/>',
  gamepad: '<path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/><path d="M17.5 6.5c2.5 0 4 2.2 4 5.5 0 3-1 6-3.2 6-1.4 0-2.2-1.4-3.3-1.4h-6c-1.1 0-1.9 1.4-3.3 1.4C3.5 18 2.5 15 2.5 12c0-3.3 1.5-5.5 4-5.5 1.8 0 3 1 5.5 1s3.7-1 5.5-1z"/>',
  trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z"/>',
  heartFill: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  spark: '<path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 4h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 4h14"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  message: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
};

const GRADS = [
  ['#141d33', '#3a1d63'],
  ['#152a17', '#2f3d0d'],
  ['#2b131a', '#421a26'],
  ['#2a2008', '#3f2f0a'],
  ['#0d2231', '#103647'],
  ['#24122d', '#1b1235'],
];

function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const nf = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

function fmt(value) {
  return nf.format(Number(value) || 0);
}

function fmtInt(value) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(Number(value) || 0));
}

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function shortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ago(iso) {
  if (!iso) return '';
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return 'vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 30 * 86400) return `${Math.floor(seconds / 86400)} ngày trước`;
  return shortDate(iso);
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function gradFor(text) {
  let n = 0;
  for (const ch of String(text || 'vault')) n = (n * 31 + ch.codePointAt(0)) >>> 0;
  const [a, b] = GRADS[n % GRADS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function avatar(user, cls = '') {
  const name = user?.display_name || user?.username || '?';
  const style = `background:${esc(user?.avatar_color || '#b9ff3d')}`;
  if (user?.avatar_path) {
    return `<span class="avatar has-img ${cls}" style="${style}"><img src="${esc(user.avatar_path)}" alt="" loading="lazy" /></span>`;
  }
  return `<span class="avatar ${cls}" style="${style}">${esc(initials(name))}</span>`;
}

function starRow(value, size = 15) {
  const filled = Math.round(Number(value) || 0);
  return `<span class="stars" aria-label="${fmt(value)} trên 5 sao">${[1, 2, 3, 4, 5]
    .map((i) => `<span class="star${i <= filled ? ' on' : ''}">${icon('star', size)}</span>`)
    .join('')}</span>`;
}

function rateButtons(myRating, gameId) {
  const current = Number(myRating) || 0;
  return `<div class="rate-buttons" role="group" aria-label="Chấm sao cho game">${[1, 2, 3, 4, 5]
    .map((i) => `<button class="star-btn${i <= current ? ' on' : ''}" type="button" data-action="rate" data-id="${gameId}" data-value="${i}" title="${i} sao" aria-label="${i} sao">${icon('star', 24)}</button>`)
    .join('')}</div>`;
}

function coverInner(game) {
  if (game.cover_url) {
    return `<img src="${esc(game.cover_url)}" alt="" data-cover-title="${esc(game.title)}" data-cover-grad="${esc(gradFor(game.title))}" data-cover-initials="${esc(initials(game.title))}" />`;
  }
  return `<div class="cover-fallback" style="background:${gradFor(game.title)}"><span>${esc(initials(game.title))}</span></div>`;
}

function canManage() {
  return Boolean(state.me && ['admin', 'editor'].includes(state.me.role));
}

function canEditGame(game) {
  return canManage() || Boolean(state.me && game.created_by === state.me.id);
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('vault-theme', theme); } catch { /* ignore */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f3f5fa' : '#07080b');
  renderHeader();
}

function isAdmin() {
  return Boolean(state.me && state.me.role === 'admin');
}

function navActive(prefix) {
  const hash = location.hash || '#/';
  if (prefix === '#/') return hash === '#/' || hash === '';
  return hash.startsWith(prefix);
}

function appRoot() {
  return document.getElementById('app');
}

function setLoading() {
  appRoot().innerHTML = `<div class="wrap"><div class="loading"><div class="spinner"></div>Đang tải…</div></div>`;
}

function toast(message, type = 'ok') {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'ok' ? 'check' : 'x', 15)}<span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(10px)';
    el.style.transition = 'all .25s';
    setTimeout(() => el.remove(), 260);
  }, 3600);
}

function renderHeader() {
  const items = [
    ['#/', 'Trang chủ'],
    ['#/games', 'Kho game'],
    ['#/submit', 'Đăng game'],
    ['#/leaderboard', 'Bảng xếp hạng'],
  ];
  if (state.me) items.push(['#/my-games', 'Game của tôi']);
  if (canManage()) items.push(['#/admin', 'Quản trị']);

  const nav = items
    .map(([href, label]) => `<a class="nav-link${navActive(href) ? ' active' : ''}" href="${href}">${label}</a>`)
    .join('');

  const me = state.me;
  const themeBtn = `<button class="icon-btn theme-toggle" data-action="toggle-theme" type="button" title="Đổi giao diện sáng/tối" aria-label="Đổi giao diện sáng/tối">
      <span class="sun-icon">${icon('sun', 17)}</span>
      <span class="moon-icon">${icon('moon', 17)}</span>
    </button>`;
  const right = me
    ? `<details class="user-menu">
         <summary title="${esc(me.display_name)}">
           ${avatar(me)}
           <span class="summary-name">${esc(me.display_name)}</span>
           ${icon('chevron', 14)}
         </summary>
         <div class="menu-panel">
           <div class="menu-id">
             <strong>${esc(me.display_name)}</strong>
             <span>@${esc(me.username)} · ${ROLE_LABEL[me.role] || me.role}</span>
           </div>
           <button class="menu-item" data-action="profile">${icon('key', 15)} Hồ sơ & mật khẩu</button>
           <a class="menu-item" href="#/my-games">${icon('gamepad', 15)} Game của tôi</a>
           ${canManage() ? `<a class="menu-item" href="#/admin">${icon('shield', 15)} Quản trị</a>` : ''}
           <button class="menu-item danger" data-action="logout">${icon('logout', 15)} Đăng xuất</button>
         </div>
       </details>`
    : `<a class="btn btn-ghost btn-sm" href="#/login">Đăng nhập</a>
       <a class="btn btn-primary btn-sm" href="#/register">Tham gia</a>`;

  document.getElementById('site-header').innerHTML = `
    <div class="wrap header-inner">
      <a class="brand" href="#/">
        <span class="brand-glyph">${icon('vault', 21)}</span>
        <span class="brand-text">Laiber<small>kho game nhóm</small></span>
      </a>
      <nav class="main-nav">${nav}</nav>
      <div class="header-right">${themeBtn}${right}</div>
    </div>`;
}

function stat(value, label) {
  return `<div class="stat"><div class="value">${fmtInt(value)}</div><div class="label">${label}</div></div>`;
}

function gameCard(g) {
  const st = STATUS[g.status] || STATUS.in_progress;
  const category = g.category_name
    ? `<span class="tag" style="border-color:${esc(g.category_color)}66;color:${esc(g.category_color)}">${esc(g.category_name)}</span>`
    : '<span></span>';

  const record = g.rating_count
    ? `<span class="metric strong">${icon('star', 13)} ${fmt(g.rating_avg)} <span style="opacity:.55">(${fmtInt(g.rating_count)})</span></span>`
    : g.top_score !== null && g.top_score !== undefined
      ? `<span class="metric strong">${icon('trophy', 13)} ${fmt(g.top_score)}</span>`
      : `<span class="metric">v${esc(g.version)}</span>`;

  return `<a class="game-card rise" href="#/games/${encodeURIComponent(g.slug)}">
    <div class="cover">
      ${coverInner(g)}
      <div class="cover-top">${category}<span class="status ${st.cls}">${st.label}</span></div>
    </div>
    <div class="card-body">
      <span class="card-title">${esc(g.title)}</span>
      <span class="card-tagline">${esc(g.tagline || 'Chưa có mô tả ngắn cho game này.')}</span>
    </div>
    <div class="card-foot">
      <span class="metric">${icon('download', 13)} ${fmtInt(g.downloads)}</span>
      <span class="metric">${icon('heart', 13)} ${fmtInt(g.like_count)}</span>
      ${record}
    </div>
  </a>`;
}

function emptyState({ title, body, cta = '' }) {
  return `<div class="empty">
    <div class="empty-icon">${icon('gamepad', 24)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
    ${cta ? `<div style="margin-top:16px">${cta}</div>` : ''}
  </div>`;
}

function errorState(message) {
  return `<div style="margin-top:40px">${emptyState({
    title: 'Không tải được nội dung',
    body: message || 'Có lỗi xảy ra, vui lòng thử lại.',
    cta: '<a class="btn btn-ghost btn-sm" href="#/">Về trang chủ</a>',
  })}</div>`;
}

function activityRow(item) {
  const typeIcon = {
    score: 'trophy', game_added: 'plus', version: 'layers',
    like: 'heart', delete: 'trash', edit: 'edit', role: 'shield',
  }[item.type] || 'spark';

  return `<div class="activity-row">
    <span class="activity-type ${esc(item.type)}">${icon(typeIcon, 13)}</span>
    <div class="activity-body">
      <div class="activity-text">${item.display_name ? `<b>${esc(item.display_name)}</b> ` : ''}${esc(item.message)}</div>
      <div class="activity-meta">
        ${item.game_slug ? `<a href="#/games/${encodeURIComponent(item.game_slug)}" style="color:var(--cyan)">xem game</a><span>·</span>` : ''}
        <span>${ago(item.created_at)}</span>
      </div>
    </div>
  </div>`;
}

function boardRowsMini(rows) {
  if (!rows.length) return `<p class="subtle" style="margin:4px 0">Chưa có ai ghi điểm. Hãy là người đầu tiên.</p>`;
  return rows.slice(0, 5).map((row, i) => `
    <div class="board-row">
      <span class="rank ${i < 3 ? `r${i + 1}` : ''}">${i + 1}</span>
      ${avatar(row)}
      <div class="player-name"><strong>${esc(row.display_name)}</strong><span>${row.games_played} game</span></div>
      <span class="board-points">${fmt(row.total)}</span>
    </div>`).join('');
}

async function renderHome() {
  setLoading();
  let games;
  let stats;
  let feed;
  let board;
  try {
    const [g, s, a, b] = await Promise.all([
      api('/api/games?sort=updated'),
      api('/api/stats'),
      api('/api/activity?limit=7'),
      api('/api/leaderboard/global'),
    ]);
    games = g.games;
    stats = s.stats;
    feed = a.activity;
    board = b.rows;
  } catch (err) {
    appRoot().innerHTML = `<div class="wrap">${errorState(err.message)}</div>`;
    return;
  }

  document.title = 'Laiber — Kho game của nhóm';
  const featured = games.slice(0, 6);
  const heroGames = games.slice(0, 3);

  const heroTiles = heroGames.length
    ? heroGames.map((g, i) => `<a class="hero-tile t${i + 1}" href="#/games/${encodeURIComponent(g.slug)}">
        ${coverInner(g)}<span class="hero-tile-label">${esc(g.title)}</span>
      </a>`).join('')
    : [1, 2, 3].map((n, i) => `<div class="hero-tile t${i + 1}">
        <div class="cover-fallback" style="background:${gradFor(`tile-${n}`)}"><span>0${n}</span></div>
      </div>`).join('');

  const secondaryCta = state.me
    ? `<a class="btn btn-ghost" href="#/submit">${icon('plus', 16)} Đăng game</a>`
    : `<a class="btn btn-ghost" href="#/register">Tham gia nhóm</a>`;

  const categoryChips = state.categories.map((c) => `
    <a class="chip" href="#/games?cat=${encodeURIComponent(c.slug)}" style="text-decoration:none">
      <span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}
      <span style="color:var(--dim)">${c.game_count}</span>
    </a>`).join('');

  appRoot().innerHTML = `<div class="wrap rise">
    <section class="hero">
      <div>
        <span class="eyebrow">Kho lưu trữ nội bộ</span>
        <h1>Nơi game của nhóm được <span class="accent">lưu giữ &amp; so tài</span>.</h1>
        <p class="lead">Dán link game, chọn thể loại và đưa vào kho chỉ trong vài giây — ảnh minh hoạ tự lấy từ trang game.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/games">Khám phá kho game ${icon('arrow', 16)}</a>
          ${secondaryCta}
        </div>
      </div>
      <div class="hero-stage">
        <span class="stage-glow"></span>
        ${heroTiles}
      </div>
    </section>

    <div class="stats-strip">
      ${stat(stats.games, 'Game trong kho')}
      ${stat(stats.users, 'Thành viên')}
      ${stat(stats.scores, 'Lượt ghi điểm')}
      ${stat(stats.downloads, 'Lượt tải')}
    </div>

    <section class="section">
      <div class="section-head">
        <h2>Mới cập nhật <span class="count">${games.length}</span></h2>
        <a class="more" href="#/games">Xem tất cả ${icon('arrow', 14)}</a>
      </div>
      ${featured.length
        ? `<div class="game-grid">${featured.map(gameCard).join('')}</div>`
        : emptyState({
            title: 'Kho game đang trống',
            body: state.me
              ? 'Đăng game đầu tiên để bắt đầu xây kho của nhóm.'
              : 'Kho game chưa có gì. Đăng nhập rồi đăng game đầu tiên nhé.',
            cta: state.me
              ? `<a class="btn btn-primary btn-sm" href="#/submit">${icon('plus', 15)} Đăng game</a>`
              : `<a class="btn btn-primary btn-sm" href="#/register">Tạo tài khoản</a>`,
          })}
    </section>

    <section class="section two-col">
      <div class="panel">
        <div class="panel-title">
          <h3>${icon('spark', 16)} Bảng tin nhóm</h3>
          <span class="subtle">${feed.length} hoạt động gần đây</span>
        </div>
        ${feed.length ? `<div class="activity-list">${feed.map(activityRow).join('')}</div>` : '<p class="subtle">Chưa có hoạt động nào.</p>'}
      </div>
      <div class="panel">
        <div class="panel-title">
          <h3>${icon('trophy', 16)} Bảng xếp hạng</h3>
          <a class="more" href="#/leaderboard" style="font-size:12.5px">Chi tiết</a>
        </div>
        <div class="mini-board">${boardRowsMini(board)}</div>
      </div>
    </section>

    ${categoryChips ? `<section class="section">
      <div class="section-head"><h2>Phân loại theo thể loại</h2></div>
      <div class="category-strip">${categoryChips}</div>
    </section>` : ''}
  </div>`;
}

async function renderGames() {
  if (!state.categories.length) {
    try {
      state.categories = (await api('/api/categories')).categories;
    } catch { /* ignore */ }
  }

  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  filters.q = '';
  filters.cat = params.get('cat') || '';
  filters.status = '';
  filters.sort = 'newest';
  document.title = 'Kho game — Laiber';

  const chips = [`<button class="chip ${filters.cat ? '' : 'active'}" data-action="cat" data-slug="">Tất cả</button>`]
    .concat(state.categories.map((c) => `<button class="chip ${filters.cat === c.slug ? 'active' : ''}" data-action="cat" data-slug="${esc(c.slug)}">
      <span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}
    </button>`))
    .join('');

  appRoot().innerHTML = `<div class="wrap rise">
    <div class="section-head" style="margin-top:32px">
      <h2>Kho game <span class="count" id="games-count">…</span></h2>
      ${canManage()
        ? `<button class="btn btn-primary btn-sm" data-action="new-game">${icon('plus', 15)} Thêm game</button>`
        : state.me
          ? `<a class="btn btn-primary btn-sm" href="#/submit">${icon('plus', 15)} Đăng game</a>`
          : ''}
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">${icon('search', 16)}</span>
        <input id="game-search" type="search" placeholder="Tìm theo tên hoặc mô tả…" value="${esc(filters.q)}" />
      </div>
      <select id="status-filter" class="select" style="width:auto" aria-label="Lọc trạng thái">
        <option value="">Mọi trạng thái</option>
        <option value="done">Hoàn thành</option>
        <option value="in_progress">Đang phát triển</option>
        <option value="abandoned">Tạm dừng</option>
      </select>
      <select id="sort-filter" class="select" style="width:auto" aria-label="Sắp xếp">
        <option value="newest">Mới nhất</option>
        <option value="updated">Vừa cập nhật</option>
        <option value="popular">Tải nhiều</option>
        <option value="likes">Yêu thích nhiều</option>
        <option value="alpha">Tên A → Z</option>
      </select>
    </div>

    <div class="filter-row" style="margin-bottom:20px">${chips}</div>
    <div id="games-results"></div>
  </div>`;

  await loadGames();
}

async function loadGames() {
  const results = document.getElementById('games-results');
  const count = document.getElementById('games-count');
  if (!results) return;

  results.innerHTML = '<div class="loading"><div class="spinner"></div>Đang tải…</div>';

  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.cat) qs.set('category', filters.cat);
  if (filters.status) qs.set('status', filters.status);
  if (filters.sort) qs.set('sort', filters.sort);

  try {
    const { games } = await api(`/api/games?${qs.toString()}`);
    if (count) count.textContent = games.length;
    results.innerHTML = games.length
      ? `<div class="game-grid">${games.map(gameCard).join('')}</div>`
      : emptyState({
          title: 'Không tìm thấy game nào',
          body: 'Thử từ khoá khác, bỏ bộ lọc hoặc thêm game mới vào kho.',
          cta: state.me
            ? `<a class="btn btn-primary btn-sm" href="#/submit">${icon('plus', 15)} Đăng game</a>`
            : '',
        });
  } catch (err) {
    results.innerHTML = errorState(err.message);
  }
}

async function renderMyGames() {
  if (!state.me) {
    appRoot().innerHTML = `<div class="wrap">${authPrompt('Đăng nhập để theo dõi tiến độ game của bạn.')}</div>`;
    return;
  }

  setLoading();
  document.title = 'Game của tôi — Laiber';

  let data;
  try {
    data = await api('/api/games/mine');
  } catch (err) {
    appRoot().innerHTML = `<div class="wrap">${errorState(err.message)}</div>`;
    return;
  }

  const { games, summary } = data;
  const rows = games.map((g) => {
    const st = STATUS[g.status] || STATUS.in_progress;
    const hasRating = Number(g.rating_count) > 0;
    const note = String(g.latest_note || '').trim();
    return `<div class="mygame-row">
      <a class="mygame-thumb" href="#/games/${encodeURIComponent(g.slug)}" aria-hidden="true">${coverInner(g)}</a>
      <div class="mygame-main">
        <div class="mygame-title">
          <a href="#/games/${encodeURIComponent(g.slug)}">${esc(g.title)}</a>
          <span class="status ${st.cls}">${st.label}</span>
        </div>
        ${g.tagline ? `<p class="mygame-tagline">${esc(g.tagline)}</p>` : ''}
        <div class="mygame-meta">
          <span>v${esc(g.version)}</span>
          <span>${hasRating ? `${icon('star', 12)} ${fmt(g.rating_avg)} · ${fmtInt(g.rating_count)} lượt` : 'Chưa có đánh giá'}</span>
          <span>${icon('message', 12)} ${fmtInt(g.comment_count)}</span>
          <span>${icon('download', 12)} ${fmtInt(g.downloads)}</span>
          <span>${icon('clock', 12)} ${ago(g.updated_at)}</span>
        </div>
        ${note ? `<p class="mygame-note">${icon('layers', 12)} v${esc(g.latest_version || g.version)} — ${esc(note.length > 140 ? `${note.slice(0, 140)}…` : note)}</p>` : ''}
      </div>
      <div class="mygame-actions">
        <a class="btn btn-ghost btn-sm" href="#/games/${encodeURIComponent(g.slug)}">Xem</a>
        <button class="btn btn-ghost btn-sm" type="button" data-action="edit-game" data-slug="${esc(g.slug)}">${icon('edit', 13)} Cập nhật</button>
        <button class="btn btn-ghost btn-sm" type="button" data-action="add-version" data-id="${g.id}" data-slug="${esc(g.slug)}" data-version="${esc(g.version)}">${icon('plus', 13)} Bản mới</button>
      </div>
    </div>`;
  }).join('');

  appRoot().innerHTML = `<div class="wrap rise">
    <div class="section-head" style="margin-top:32px">
      <div>
        <h1 style="font-size:30px">Game của tôi</h1>
        <p class="subtle" style="margin:6px 0 0">Theo dõi trạng thái, phiên bản và phản hồi của những game bạn đã đăng.</p>
      </div>
      <a class="btn btn-primary btn-sm" href="#/submit">${icon('plus', 15)} Đăng game</a>
    </div>

    <div class="mini-stat-grid" style="margin-top:22px">
      <div class="mini-stat"><div class="v">${fmtInt(summary.total)}</div><div class="l">Tổng game</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(summary.in_progress)}</div><div class="l">Đang phát triển</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(summary.done)}</div><div class="l">Hoàn thành</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(summary.abandoned)}</div><div class="l">Tạm dừng</div></div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-title">
        <h3>${icon('layers', 16)} Tiến độ game</h3>
        <span class="subtle">${summary.total} game</span>
      </div>
      ${games.length ? `<div class="mygame-list">${rows}</div>` : emptyState({
        title: 'Bạn chưa đăng game nào',
        body: 'Đăng game đầu tiên để theo dõi tiến độ, nhận đánh giá và bình luận tại đây.',
        cta: '<a class="btn btn-primary btn-sm" href="#/submit">Đăng game</a>',
      })}
    </div>
  </div>`;
}

function versionHtml(v, game) {
  return `<div class="tl-item">
    <div class="tl-head">
      <span class="tl-version">v${esc(v.version)}</span>
      <span class="tl-time">${shortDate(v.created_at)}</span>
      ${v.author_name ? `<span class="tl-time">· ${esc(v.author_name)}</span>` : ''}
      ${canManage() ? `<button class="icon-btn danger" style="width:26px;height:26px;margin-left:auto" data-action="delete-version" data-id="${v.id}" data-version="${esc(v.version)}" data-slug="${esc(game.slug)}" title="Xoá bản này">${icon('trash', 13)}</button>` : ''}
    </div>
    ${v.notes ? `<p class="tl-notes">${esc(v.notes)}</p>` : ''}
    ${v.file_name ? `<a class="tl-file" href="/api/download/version/${v.id}">${icon('file', 13)} ${esc(v.file_name)} <span style="color:var(--dim)">${fmtSize(v.file_size)}</span></a>` : ''}
  </div>`;
}

function leaderboardTable(rows, gameSlug) {
  if (!rows.length) {
    return `<p class="subtle" style="margin:6px 0 2px">Chưa có ai ghi điểm. Hãy là người đầu tiên.</p>`;
  }

  return `<div class="table-wrap"><table class="table" style="min-width:0">
    <thead><tr><th></th><th>Thành viên</th><th>Điểm cao nhất</th><th>Lần ghi</th></tr></thead>
    <tbody>${rows.map((row, i) => `
      <tr>
        <td style="width:38px"><span class="rank ${i < 3 ? `r${i + 1}` : ''}">${i + 1}</span></td>
        <td><div class="player">${avatar(row)}<div class="player-name">
          <strong>${esc(row.display_name)}${state.me?.id === row.user_id ? ' <span style="color:var(--lime);font-size:10.5px;font-weight:600">BẠN</span>' : ''}</strong>
          <span>@${esc(row.username)}</span>
        </div></div></td>
        <td><span class="score-value">${fmt(row.value)}</span></td>
        <td class="num" style="color:var(--dim)">${row.runs} · ${ago(row.last_at)}</td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function drawGame(data) {
  const { game, versions, leaderboard, comments, myRating, liked, myBest, myRuns } = data;
  const st = STATUS[game.status] || STATUS.in_progress;
  document.title = `${game.title} — Laiber`;

  const downloadBtn = game.file_path
    ? `<a class="btn ${game.play_url ? 'btn-ghost' : 'btn-primary'}" href="/api/download/${game.id}">${icon('download', 16)} Tải game <span style="opacity:.65;font-size:12px">${fmtSize(game.file_size)}</span></a>`
    : '';
  const externalBtn = game.external_url
    ? `<a class="btn ${game.file_path || game.play_url ? 'btn-ghost' : 'btn-primary'}" href="${esc(game.external_url)}" target="_blank" rel="noopener noreferrer">${icon('link', 16)} ${game.file_path ? 'Mở link tải' : 'Mở game'}</a>`
    : '';
  const playBtn = game.play_url
    ? `<button class="btn btn-primary" data-action="play" data-url="${esc(game.play_url)}" data-title="${esc(game.title)}">${icon('play', 16)} Chơi ngay</button>`
    : '';

  const creator = game.creator_name
    ? `<div class="info-row"><span class="k">Người thêm</span><span class="v">${esc(game.creator_name)}</span></div>`
    : '';

  const categoryChip = game.category_name
    ? `<span class="tag" style="border-color:${esc(game.category_color)}66;color:${esc(game.category_color)}">${esc(game.category_name)}</span>`
    : '';

  const scoreForm = state.me
    ? `<form class="score-form" data-form="score" data-game-id="${game.id}" data-slug="${esc(game.slug)}">
        <div class="form-error" data-error></div>
        <input class="input" type="number" name="value" min="0" step="0.01" placeholder="Điểm" required />
        <input class="input" type="text" name="note" maxlength="120" placeholder="Ghi chú" />
        <button class="btn btn-primary btn-sm" type="submit">Ghi điểm</button>
      </form>`
    : `<div class="score-form"><a class="btn btn-ghost btn-sm" href="#/login">Đăng nhập để ghi điểm</a></div>`;

  const ratingAvg = Number(game.rating_avg) || 0;
  const ratingPanel = `<div class="panel rating-panel">
    <div class="panel-title"><h3>${icon('star', 16)} Đánh giá</h3><span class="subtle">${fmtInt(game.rating_count)} lượt</span></div>
    <div class="rating-summary">
      <div class="rating-average"><strong>${game.rating_count ? fmt(ratingAvg) : '—'}</strong><span>/5</span></div>
      <div class="rating-side">
        ${starRow(ratingAvg)}
        <div class="subtle">${state.me
          ? (myRating ? `Bạn đã chấm ${myRating} sao` : 'Chấm sao để ủng hộ game')
          : 'Đăng nhập để chấm sao'}</div>
      </div>
    </div>
    ${state.me ? rateButtons(myRating, game.id) : `<a class="btn btn-ghost btn-sm" href="#/login">${icon('star', 14)} Đăng nhập để chấm sao</a>`}
  </div>`;

  const commentForm = state.me
    ? `<form class="comment-form" data-form="comment" data-id="${game.id}" data-slug="${esc(game.slug)}">
        <div class="form-error" data-error></div>
        <textarea class="input" name="body" rows="2" maxlength="1000" placeholder="Chia sẻ cảm nhận hoặc mẹo chơi…" required></textarea>
        <button class="btn btn-primary btn-sm" type="submit">${icon('send', 14)} Gửi</button>
      </form>`
    : `<p class="subtle" style="margin:0 0 14px"><a href="#/login" style="color:var(--lime);font-weight:600">Đăng nhập</a> để bình luận.</p>`;

  const commentList = comments.length
    ? comments.map((c) => `<div class="comment">
        ${avatar(c)}
        <div class="comment-main">
          <div class="comment-head">
            <strong>${esc(c.display_name || 'Thành viên cũ')}</strong>
            <span>${ago(c.created_at)}</span>
          </div>
          <p>${esc(c.body)}</p>
        </div>
        ${state.me && (state.me.id === c.user_id || canManage())
          ? `<button class="icon-btn danger" data-action="delete-comment" data-id="${c.id}" data-slug="${esc(game.slug)}" title="Xoá bình luận">${icon('trash', 14)}</button>`
          : ''}
      </div>`).join('')
    : '<p class="subtle">Chưa có bình luận nào — hãy mở màn.</p>';

  const honors = [
    game.rating_count >= 3 && ratingAvg >= 4.5 ? `<span class="tag honor">${icon('star', 12)} Được đánh giá cao</span>` : '',
    game.like_count >= 5 ? `<span class="tag honor">${icon('heart', 12)} Được yêu thích</span>` : '',
    game.comment_count >= 5 ? `<span class="tag honor">${icon('message', 12)} Sôi nổi</span>` : '',
  ].filter(Boolean).join('');

  appRoot().innerHTML = `<div class="wrap rise">
    <a class="detail-back" href="#/games">${icon('arrowLeft', 14)} Kho game</a>

    <div class="detail-banner">
      ${game.cover_url ? `<img class="banner-img" src="${esc(game.cover_url)}" alt="" data-cover-title="${esc(game.title)}" data-cover-grad="${esc(gradFor(game.title))}" data-cover-initials="${esc(initials(game.title))}" />` : `<div class="banner-img"><div class="cover-fallback" style="background:${gradFor(game.title)}"><span>${esc(initials(game.title))}</span></div></div>`}
      <div class="banner-content">
        <div class="banner-chips">
          ${categoryChip}
          <span class="status ${st.cls}">${st.label}</span>
          <span class="tag">${icon('layers', 12)} v${esc(game.version)}</span>
          ${honors}
        </div>
        <h1>${esc(game.title)}</h1>
        <p class="banner-tagline">${esc(game.tagline || 'Chưa có mô tả ngắn cho game này.')}</p>
        <div class="banner-actions">
          ${playBtn}
          ${downloadBtn}
          ${externalBtn}
          <button class="btn btn-ghost${liked ? ' liked' : ''}" data-action="like" data-id="${game.id}" aria-pressed="${liked}">
            ${icon(liked ? 'heartFill' : 'heart', 16)} <span data-like-count>${game.like_count}</span><span class="like-label">yêu thích</span>
          </button>
          <span style="flex:1"></span>
          <button class="btn btn-ghost btn-sm" data-action="report" data-id="${game.id}" data-title="${esc(game.title)}">${icon('flag', 14)} Báo lỗi</button>
          ${canEditGame(game) ? `<button class="btn btn-ghost btn-sm" data-action="edit-game" data-slug="${esc(game.slug)}">${icon('edit', 15)} Chỉnh sửa</button>` : ''}
          ${isAdmin() ? `<button class="icon-btn danger" data-action="delete-game" data-id="${game.id}" data-title="${esc(game.title)}" title="Xoá game">${icon('trash', 16)}</button>` : ''}
        </div>
      </div>
    </div>

    <div class="detail-grid">
      <div style="display:flex;flex-direction:column;gap:24px">
        <div class="panel">
          <div class="panel-title"><h3>${icon('file', 16)} Giới thiệu</h3></div>
          <div class="prose">${game.description ? esc(game.description) : 'Chưa có mô tả chi tiết cho game này.'}</div>
        </div>

        <div class="panel">
          <div class="panel-title">
            <h3>${icon('message', 16)} Bình luận</h3>
            <span class="subtle">${fmtInt(game.comment_count)}</span>
          </div>
          ${commentForm}
          <div class="comment-list">${commentList}</div>
        </div>

        <div class="panel">
          <div class="panel-title">
            <h3>${icon('layers', 16)} Nhật ký cập nhật</h3>
            ${canEditGame(game) ? `<button class="btn btn-ghost btn-sm" data-action="add-version" data-id="${game.id}" data-slug="${esc(game.slug)}" data-version="${esc(game.version)}">${icon('plus', 14)} Thêm bản</button>` : ''}
          </div>
          ${versions.length
            ? `<div class="timeline">${versions.map((v) => versionHtml(v, game)).join('')}</div>`
            : '<p class="subtle">Chưa có ghi chú phiên bản nào.</p>'}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:24px">
        ${ratingPanel}

        <div class="panel">
          <div class="panel-title"><h3>${icon('spark', 16)} Thông tin</h3></div>
          <div class="info-list">
            ${game.category_name ? `<div class="info-row"><span class="k">Thể loại</span><span class="v">${esc(game.category_name)}</span></div>` : ''}
            <div class="info-row"><span class="k">Trạng thái</span><span class="v">${st.label}</span></div>
            <div class="info-row"><span class="k">Phiên bản</span><span class="v">v${esc(game.version)}</span></div>
            ${game.file_size ? `<div class="info-row"><span class="k">Dung lượng</span><span class="v">${fmtSize(game.file_size)}</span></div>` : ''}
            <div class="info-row"><span class="k">Đánh giá</span><span class="v">${game.rating_count ? `${fmt(ratingAvg)} ★ · ${fmtInt(game.rating_count)} lượt` : 'Chưa có'}</span></div>
            <div class="info-row"><span class="k">Bình luận</span><span class="v">${fmtInt(game.comment_count)}</span></div>
            <div class="info-row"><span class="k">Lượt tải</span><span class="v">${fmtInt(game.downloads)}</span></div>
            <div class="info-row"><span class="k">Cập nhật</span><span class="v">${shortDate(game.updated_at)}</span></div>
            ${creator}
          </div>
        </div>

        <div class="panel" id="leaderboard-panel">
          <div class="panel-title">
            <h3>${icon('trophy', 16)} Bảng xếp hạng</h3>
            <span class="subtle">${game.score_count} lượt ghi</span>
          </div>
          ${myBest !== null && myBest !== undefined
            ? `<p class="subtle" style="margin:-4px 0 10px">Kỷ lục của bạn: <span style="color:var(--lime);font-family:var(--font-mono);font-weight:700">${fmt(myBest)}</span> · ${myRuns} lần ghi</p>`
            : ''}
          ${leaderboardTable(leaderboard, game.slug)}
          ${scoreForm}
        </div>
      </div>
    </div>
  </div>`;
}

async function renderGame(slug, options = {}) {
  if (!options.silent) setLoading();
  try {
    const data = await api(`/api/games/${encodeURIComponent(slug)}`);
    drawGame(data);
    if (options.scroll !== undefined) window.scrollTo(0, options.scroll);
  } catch (err) {
    appRoot().innerHTML = `<div class="wrap">${errorState(err.message)}</div>`;
  }
}

function globalBoardTable(rows) {
  if (!rows.length) {
    return emptyState({ title: 'Chưa có dữ liệu xếp hạng', body: 'Ghi điểm ở một game bất kỳ để bắt đầu bảng xếp hạng của nhóm.' });
  }
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th></th><th>Thành viên</th><th>Số game</th><th>Lượt ghi</th><th>Tổng điểm</th><th>Kỷ lục</th></tr></thead>
    <tbody>${rows.map((row, i) => `
      <tr>
        <td style="width:38px"><span class="rank ${i < 3 ? `r${i + 1}` : ''}">${i + 1}</span></td>
        <td><div class="player">${avatar(row)}<div class="player-name">
          <strong>${esc(row.display_name)}${state.me?.id === row.user_id ? ' <span style="color:var(--lime);font-size:10.5px;font-weight:600">BẠN</span>' : ''}</strong>
          <span>@${esc(row.username)}</span>
        </div></div></td>
        <td class="num">${row.games_played}</td>
        <td class="num">${row.runs}</td>
        <td><span class="score-value">${fmt(row.total)}</span></td>
        <td class="num" style="color:var(--muted)">${fmt(row.best)}</td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function gameBoardTable(rows) {
  if (!rows.length) {
    return emptyState({ title: 'Chưa có ai ghi điểm', body: 'Chọn game khác hoặc là người đầu tiên ghi điểm ở game này.' });
  }
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th></th><th>Thành viên</th><th>Điểm cao nhất</th><th>Số lần ghi</th><th>Gần nhất</th></tr></thead>
    <tbody>${rows.map((row, i) => `
      <tr>
        <td style="width:38px"><span class="rank ${i < 3 ? `r${i + 1}` : ''}">${i + 1}</span></td>
        <td><div class="player">${avatar(row)}<div class="player-name">
          <strong>${esc(row.display_name)}${state.me?.id === row.user_id ? ' <span style="color:var(--lime);font-size:10.5px;font-weight:600">BẠN</span>' : ''}</strong>
          <span>@${esc(row.username)}</span>
        </div></div></td>
        <td><span class="score-value">${fmt(row.total)}</span></td>
        <td class="num">${row.runs}</td>
        <td class="num" style="color:var(--dim)">${ago(row.last_at)}</td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

async function renderLeaderboard() {
  setLoading();
  let games;
  try {
    games = (await api('/api/games?sort=alpha')).games;
  } catch (err) {
    appRoot().innerHTML = `<div class="wrap">${errorState(err.message)}</div>`;
    return;
  }

  document.title = 'Bảng xếp hạng — Laiber';
  const options = ['<option value="">Tổng hợp toàn bộ game</option>']
    .concat(games.map((g) => `<option value="${esc(g.slug)}">${esc(g.title)}</option>`))
    .join('');

  appRoot().innerHTML = `<div class="wrap rise">
    <div class="section-head" style="margin-top:32px">
      <div>
        <h1 style="font-size:30px">Bảng xếp hạng</h1>
        <p class="subtle" style="margin:6px 0 0">Tổng điểm tính theo kỷ lục cao nhất của từng thành viên ở mỗi game.</p>
      </div>
    </div>

    <div class="toolbar" style="margin-top:20px">
      <select id="lb-game" class="select" style="max-width:320px" aria-label="Chọn game">${options}</select>
      <span class="subtle" id="lb-meta"></span>
    </div>

    <div id="lb-body"></div>
  </div>`;

  await loadLeaderboard('');
}

async function loadLeaderboard(gameSlug) {
  const body = document.getElementById('lb-body');
  const meta = document.getElementById('lb-meta');
  if (!body) return;
  body.innerHTML = '<div class="loading"><div class="spinner"></div>Đang tải…</div>';

  try {
    const data = await api('/api/leaderboard/global' + (gameSlug ? `?game=${encodeURIComponent(gameSlug)}` : ''));
    if (meta) {
      meta.textContent = data.mode === 'game'
        ? `${data.game.title} · ${data.totalSubmissions} lượt ghi điểm`
        : `${data.rows.length} thành viên · ${data.totalSubmissions} lượt ghi điểm`;
    }
    body.innerHTML = `<div class="panel" style="padding:8px 4px">${
      data.mode === 'game' ? gameBoardTable(data.rows) : globalBoardTable(data.rows)
    }</div>`;
  } catch (err) {
    body.innerHTML = errorState(err.message);
  }
}

function authPrompt(message) {
  return `<div class="auth-shell"><div class="auth-card" style="text-align:center">
    <div class="empty-icon" style="margin:0 auto 16px;width:52px;height:52px;display:grid;place-items:center;border-radius:15px;border:1px solid var(--line-2);background:rgba(255,255,255,.03);color:var(--lime)">${icon('shield', 22)}</div>
    <h2 style="font-size:20px;margin-bottom:8px">Cần đăng nhập</h2>
    <p class="subtle" style="margin:0 0 20px">${esc(message)}</p>
    <a class="btn btn-primary" href="#/login" style="width:100%">Đăng nhập</a>
  </div></div>`;
}

async function renderAdmin() {
  if (!state.me) {
    appRoot().innerHTML = `<div class="wrap">${authPrompt('Khu quản trị chỉ dành cho thành viên đã đăng nhập.')}</div>`;
    return;
  }
  if (!canManage()) {
    appRoot().innerHTML = `<div class="wrap"><div style="margin-top:40px">${emptyState({
      title: 'Không có quyền truy cập',
      body: 'Bạn cần vai trò quản lý nội dung hoặc quản trị viên để mở khu vực này.',
      cta: '<a class="btn btn-ghost btn-sm" href="#/">Về trang chủ</a>',
    })}</div></div>`;
    return;
  }

  setLoading();
  document.title = 'Quản trị — Laiber';

  let stats;
  let users = [];
  let reports = [];
  try {
    const [statsRes, catsRes, reportsRes] = await Promise.all([
      api('/api/stats'),
      api('/api/categories'),
      api('/api/reports?status=open'),
    ]);
    stats = statsRes.stats;
    state.categories = catsRes.categories;
    reports = reportsRes.reports;
    if (isAdmin()) users = (await api('/api/users')).users;
  } catch (err) {
    appRoot().innerHTML = `<div class="wrap">${errorState(err.message)}</div>`;
    return;
  }

  const reportRows = reports.map((r) => `
    <div class="report-row">
      <div class="report-head">
        <span class="report-reason">${icon('flag', 12)} ${esc(r.reason_label)}</span>
        <span class="subtle" style="font-size:11.5px">${ago(r.created_at)}</span>
      </div>
      <a class="report-game" href="#/games/${encodeURIComponent(r.game_slug || '')}">${esc(r.game_title || 'Game đã xoá')}</a>
      <p class="report-message">${esc(r.message)}</p>
      <div class="report-foot">
        <span class="subtle" style="font-size:11.5px">${r.reporter_name ? `Bởi ${esc(r.reporter_name)}` : 'Ẩn danh'}</span>
        <button class="btn btn-ghost btn-sm" data-action="resolve-report" data-id="${r.id}">${icon('check', 13)} Đã xử lý</button>
      </div>
    </div>`).join('');

  const categoryRows = state.categories.map((c) => `
    <div class="roster-row">
      <span class="swatch" style="background:${esc(c.color)}"></span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13.5px">${esc(c.name)}</div>
        <div class="subtle" style="font-size:11.5px">${c.game_count} game · /${esc(c.slug)}</div>
      </div>
      <button class="icon-btn danger" data-action="delete-category" data-id="${c.id}" data-name="${esc(c.name)}" title="Xoá thể loại">${icon('trash', 14)}</button>
    </div>`).join('');

  const userRows = users.map((u) => `
    <tr>
      <td><div class="player">${avatar(u)}<div class="player-name">
        <strong>${esc(u.display_name)}${u.id === state.me.id ? ' (bạn)' : ''}</strong>
        <span>@${esc(u.username)}</span>
      </div></div></td>
      <td>
        <select class="select" style="width:auto;padding:6px 30px 6px 10px;font-size:12.5px" data-role-select data-id="${u.id}" aria-label="Vai trò của ${esc(u.display_name)}">
          <option value="member" ${u.role === 'member' ? 'selected' : ''}>Thành viên</option>
          <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Quản lý nội dung</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Quản trị viên</option>
        </select>
      </td>
      <td class="num">${fmtInt(u.total_points)}<span class="subtle" style="font-size:11px"> / ${u.games_played} game</span></td>
      <td class="num" style="color:var(--dim)">${shortDate(u.created_at)}</td>
      <td style="text-align:right">
        ${u.id === state.me.id ? '' : `<button class="icon-btn danger" data-action="delete-user" data-id="${u.id}" data-name="${esc(u.display_name)}" title="Xoá thành viên">${icon('trash', 15)}</button>`}
      </td>
    </tr>`).join('');

  appRoot().innerHTML = `<div class="wrap rise">
    <div class="section-head" style="margin-top:32px">
      <div>
        <h1 style="font-size:30px">Quản trị</h1>
        <p class="subtle" style="margin:6px 0 0">Xin chào ${esc(state.me.display_name)} — ${ROLE_LABEL[state.me.role]}.</p>
      </div>
      <button class="btn btn-primary btn-sm" data-action="new-game">${icon('plus', 15)} Thêm game</button>
    </div>

    <div class="mini-stat-grid" style="margin-top:22px">
      <div class="mini-stat"><div class="v">${fmtInt(stats.games)}</div><div class="l">Game</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(stats.users)}</div><div class="l">Thành viên</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(stats.scores)}</div><div class="l">Lượt ghi điểm</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(stats.likes)}</div><div class="l">Lượt thích</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(stats.downloads)}</div><div class="l">Lượt tải</div></div>
      <div class="mini-stat"><div class="v">${fmtInt(stats.versions)}</div><div class="l">Bản cập nhật</div></div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-title">
        <h3>${icon('flag', 16)} Báo cáo cần xử lý</h3>
        <span class="subtle">${reports.length} đang mở</span>
      </div>
      ${reports.length ? `<div class="report-list">${reportRows}</div>` : '<p class="subtle" style="margin:0">Không có báo cáo nào đang chờ.</p>'}
    </div>

    <div class="admin-grid">
      ${isAdmin() ? `<div class="panel">
        <div class="panel-title">
          <h3>${icon('users', 16)} Thành viên</h3>
          <span class="subtle">${users.length} người</span>
        </div>
        <div class="table-wrap"><table class="table" style="min-width:0">
          <thead><tr><th>Thành viên</th><th>Vai trò</th><th>Điểm</th><th>Tham gia</th><th></th></tr></thead>
          <tbody>${userRows || '<tr><td colspan="5" class="subtle">Chưa có ai.</td></tr>'}</tbody>
        </table></div>
      </div>` : ''}

      <div class="panel">
        <div class="panel-title">
          <h3>${icon('layers', 16)} Thể loại</h3>
          <span class="subtle">${state.categories.length} nhóm</span>
        </div>
        <form data-form="category" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <div class="form-error" data-error></div>
          <input class="input" name="name" placeholder="Tên thể loại mới" maxlength="40" required style="flex:1;min-width:150px" />
          <input class="input" type="color" name="color" value="#8b5cf6" style="width:46px;height:42px;padding:4px;flex-shrink:0" title="Màu thể loại" />
          <button class="btn btn-primary btn-sm" type="submit">${icon('plus', 14)} Thêm</button>
        </form>
        <div>${categoryRows || '<p class="subtle">Chưa có thể loại nào.</p>'}</div>
      </div>

      <div class="panel">
        <div class="panel-title"><h3>${icon('shield', 16)} Phân quyền</h3></div>
        <div class="info-list">
          <div class="info-row"><span class="k">Quản trị viên</span><span class="v">Toàn quyền, quản lý thành viên</span></div>
          <div class="info-row"><span class="k">Quản lý nội dung</span><span class="v">Thêm, sửa game và thể loại</span></div>
          <div class="info-row"><span class="k">Thành viên</span><span class="v">Xem, tải, ghi điểm, yêu thích</span></div>
        </div>
        <p class="hint" style="margin-top:12px">Người đăng ký đầu tiên tự động trở thành quản trị viên. Quản trị viên đổi vai trò ngay trong bảng thành viên.</p>
      </div>
    </div>
  </div>`;
}

function renderLogin() {
  document.title = 'Đăng nhập — Laiber';
  appRoot().innerHTML = `<div class="wrap"><div class="auth-shell rise">
    <div class="auth-card">
      <div class="auth-head">
        <h1>Đăng nhập</h1>
        <p>Vào kho game của nhóm để tải, cập nhật và ghi điểm.</p>
      </div>
      <form data-form="login">
        <div class="form-error" data-error></div>
        <div class="field">
          <label>Tên đăng nhập</label>
          <input class="input" name="username" autocomplete="username" autocapitalize="none" required />
        </div>
        <div class="field">
          <label>Mật khẩu</label>
          <input class="input" type="password" name="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%">Đăng nhập</button>
      </form>
      <p class="auth-alt">Chưa có tài khoản? <a href="#/register">Đăng ký</a></p>
    </div>
  </div></div>`;
}

function renderRegister() {
  document.title = 'Đăng ký — Laiber';
  const banner = state.needsSetup
    ? `<div class="setup-banner">${icon('shield', 18)}<div><b>Thiết lập lần đầu.</b> Chưa có quản trị viên — tài khoản bạn tạo bây giờ sẽ có toàn quyền quản trị.</div></div>`
    : '';

  appRoot().innerHTML = `<div class="wrap"><div class="auth-shell rise">
    <div class="auth-card">
      <div class="auth-head">
        <h1>Tạo tài khoản</h1>
        <p>Tham gia kho game nội bộ của nhóm.</p>
      </div>
      ${banner}
      <form data-form="register">
        <div class="form-error" data-error></div>
        <div class="field">
          <label>Tên đăng nhập</label>
          <input class="input" name="username" autocomplete="username" autocapitalize="none" placeholder="vd: minh_dev" required />
          <span class="hint">3–24 ký tự: chữ thường, số, dấu gạch dưới.</span>
        </div>
        <div class="field">
          <label>Tên hiển thị</label>
          <input class="input" name="displayName" maxlength="40" placeholder="Tên hiện trên bảng xếp hạng" required />
        </div>
        <div class="field">
          <label>Mật khẩu</label>
          <input class="input" type="password" name="password" minlength="6" autocomplete="new-password" required />
          <span class="hint">Ít nhất 6 ký tự.</span>
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%">Tạo tài khoản</button>
      </form>
      <p class="auth-alt">Đã có tài khoản? <a href="#/login">Đăng nhập</a></p>
    </div>
  </div></div>`;
}

async function renderSubmit() {
  document.title = 'Đăng game — Laiber';

  if (!state.me) {
    appRoot().innerHTML = `<div class="wrap"><div class="auth-shell wide rise">${emptyState({
      title: 'Đăng nhập để đăng game',
      body: 'Chỉ thành viên trong nhóm mới có thể thêm game vào kho.',
      cta: `<a class="btn btn-primary btn-sm" href="#/login">Đăng nhập</a><a class="btn btn-ghost btn-sm" href="#/register">Tạo tài khoản</a>`,
    })}</div></div>`;
    return;
  }

  if (!state.categories.length) {
    try {
      await refreshCategories();
    } catch (err) {
      appRoot().innerHTML = `<div class="wrap">${errorState(err.message)}</div>`;
      return;
    }
  }

  const categoryOptions = ['<option value="" selected disabled>— Chọn thể loại —</option>']
    .concat(state.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`))
    .join('');

  appRoot().innerHTML = `<div class="wrap"><div class="auth-shell wide rise">
    <div class="auth-card">
      <div class="auth-head">
        <h1>Đăng game</h1>
        <p>Dán link, đặt tên và chọn thể loại — ảnh minh hoạ tự lấy từ trang game.</p>
      </div>
      <form data-form="submit">
        <div class="form-error" data-error></div>
        <div class="field">
          <label>Tên game *</label>
          <input class="input" name="title" maxlength="80" placeholder="Tên game hiện trong kho" required />
        </div>
        <div class="field">
          <label>Thể loại *</label>
          <select class="select" name="category_id" required>${categoryOptions}</select>
        </div>
        <div class="field">
          <label>Link game *</label>
          <div class="link-source-row">
            <input class="input" type="url" name="url" data-link-source placeholder="https://…" autocomplete="off" required />
            <button class="btn btn-ghost btn-sm" type="button" data-action="preview-link">${icon('spark', 14)} Xem trước</button>
          </div>
          <span class="hint">Link tới trang chơi hoặc trang tải game. Nếu trang cho phép nhúng, người xem bấm “Chơi ngay” được luôn.</span>
          <div id="link-preview" class="link-preview-slot"></div>
        </div>
        <div class="field">
          <label>Mô tả game</label>
          <textarea class="input" name="description" rows="4" maxlength="6000" placeholder="Giới thiệu nội dung, cách chơi, điểm nổi bật…"></textarea>
        </div>
        <div class="field">
          <label>Ảnh đại diện game</label>
          <input class="input file-input" type="file" name="cover" accept="image/png,image/jpeg,image/webp,image/gif" />
          <span class="hint">Tuỳ chọn · tối đa 12MB. Bỏ trống để dùng ảnh xem trước lấy từ link.</span>
        </div>
        <input type="hidden" name="tagline" value="" />
        <input type="hidden" name="cover_url" value="" />
        <input type="hidden" name="play_url" value="" />
        <input type="hidden" name="external_url" value="" />
        <button class="btn btn-primary" type="submit" style="width:100%">${icon('plus', 16)} Đăng vào kho</button>
      </form>
    </div>
  </div></div>`;
}

function openModal(html, { wide = false, small = false } = {}) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop">
    <div class="modal${wide ? ' wide' : ''}${small ? ' small' : ''}" role="dialog" aria-modal="true">${html}</div>
  </div>`;
  document.body.classList.add('no-scroll');
}

function closeModal() {
  const resolve = state.confirmResolve;
  state.confirmResolve = null;
  document.getElementById('modal-root').innerHTML = '';
  document.body.classList.remove('no-scroll');
  if (resolve) resolve(false);
}

function askConfirm({ title, body, confirmLabel = 'Xoá', danger = true }) {
  return new Promise((resolve) => {
    state.confirmResolve = resolve;
    openModal(`
      <div class="modal-head">
        <div><h3>${esc(title)}</h3>${body ? `<p>${esc(body)}</p>` : ''}</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="confirm-cancel" type="button">Huỷ</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm-ok" type="button">${esc(confirmLabel)}</button>
      </div>`, { small: true });
  });
}

async function refreshCategories() {
  state.categories = (await api('/api/categories')).categories;
}

async function openGameForm(game = null) {
  if (!state.categories.length) await refreshCategories();
  const isEdit = Boolean(game);
  const statusOptions = Object.entries(STATUS)
    .map(([key, meta]) => `<option value="${key}" ${game?.status === key ? 'selected' : ''}>${meta.label}</option>`)
    .join('');
  const categoryOptions = ['<option value="">— Không phân loại —</option>']
    .concat(state.categories.map((c) => `<option value="${c.id}" ${game?.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`))
    .join('');

  openModal(`
    <div class="modal-head">
      <div><h3>${isEdit ? 'Chỉnh sửa game' : 'Thêm game mới'}</h3>
      <p>${isEdit ? 'Cập nhật thông tin, file build hoặc ảnh bìa.' : 'Điền thông tin cơ bản, có thể bổ sung file sau.'}</p></div>
      <button class="icon-btn" data-action="close-modal" type="button">${icon('x', 16)}</button>
    </div>
    <form data-form="game" data-id="${game?.id || ''}" data-slug="${esc(game?.slug || '')}">
      <div class="form-error" data-error></div>
      <div class="panel" style="padding:14px;margin-bottom:16px">
        <div class="field" style="margin-bottom:0">
          <label>Dán link game</label>
          <div class="link-source-row">
            <input class="input" data-link-source placeholder="https://itch.io/… hoặc link chơi trên web" autocomplete="off" />
            <button class="btn btn-ghost btn-sm" type="button" data-action="preview-link">${icon('spark', 14)} Lấy thông tin</button>
          </div>
          <span class="hint">Tự lấy tiêu đề, ảnh minh hoạ và cho người xem “Chơi ngay” nếu trang cho phép nhúng.</span>
          <div id="link-preview" class="link-preview-slot"></div>
        </div>
      </div>
      <input type="hidden" name="cover_url" value="${esc(game?.cover_url || '')}" />
      <div class="field">
        <label>Tên game *</label>
        <input class="input" name="title" maxlength="80" value="${esc(game?.title || '')}" required />
      </div>
      <div class="field">
        <label>Mô tả ngắn</label>
        <input class="input" name="tagline" maxlength="160" value="${esc(game?.tagline || '')}" placeholder="Một câu giới thiệu game" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Thể loại</label>
          <select class="select" name="category_id">${categoryOptions}</select>
        </div>
        <div class="field">
          <label>Trạng thái</label>
          <select class="select" name="status">${statusOptions}</select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Phiên bản</label>
          <input class="input" name="version" maxlength="24" value="${esc(game?.version || '1.0')}" />
        </div>
        <div class="field">
          <label>Link chơi trên web</label>
          <input class="input" name="play_url" maxlength="500" value="${esc(game?.play_url || '')}" placeholder="https://… (tự điền khi dán link)" />
        </div>
      </div>
      <div class="field">
        <label>Mô tả chi tiết</label>
        <textarea class="textarea" name="description" maxlength="6000" placeholder="Cách chơi, cốt truyện, điều khiển…">${esc(game?.description || '')}</textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Ảnh bìa</label>
          <input class="file-input" type="file" name="cover" accept=".png,.jpg,.jpeg,.webp,.gif" />
          <span class="hint">PNG/JPG/WEBP/GIF, tối đa 12MB.</span>
        </div>
        <div class="field">
          <label>File game</label>
          <input class="file-input" type="file" name="file" accept=".zip,.rar,.7z,.tar,.gz,.tgz,.exe,.apk,.html,.htm,.iso,.dmg,.jar,.unitypackage,.love,.bin,.pdf" />
          <span class="hint">Tối đa 700MB mỗi file.</span>
        </div>
      </div>
      <div class="field">
        <label>Link tải ngoài</label>
        <input class="input" name="external_url" maxlength="500" value="${esc(game?.external_url || '')}" placeholder="itch.io, Drive, GitHub release…" />
      </div>
      ${isEdit && game?.file_path ? `<label class="checkbox-line"><input type="checkbox" name="clear_file" value="1" /> Xoá file game hiện tại (${fmtSize(game.file_size)})</label>` : ''}
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-action="close-modal">Huỷ</button>
        <button class="btn btn-primary" type="submit">${isEdit ? 'Lưu thay đổi' : 'Thêm game'}</button>
      </div>
    </form>`, { wide: true });
}

function openVersionForm(game) {
  openModal(`
    <div class="modal-head">
      <div><h3>Thêm bản cập nhật</h3><p>${esc(game.title)}</p></div>
      <button class="icon-btn" data-action="close-modal" type="button">${icon('x', 16)}</button>
    </div>
    <form data-form="version" data-id="${game.id}" data-slug="${esc(game.slug)}">
      <div class="form-error" data-error></div>
      <div class="field">
        <label>Phiên bản *</label>
        <input class="input" name="version" maxlength="24" value="${esc(game.version)}" required />
      </div>
      <div class="field">
        <label>Ghi chú thay đổi</label>
        <textarea class="textarea" name="notes" maxlength="3000" placeholder="Đã thêm gì, sửa gì…"></textarea>
      </div>
      <div class="field">
        <label>File build (không bắt buộc)</label>
        <input class="file-input" type="file" name="file" accept=".zip,.rar,.7z,.tar,.gz,.tgz,.exe,.apk,.html,.htm,.iso,.dmg,.jar,.unitypackage,.love,.bin,.pdf" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-action="close-modal">Huỷ</button>
        <button class="btn btn-primary" type="submit">Lưu bản cập nhật</button>
      </div>
    </form>`);
}

function fillFromPreview(form, p) {
  const auto = form._autoValues || (form._autoValues = {});
  const fieldAuto = (field, value) => {
    if (!field) return;
    const current = String(field.value || '').trim();
    if (current && current !== auto[field.name]) return;
    field.value = value;
    if (value) auto[field.name] = value;
    else delete auto[field.name];
  };
  const setAuto = (name, value) => fieldAuto(form.querySelector(`[name="${name}"]`), value);

  setAuto('title', p.title);
  setAuto('tagline', p.description ? p.description.slice(0, 160) : '');
  setAuto('description', p.description || '');
  setAuto('play_url', p.embeddable ? p.url : '');
  setAuto('external_url', !p.embeddable || p.kind === 'file' ? p.url : '');

  const hasFile = form.querySelector('input[name="cover"]')?.files?.length;
  if (!hasFile) setAuto('cover_url', p.image || '');
}

function renderLinkPreview(form, p) {
  const slot = form.querySelector('#link-preview');
  if (!slot) return;
  slot._preview = p;
  const media = p.image
    ? `<img src="${esc(p.image)}" alt="" data-preview-img />`
    : `<div class="preview-fallback" style="background:${gradFor(p.title)}">${esc(initials(p.title))}</div>`;
  const playTag = p.embeddable
    ? `<span class="link-preview-tag good">${icon('play', 11)} chơi nhúng được</span>`
    : `<span class="link-preview-tag warn">${icon('external', 11)} ${esc(p.embedReason || 'mở tab mới')}</span>`;
  slot.innerHTML = `<div class="link-preview-box">
    ${media}
    <div class="link-preview-meta">
      <strong>${esc(p.title)}</strong>
      <p>${esc(p.description || 'Không có mô tả — bạn có thể tự viết bên dưới.')}</p>
      <div class="link-preview-tags">
        <span class="link-preview-tag">${icon('link', 11)} ${esc(p.host)}</span>
        ${p.siteName ? `<span class="link-preview-tag">${esc(p.siteName)}</span>` : ''}
        ${playTag}
        ${p.imageSource === 'screenshot' ? `<span class="link-preview-tag">ảnh chụp trang</span>` : ''}
      </div>
      ${p.image ? `<div class="link-preview-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="use-preview-image">${icon('image', 13)} Dùng ảnh này làm bìa</button>
      </div>` : ''}
    </div>
  </div>`;
}

async function previewLink(button) {
  const form = button.closest('form');
  if (!form) return;
  const input = form.querySelector('[data-link-source]');
  const slot = form.querySelector('#link-preview');
  const url = String(input?.value || '').trim();
  if (!/^https?:\/\/[^\s]+/i.test(url)) {
    toast('Dán link bắt đầu bằng http:// hoặc https://', 'err');
    input?.focus();
    return;
  }
  if (form._previewBusy === url) return;
  if (form._previewUrl === url && slot?._preview) {
    renderLinkPreview(form, slot._preview);
    return;
  }
  form._previewBusy = url;
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="spinner" style="width:13px;height:13px;margin:0;border-width:2px"></span> Đang lấy…';
  if (slot) slot.innerHTML = '<div class="link-preview-box" style="grid-template-columns:1fr"><span class="subtle">Đang mở link và lấy ảnh xem trước…</span></div>';
  try {
    const p = await api(`/api/link-preview?url=${encodeURIComponent(url)}`);
    form._previewUrl = url;
    fillFromPreview(form, p);
    renderLinkPreview(form, p);
    toast(p.embeddable ? 'Đã lấy thông tin — người xem chơi nhúng được ngay.' : 'Đã lấy thông tin — link sẽ mở ở tab mới khi chơi.');
  } catch (err) {
    if (slot) slot.innerHTML = `<div class="form-error show" style="margin:8px 0 0">${esc(err.message)}</div>`;
  } finally {
    form._previewBusy = '';
    button.disabled = false;
    button.innerHTML = original;
  }
}

function openPlayModal(url, title) {
  let host = '';
  try { host = new URL(url).host; } catch { /* ignore */ }
  openModal(`
    <div class="modal-head">
      <div><h3>${esc(title)}</h3><p>Chơi trực tiếp trên web${host ? ` · <span class="play-host">${esc(host)}</span>` : ''}</p></div>
      <button class="icon-btn" data-action="close-modal" type="button">${icon('x', 16)}</button>
    </div>
    <div class="play-toolbar">
      <span class="play-note">Nếu khung bên dưới trắng hoặc báo lỗi, trang game đang chặn nhúng — bấm “Mở tab mới”.</span>
      <a class="btn btn-ghost btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('external', 14)} Mở tab mới</a>
    </div>
    <div class="play-frame">
      <iframe src="${esc(url)}" title="${esc(title)}" allow="fullscreen; gamepad; autoplay; clipboard-write" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock" referrerpolicy="no-referrer"></iframe>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary btn-sm" data-action="close-modal" type="button">Đóng</button>
    </div>`, { wide: true });
}

function renderAchievements(box, data) {
  box.innerHTML = `<div class="achievement-grid">${data.achievements.map((a) => `
    <div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}">
      <span class="ach-icon">${icon(a.unlocked ? a.icon : 'lock', 17)}</span>
      <div class="ach-text"><strong>${esc(a.label)}</strong><span>${esc(a.desc)}</span></div>
    </div>`).join('')}</div>
    <p class="hint" style="margin-top:12px">Đã mở <b>${data.unlockedCount}/${data.achievements.length}</b> thành tích${data.bestGame ? ` · Game nổi bật: <b>${esc(data.bestGame.title)}</b> (${fmt(data.bestGame.avg)}★)` : ''}.</p>`;
}

function openReportModal(gameId, title) {
  openModal(`
    <div class="modal-head">
      <div><h3>${icon('flag', 17)} Báo lỗi game</h3><p>${esc(title)} — quản trị viên sẽ xem xét báo cáo của bạn.</p></div>
      <button class="icon-btn" data-action="close-modal" type="button">${icon('x', 16)}</button>
    </div>
    <form data-form="report" data-id="${gameId}">
      <div class="form-error" data-error></div>
      <div class="field">
        <label>Vấn đề</label>
        <select class="select" name="reason" required>
          <option value="wrong_link">Link sai hoặc không mở được</option>
          <option value="stolen">Nội dung bị đánh cắp</option>
          <option value="broken">Game lỗi, không chơi hoặc tải được</option>
          <option value="other">Vấn đề khác</option>
        </select>
      </div>
      <div class="field">
        <label>Mô tả chi tiết</label>
        <textarea class="input" name="message" rows="4" maxlength="1000" placeholder="Ví dụ: link dẫn tới trang khác, game gốc thuộc về tác giả…" required></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-action="close-modal">Huỷ</button>
        <button class="btn btn-primary" type="submit">${icon('flag', 14)} Gửi báo cáo</button>
      </div>
    </form>`, { small: true });
}

async function openProfile() {
  const me = state.me;
  openModal(`
    <div class="modal-head">
      <div><h3>Hồ sơ của bạn</h3><p>Ảnh đại diện, tên hiển thị, mật khẩu và thành tích.</p></div>
      <button class="icon-btn" data-action="close-modal" type="button">${icon('x', 16)}</button>
    </div>

    <div class="profile-head">
      ${avatar(me, 'lg')}
      <div class="profile-id">
        <strong>${esc(me.display_name)}</strong>
        <span>@${esc(me.username)} · ${ROLE_LABEL[me.role] || me.role}</span>
      </div>
      <form class="avatar-form" data-form="avatar">
        <label class="btn btn-ghost btn-sm">
          ${icon('camera', 14)} Đổi ảnh
          <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
        </label>
        ${me.avatar_path ? `<button class="btn btn-ghost btn-sm" type="button" data-action="remove-avatar">Xoá ảnh</button>` : ''}
      </form>
    </div>

    <form data-form="profile">
      <div class="form-error" data-error></div>
      <div class="field">
        <label>Tên hiển thị</label>
        <input class="input" name="displayName" maxlength="40" value="${esc(me.display_name)}" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Mật khẩu hiện tại</label>
          <input class="input" type="password" name="currentPassword" autocomplete="current-password" />
        </div>
        <div class="field">
          <label>Mật khẩu mới</label>
          <input class="input" type="password" name="newPassword" autocomplete="new-password" minlength="6" />
        </div>
      </div>
      <p class="hint">Bỏ trống mục mật khẩu nếu chỉ đổi tên hiển thị.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-action="close-modal">Đóng</button>
        <button class="btn btn-primary" type="submit">Lưu thay đổi</button>
      </div>
    </form>

    <div class="profile-section">
      <div class="panel-title"><h3 style="font-size:14px">${icon('award', 15)} Thành tích</h3><span class="subtle" id="ach-count"></span></div>
      <div id="achievements"><div class="loading" style="padding:16px 0"><div class="spinner"></div></div></div>
    </div>

    <div class="profile-section">
      <div class="panel-title"><h3 style="font-size:14px">Lượt ghi điểm gần đây</h3></div>
      <div id="recent-scores"><div class="loading" style="padding:20px 0"><div class="spinner"></div></div></div>
    </div>`);

  try {
    const { scores } = await api('/api/scores/mine');
    const box = document.getElementById('recent-scores');
    if (box) {
      box.innerHTML = scores.length
        ? scores.map((s) => `<div class="roster-row">
            <div style="flex:1;min-width:0">
              <a href="#/games/${encodeURIComponent(s.game_slug)}" style="font-weight:600;font-size:13px">${esc(s.game_title)}</a>
              <div class="subtle" style="font-size:11.5px">${ago(s.created_at)}${s.note ? ` · ${esc(s.note)}` : ''}</div>
            </div>
            <span class="score-value">${fmt(s.value)}</span>
            <button class="icon-btn danger" data-action="delete-score" data-id="${s.id}" data-name="${esc(s.game_title)}" title="Xoá lượt ghi này">${icon('trash', 14)}</button>
          </div>`).join('')
        : '<p class="subtle">Bạn chưa ghi điểm ở game nào.</p>';
    }
  } catch { /* ignore */ }

  try {
    const data = await api('/api/achievements/me');
    const box = document.getElementById('achievements');
    const count = document.getElementById('ach-count');
    if (count) count.textContent = `${data.unlockedCount}/${data.achievements.length}`;
    if (box) renderAchievements(box, data);
  } catch { /* ignore */ }
}

function showFormError(form, message) {
  const box = form.querySelector('[data-error]');
  if (!box) {
    toast(message, 'err');
    return;
  }
  box.textContent = message;
  box.classList.add('show');
}

function go(hash) {
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
}

async function renderRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const segments = path.split('/').filter(Boolean);

  closeModal();
  document.querySelectorAll('.user-menu[open]').forEach((d) => { d.open = false; });
  renderHeader();

  if (!segments.length) {
    window.scrollTo(0, 0);
    return renderHome();
  }
  if (segments[0] === 'games' && segments.length === 2) {
    window.scrollTo(0, 0);
    return renderGame(decodeURIComponent(segments[1]));
  }
  if (segments[0] === 'games') {
    window.scrollTo(0, 0);
    return renderGames();
  }
  if (segments[0] === 'submit') {
    window.scrollTo(0, 0);
    return renderSubmit();
  }
  if (segments[0] === 'leaderboard') {
    window.scrollTo(0, 0);
    return renderLeaderboard();
  }
  if (segments[0] === 'my-games') {
    window.scrollTo(0, 0);
    return renderMyGames();
  }
  if (segments[0] === 'admin') {
    window.scrollTo(0, 0);
    return renderAdmin();
  }
  if (segments[0] === 'login') {
    window.scrollTo(0, 0);
    return renderLogin();
  }
  if (segments[0] === 'register') {
    window.scrollTo(0, 0);
    return renderRegister();
  }

  appRoot().innerHTML = `<div class="wrap"><div style="margin-top:40px">${emptyState({
    title: 'Trang không tồn tại',
    body: 'Đường dẫn này không có trong kho game.',
    cta: '<a class="btn btn-primary btn-sm" href="#/">Về trang chủ</a>',
  })}</div></div>`;
}

async function toggleLike(button) {
  if (!state.me) {
    toast('Đăng nhập để yêu thích game.', 'err');
    go('#/login');
    return;
  }
  const id = button.dataset.id;
  try {
    const res = await api(`/api/games/${id}/like`, { method: 'POST' });
    button.classList.toggle('liked', res.liked);
    button.setAttribute('aria-pressed', String(res.liked));
    button.innerHTML = `${icon(res.liked ? 'heartFill' : 'heart', 16)} <span data-like-count>${res.likes}</span><span class="like-label">yêu thích</span>`;
    toast(res.liked ? 'Đã thêm vào yêu thích.' : 'Đã bỏ yêu thích.');
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function handleRoleChange(select) {
  const id = Number(select.dataset.id);
  const role = select.value;
  try {
    await api(`/api/users/${id}`, { method: 'PATCH', body: { role } });
    toast('Đã cập nhật vai trò.');
    if (state.me?.id === id) {
      const res = await api('/api/auth/me');
      state.me = res.user;
      renderHeader();
      if (!canManage()) {
        go('#/');
        return;
      }
    }
    renderAdmin();
  } catch (err) {
    toast(err.message, 'err');
    renderAdmin();
  }
}

async function handleAction(action, el) {
  switch (action) {
    case 'modal-backdrop':
      return;
    case 'close-modal':
      closeModal();
      return;
    case 'confirm-cancel':
      closeModal();
      return;
    case 'confirm-ok': {
      const resolve = state.confirmResolve;
      state.confirmResolve = null;
      closeModal();
      if (resolve) resolve(true);
      return;
    }
    case 'logout': {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      state.me = null;
      renderHeader();
      toast('Đã đăng xuất.');
      go('#/');
      return;
    }
    case 'profile':
      openProfile();
      return;
    case 'like':
      toggleLike(el);
      return;
    case 'rate': {
      if (!state.me) {
        toast('Đăng nhập để chấm sao.', 'err');
        go('#/login');
        return;
      }
      const value = Number(el.dataset.value);
      await api(`/api/games/${el.dataset.id}/rating`, { method: 'POST', body: { value } });
      toast(`Đã chấm ${value} sao cho game.`);
      const slug = decodeURIComponent((location.hash.split('/')[2] || '').split('?')[0]);
      renderGame(slug, { silent: true, scroll: window.scrollY });
      return;
    }
    case 'report':
      if (!state.me) {
        toast('Đăng nhập để gửi báo cáo.', 'err');
        go('#/login');
        return;
      }
      openReportModal(el.dataset.id, el.dataset.title);
      return;
    case 'delete-comment': {
      const ok = await askConfirm({
        title: 'Xoá bình luận này?',
        body: 'Bình luận sẽ bị xoá vĩnh viễn.',
        confirmLabel: 'Xoá bình luận',
      });
      if (!ok) return;
      await api(`/api/comments/${el.dataset.id}`, { method: 'DELETE' });
      toast('Đã xoá bình luận.');
      renderGame(el.dataset.slug, { silent: true, scroll: window.scrollY });
      return;
    }
    case 'remove-avatar': {
      const res = await api('/api/auth/avatar', { method: 'DELETE' });
      state.me = res.user;
      renderHeader();
      openProfile();
      toast('Đã xoá ảnh đại diện.');
      return;
    }
    case 'resolve-report':
      await api(`/api/reports/${el.dataset.id}`, { method: 'PATCH', body: { status: 'resolved' } });
      toast('Đã đánh dấu báo cáo là đã xử lý.');
      renderAdmin();
      return;
    case 'play':
      openPlayModal(el.dataset.url, el.dataset.title);
      return;
    case 'toggle-theme':
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
      return;
    case 'preview-link':
      previewLink(el);
      return;
    case 'use-preview-image': {
      const form = el.closest('form');
      const preview = form?.querySelector('#link-preview')?._preview;
      const field = form?.querySelector('[name="cover_url"]');
      if (preview?.image && field) {
        field.value = preview.image;
        toast('Đã đặt ảnh từ link làm ảnh bìa.');
      }
      return;
    }
    case 'new-game':
      openGameForm(null);
      return;
    case 'edit-game': {
      try {
        const data = await api(`/api/games/${encodeURIComponent(el.dataset.slug)}`);
        openGameForm(data.game);
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    case 'delete-game': {
      const ok = await askConfirm({
        title: `Xoá "${el.dataset.title}"?`,
        body: 'Game, điểm số, bình luận và file đính kèm sẽ bị xoá vĩnh viễn.',
        confirmLabel: 'Xoá game',
      });
      if (!ok) return;
      try {
        await api(`/api/games/${el.dataset.id}`, { method: 'DELETE' });
        toast('Đã xoá game.');
        go('#/games');
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    case 'add-version': {
      try {
        const data = await api(`/api/games/${encodeURIComponent(el.dataset.slug)}`);
        openVersionForm(data.game);
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    case 'delete-version': {
      const ok = await askConfirm({
        title: `Xoá bản v${el.dataset.version}?`,
        body: 'Ghi chú và file của bản này sẽ bị xoá.',
        confirmLabel: 'Xoá bản này',
      });
      if (!ok) return;
      try {
        await api(`/api/versions/${el.dataset.id}`, { method: 'DELETE' });
        toast('Đã xoá bản cập nhật.');
        renderGame(el.dataset.slug, { silent: true, scroll: window.scrollY });
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    case 'cat': {
      if (!location.hash.startsWith('#/games')) return;
      filters.cat = el.dataset.slug || '';
      document.querySelectorAll('.filter-row .chip').forEach((chip) => {
        chip.classList.toggle('active', (chip.dataset.slug || '') === filters.cat);
      });
      loadGames();
      return;
    }
    case 'delete-category': {
      const ok = await askConfirm({
        title: `Xoá thể loại "${el.dataset.name}"?`,
        body: 'Các game thuộc thể loại này sẽ trở thành "Không phân loại".',
        confirmLabel: 'Xoá thể loại',
      });
      if (!ok) return;
      try {
        await api(`/api/categories/${el.dataset.id}`, { method: 'DELETE' });
        toast('Đã xoá thể loại.');
        renderAdmin();
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    case 'delete-user': {
      const ok = await askConfirm({
        title: `Xoá thành viên "${el.dataset.name}"?`,
        body: 'Toàn bộ điểm số của người này cũng sẽ bị xoá.',
        confirmLabel: 'Xoá thành viên',
      });
      if (!ok) return;
      try {
        await api(`/api/users/${el.dataset.id}`, { method: 'DELETE' });
        toast('Đã xoá thành viên.');
        renderAdmin();
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    case 'delete-score': {
      const ok = await askConfirm({
        title: 'Xoá lượt ghi điểm?',
        body: el.dataset.name ? `Lượt ghi ở ${el.dataset.name} sẽ bị xoá.` : '',
        confirmLabel: 'Xoá',
      });
      if (!ok) return;
      try {
        await api(`/api/scores/${el.dataset.id}`, { method: 'DELETE' });
        toast('Đã xoá lượt ghi điểm.');
        openProfile();
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }
    default:
      return;
  }
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.user-menu')) {
    document.querySelectorAll('.user-menu[open]').forEach((d) => { d.open = false; });
  }

  const backdrop = event.target.closest('.modal-backdrop');
  if (backdrop && event.target === backdrop) {
    closeModal();
    return;
  }

  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'modal-backdrop') return;
  event.preventDefault();
  handleAction(action, el).catch((err) => toast(err.message || 'Có lỗi xảy ra.', 'err'));
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();

  const kind = form.dataset.form;
  const submit = form.querySelector('button[type="submit"]');
  const original = submit ? submit.innerHTML : '';
  const lock = () => {
    if (!submit) return;
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin:0;border-width:2px"></span> Đang lưu…';
  };
  const unlock = () => {
    if (!submit) return;
    submit.disabled = false;
    submit.innerHTML = original;
  };

  const fd = new FormData(form);

  try {
    if (kind === 'login') {
      lock();
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { username: fd.get('username'), password: fd.get('password') },
      });
      state.me = res.user;
      state.needsSetup = false;
      renderHeader();
      toast(`Chào mừng ${res.user.display_name}!`);
      go('#/');
      return;
    }

    if (kind === 'register') {
      lock();
      const res = await api('/api/auth/register', {
        method: 'POST',
        body: {
          username: fd.get('username'),
          displayName: fd.get('displayName'),
          password: fd.get('password'),
        },
      });
      state.me = res.user;
      state.needsSetup = false;
      renderHeader();
      toast(res.wasSetup ? 'Tài khoản quản trị đầu tiên đã sẵn sàng.' : `Chào mừng ${res.user.display_name}!`);
      go('#/');
      return;
    }

    if (kind === 'submit') {
      lock();
      const res = await api('/api/games/submit', { method: 'POST', body: fd });
      toast('Đã đăng game vào kho.');
      go(`#/games/${encodeURIComponent(res.game.slug)}`);
      return;
    }

    if (kind === 'comment') {
      lock();
      await api(`/api/games/${form.dataset.id}/comments`, {
        method: 'POST',
        body: { body: String(fd.get('body') || '') },
      });
      toast('Đã gửi bình luận.');
      renderGame(form.dataset.slug, { silent: true, scroll: window.scrollY });
      return;
    }

    if (kind === 'report') {
      lock();
      await api(`/api/games/${form.dataset.id}/reports`, {
        method: 'POST',
        body: { reason: fd.get('reason'), message: fd.get('message') },
      });
      closeModal();
      toast('Đã gửi báo cáo tới quản trị viên.');
      return;
    }

    if (kind === 'avatar') {
      lock();
      const body = new FormData();
      const file = form.querySelector('input[name="avatar"]')?.files[0];
      if (file) body.append('avatar', file);
      const res = await api('/api/auth/avatar', { method: 'POST', body });
      state.me = res.user;
      renderHeader();
      closeModal();
      openProfile();
      toast('Đã cập nhật ảnh đại diện.');
      return;
    }

    if (kind === 'game') {
      lock();
      const body = new FormData();
      ['title', 'tagline', 'category_id', 'status', 'version', 'description', 'play_url', 'external_url']
        .forEach((key) => body.append(key, fd.get(key) ?? ''));
      const coverUrl = String(fd.get('cover_url') || '').trim();
      if (/^https?:\/\//i.test(coverUrl)) body.append('cover_url', coverUrl);
      const cover = form.querySelector('input[name="cover"]')?.files[0];
      const file = form.querySelector('input[name="file"]')?.files[0];
      if (cover) body.append('cover', cover);
      if (file) body.append('file', file);
      if (fd.get('clear_file') === '1') body.append('clear_file', '1');

      const id = form.dataset.id;
      const isEdit = Boolean(id);
      const res = await api(isEdit ? `/api/games/${id}` : '/api/games', {
        method: isEdit ? 'PATCH' : 'POST',
        body,
      });
      closeModal();
      toast(isEdit ? 'Đã lưu thay đổi.' : 'Đã thêm game mới.');
      if (location.hash.startsWith('#/my-games')) return renderRoute();
      go(`#/games/${encodeURIComponent(res.game.slug)}`);
      return;
    }

    if (kind === 'version') {
      lock();
      const body = new FormData();
      body.append('version', fd.get('version') ?? '');
      body.append('notes', fd.get('notes') ?? '');
      const file = form.querySelector('input[name="file"]')?.files[0];
      if (file) body.append('file', file);

      await api(`/api/games/${form.dataset.id}/versions`, { method: 'POST', body });
      closeModal();
      toast('Đã lưu bản cập nhật.');
      if (location.hash.startsWith('#/my-games')) return renderRoute();
      renderGame(form.dataset.slug, { silent: true, scroll: window.scrollY });
      return;
    }

    if (kind === 'score') {
      lock();
      await api(`/api/games/${form.dataset.gameId}/scores`, {
        method: 'POST',
        body: { value: Number(fd.get('value')), note: fd.get('note') || '' },
      });
      toast('Đã ghi điểm.');
      renderGame(form.dataset.slug, { silent: true, scroll: window.scrollY });
      return;
    }

    if (kind === 'profile') {
      lock();
      const body = { displayName: fd.get('displayName') };
      if (fd.get('newPassword')) {
        body.currentPassword = fd.get('currentPassword');
        body.newPassword = fd.get('newPassword');
      }
      const res = await api('/api/auth/me', { method: 'PATCH', body });
      state.me = res.user;
      renderHeader();
      closeModal();
      toast('Đã cập nhật hồ sơ.');
      return;
    }

    if (kind === 'category') {
      lock();
      await api('/api/categories', {
        method: 'POST',
        body: { name: fd.get('name'), color: fd.get('color') },
      });
      toast('Đã thêm thể loại.');
      renderAdmin();
      return;
    }
  } catch (err) {
    showFormError(form, err.message || 'Có lỗi xảy ra.');
  } finally {
    unlock();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'game-search') {
    filters.q = event.target.value;
    clearTimeout(window.__searchTimer);
    window.__searchTimer = setTimeout(() => {
      if (location.hash.startsWith('#/games')) loadGames();
    }, 260);
    return;
  }

  if (event.target.matches('[data-link-source]')) {
    const input = event.target;
    const value = input.value.trim();
    clearTimeout(window.__previewTimer);
    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(value)) return;
    window.__previewTimer = setTimeout(() => {
      const form = input.closest('form');
      const button = form?.querySelector('[data-action="preview-link"]');
      if (button && form.contains(input)) previewLink(button);
    }, 900);
  }
});

document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.coverTitle) return;
  const fallback = document.createElement('div');
  fallback.className = 'cover-fallback';
  fallback.style.background = img.dataset.coverGrad || gradFor(img.dataset.coverTitle);
  fallback.innerHTML = `<span>${esc(img.dataset.coverInitials || initials(img.dataset.coverTitle))}</span>`;
  img.replaceWith(fallback);
}, true);

document.addEventListener('change', (event) => {
  const target = event.target;

  if (target.id === 'status-filter') {
    filters.status = target.value;
    loadGames();
    return;
  }
  if (target.id === 'sort-filter') {
    filters.sort = target.value;
    loadGames();
    return;
  }
  if (target.id === 'lb-game') {
    loadLeaderboard(target.value);
    return;
  }
  if (target.matches('[data-role-select]')) {
    handleRoleChange(target);
    return;
  }

  if (target.matches('input[name="avatar"][type="file"]')) {
    const file = target.files?.[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast('Ảnh đại diện tối đa 5MB.', 'err');
      target.value = '';
      return;
    }
    if (file) target.closest('form')?.requestSubmit();
    return;
  }

  if (target.matches('.modal input[name="cover"]') || target.matches('.modal input[name="file"]')) {
    const file = target.files?.[0];
    if (file && file.size > 700 * 1024 * 1024) {
      toast('File vượt quá giới hạn 700MB.', 'err');
      target.value = '';
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) closeModal();
  }
});

window.addEventListener('hashchange', () => renderRoute());

async function boot() {
  try {
    const [meRes, stateRes, catsRes] = await Promise.all([
      api('/api/auth/me'),
      api('/api/auth/state'),
      api('/api/categories'),
    ]);
    state.me = meRes.user;
    state.needsSetup = stateRes.needsSetup;
    state.categories = catsRes.categories;
  } catch (err) {
    console.error(err);
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', currentTheme() === 'light' ? '#f3f5fa' : '#07080b');

  renderHeader();

  if (!location.hash) {
    history.replaceState(null, '', '#/');
  }
  renderRoute();
}

boot();
