// GET /api/sync  -> returns the saved planner data   (header x-app-passcode)
// PUT /api/sync  -> saves the planner data (JSON body {data: {...}})
// Data is encrypted with a key derived from APP_PASSCODE before it is stored in Vercel Blob,
// so the stored file is unreadable without the passcode. Secrets live only in Vercel env vars.
const crypto = require('crypto');
const blob = require('@vercel/blob');

const PATH = 'eya-planner/data.enc.json';
const MAX_BYTES = 1000000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const hits = new Map();

function same(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear();
  return arr.length > MAX_PER_WINDOW;
}
function key(pass, salt) { return crypto.scryptSync(String(pass), salt, 32); }

function encrypt(obj, pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(pass, salt), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: enc.toString('base64') });
}
function decrypt(text, pass) {
  const j = JSON.parse(text);
  const d = crypto.createDecipheriv('aes-256-gcm', key(pass, Buffer.from(j.salt, 'base64')), Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8'));
}

// The store may be private or public; encryption makes either safe. Try private first.
async function store(text) {
  let last;
  for (const access of ['private', 'public']) {
    try { return await blob.put(PATH, text, { access, allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' }); }
    catch (e) { last = e; }
  }
  throw last;
}
async function load() {
  for (const access of ['private', 'public']) {
    try {
      const r = await blob.get(PATH, { access, useCache: false });
      if (r && r.statusCode === 200) return await new Response(r.stream).text();
      if (r === null) continue;
    } catch (e) { /* try the other access mode */ }
  }
  return null;
}

module.exports = async function handler(req, res) {
  const send = (status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(body)); };
  const pass = process.env.APP_PASSCODE;
  if (!pass) return send(503, { error: 'not_configured' });
  if (req.method !== 'GET' && req.method !== 'PUT') return send(405, { error: 'method_not_allowed' });
  if (!same(req.headers['x-app-passcode'] || '', pass)) return send(401, { error: 'bad_passcode' });
  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (limited(ip)) return send(429, { error: 'rate_limited' });

  try {
    if (req.method === 'GET') {
      const text = await load();
      if (!text) return send(200, { data: null });
      return send(200, { data: decrypt(text, pass) });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
    const data = body && body.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.students)) return send(400, { error: 'bad_data' });
    const text = encrypt(data, pass);
    if (Buffer.byteLength(text) > MAX_BYTES) return send(413, { error: 'too_large' });
    await store(text);
    return send(200, { ok: true, savedAt: Date.now() });
  } catch (e) {
    return send(500, { error: 'server_error' });
  }
};
