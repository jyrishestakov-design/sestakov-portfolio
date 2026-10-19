// shesta-failid — private client file zone for shesta.eu
// Cloudflare Worker + R2. You upload at /admin, each client gets /c/<code> behind a password.
//
// R2 layout:
//   c/<code>/_meta.json   { salt, hash, label, created }
//   c/<code>/f/<filename> the files themselves

const PART_SIZE = 50 * 1024 * 1024; // < 100 MB Worker request-body limit
const CLIENT_SESSION_DAYS = 14;
const ADMIN_SESSION_HOURS = 12;
const PBKDF2_ITER = 100000;

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (err) {
      console.error(err);
      return new Response('Viga: ' + (err && err.message ? err.message : 'tundmatu'), { status: 500 });
    }
  },
};

async function route(req, env) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;

  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) {
    return new Response('Seadistamata: lisa ADMIN_PASSWORD ja SESSION_SECRET (wrangler secret put).', { status: 500 });
  }

  if (p === '/') return Response.redirect((env.SITE_URL || 'https://shesta.eu') + '/#files', 302);
  if (p === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n');

  // ---------- admin ----------
  if (p === '/admin' && m === 'GET') {
    return html(await isAdmin(req, env) ? adminPage() : loginPage('Haldus', '/admin/login', ''));
  }
  if (p === '/admin/login' && m === 'POST') {
    const form = await req.formData();
    if (!timingSafeEqual(String(form.get('password') || ''), env.ADMIN_PASSWORD)) {
      await sleep(800);
      return html(loginPage('Haldus', '/admin/login', 'Vale parool.'), 401);
    }
    const exp = Date.now() + ADMIN_SESSION_HOURS * 3600e3;
    const sig = await sign(env, `admin:${exp}`);
    return redirect('/admin', cookie('adm', `${exp}.${sig}`, ADMIN_SESSION_HOURS * 3600, 'Strict'));
  }
  if (p === '/admin/logout') return redirect('/admin', cookie('adm', '', 0, 'Strict'));

  if (p.startsWith('/api/')) {
    if (!(await isAdmin(req, env))) return json({ error: 'Pole sisse logitud' }, 401);
    if (m !== 'GET' && req.headers.get('X-Requested-With') !== 'shesta') return json({ error: 'CSRF' }, 403);
    return api(req, env, url, p, m);
  }

  // ---------- client ----------
  const cm = p.match(/^\/c\/([a-z0-9-]{2,40})(\/.*)?$/);
  if (cm) {
    const slug = cm[1];
    const rest = cm[2] || '';
    const meta = await getMeta(env, slug);
    if (!meta) { await sleep(400); return html(page('Ei leitud', `<p class="lead">Sellist kliendikoodi pole.</p><a class="btn" href="${esc(env.SITE_URL || '/')}/#files">← Tagasi</a>`), 404); }

    if (rest === '/login' && m === 'POST') {
      const form = await req.formData();
      const ok = await verifyPassword(String(form.get('password') || ''), meta);
      if (!ok) { await sleep(800); return html(loginPage(meta.label || slug, `/c/${slug}/login`, 'Vale parool.'), 401); }
      const exp = Date.now() + CLIENT_SESSION_DAYS * 86400e3;
      const sig = await sign(env, `client:${slug}:${exp}:${meta.hash}`);
      return redirect(`/c/${slug}`, cookie(`cs_${slug}`, `${exp}.${sig}`, CLIENT_SESSION_DAYS * 86400, 'Lax'));
    }
    if (rest === '/logout') return redirect(`/c/${slug}`, cookie(`cs_${slug}`, '', 0, 'Lax'));

    const authed = await isClient(req, env, slug, meta);
    if (!authed) return html(loginPage(meta.label || slug, `/c/${slug}/login`, ''), rest ? 401 : 200);

    if (rest === '') return html(clientPage(slug, meta, await listFiles(env, slug)));
    const fm = rest.match(/^\/f\/(.+)$/);
    if (fm && (m === 'GET' || m === 'HEAD')) return download(req, env, slug, decodeURIComponent(fm[1]));
  }

  return new Response('Ei leitud', { status: 404 });
}

// ================= admin API =================
async function api(req, env, url, p, m) {
  if (p === '/api/clients' && m === 'GET') {
    const all = await listAll(env, 'c/');
    const clients = {};
    for (const o of all) {
      const [, slug, kind, ...name] = o.key.split('/');
      clients[slug] = clients[slug] || { slug, files: [] };
      if (kind === 'f') clients[slug].files.push({ name: name.join('/'), size: o.size, uploaded: o.uploaded });
    }
    for (const slug of Object.keys(clients)) {
      const meta = await getMeta(env, slug);
      clients[slug].label = meta ? meta.label : '';
      clients[slug].created = meta ? meta.created : '';
    }
    return json(Object.values(clients).sort((a, b) => String(b.created).localeCompare(String(a.created))));
  }

  if (p === '/api/clients' && m === 'POST') {
    const body = await req.json();
    const slug = String(body.slug || '').toLowerCase().trim();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return json({ error: 'Kood: 2–40 märki, ainult a-z, 0-9 ja -' }, 400);
    if (String(body.password || '').length < 6) return json({ error: 'Parool vähemalt 6 märki' }, 400);
    const old = await getMeta(env, slug);
    const salt = randomB64(16);
    const hash = await pbkdf2(String(body.password), salt);
    const meta = { salt, hash, label: String(body.label || (old && old.label) || ''), created: (old && old.created) || new Date().toISOString() };
    await env.BUCKET.put(`c/${slug}/_meta.json`, JSON.stringify(meta), { httpMetadata: { contentType: 'application/json' } });
    return json({ ok: true, slug, updated: !!old });
  }

  const dc = p.match(/^\/api\/clients\/([a-z0-9-]{2,40})$/);
  if (dc && m === 'DELETE') {
    const objs = await listAll(env, `c/${dc[1]}/`);
    for (let i = 0; i < objs.length; i += 1000) await env.BUCKET.delete(objs.slice(i, i + 1000).map(o => o.key));
    return json({ ok: true, deleted: objs.length });
  }

  if (p === '/api/file' && m === 'DELETE') {
    const key = fileKey(url.searchParams.get('slug'), url.searchParams.get('name'));
    await env.BUCKET.delete(key);
    return json({ ok: true });
  }

  // --- chunked (multipart) upload, so files can be many GB ---
  if (p === '/api/upload/create' && m === 'POST') {
    const body = await req.json();
    if (!(await getMeta(env, body.slug))) return json({ error: 'Klienti pole' }, 404);
    const key = fileKey(body.slug, body.name);
    const mpu = await env.BUCKET.createMultipartUpload(key, {
      httpMetadata: { contentType: body.type || 'application/octet-stream' },
    });
    return json({ key: mpu.key, uploadId: mpu.uploadId, partSize: PART_SIZE });
  }
  if (p === '/api/upload/part' && m === 'PUT') {
    const key = checkKey(url.searchParams.get('key'));
    const n = parseInt(url.searchParams.get('part'), 10);
    const mpu = env.BUCKET.resumeMultipartUpload(key, url.searchParams.get('uploadId'));
    const part = await mpu.uploadPart(n, req.body);
    return json(part);
  }
  if (p === '/api/upload/complete' && m === 'POST') {
    const body = await req.json();
    const mpu = env.BUCKET.resumeMultipartUpload(checkKey(body.key), body.uploadId);
    const obj = await mpu.complete(body.parts);
    return json({ ok: true, size: obj.size });
  }
  if (p === '/api/upload/abort' && m === 'POST') {
    const body = await req.json();
    await env.BUCKET.resumeMultipartUpload(checkKey(body.key), body.uploadId).abort();
    return json({ ok: true });
  }

  return json({ error: 'Tundmatu päring' }, 404);
}

// ================= storage helpers =================
function cleanName(name) {
  const n = String(name || '').replace(/[\\/\x00-\x1f\x7f]/g, '_').replace(/^\.+/, '').trim().slice(0, 200);
  if (!n) throw new Error('Vigane failinimi');
  return n;
}
function fileKey(slug, name) {
  if (!/^[a-z0-9-]{2,40}$/.test(String(slug))) throw new Error('Vigane kood');
  return `c/${slug}/f/${cleanName(name)}`;
}
function checkKey(key) {
  if (!/^c\/[a-z0-9-]{2,40}\/f\/[^/]+$/.test(String(key))) throw new Error('Vigane võti');
  return key;
}
async function getMeta(env, slug) {
  if (!/^[a-z0-9-]{2,40}$/.test(String(slug))) return null;
  const o = await env.BUCKET.get(`c/${slug}/_meta.json`);
  return o ? o.json() : null;
}
async function listAll(env, prefix) {
  const out = []; let cursor;
  do {
    const r = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    out.push(...r.objects);
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  return out;
}
async function listFiles(env, slug) {
  const objs = await listAll(env, `c/${slug}/f/`);
  return objs.map(o => ({ name: o.key.slice(`c/${slug}/f/`.length), size: o.size, uploaded: o.uploaded }))
    .sort((a, b) => b.uploaded - a.uploaded);
}

async function download(req, env, slug, name) {
  const key = fileKey(slug, name);
  const obj = await env.BUCKET.get(key, { range: req.headers, onlyIf: req.headers });
  if (obj === null) return new Response('Faili pole', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', 'private, no-store');
  h.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  if (!('body' in obj)) return new Response(null, { status: 304, headers: h }); // onlyIf not met
  let status = 200;
  if (req.headers.has('range') && obj.range) {
    const off = obj.range.offset ?? (obj.size - obj.range.suffix);
    const len = obj.range.length ?? (obj.size - off);
    h.set('Content-Range', `bytes ${off}-${off + len - 1}/${obj.size}`);
    h.set('Content-Length', String(len));
    status = 206;
  } else {
    h.set('Content-Length', String(obj.size));
  }
  return new Response(req.method === 'HEAD' ? null : obj.body, { status, headers: h });
}

// ================= auth helpers =================
async function hmacKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sign(env, msg) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(msg));
  return b64url(sig);
}
function getCookie(req, name) {
  const c = req.headers.get('Cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : '';
}
async function checkToken(env, token, msgFor) {
  const [exp, sig] = String(token).split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  return timingSafeEqual(sig, await sign(env, msgFor(exp)));
}
async function isAdmin(req, env) {
  return checkToken(env, getCookie(req, 'adm'), exp => `admin:${exp}`);
}
async function isClient(req, env, slug, meta) {
  if (await isAdmin(req, env)) return true; // you can always preview a client's page
  return checkToken(env, getCookie(req, `cs_${slug}`), exp => `client:${slug}:${exp}:${meta.hash}`);
}
async function pbkdf2(password, saltB64) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)), iterations: PBKDF2_ITER },
    key, 256);
  return b64url(bits);
}
async function verifyPassword(password, meta) {
  return timingSafeEqual(await pbkdf2(password, meta.salt), meta.hash);
}
function timingSafeEqual(a, b) {
  const ea = new TextEncoder().encode(String(a)), eb = new TextEncoder().encode(String(b));
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}
function randomB64(n) {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n))));
}
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ================= responses =================
function cookie(name, value, maxAge, sameSite) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}`;
}
function redirect(to, setCookie) {
  const h = new Headers({ Location: to });
  if (setCookie) h.append('Set-Cookie', setCookie);
  return new Response(null, { status: 303, headers: h });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtSize(b) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i ? b.toFixed(1) : b) + ' ' + u[i];
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('et-EE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ================= pages =================
const CSS = `
:root{--bg:#0C0D11;--surface:#161922;--line:#2A2E3B;--ink:#ECE7DD;--ink-dim:#9C9789;--muted:#6C6858;--accent:#F2A43A;--accent-ink:#0C0D11;--cool:#7DACA4;--rec:#E4572E;
--fd:"Bricolage Grotesque","Arial Narrow",system-ui,sans-serif;--fm:"IBM Plex Mono",ui-monospace,Menlo,monospace;--fb:"IBM Plex Sans",system-ui,sans-serif}
@media (prefers-color-scheme:light){:root{--bg:#EDE7DA;--surface:#F6F1E5;--line:#CDC3AC;--ink:#191A1E;--ink-dim:#4C4838;--muted:#847E6A;--accent:#B0701A;--accent-ink:#F6F1E5;--cool:#3A6F67;--rec:#C1401F}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--fb);line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:900px;margin:0 auto;padding:clamp(1.5rem,6vw,4rem) 16px 4rem}
.sig{font-family:var(--fm);font-size:.72rem;letter-spacing:.18em;color:var(--ink-dim);text-decoration:none}.sig b{color:var(--accent)}
.top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:clamp(2rem,6vw,3.5rem)}
.top a.out{font-family:var(--fm);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.k{font-family:var(--fm);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cool)}
h1{font-family:var(--fd);font-weight:800;font-size:clamp(2rem,7vw,3.4rem);line-height:1;letter-spacing:-.02em;margin:.4rem 0 1rem;overflow-wrap:anywhere}
h2{font-family:var(--fd);font-weight:700;font-size:1.3rem;margin:0}
.lead{color:var(--ink-dim);margin:0 0 1.6rem;max-width:52ch}
.btn{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--fm);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;color:var(--accent-ink);background:var(--accent);padding:.7rem 1.1rem;border:0;border-radius:2px;cursor:pointer}
.btn.ghost{background:transparent;color:var(--ink-dim);border:1px solid var(--line)}.btn.danger{background:transparent;color:var(--rec);border:1px solid var(--line)}
.btn:disabled{opacity:.5;cursor:default}
input{font:inherit;font-family:var(--fm);font-size:.9rem;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:2px;padding:.65rem .8rem;min-width:0}
input:focus{outline:2px solid var(--accent);outline-offset:1px}
form.row{display:flex;gap:.5rem;flex-wrap:wrap}form.row input{flex:1 1 12rem}
.err{color:var(--rec);font-family:var(--fm);font-size:.8rem;margin:.8rem 0 0}
.list{border-top:1px solid var(--line)}
.f{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.2rem 1rem;align-items:center;padding:1rem 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit}
a.f:hover .n{color:var(--accent)}
.f .n{font-family:var(--fd);font-weight:600;font-size:1.05rem;overflow-wrap:anywhere;transition:color .15s}
.f .m{font-family:var(--fm);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim)}
.f .g{font-family:var(--fm);font-size:.72rem;letter-spacing:.1em;color:var(--accent);white-space:nowrap;grid-row:span 2}
.f .acts{display:flex;gap:.4rem;grid-row:span 2}.f .acts .btn{padding:.45rem .7rem;font-size:.64rem}
.empty{font-family:var(--fm);font-size:.8rem;color:var(--muted);padding:1rem 0;border-bottom:1px solid var(--line);margin:0}
.card{border:1px solid var(--line);background:var(--surface);padding:1.2rem;margin-bottom:1.2rem}
.card-head{display:flex;justify-content:space-between;align-items:baseline;gap:.8rem;flex-wrap:wrap;margin-bottom:.8rem}
.tools{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.8rem}
.bar{height:4px;background:var(--line);margin:.6rem 0 .2rem;overflow:hidden}.bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .2s}
.prog{font-family:var(--fm);font-size:.7rem;color:var(--ink-dim);min-height:1.1em}
.note{font-family:var(--fm);font-size:.7rem;color:var(--muted);margin-top:2.5rem}
`;

function page(title, body) {
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)} · Šestakov failid</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;
}

function loginPage(name, action, error) {
  return page(name, `
<div class="top"><span class="sig">ŠESTAKOV<b>.</b>WORK</span></div>
<span class="k">● Klienditsoon</span>
<h1>${esc(name)}</h1>
<p class="lead">Sisesta parool, et näha ja alla laadida oma faile.</p>
<form class="row" method="post" action="${esc(action)}">
  <input type="password" name="password" placeholder="parool" aria-label="Parool" required autofocus autocomplete="current-password">
  <button class="btn" type="submit">Sisene →</button>
</form>
${error ? `<p class="err">${esc(error)}</p>` : ''}`);
}

function clientPage(slug, meta, files) {
  const rows = files.length ? files.map(f => `
<a class="f" href="/c/${slug}/f/${encodeURIComponent(f.name)}" download>
  <span class="n">${esc(f.name)}</span><span class="g">↓ Lae alla</span>
  <span class="m">${fmtSize(f.size)} · ${fmtDate(f.uploaded)}</span>
</a>`).join('') : '<p class="empty">Faile veel pole. Annan teada, kui midagi lisan.</p>';
  return page(meta.label || slug, `
<div class="top"><span class="sig">ŠESTAKOV<b>.</b>WORK</span><a class="out" href="/c/${slug}/logout">Logi välja</a></div>
<span class="k">● Klienditsoon · ${files.length} ${files.length === 1 ? 'fail' : 'faili'}</span>
<h1>${esc(meta.label || slug)}</h1>
<p class="lead">Klõpsa failil, et see alla laadida. Suured videofailid võivad võtta aega — katkenud allalaadimist saab jätkata.</p>
<div class="list">${rows}</div>
<p class="note">Küsimused: Jüri-Illimar Reinberg-Šestakov</p>`);
}

function adminPage() {
  return page('Haldus', `
<div class="top"><span class="sig">ŠESTAKOV<b>.</b>WORK · HALDUS</span><a class="out" href="/admin/logout">Logi välja</a></div>
<span class="k">● Klienditsoon</span>
<h1>Failid klientidele</h1>
<div class="card">
  <h2 style="margin-bottom:.8rem">Uus klient / muuda parooli</h2>
  <form class="row" id="newClient">
    <input name="slug" placeholder="kood (nt ood-2026)" required pattern="[a-z0-9-]{2,40}" autocapitalize="none">
    <input name="label" placeholder="nimi lehel (nt Ood armastusele)">
    <input name="password" placeholder="parool (min 6)" required minlength="6">
    <button class="btn" type="submit">Salvesta</button>
  </form>
  <p class="err" id="newErr"></p>
</div>
<div id="clients"><p class="empty">Laen…</p></div>

<script>
const H = { 'X-Requested-With': 'shesta' };
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtSize = b => { const u=['B','KB','MB','GB','TB']; let i=0; while(b>=1024&&i<u.length-1){b/=1024;i++;} return (i?b.toFixed(1):b)+' '+u[i]; };

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  return d;
}

async function load() {
  const list = await api('/api/clients');
  const box = $('#clients');
  if (!list.length) { box.innerHTML = '<p class="empty">Kliente veel pole — lisa esimene ülal.</p>'; return; }
  box.innerHTML = list.map(c => {
    const link = location.origin + '/c/' + c.slug;
    const files = c.files.length ? c.files.map(f => \`
      <div class="f"><span class="n">\${esc(f.name)}</span>
        <span class="acts"><a class="btn ghost" href="/c/\${c.slug}/f/\${encodeURIComponent(f.name)}">↓</a>
        <button class="btn danger" data-del="\${esc(f.name)}" data-slug="\${c.slug}">Kustuta</button></span>
        <span class="m">\${fmtSize(f.size)} · \${new Date(f.uploaded).toLocaleDateString('et-EE')}</span></div>\`).join('')
      : '<p class="empty">Faile pole.</p>';
    return \`<div class="card" data-slug="\${c.slug}">
      <div class="card-head"><h2>\${esc(c.label || c.slug)}</h2><span class="k">kood: \${c.slug}</span></div>
      <div class="tools">
        <label class="btn">+ Lisa failid<input type="file" multiple hidden data-up="\${c.slug}"></label>
        <button class="btn ghost" data-copy="\${esc(link)}">Kopeeri link</button>
        <a class="btn ghost" href="/c/\${c.slug}" target="_blank">Eelvaade</a>
        <button class="btn danger" data-delclient="\${c.slug}">Kustuta klient</button>
      </div>
      <div class="bar" hidden><i></i></div><div class="prog"></div>
      <div class="list">\${files}</div></div>\`;
  }).join('');
}

async function uploadFile(slug, file, card) {
  const bar = $('.bar', card), fill = $('.bar i', card), prog = $('.prog', card);
  bar.hidden = false;
  const { key, uploadId, partSize } = await api('/api/upload/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, name: file.name, type: file.type }) });
  const parts = []; const total = Math.max(1, Math.ceil(file.size / partSize));
  try {
    for (let i = 0; i < total; i++) {
      const blob = file.slice(i * partSize, (i + 1) * partSize);
      let tries = 0, part;
      while (true) {
        try { part = await putPart(key, uploadId, i + 1, blob, loaded => {
          const done = i * partSize + loaded;
          fill.style.width = (done / file.size * 100).toFixed(1) + '%';
          prog.textContent = file.name + ' — ' + fmtSize(done) + ' / ' + fmtSize(file.size);
        }); break; }
        catch (e) { if (++tries >= 3) throw e; await new Promise(r => setTimeout(r, 1500 * tries)); }
      }
      parts.push(part);
    }
    await api('/api/upload/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, parts }) });
  } catch (e) {
    api('/api/upload/abort', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId }) }).catch(() => {});
    throw e;
  }
}

function putPart(key, uploadId, n, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', '/api/upload/part?key=' + encodeURIComponent(key) + '&uploadId=' + encodeURIComponent(uploadId) + '&part=' + n);
    x.setRequestHeader('X-Requested-With', 'shesta');
    x.upload.onprogress = e => onProgress(e.loaded);
    x.onload = () => x.status < 300 ? resolve(JSON.parse(x.responseText)) : reject(new Error('Osa ' + n + ': ' + x.status));
    x.onerror = () => reject(new Error('Võrguviga'));
    x.send(blob);
  });
}

let busy = false;
window.addEventListener('beforeunload', e => { if (busy) { e.preventDefault(); e.returnValue = ''; } });

document.addEventListener('change', async e => {
  const slug = e.target.dataset.up; if (!slug) return;
  const card = e.target.closest('.card'); const files = [...e.target.files];
  busy = true;
  try { for (const f of files) await uploadFile(slug, f, card); await load(); }
  catch (err) { $('.prog', card).textContent = 'Viga: ' + err.message; }
  finally { busy = false; }
});

document.addEventListener('click', async e => {
  const t = e.target;
  if (t.dataset.copy) {
    await navigator.clipboard.writeText(t.dataset.copy).catch(() => prompt('Link:', t.dataset.copy));
    t.textContent = 'Kopeeritud ✓'; setTimeout(() => t.textContent = 'Kopeeri link', 1500);
  }
  if (t.dataset.del && confirm('Kustuta "' + t.dataset.del + '"?')) {
    await api('/api/file?slug=' + t.dataset.slug + '&name=' + encodeURIComponent(t.dataset.del), { method: 'DELETE' });
    load();
  }
  if (t.dataset.delclient && confirm('Kustuta klient "' + t.dataset.delclient + '" koos KÕIGI failidega?')) {
    await api('/api/clients/' + t.dataset.delclient, { method: 'DELETE' });
    load();
  }
});

$('#newClient').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#newErr'); msg.textContent = ''; msg.style.color = '';
  const fd = Object.fromEntries(new FormData(e.target));
  try { const r = await api('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd) });
    msg.style.color = 'var(--cool)';
    msg.textContent = r.updated ? 'Parool muudetud — vanad sisselogimised tühistati.' : 'Klient lisatud: ' + r.slug;
    e.target.reset(); load(); }
  catch (err) { msg.textContent = err.message; }
});

load().catch(err => { $('#clients').innerHTML = '<p class="err">' + esc(err.message) + '</p>'; });
</script>`);
}
