export async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options };
  if (opts.body instanceof FormData) {
    delete opts.headers;
  } else if (opts.body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    opts.body = JSON.stringify(opts.body);
  }

  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new Error('Không kết nối được tới máy chủ.');
  }

  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(data?.error || `Lỗi ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}
