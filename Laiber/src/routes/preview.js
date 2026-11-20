import { Router } from 'express';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { clampText, httpError, isHttpUrl, rateLimiter } from '../util.js';

const router = Router();

const limiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 40 });
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 200;
const MAX_BYTES = 600 * 1024;
const MAX_REDIRECTS = 4;

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127
      || (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
      || (p[0] === 169 && p[1] === 254)
      || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
      || (p[0] === 192 && p[1] === 168)
      || (p[0] === 198 && (p[1] === 18 || p[1] === 19))
      || p[0] >= 224;
  }
  const low = ip.toLowerCase();
  return low === '::' || low === '::1'
    || low.startsWith('fc') || low.startsWith('fd')
    || low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')
    || low.startsWith('::ffff:');
}

async function resolveSafe(hostname) {
  const host = hostname.toLowerCase();
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/.test(host)) {
    throw httpError(400, 'Không hỗ trợ link trỏ vào mạng nội bộ.');
  }
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw httpError(400, 'Không hỗ trợ link trỏ vào mạng nội bộ.');
    return { address: host, family: net.isIPv4(host) ? 4 : 6 };
  }
  let list;
  try {
    list = await dns.promises.lookup(host, { all: true });
  } catch {
    throw httpError(400, 'Không tìm thấy máy chủ của link này.');
  }
  if (!list.length) throw httpError(400, 'Không tìm thấy máy chủ của link này.');
  if (list.some((item) => isPrivateAddress(item.address))) {
    throw httpError(400, 'Không hỗ trợ link trỏ vào mạng nội bộ.');
  }
  return list[0];
}

function requestPage(target, address) {
  return new Promise((resolve, reject) => {
    const secure = target.protocol === 'https:';
    const options = {
      protocol: target.protocol,
      host: address,
      hostname: address,
      port: target.port || (secure ? 443 : 80),
      path: `${target.pathname}${target.search}` || '/',
      method: 'GET',
      headers: {
        host: target.host,
        'user-agent': 'Mozilla/5.0 (compatible; Laiber-link-preview/1.0)',
        accept: 'text/html,application/xhtml+xml',
        'accept-encoding': 'identity',
        'accept-language': 'vi,en;q=0.8',
      },
      timeout: 8000,
      autoSelectFamily: false,
    };
    if (secure) options.servername = target.hostname;

    const req = (secure ? https : http).request(options, (res) => {
      const status = res.statusCode || 0;
      const headers = res.headers;

      if (status >= 300 && status < 400 && headers.location) {
        res.resume();
        return resolve({ status, headers, location: headers.location });
      }

      const type = String(headers['content-type'] || '');
      if (!/text\/html|application\/xhtml/i.test(type) || status >= 400) {
        res.resume();
        return resolve({ status, headers, html: '', contentType: type });
      }

      const chunks = [];
      let size = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve({ status, headers, html: Buffer.concat(chunks).toString('utf8'), contentType: type });
      };
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size <= MAX_BYTES) chunks.push(chunk);
        else res.destroy();
      });
      res.on('end', finish);
      res.on('close', finish);
      res.on('error', finish);
    });

    req.on('timeout', () => req.destroy(new Error('Hết thời gian kết nối tới trang.')));
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function fetchPage(startUrl) {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isHttpUrl(current.href)) throw httpError(400, 'Link phải là http hoặc https.');
    const { address } = await resolveSafe(current.hostname);
    const res = await requestPage(current, address);
    if (res.location) {
      current = new URL(res.location, current);
      continue;
    }
    return { finalUrl: current, res };
  }
  throw httpError(400, 'Link chuyển hướng quá nhiều lần.');
}

function getAttr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const match = tag.match(re);
  if (!match) return '';
  return match[1] ?? match[2] ?? match[3] ?? '';
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function cleanText(value, max) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function absoluteUrl(value, base) {
  if (!value) return '';
  try {
    const url = new URL(decodeEntities(value), base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function embedInfo(headers) {
  const xfo = String(headers['x-frame-options'] || '').toLowerCase();
  const csp = String(headers['content-security-policy'] || '').toLowerCase();
  if (xfo.includes('deny') || xfo.includes('sameorigin')) {
    return { embeddable: false, reason: 'Trang chặn nhúng bằng X-Frame-Options.' };
  }
  const frameAncestors = csp.match(/frame-ancestors([^;]*)/);
  if (frameAncestors && !frameAncestors[1].includes('*')) {
    return { embeddable: false, reason: 'Trang giới hạn nguồn được nhúng bằng CSP.' };
  }
  return { embeddable: true, reason: '' };
}

function parseHtml(html, pageUrl) {
  const metas = {};
  const metaRe = /<meta\b[^>]*>/gi;
  let match;
  while ((match = metaRe.exec(html))) {
    const tag = match[0];
    const key = (getAttr(tag, 'property') || getAttr(tag, 'name')).toLowerCase();
    const content = getAttr(tag, 'content');
    if (key && content && !metas[key]) metas[key] = content;
  }

  let icon = '';
  const linkRe = /<link\b[^>]*>/gi;
  while ((match = linkRe.exec(html))) {
    const rel = getAttr(match[0], 'rel').toLowerCase();
    const href = getAttr(match[0], 'href');
    if (rel.includes('icon') && href) {
      icon = absoluteUrl(href, pageUrl);
      if (rel.includes('apple-touch')) break;
    }
  }

  const rawTitle = metas['og:title'] || metas['twitter:title']
    || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const rawDesc = metas['og:description'] || metas['twitter:description'] || metas.description || '';
  const rawImage = metas['og:image:secure_url'] || metas['og:image']
    || metas['twitter:image'] || metas['twitter:image:src'] || '';

  return {
    title: cleanText(rawTitle, 160),
    description: cleanText(rawDesc, 300),
    image: absoluteUrl(rawImage, pageUrl),
    icon,
    siteName: cleanText(metas['og:site_name'] || '', 80),
  };
}

function screenshotUrl(pageUrl) {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(pageUrl)}?w=1200&h=750`;
}

async function inspect(rawUrl) {
  const cached = cache.get(rawUrl);
  if (cached && cached.expires > Date.now()) return cached.data;

  let page;
  try {
    page = await fetchPage(rawUrl);
  } catch (err) {
    if (err.status) throw err;
    throw httpError(400, 'Không mở được link này. Kiểm tra lại địa chỉ hoặc thử link khác.');
  }

  const { finalUrl, res } = page;
  const isHtml = Boolean(res.html) && /text\/html|application\/xhtml/i.test(res.contentType || '');
  const embed = isHtml ? embedInfo(res.headers) : { embeddable: false, reason: 'Link không phải trang web có thể nhúng.' };

  let meta = { title: '', description: '', image: '', icon: '', siteName: '' };
  if (isHtml) meta = parseHtml(res.html, finalUrl.href);

  const fallbackTitle = (() => {
    try {
      const parts = finalUrl.pathname.split('/').filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] || finalUrl.hostname);
    } catch {
      return finalUrl.hostname;
    }
  })();

  const image = meta.image || (isHtml ? screenshotUrl(finalUrl.href) : '');
  const data = {
    url: finalUrl.href,
    host: finalUrl.host,
    title: meta.title || fallbackTitle || finalUrl.host,
    description: meta.description,
    image,
    imageSource: meta.image ? 'og' : (image ? 'screenshot' : 'none'),
    icon: meta.icon,
    siteName: meta.siteName,
    embeddable: embed.embeddable,
    embedReason: embed.reason,
    kind: isHtml ? 'page' : 'file',
    contentType: res.contentType || '',
  };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(rawUrl, { expires: Date.now() + CACHE_TTL, data });
  return data;
}

router.get('/link-preview', async (req, res, next) => {
  try {
    if (!limiter(req.ip || req.socket.remoteAddress || 'unknown')) {
      throw httpError(429, 'Bạn đã xem trước link quá nhiều lần. Thử lại sau ít phút.');
    }
    const raw = clampText(req.query.url, 800);
    if (!raw) throw httpError(400, 'Thiếu link cần xem trước.');
    if (!isHttpUrl(raw)) throw httpError(400, 'Link phải bắt đầu bằng http:// hoặc https://.');
    const data = await inspect(raw);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
