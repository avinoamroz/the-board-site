// The Board API (Cloudflare Pages Function).
// Sign-in with Google, member profile + board view, and the founders' CRM.
// Data lives in the Google Sheet "The Board CRM"; reads and writes go through
// a Make "sheet pipe" scenario. Secrets live in the D1 table `config`.

const MEMBER_EDITABLE = {
  'Full name': 'name', 'Gender': 'gender', 'Phone': 'phone', 'City': 'city', 'Company': 'company',
  'Company type': 'company_type', 'Tagline': 'tagline', 'What the business does': 'business', 'Role': 'role',
  'Years in business': 'years', 'Annual revenue': 'revenue', 'Employees': 'employees', 'Website': 'website',
  'Instagram': 'instagram', 'Facebook': 'facebook', 'Main challenge': 'challenge',
  'Personal goals': 'personal_goals', 'Business goals': 'business_goals'
};
const MEMBER_READONLY = { 'Email (Google)': 'email', 'Membership': 'membership', 'Board': 'board', 'Status': 'status', 'Joined': 'joined', 'Logo': 'logo', 'Photo': 'photo' };
const MATE_FIELDS = ['name', 'gender', 'phone', 'city', 'company', 'company_type', 'tagline', 'website', 'instagram', 'facebook', 'logo', 'photo', 'role'];
const LEAD_EDITABLE = ['Stage', 'Interested in', 'Board (form)', 'Name', 'Phone', 'Email', 'Company & field', 'Role', 'Owner', 'Call date', 'Next follow-up', 'Deal value (ex VAT)', 'Lost reason', 'Notes', 'Call summary (link)', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const MEMBER_ADMIN = ['Membership', 'Board', 'Status', 'Joined', 'Payment', 'Paid (ex VAT)', 'NDA signed', 'Internal notes'];
const BOARD_EDITABLE = ['Board', 'Type', 'Start', 'Last session', 'Session dates', 'Head of Board', 'Location', 'Hours', 'WhatsApp group', 'Notes', 'Name in Hebrew (members see this)'];
const COOKIE = 'tb_s';
const MAX_AGE = 60 * 60 * 24 * 30;

let cfgCache = null;
async function cfg(env) {
  if (cfgCache && cfgCache.t > Date.now() - 60000) return cfgCache.v;
  const { results } = await env.DB.prepare('SELECT key, value FROM config').all();
  const v = {}; results.forEach(r => { v[r.key] = r.value; });
  cfgCache = { t: Date.now(), v };
  return v;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

function norm(email) {
  let e = String(email || '').trim().toLowerCase();
  const [u, d] = e.split('@');
  if (d === 'gmail.com' || d === 'googlemail.com') e = u.split('+')[0].replace(/\./g, '') + '@gmail.com';
  return e;
}

/* ---------- session ---------- */
const enc = new TextEncoder();
function b64u(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64uStr(s) { return b64u(enc.encode(s)); }
function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0))); }
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function sha(s) { return b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))).slice(0, 24); }

async function readSession(request, c) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [p, sig] = m[1].split('.');
  if (!p || !sig || sig !== await hmac(c.session_secret, p)) return null;
  const s = JSON.parse(unb64u(p));
  if (s.exp < Date.now()) return null;
  s.admin = (c.admins || '').split(',').map(norm).includes(norm(s.email));
  return s;
}
async function makeCookie(s, c) {
  const p = b64uStr(JSON.stringify(s));
  return `${COOKIE}=${p}.${await hmac(c.session_secret, p)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

/* ---------- sheet pipe ---------- */
async function pipe(c, method, path, body) {
  const r = await fetch(c.pipe_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: c.pipe_key, method, url: `spreadsheets/${c.sheet_id}${path}`, body }) });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch (e) { throw new Error('pipe ' + r.status + ' ' + t.slice(0, 120)); }
  if (d && d.error) throw new Error('sheets ' + JSON.stringify(d.error).slice(0, 200));
  return d;
}
async function readTabs(c, tabs) {
  const qs = tabs.map(t => 'ranges=' + encodeURIComponent(`'${t}'!A1:AZ5000`)).join('&');
  const d = await pipe(c, 'GET', `/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`);
  const out = {};
  (d.valueRanges || []).forEach((vr, i) => {
    const rows = vr.values || [];
    const head = rows[0] || [];
    out[tabs[i]] = { head, rows: rows.slice(1).map((r, j) => { const o = { _row: j + 2 }; head.forEach((h, k) => { o[h] = r[k] == null ? '' : String(r[k]); }); return o; }) };
  });
  return out;
}
function colLetter(n) { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
async function writeCells(c, tab, head, row, fields) {
  const data = [];
  Object.keys(fields).forEach(h => {
    const i = head.indexOf(h);
    if (i < 0) return;
    data.push({ range: `'${tab}'!${colLetter(i)}${row}`, values: [[clean(fields[h])]] });
  });
  if (!data.length) return;
  await pipe(c, 'POST', '/values:batchUpdate', { valueInputOption: 'RAW', data });
}
async function appendRow(c, tab, head, fields) {
  const row = head.map(h => (fields[h] == null ? '' : clean(fields[h])));
  await pipe(c, 'POST', `/values/${encodeURIComponent(`'${tab}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { values: [row] });
}
function clean(v) { return String(v == null ? '' : v).slice(0, 3000); }
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const nowStamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' }).slice(0, 16);

/* ---------- boards ---------- */
function parseIL(d) { const m = String(d).trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/); if (!m) return null; let y = +m[3]; if (y < 100) y += 2000; return new Date(Date.UTC(y, m[2] - 1, m[1])); }
function boardView(b) {
  const dates = String(b['Session dates'] || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const t = new Date(); t.setUTCHours(0, 0, 0, 0);
  const next = dates.find(d => { const x = parseIL(d); return x && x >= t; }) || '';
  return { key: b['Board'], name: b['Name in Hebrew (members see this)'] || b['Board'], type: b['Type'], start: b['Start'], end: b['Last session'], dates, next, head: b['Head of Board'], location: b['Location'], hours: b['Hours'], whatsapp: b['WhatsApp group'] };
}
function memberView(m) {
  const o = {};
  Object.entries(MEMBER_EDITABLE).forEach(([h, k]) => { o[k] = m[h] || ''; });
  Object.entries(MEMBER_READONLY).forEach(([h, k]) => { o[k] = m[h] || ''; });
  return o;
}

/* ---------- images ---------- */
async function saveImage(env, c, kind, email, dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('image');
  if (m[2].length > 700000) throw new Error('image too large');
  const id = kind + '-' + await sha(kind + norm(email) + c.session_secret);
  await env.DB.prepare('INSERT OR REPLACE INTO images (id, mime, data, updated) VALUES (?, ?, ?, ?)').bind(id, m[1], m[2], nowStamp()).run();
  return `https://the-board.co.il/api/img/${id}?v=${Date.now().toString(36)}`;
}

/* ---------- handlers ---------- */
export async function onRequest(context) {
  const { request, env, params } = context;
  const route = (params.route || []).join('/');
  const method = request.method;
  try {
    const c = await cfg(env);
    if (route.startsWith('img/') && method === 'GET') {
      const row = await env.DB.prepare('SELECT mime, data FROM images WHERE id = ?').bind(route.slice(4)).first();
      if (!row) return new Response('not found', { status: 404 });
      return new Response(Uint8Array.from(atob(row.data), ch => ch.charCodeAt(0)), { headers: { 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (route === 'config' && method === 'GET') return json({ client_id: c.client_id });
    if (route === 'login' && method === 'POST') {
      const { credential } = await request.json();
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential || ''));
      if (!r.ok) return bad('auth', 401);
      const p = await r.json();
      if (p.aud !== c.client_id || String(p.email_verified) !== 'true') return bad('auth', 401);
      const s = { email: String(p.email).toLowerCase(), name: p.name || '', picture: p.picture || '', exp: Date.now() + MAX_AGE * 1000 };
      const admin = (c.admins || '').split(',').map(norm).includes(norm(s.email));
      return json({ ok: true, email: s.email, name: s.name, picture: s.picture, admin }, 200, { 'Set-Cookie': await makeCookie(s, c) });
    }
    if (route === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });

    const s = await readSession(request, c);
    if (!s) return bad('auth', 401);
    if (route === 'me') return json({ ok: true, email: s.email, name: s.name, picture: s.picture, admin: s.admin });

    /* ----- member ----- */
    if (route === 'member' && method === 'GET') {
      const d = await readTabs(c, ['Members', 'Boards', 'Leads']);
      const me = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(s.email));
      if (!me) {
        const lead = [...d.Leads.rows].reverse().find(l => norm(l['Email']) === norm(s.email));
        return json({ ok: true, member: false, email: s.email, name: (lead && lead['Name']) || s.name, admin: s.admin });
      }
      const profile = memberView(me);
      const lead = [...d.Leads.rows].reverse().find(l => norm(l['Email']) === norm(s.email));
      if (lead) {
        const fill = { name: 'Name', phone: 'Phone', role: 'Role', years: 'Years in business', revenue: 'Annual revenue', challenge: 'Main challenge', business: 'Company & field' };
        Object.entries(fill).forEach(([k, h]) => { if (!profile[k] && lead[h]) profile[k] = lead[h]; });
      }
      if (!profile.name) profile.name = s.name;
      if (!profile.photo && s.picture) profile.photo = s.picture;
      let board = null;
      if (me['Board']) {
        const b = d.Boards.rows.find(x => x['Board'] === me['Board']);
        board = b ? boardView(b) : { key: me['Board'], name: me['Board'], dates: [] };
        board.members = d.Members.rows.filter(m => m['Board'] === me['Board'] && m['Status'] !== 'Ended').map(m => {
          const v = memberView(m); const o = {}; MATE_FIELDS.forEach(k => { o[k] = v[k]; });
          o.me = norm(m['Email (Google)']) === norm(s.email); return o;
        });
      }
      return json({ ok: true, member: true, admin: s.admin, profile, board });
    }
    if (route === 'member' && method === 'PUT') {
      const body = await request.json();
      const d = await readTabs(c, ['Members']);
      const me = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(s.email));
      if (!me) return bad('not_member', 403);
      const f = {};
      Object.entries(MEMBER_EDITABLE).forEach(([h, k]) => { if (k in body) f[h] = body[k]; });
      f['Profile updated'] = nowStamp();
      if (!me['Photo'] && s.picture) f['Photo'] = s.picture;
      await writeCells(c, 'Members', d.Members.head, me._row, f);
      return json({ ok: true });
    }
    if (route === 'upload' && method === 'POST') {
      const { kind, data, email } = await request.json();
      if (!['photo', 'logo'].includes(kind)) return bad('kind');
      const target = (s.admin && email) ? email : s.email;
      const d = await readTabs(c, ['Members']);
      const me = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(target));
      if (!me) return bad('not_member', 403);
      const url = await saveImage(env, c, kind, target, data);
      await writeCells(c, 'Members', d.Members.head, me._row, { [kind === 'photo' ? 'Photo' : 'Logo']: url });
      return json({ ok: true, url });
    }

    /* ----- admin ----- */
    if (route.startsWith('admin/')) {
      if (!s.admin) return bad('forbidden', 403);
      const r = route.slice(6);
      if (r === 'data' && method === 'GET') {
        const d = await readTabs(c, ['Leads', 'Members', 'Boards', 'Sessions']);
        return json({ ok: true, leads: d.Leads.rows, members: d.Members.rows, boards: d.Boards.rows, sessions: d.Sessions.rows, heads: { leads: d.Leads.head, members: d.Members.head, boards: d.Boards.head } });
      }
      const body = method === 'GET' ? {} : await request.json();
      if (r === 'lead' && method === 'PUT') {
        const d = await readTabs(c, ['Leads']);
        const f = {}; LEAD_EDITABLE.forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        await writeCells(c, 'Leads', d.Leads.head, +body.row, f);
        return json({ ok: true });
      }
      if (r === 'lead' && method === 'POST') {
        const d = await readTabs(c, ['Leads']);
        const f = {}; LEAD_EDITABLE.forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        f['Date'] = today(); f['Time'] = nowStamp().slice(11);
        f['Stage'] = f['Stage'] || 'New lead'; f['Owner'] = f['Owner'] || 'Adi';
        if (f['Email']) f['Email'] = String(f['Email']).toLowerCase();
        await appendRow(c, 'Leads', d.Leads.head, f);
        return json({ ok: true });
      }
      if (r === 'close' && method === 'POST') {
        // Closed won: update the lead, then create or update the member and seat them on a board.
        const d = await readTabs(c, ['Leads', 'Members']);
        const lead = d.Leads.rows.find(l => l._row === +body.row);
        if (!lead) return bad('lead');
        const email = String(body.email || lead['Email'] || '').toLowerCase();
        if (!email) return bad('email');
        await writeCells(c, 'Leads', d.Leads.head, lead._row, { 'Stage': 'Closed won', 'Deal value (ex VAT)': body.amount || lead['Deal value (ex VAT)'], 'Email': email });
        const mf = { 'Membership': body.membership || 'Board', 'Board': body.board || '', 'Status': 'Active', 'Payment': body.payment || 'Awaiting payment', 'Paid (ex VAT)': body.amount || '' };
        const existing = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(email));
        if (existing) {
          await writeCells(c, 'Members', d.Members.head, existing._row, mf);
        } else {
          await appendRow(c, 'Members', d.Members.head, Object.assign({
            'Email (Google)': email, 'Full name': lead['Name'], 'Phone': lead['Phone'], 'Company': lead['Company & field'],
            'Role': lead['Role'], 'Years in business': lead['Years in business'], 'Annual revenue': lead['Annual revenue'],
            'Main challenge': lead['Main challenge'], 'Joined': today(), 'NDA signed': 'No'
          }, mf));
        }
        return json({ ok: true });
      }
      if (r === 'member' && method === 'PUT') {
        const d = await readTabs(c, ['Members']);
        const allowed = MEMBER_ADMIN.concat(Object.keys(MEMBER_EDITABLE));
        const f = {}; allowed.forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        await writeCells(c, 'Members', d.Members.head, +body.row, f);
        return json({ ok: true });
      }
      if (r === 'member' && method === 'POST') {
        const d = await readTabs(c, ['Members']);
        const email = String(body.fields['Email (Google)'] || '').toLowerCase();
        if (!email) return bad('email');
        if (d.Members.rows.some(m => norm(m['Email (Google)']) === norm(email))) return bad('exists');
        const f = { 'Email (Google)': email, 'Joined': today(), 'Status': 'Active' };
        MEMBER_ADMIN.concat(Object.keys(MEMBER_EDITABLE)).forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        await appendRow(c, 'Members', d.Members.head, f);
        return json({ ok: true });
      }
      if (r === 'board' && method === 'PUT') {
        const d = await readTabs(c, ['Boards']);
        const f = {}; BOARD_EDITABLE.forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        if (body.row) await writeCells(c, 'Boards', d.Boards.head, +body.row, f);
        else await appendRow(c, 'Boards', d.Boards.head, f);
        return json({ ok: true });
      }
      return bad('not found', 404);
    }
    return bad('not found', 404);
  } catch (err) {
    return json({ ok: false, error: 'server', detail: String(err && err.message || err) }, 500);
  }
}
