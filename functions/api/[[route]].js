// The Board API (Cloudflare Pages Function).
// Sign-in with Google, member profile + board view, and the founders' CRM.
// Data lives in the Google Sheet "The Board CRM"; reads and writes go through
// a Make "sheet pipe" scenario. Secrets live in the D1 table `config`.
import { DOCS, renderDoc } from '../_docs.js';

const MEMBER_EDITABLE = {
  'Full name': 'name', 'Name in English': 'name_en', 'Gender': 'gender', 'Phone': 'phone', 'City': 'city', 'Company': 'company',
  'Company type': 'company_type', 'Tagline': 'tagline', 'What the business does': 'business', 'Role': 'role',
  'Years in business': 'years', 'Annual revenue': 'revenue', 'Employees': 'employees', 'Website': 'website',
  'Instagram': 'instagram', 'Facebook': 'facebook', 'Main challenge': 'challenge',
  'Personal goals': 'personal_goals', 'Business goals': 'business_goals'
};
const MEMBER_READONLY = { 'Email (Google)': 'email', 'Membership': 'membership', 'Board': 'board', 'Status': 'status', 'Joined': 'joined', 'Logo': 'logo', 'Photo': 'photo', 'NDA signed': 'nda', 'NDA date': 'nda_date', 'Invoice': 'invoice', 'Calendar': 'calendar' };
const MATE_FIELDS = ['name', 'name_en', 'gender', 'phone', 'city', 'company', 'company_type', 'tagline', 'website', 'instagram', 'facebook', 'logo', 'photo', 'role'];
const LEAD_EDITABLE = ['Stage', 'Interested in', 'Board (form)', 'Name', 'Phone', 'Email', 'Company & field', 'Role', 'Owner', 'Call date', 'Next follow-up', 'Deal value (ex VAT)', 'Lost reason', 'Notes', 'Call summary (link)', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'Payment', 'Payment link', 'Invoice'];
const MEMBER_ADMIN = ['Membership', 'Board', 'Status', 'Joined', 'Payment', 'Paid (ex VAT)', 'NDA signed', 'Internal notes', 'Invoice'];
const BOARD_EDITABLE = ['Board', 'Type', 'Start', 'Last session', 'Session dates', 'Head of Board', 'Location', 'Hours', 'WhatsApp group', 'Notes', 'Name in Hebrew (members see this)', 'Chairman (email)'];
const BOARD_EXTRA = ['Chairman (email)'];
// The chairman is picked by an admin in the CRM: a member (by email) or a free-text name in "Head of Board".
function chairOf(b, members) {
  const e = norm(b['Chairman (email)']);
  const m = e && members.find(x => norm(x['Email (Google)']) === e);
  if (m) return { name: m['Full name'] || '', name_en: m['Name in English'] || '', company: m['Company'] || '', role: m['Role'] || '', photo: m['Photo'] || '' };
  return b['Head of Board'] ? { name: b['Head of Board'], company: '', role: '', photo: '' } : null;
}
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

/* ---------- headers, mail, onboarding ---------- */
const LEAD_EXTRA = ['Agreement sent', 'Agreement signed', 'Payment', 'Payment link', 'Invoice'];
const MEMBER_EXTRA = ['NDA date', 'Agreement', 'Invoice', 'Onboarded', 'Name in English'];
async function ensureHeaders(c, tab, t, needed) {
  const missing = needed.filter(h => !t.head.includes(h));
  if (!missing.length) return;
  const start = t.head.length;
  await pipe(c, 'POST', '/values:batchUpdate', { valueInputOption: 'RAW', data: [{ range: `'${tab}'!${colLetter(start)}1`, values: [missing] }] });
  t.head = t.head.concat(missing);
}
async function mail(c, to, subject, html, cc) {
  if (!c.mail_url || !to) return;
  await fetch(c.mail_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: c.pipe_key, to, subject, html: wrapMail(html), cc: cc || [] }) });
}
function wrapMail(inner) {
  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#2B2E42;max-width:560px;margin:0 auto">
<div style="background:#1A1C2C;color:#fff;padding:18px 24px;border-radius:16px 16px 0 0;font-weight:800;letter-spacing:.12em;direction:ltr;text-align:right">THE BOARD</div>
<div style="border:1px solid #DCDCE6;border-top:0;padding:24px;border-radius:0 0 16px 16px">${inner}</div>
<p style="font-size:13px;color:#565A70;text-align:center;margin-top:14px">The Board · <a href="https://the-board.co.il" style="color:#565A70">the-board.co.il</a> · info@the-board.co.il</p></div>`;
}
const btnHtml = (href, label) => `<p style="margin:22px 0"><a href="${href}" style="background:#C6F278;color:#1A1C2C;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:999px;display:inline-block">${label}</a></p>`;
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
async function joinToken(c, email) { return (await hmac(c.session_secret, 'join:' + norm(email))).slice(0, 32); }
async function joinLink(c, email) { return `https://the-board.co.il/join/?e=${encodeURIComponent(email)}&t=${await joinToken(c, email)}`; }
const MEMB_HE = { 'Board': 'בורד', 'Open board': 'אופן בורד', 'Community': 'קהילה' };
function agreementVars(c, lead) {
  const interest = lead['Interested in'] && lead['Interested in'] !== 'Unknown' ? lead['Interested in'] : 'Board';
  const price = lead['Deal value (ex VAT)'] ? `${lead['Deal value (ex VAT)']} ₪` : '4,000 ₪';
  return { operator: c.company_legal || 'The Board (פרטי הישות המשפטית יושלמו לפני החתימה)', membership: MEMB_HE[interest] || interest, board: lead['Board (form)'] || 'ייקבע בתיאום', price };
}
async function maybeOnboard(c, d, lead) {
  // Signed + paid -> becomes a boarder, team gets notified, member gets a welcome email.
  if (!lead['Agreement signed'] || lead['Payment'] !== 'Paid') return false;
  const email = norm(lead['Email']) && String(lead['Email']).toLowerCase();
  await ensureHeaders(c, 'Members', d.Members, MEMBER_EXTRA);
  const existing = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(email));
  const interest = lead['Interested in'] && lead['Interested in'] !== 'Unknown' ? lead['Interested in'] : 'Board';
  const mf = { 'Membership': interest, 'Status': 'Active', 'Payment': 'Paid', 'Paid (ex VAT)': lead['Deal value (ex VAT)'] || '', 'Agreement': lead['Agreement signed'], 'Invoice': lead['Invoice'] || '' };
  if (existing && existing['Onboarded']) return false;
  if (existing) await writeCells(c, 'Members', d.Members.head, existing._row, Object.assign(mf, { 'Onboarded': nowStamp() }));
  else await appendRow(c, 'Members', d.Members.head, Object.assign({
    'Email (Google)': email, 'Full name': lead['Name'], 'Phone': lead['Phone'], 'Company': lead['Company & field'], 'Role': lead['Role'],
    'Years in business': lead['Years in business'], 'Annual revenue': lead['Annual revenue'], 'Main challenge': lead['Main challenge'],
    'Joined': today(), 'NDA signed': 'No', 'Board': '', 'Onboarded': nowStamp()
  }, mf));
  await writeCells(c, 'Leads', d.Leads.head, lead._row, { 'Stage': 'Closed won' });
  const team = (c.team_emails || '').split(',').filter(Boolean);
  await mail(c, team[0], `בורדר חדש: ${lead['Name']} (חתם ושילם)`,
    `<p><b>${escH(lead['Name'])}</b> חתם/ה על ההסכם ושילם/ה. נוצר כרטיס חבר ב-CRM.</p><p>${escH(lead['Company & field'])} · ${escH(lead['Phone'])} · ${escH(email)}</p><p>${escH(lead['Board (form)'] || '')}</p><p>נשאר לשבץ לבורד.</p>${btnHtml('https://the-board.co.il/crm/#members', 'לשיבוץ ב-CRM')}`, team.slice(1));
  await mail(c, email, 'ברוכים הבאים ל-The Board',
    `<p>היי ${escH(firstName(lead['Name']))},</p><p>איזה כיף שהצטרפת! קיבלנו את ההסכם החתום ואת התשלום, והמקום שלך ליד השולחן שמור.</p><p>השלב הבא: נכנסים לאזור החברים עם חשבון ה-Google של הכתובת הזו (<span dir="ltr">${escH(email)}</span>), משלימים את הפרופיל, מעלים תמונה ולוגו וחותמים על הסכם הסודיות. שם גם תראו את הבורד שלכם, את מועדי המפגשים ואת האנשים שיושבים איתכם ליד השולחן.</p>${btnHtml('https://the-board.co.il/members/', 'כניסה לאזור החברים')}<p>חשבונית המס נשלחת אליך בנפרד ותישמר גם באזור החברים.</p><p>נתראה ליד השולחן,<br>נועם, עדי ואיתן</p>`);
  return true;
}

/* ---------- calendar invites ----------
   Every seated member gets one Google Calendar invite per upcoming session of their board,
   sent from the "The Board" calendar on Noam's account (Make scenario 21). They accept (Yes)
   in their own calendar, which is how we know the date works for them. Event ids are
   deterministic (board + date + email), so re-syncing updates instead of duplicating. */
const MEMBER_CAL = ['Calendar'];
async function cal(c, method, path, body) {
  if (!c.cal_url || !c.cal_id) return { status: 0 };
  const r = await fetch(c.cal_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: c.pipe_key, method, url: `/v3/calendars/${encodeURIComponent(c.cal_id)}${path}`, body }) });
  try { return await r.json(); } catch (e) { return { status: 0 }; }
}
async function eventId(board, date, email) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(`${board}|${date}|${norm(email)}`));
  return 'tb' + [...new Uint8Array(h)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
function ymd(d) { const x = parseIL(d); return x ? x.toISOString().slice(0, 10) : ''; }
function upcoming(dates) { const t = today(); return dates.filter(d => { const y = ymd(d); return y && y >= t; }); }
function sessionEvent(b, date, email) {
  const v = boardView(b);
  const [from, to] = (String(v.hours || '').match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/) || [, '10:00', '15:00']).slice(1).map(s => s.padStart(5, '0'));
  const idx = v.dates.indexOf(date) + 1;
  return {
    summary: `The Board · ${v.name}${idx ? ` · מפגש ${idx}` : ''}`,
    location: v.location || '',
    description: `מפגש ${v.name} של The Board.\n\nמיקום: ${v.location || 'יעודכן'}\nשעות: ${from} עד ${to}\n\nנא לאשר את ההזמנה (Yes) כדי שהמפגש יישמר ביומן שלך ונדע שהתאריך פנוי. אם יש התנגשות, כתבו לנו: info@the-board.co.il\n\nחומרי ההכנה למפגש: https://the-board.co.il/members/\n\nמה שקורה בבורד נשאר בבורד.`,
    start: { dateTime: `${ymd(date)}T${from}:00`, timeZone: 'Asia/Jerusalem' },
    end: { dateTime: `${ymd(date)}T${to}:00`, timeZone: 'Asia/Jerusalem' },
    attendees: [{ email }],
    guestsCanInviteOthers: false, guestsCanSeeOtherGuests: false,
    reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 3 * 24 * 60 }, { method: 'popup', minutes: 24 * 60 }] }
  };
}
// Sync one member's invites. prevBoard: the board they were on before (its upcoming invites are cancelled).
// details: true when the board's date, time or location changed (existing invites are updated first).
async function syncMemberCalendar(c, email, boardKey, prevBoardKey, opts = {}) {
  if (!c.cal_url || !c.cal_id || !email) return { sent: 0 };
  const d = await readTabs(c, ['Boards', 'Members']);
  const m = d.Members.rows.find(x => norm(x['Email (Google)']) === norm(email));
  const active = m && m['Status'] !== 'Ended' && m['Status'] !== 'Paused';
  const find = k => d.Boards.rows.find(x => x['Board'] === k);
  const cancel = async (k, dates) => { for (const dt of dates) await cal(c, 'DELETE', `/events/${await eventId(k, dt, email)}?sendUpdates=all`); };
  if (prevBoardKey && prevBoardKey !== boardKey && find(prevBoardKey)) await cancel(prevBoardKey, upcoming(boardView(find(prevBoardKey)).dates));
  if (opts.removedDates && boardKey) await cancel(boardKey, opts.removedDates);
  const b = boardKey && find(boardKey);
  let sent = 0;
  if (b && active) {
    for (const dt of upcoming(boardView(b).dates)) {
      const id = await eventId(boardKey, dt, email), ev = sessionEvent(b, dt, email);
      let r = opts.details ? await cal(c, 'PATCH', `/events/${id}?sendUpdates=all`, Object.assign({}, ev, { status: 'confirmed', attendees: undefined })) : { status: 0 };
      if (r.status !== 200) r = await cal(c, 'POST', `/events?sendUpdates=all`, Object.assign({ id }, ev));
      if (r.status !== 200) r = await cal(c, 'PATCH', `/events/${id}?sendUpdates=all`, Object.assign({}, ev, { status: 'confirmed' })); // invite existed before (e.g. re-seated)
      if (r.status === 200) sent++;
    }
  } else if (b && !active) await cancel(boardKey, upcoming(boardView(b).dates));
  if (m) {
    await ensureHeaders(c, 'Members', d.Members, MEMBER_CAL);
    await writeCells(c, 'Members', d.Members.head, m._row, { 'Calendar': sent ? `${nowStamp()} · ${sent} invites (${boardKey})` : '' });
  }
  return { sent };
}
// Each member's sync runs as its own request (keeps every call well under the per-request limits).
async function queueCalendar(c, context, jobs) {
  const list = jobs.filter(j => j && j.email);
  if (!list.length || !c.cal_url) return;
  const origin = new URL(context.request.url).origin;
  context.waitUntil(Promise.all(list.map(async j => {
    const payload = JSON.stringify(j);
    await fetch(origin + '/api/calsync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: payload, sig: await hmac(c.session_secret, 'cal:' + payload) }) }).catch(() => {});
  })));
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
    if (route === 'boards' && method === 'GET') {
      // Public: board names and their chairman, for the landing page cards.
      const d = await readTabs(c, ['Boards', 'Members']);
      const boards = d.Boards.rows.filter(b => b['Board']).map(b => ({ key: b['Board'], name: b['Name in Hebrew (members see this)'] || b['Board'], chair: chairOf(b, d.Members.rows) }));
      return json({ ok: true, boards }, 200, { 'Cache-Control': 'public, max-age=300' });
    }
    if (route.startsWith('doc/') && method === 'GET') {
      const name = route.slice(4);
      if (!DOCS[name]) return bad('doc', 404);
      return json({ ok: true, doc: renderDoc(name, { operator: c.company_legal || 'The Board' }) });
    }
    if (route === 'join' && (method === 'GET' || method === 'POST')) {
      // Membership agreement, opened from the emailed link (no sign-in needed).
      const u = new URL(request.url);
      const body = method === 'POST' ? await request.json() : {};
      const email = String(body.e || u.searchParams.get('e') || '').toLowerCase();
      const t = body.t || u.searchParams.get('t') || '';
      if (!email || t !== await joinToken(c, email)) return bad('link', 403);
      const d = await readTabs(c, ['Leads', 'Members']);
      await ensureHeaders(c, 'Leads', d.Leads, LEAD_EXTRA);
      const lead = [...d.Leads.rows].reverse().find(l => norm(l['Email']) === norm(email));
      if (!lead) return bad('lead', 404);
      const doc = renderDoc('agreement', agreementVars(c, lead));
      const payLink = lead['Payment link'] || c.payment_link || '';
      if (method === 'GET') return json({ ok: true, name: lead['Name'], company: lead['Company & field'], signed: lead['Agreement signed'] || '', paid: lead['Payment'] === 'Paid', payLink, doc });
      const name = String(body.name || '').trim(), sig = String(body.signature || '');
      if (name.length < 2 || !/^data:image\/png;base64,/.test(sig) || sig.length > 400000 || !body.agree) return bad('sign');
      const stamp = nowStamp();
      await env.DB.prepare('INSERT INTO signatures (doc, version, email, name, id_number, company, signed_at, ip, ua, signature, text_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind('agreement', doc.version, email, name, String(body.id_number || '').slice(0, 20), String(body.company || '').slice(0, 200), stamp, request.headers.get('CF-Connecting-IP') || '', (request.headers.get('User-Agent') || '').slice(0, 300), sig, await sha(JSON.stringify(doc.sections))).run();
      lead['Agreement signed'] = stamp;
      await writeCells(c, 'Leads', d.Leads.head, lead._row, { 'Agreement signed': stamp, 'Stage': lead['Payment'] === 'Paid' ? 'Closed won' : 'Agreement sent' });
      const team = (c.team_emails || '').split(',').filter(Boolean);
      await mail(c, team[0], `ההסכם נחתם: ${lead['Name']}`, `<p><b>${escH(lead['Name'])}</b> חתם/ה על הסכם ההצטרפות (${escH(stamp)}).</p><p>${lead['Payment'] === 'Paid' ? 'התשלום כבר התקבל.' : 'ממתין לתשלום.'}</p>${btnHtml('https://the-board.co.il/crm/', 'ל-CRM')}`, team.slice(1));
      const onboarded = await maybeOnboard(c, d, lead);
      return json({ ok: true, signed: stamp, paid: lead['Payment'] === 'Paid', onboarded, payLink });
    }
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
    if (route === 'calsync' && method === 'POST') {
      // Internal: queued by queueCalendar, signed with the session secret.
      const { job, sig } = await request.json();
      if (!job || sig !== await hmac(c.session_secret, 'cal:' + job)) return bad('sig', 403);
      const j = JSON.parse(job);
      return json(Object.assign({ ok: true }, await syncMemberCalendar(c, j.email, j.board, j.prev, j)));
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
        const ch = b && chairOf(b, d.Members.rows);
        board.head = ch ? ch.name : '';
        if (me['NDA signed'] !== 'Yes') board.whatsapp = '';
        board.members = d.Members.rows.filter(m => m['Board'] === me['Board'] && m['Status'] !== 'Ended').map(m => {
          const v = memberView(m); const o = {}; MATE_FIELDS.forEach(k => { o[k] = v[k]; });
          o.me = norm(m['Email (Google)']) === norm(s.email);
          if (!o.me && me['NDA signed'] !== 'Yes') { o.phone = ''; o.website = ''; o.instagram = ''; o.facebook = ''; }
          return o;
        });
      }
      return json({ ok: true, member: true, admin: s.admin, profile, board });
    }
    if (route === 'member' && method === 'PUT') {
      const body = await request.json();
      const d = await readTabs(c, ['Members']);
      const me = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(s.email));
      if (!me) return bad('not_member', 403);
      await ensureHeaders(c, 'Members', d.Members, MEMBER_EXTRA);
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

    if (route === 'nda' && method === 'POST') {
      const body = await request.json();
      const d = await readTabs(c, ['Members']);
      await ensureHeaders(c, 'Members', d.Members, MEMBER_EXTRA);
      const me = d.Members.rows.find(m => norm(m['Email (Google)']) === norm(s.email));
      if (!me) return bad('not_member', 403);
      const name = String(body.name || '').trim(), sig = String(body.signature || '');
      if (name.length < 2 || !/^data:image\/png;base64,/.test(sig) || sig.length > 400000 || !body.agree) return bad('sign');
      const doc = renderDoc('nda', { operator: c.company_legal || 'The Board' });
      const stamp = nowStamp();
      await env.DB.prepare('INSERT INTO signatures (doc, version, email, name, id_number, company, signed_at, ip, ua, signature, text_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind('nda', doc.version, s.email, name, String(body.id_number || '').slice(0, 20), me['Company'] || '', stamp, request.headers.get('CF-Connecting-IP') || '', (request.headers.get('User-Agent') || '').slice(0, 300), sig, await sha(JSON.stringify(doc.sections))).run();
      await writeCells(c, 'Members', d.Members.head, me._row, { 'NDA signed': 'Yes', 'NDA date': stamp });
      return json({ ok: true, signed: stamp });
    }

    /* ----- admin ----- */
    if (route.startsWith('admin/')) {
      if (!s.admin) return bad('forbidden', 403);
      const r = route.slice(6);
      if (r === 'data' && method === 'GET') {
        const d = await readTabs(c, ['Leads', 'Members', 'Boards', 'Sessions']);
        await ensureHeaders(c, 'Leads', d.Leads, LEAD_EXTRA);
        await ensureHeaders(c, 'Members', d.Members, MEMBER_EXTRA);
        await ensureHeaders(c, 'Boards', d.Boards, BOARD_EXTRA);
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
        const prev = existing ? existing['Board'] : '';
        if (mf['Board'] || prev) await queueCalendar(c, context, [{ email, board: mf['Board'], prev }]);
        return json({ ok: true });
      }
      if (r === 'agreement' && method === 'POST') {
        // Send the membership agreement link to a lead.
        const d = await readTabs(c, ['Leads']);
        await ensureHeaders(c, 'Leads', d.Leads, LEAD_EXTRA);
        const lead = d.Leads.rows.find(l => l._row === +body.row);
        if (!lead) return bad('lead');
        const email = String(body.email || lead['Email'] || '').trim().toLowerCase();
        if (!email) return bad('email');
        const f = { 'Agreement sent': nowStamp(), 'Stage': 'Agreement sent', 'Email': email };
        if (body.amount) f['Deal value (ex VAT)'] = body.amount;
        if (body.interest) f['Interested in'] = body.interest;
        if (body.payLink != null) f['Payment link'] = body.payLink;
        await writeCells(c, 'Leads', d.Leads.head, lead._row, f);
        const link = await joinLink(c, email);
        await mail(c, email, 'הסכם ההצטרפות שלך ל-The Board',
          `<p>היי ${escH(firstName(lead['Name']))},</p><p>שמחנו לדבר! מצורף הקישור להסכם ההצטרפות ל-The Board. קוראים, חותמים דיגיטלית (לוקח שתי דקות), ומיד אחרי זה מגיעים לתשלום.</p>${btnHtml(link, 'לקריאה וחתימה על ההסכם')}<p>יש שאלה? פשוט להשיב למייל הזה.</p><p>נועם, עדי ואיתן</p>`);
        return json({ ok: true, link });
      }
      if (r === 'misfit' && method === 'POST') {
        const d = await readTabs(c, ['Leads']);
        const lead = d.Leads.rows.find(l => l._row === +body.row);
        if (!lead) return bad('lead');
        const reason = String(body.reason || '').trim();
        await writeCells(c, 'Leads', d.Leads.head, lead._row, { 'Stage': 'Not a fit', 'Lost reason': reason });
        if (body.send && lead['Email']) {
          await mail(c, String(lead['Email']).toLowerCase(), 'לגבי ההצטרפות ל-The Board',
            `<p>היי ${escH(firstName(lead['Name']))},</p><p>תודה שמילאת את שאלון ההתאמה ושהקדשת לנו מזמנך.</p><p>אחרי שעברנו על הפרטים, נראה שכרגע אין לנו בורד שמתאים לך${reason ? ', ' + escH(reason) : ''}. אנחנו מקפידים על שולחנות שבהם כל המשתתפים נמצאים בשלב דומה, כדי שכל אחד ירוויח מהשולחן באמת.</p><p>אנחנו פותחים בורדים חדשים כל הזמן, ובהם גם בורדים ענפיים. ברגע שייפתח בורד שמתאים לך, נשמח לחזור אליך.</p><p>בהצלחה בינתיים,<br>נועם, עדי ואיתן<br>The Board</p>`);
        }
        return json({ ok: true });
      }
      if (r === 'paid' && method === 'POST') {
        // Mark a lead as paid (manually until Grow is connected), then onboard if the agreement is signed.
        const d = await readTabs(c, ['Leads', 'Members']);
        await ensureHeaders(c, 'Leads', d.Leads, LEAD_EXTRA);
        const lead = d.Leads.rows.find(l => l._row === +body.row);
        if (!lead) return bad('lead');
        const f = { 'Payment': 'Paid' };
        if (body.invoice) f['Invoice'] = body.invoice;
        if (body.amount) f['Deal value (ex VAT)'] = body.amount;
        await writeCells(c, 'Leads', d.Leads.head, lead._row, f);
        Object.assign(lead, f);
        const onboarded = await maybeOnboard(c, d, lead);
        return json({ ok: true, onboarded, waitingForSignature: !lead['Agreement signed'] });
      }
      if (r === 'member' && method === 'PUT') {
        const d = await readTabs(c, ['Members']);
        const allowed = MEMBER_ADMIN.concat(Object.keys(MEMBER_EDITABLE));
        const f = {}; allowed.forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        await writeCells(c, 'Members', d.Members.head, +body.row, f);
        const was = d.Members.rows.find(m => m._row === +body.row);
        if (was && (('Board' in f && f['Board'] !== was['Board']) || ('Status' in f && f['Status'] !== was['Status']))) {
          await queueCalendar(c, context, [{ email: was['Email (Google)'], board: 'Board' in f ? f['Board'] : was['Board'], prev: was['Board'] }]);
        }
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
        if (f['Board']) await queueCalendar(c, context, [{ email, board: f['Board'] }]);
        return json({ ok: true });
      }
      if (r === 'calendar' && method === 'POST') {
        // Resend / refresh one member's calendar invites (button in the CRM member drawer).
        const d = await readTabs(c, ['Members']);
        const m = d.Members.rows.find(x => x._row === +body.row);
        if (!m || !m['Board']) return bad('board');
        const out = await syncMemberCalendar(c, m['Email (Google)'], m['Board'], '', { details: true });
        return json({ ok: true, sent: out.sent });
      }
      if (r === 'board' && method === 'PUT') {
        const d = await readTabs(c, ['Boards', 'Members']);
        const f = {}; BOARD_EDITABLE.forEach(h => { if (h in body.fields) f[h] = body.fields[h]; });
        if (body.row) await writeCells(c, 'Boards', d.Boards.head, +body.row, f);
        else await appendRow(c, 'Boards', d.Boards.head, f);
        const was = body.row && d.Boards.rows.find(b => b._row === +body.row);
        if (was) {
          const changed = ['Session dates', 'Location', 'Hours', 'Name in Hebrew (members see this)'].some(h => h in f && f[h] !== was[h]);
          if (changed) {
            const now = boardView(Object.assign({}, was, f)).dates;
            const removedDates = upcoming(boardView(was).dates).filter(x => !now.includes(x));
            const seated = d.Members.rows.filter(m => m['Board'] === was['Board'] && m['Status'] !== 'Ended' && m['Email (Google)']);
            await queueCalendar(c, context, seated.map(m => ({ email: m['Email (Google)'], board: was['Board'], details: true, removedDates })));
          }
        }
        return json({ ok: true });
      }
      return bad('not found', 404);
    }
    return bad('not found', 404);
  } catch (err) {
    return json({ ok: false, error: 'server', detail: String(err && err.message || err) }, 500);
  }
}
