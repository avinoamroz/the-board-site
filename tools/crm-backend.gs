/**
 * The Board CRM backend (Google Apps Script web app).
 * - setup(): builds the CRM tabs in the spreadsheet (run once).
 * - doPost(): member area API for https://the-board.co.il/members
 *   Every request carries a Google ID token; we verify it with Google,
 *   then read or write only the row that belongs to that email.
 */

var CONFIG = {
  SHEET_ID: '1j96wEuywg5_pTyoH0FD_3VKD2XlrjFG3Zp-K9RfGpR4',
  CLIENT_ID: '993256252993-6degreh8e2051i6p16bh15d7vudfhtkj.apps.googleusercontent.com',
  TZ: 'Asia/Jerusalem'
};

var TAB = {
  LEADS: 'Leads',
  MEMBERS: 'Members',
  BOARDS: 'Boards',
  SESSIONS: 'Sessions',
  UTM: 'UTM links',
  SUMMARY: 'Summary'
};

var STAGES = ['New lead', 'Call scheduled', 'Call done', 'Follow-up', 'Closed won', 'Closed lost'];
var INTEREST = ['Board', 'Open board', 'Community', 'Unknown'];
var MEMBERSHIP = ['Board', 'Open board', 'Community'];

var LEAD_HEADERS = [
  'Date', 'Time', 'Stage', 'Interested in', 'Board (form)', 'Name', 'Phone', 'Email', 'Company & field', 'Role',
  'Years in business', 'Annual revenue', 'Main challenge', 'Will share numbers', 'Can commit to 1st Friday',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'Referrer', 'Landing page', 'First visit', 'Owner', 'Call date', 'Next follow-up',
  'Deal value (ex VAT)', 'Lost reason', 'Notes', 'Call summary (link)', 'First touch source'
];

// key, header, editable by the member
var MEMBER_FIELDS = [
  ['email', 'Email (Google)', false],
  ['name', 'Full name', true],
  ['phone', 'Phone', true],
  ['company', 'Company', true],
  ['business', 'What the business does', true],
  ['role', 'Role', true],
  ['years', 'Years in business', true],
  ['revenue', 'Annual revenue', true],
  ['employees', 'Employees', true],
  ['website', 'Website', true],
  ['instagram', 'Instagram', true],
  ['linkedin', 'LinkedIn', true],
  ['city', 'City', true],
  ['challenge', 'Main challenge', true],
  ['personal_goals', 'Personal goals', true],
  ['business_goals', 'Business goals', true],
  ['membership', 'Membership', false],
  ['board', 'Board', false],
  ['status', 'Status', false],
  ['joined', 'Joined', false],
  ['payment', 'Payment', false],
  ['amount', 'Paid (ex VAT)', false],
  ['nda', 'NDA signed', false],
  ['internal', 'Internal notes', false],
  ['updated', 'Profile updated', false],
  ['photo', 'Photo', false]
];
var HIDDEN_FROM_MEMBER = { internal: 1, amount: 1 };

var BOARD_HEADERS = ['Board', 'Type', 'Start', 'Last session', 'Session dates', 'Head of Board', 'Location', 'Hours', 'WhatsApp group', 'Notes', 'Name in Hebrew (members see this)'];
var SESSION_HEADERS = ['Date', 'Board', 'Member email', 'Name', 'Attendance', 'Homework', 'Hot seat', 'Personal progress (1-5)', 'Business progress (1-5)', 'Notes'];
var UTM_HEADERS = ['What it is for', 'Destination', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'Ready link'];

/* ---------------- setup ---------------- */

function setup() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var navy = '#1A1C2C', lime = '#C6F278';

  function tab(name, headers, widths) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.setRightToLeft(false);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground(navy).setFontColor('#FFFFFF').setWrap(true).setVerticalAlignment('middle');
    sh.setFrozenRows(1);
    sh.setRowHeight(1, 36);
    (widths || []).forEach(function (w, i) { if (w) sh.setColumnWidth(i + 1, w); });
    return sh;
  }
  function list(sh, col, values, rows) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
    sh.getRange(2, col, rows || 1000, 1).setDataValidation(rule);
  }

  // Leads and deals
  var L = tab(TAB.LEADS, LEAD_HEADERS, [90, 60, 120, 100, 150, 140, 110, 190, 190, 120, 100, 110, 220, 90, 90, 100, 100, 110, 100, 90, 150, 150, 110, 90, 100, 100, 100, 140, 260, 160]);
  list(L, 3, STAGES);
  list(L, 4, INTEREST);
  list(L, 24, ['Adi', 'Noam', 'Ethan']);
  var stageRange = L.getRange('C2:C1000');
  var colors = {'New lead': '#E8E6F7', 'Call scheduled': '#FFF4CC', 'Call done': '#FFE3B3', 'Follow-up': '#FFD6A5', 'Closed won': '#D9F7B0', 'Closed lost': '#F3D4D4'};
  var rules = Object.keys(colors).map(function (k) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(colors[k]).setRanges([stageRange]).build();
  });
  L.setConditionalFormatRules(rules);

  // Members
  var M = tab(TAB.MEMBERS, MEMBER_FIELDS.map(function (f) { return f[1]; }),
    [200, 140, 110, 150, 220, 120, 100, 110, 90, 150, 130, 150, 90, 220, 220, 220, 100, 150, 90, 100, 100, 110, 80, 240, 130, 80]);
  list(M, colIndex('membership'), MEMBERSHIP);
  list(M, colIndex('status'), ['Active', 'Paused', 'Ended']);
  list(M, colIndex('payment'), ['Paid', 'Partially paid', 'Awaiting payment']);
  list(M, colIndex('nda'), ['Yes', 'No']);
  var boardRule = SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRange("'" + TAB.BOARDS + "'!A2:A100"), true).setAllowInvalid(true).build();
  M.getRange(2, colIndex('board'), 1000, 1).setDataValidation(boardRule);

  // Boards
  var B = tab(TAB.BOARDS, BOARD_HEADERS, [150, 120, 90, 100, 320, 160, 140, 100, 220, 200, 200]);
  list(B, 2, ['Foundations board', 'Open board', 'Sector board']);
  B.getRange('C2:E100').setNumberFormat('@');
  if (B.getLastRow() < 2) {
    B.getRange(2, 1, 4, 11).setValues([
      ['December board', 'Foundations board', '4.12.26', '7.5.27', '4.12.26, 1.1.27, 5.2.27, 5.3.27, 2.4.27, 7.5.27', '', 'Tel Aviv', '10:00-15:00', '', '', 'בורד דצמבר'],
      ['January board', 'Foundations board', '1.1.27', '4.6.27', '1.1.27, 5.2.27, 5.3.27, 2.4.27, 7.5.27, 4.6.27', '', 'Tel Aviv', '10:00-15:00', '', '', 'בורד ינואר'],
      ['February board', 'Foundations board', '5.2.27', '2.7.27', '5.2.27, 5.3.27, 2.4.27, 7.5.27, 4.6.27, 2.7.27', '', 'Tel Aviv', '10:00-15:00', '', '', 'בורד פברואר'],
      ['March board', 'Foundations board', '5.3.27', '6.8.27', '5.3.27, 2.4.27, 7.5.27, 4.6.27, 2.7.27, 6.8.27', '', 'Tel Aviv', '10:00-15:00', '', '', 'בורד מרץ']
    ]);
  }

  // Sessions and attendance
  var S = tab(TAB.SESSIONS, SESSION_HEADERS, [100, 150, 200, 140, 110, 90, 80, 120, 120, 300]);
  S.getRange(2, 2, 1000, 1).setDataValidation(boardRule);
  list(S, 5, ['Attended', 'No show', 'Excused']);
  list(S, 6, ['Submitted', 'Partial', 'Not submitted']);
  list(S, 7, ['Yes', 'No']);
  list(S, 8, ['1', '2', '3', '4', '5']);
  list(S, 9, ['1', '2', '3', '4', '5']);
  var names = [];
  for (var r = 2; r <= 500; r++) names.push(['=IF(C' + r + '="","",IFERROR(INDEX(\'' + TAB.MEMBERS + '\'!B:B,MATCH(LOWER(C' + r + '),ARRAYFORMULA(LOWER(\'' + TAB.MEMBERS + '\'!A:A)),0)),""))']);
  S.getRange(2, 4, names.length, 1).setFormulas(names).setFontColor('#565A70');

  // UTM link builder
  var U = tab(TAB.UTM, UTM_HEADERS, [200, 200, 110, 100, 130, 120, 110, 520]);
  if (U.getLastRow() < 2) {
    var site = 'https://the-board.co.il/';
    U.getRange(2, 1, 12, 7).setValues([
      ['Instagram: bio link', site, 'meta', 'ig', 'organic', 'bio', 'theboard'],
      ['Instagram: reel (rename term)', site, 'meta', 'ig', 'organic', 'reel', 'reel_name'],
      ['Instagram: post (rename term)', site, 'meta', 'ig', 'organic', 'post', 'post_name'],
      ['Instagram: story (rename term)', site, 'meta', 'ig', 'organic', 'story', 'story_name'],
      ['Instagram: DM', site, 'meta', 'ig', 'organic', 'dm', 'theboard'],
      ['Facebook: post', site, 'meta', 'fb', 'organic', 'post', 'post_name'],
      ['LinkedIn: post', site, 'linkedin', 'linkedin', 'organic', 'post', 'post_name'],
      ['WhatsApp: share', site, 'whatsapp', 'whatsapp', 'organic', 'share', 'theboard'],
      ['Email / newsletter', site, 'email', 'email', 'newsletter', 'email_name', 'theboard'],
      ['Partner (replace partner_name)', site, 'partner_name', 'partner', 'organic', 'placement', 'theboard'],
      ['Shooglis', site, 'shooglis', 'partner', 'organic', 'site', 'theboard'],
      ['BizDev (Noam personally)', site, 'bizdev', 'bizdev', 'bizdev', 'bizdev', 'bizdev']
    ]);
  }
  var links = [];
  for (var u = 2; u <= 300; u++) {
    links.push(['=IF(OR(B' + u + '="",C' + u + '=""),"",B' + u + '&IF(ISNUMBER(SEARCH("?",B' + u + ')),"&","?")&"utm_source="&LOWER(TRIM(C' + u + '))&"&utm_medium="&LOWER(TRIM(D' + u + '))&"&utm_campaign="&LOWER(TRIM(E' + u + '))&"&utm_content="&LOWER(TRIM(F' + u + '))&"&utm_term="&LOWER(TRIM(G' + u + ')))']);
  }
  U.getRange(2, 8, links.length, 1).setFormulas(links).setFontColor('#4A3FB8');

  // Summary
  var Y = tab(TAB.SUMMARY, ['Metric', 'Value'], [260, 120]);
  var rows = [['Leads by stage', '']];
  STAGES.forEach(function (s) { rows.push([s, '=COUNTIF(\'' + TAB.LEADS + '\'!C:C,"' + s + '")']); });
  rows.push(['Total leads', '=COUNTA(\'' + TAB.LEADS + '\'!F2:F)']);
  rows.push(['Close rate', '=IFERROR(COUNTIF(\'' + TAB.LEADS + '\'!C:C,"Closed won")/COUNTA(\'' + TAB.LEADS + '\'!F2:F),0)']);
  rows.push(['', '']);
  rows.push(['Leads by source', '']);
  [['meta (Instagram / Facebook)', 'P', 'meta'], ['linkedin', 'P', 'linkedin'], ['whatsapp', 'P', 'whatsapp'], ['email', 'P', 'email'],
   ['Partners (medium = partner)', 'Q', 'partner'], ['bizdev', 'P', 'bizdev'], ['google', 'P', 'google']].forEach(function (s) {
    rows.push([s[0], '=COUNTIF(\'' + TAB.LEADS + '\'!' + s[1] + ':' + s[1] + ',"' + s[2] + '")']);
  });
  rows.push(['Direct / no source', '=COUNTA(\'' + TAB.LEADS + '\'!F2:F)-COUNTA(\'' + TAB.LEADS + '\'!P2:P)']);
  rows.push(['', '']);
  rows.push(['Active members', '=COUNTIF(\'' + TAB.MEMBERS + '\'!S:S,"Active")']);
  MEMBERSHIP.forEach(function (m) { rows.push(['Members: ' + m, '=COUNTIFS(\'' + TAB.MEMBERS + '\'!Q:Q,"' + m + '",\'' + TAB.MEMBERS + '\'!S:S,"Active")']); });
  Y.getRange(2, 1, rows.length, 2).setValues(rows);
  Y.getRange('B2:B100').setHorizontalAlignment('center');
  [2, 12, 22].forEach(function (r) { Y.getRange(r, 1, 1, 2).setFontWeight('bold').setBackground('#E8E9EE'); });
  Y.getRange('B10').setNumberFormat('0%');

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  [TAB.LEADS, TAB.MEMBERS, TAB.BOARDS, TAB.SESSIONS, TAB.UTM, TAB.SUMMARY].forEach(function (n, i) {
    ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1);
  });
  return 'ok';
}

function colIndex(key) {
  for (var i = 0; i < MEMBER_FIELDS.length; i++) if (MEMBER_FIELDS[i][0] === key) return i + 1;
  throw new Error('no field ' + key);
}

/* ---------------- API ---------------- */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var user = verify(body.credential);
    if (!user) return out({ ok: false, error: 'auth' });
    if (body.action === 'get') return out(getProfile(user));
    if (body.action === 'save') return out(saveProfile(user, body.profile || {}));
    return out({ ok: false, error: 'action' });
  } catch (err) {
    return out({ ok: false, error: 'server', detail: String(err && err.message || err) });
  }
}

function doGet() {
  return out({ ok: true, service: 'the-board-members' });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function verify(token) {
  if (!token) return null;
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  var p = JSON.parse(res.getContentText());
  if (p.aud !== CONFIG.CLIENT_ID) return null;
  if (String(p.email_verified) !== 'true') return null;
  if (Number(p.exp) * 1000 < Date.now()) return null;
  return { email: String(p.email).toLowerCase(), name: p.name || '', picture: p.picture || '' };
}

function sheet(name) { return SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(name); }

function findMember(email) {
  var sh = sheet(TAB.MEMBERS);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var values = sh.getRange(2, 1, last - 1, MEMBER_FIELDS.length).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email) return { row: i + 2, values: values[i] };
  }
  return null;
}

function latestLead(email) {
  var sh = sheet(TAB.LEADS);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var v = sh.getRange(2, 1, last - 1, LEAD_HEADERS.length).getDisplayValues();
  for (var i = v.length - 1; i >= 0; i--) {
    if (String(v[i][7]).trim().toLowerCase() === email) {
      return { name: v[i][5], phone: v[i][6], business: v[i][8], role: v[i][9], years: v[i][10], revenue: v[i][11], challenge: v[i][12] };
    }
  }
  return null;
}

function getProfile(user) {
  var m = findMember(user.email);
  if (!m) {
    var lead = latestLead(user.email);
    return { ok: true, member: false, email: user.email, name: (lead && lead.name) || user.name };
  }
  var profile = {};
  MEMBER_FIELDS.forEach(function (f, i) { if (!HIDDEN_FROM_MEMBER[f[0]]) profile[f[0]] = m.values[i]; });
  var lead = latestLead(user.email);
  if (lead) {
    ['name', 'phone', 'role', 'years', 'revenue', 'challenge'].forEach(function (k) { if (!profile[k] && lead[k]) profile[k] = lead[k]; });
    if (!profile.business && lead.business) profile.business = lead.business;
  }
  if (!profile.name) profile.name = user.name;
  if (user.picture && m.values[colIndex('photo') - 1] !== user.picture) {
    sheet(TAB.MEMBERS).getRange(m.row, colIndex('photo')).setValue(user.picture);
  }
  profile.photo = user.picture || profile.photo;
  return { ok: true, member: true, profile: profile, board: boardInfo(profile.board, user.email) };
}

function boardInfo(name, email) {
  if (!name) return null;
  var B = sheet(TAB.BOARDS);
  var last = B.getLastRow();
  var info = null;
  if (last >= 2) {
    var v = B.getRange(2, 1, last - 1, BOARD_HEADERS.length).getDisplayValues();
    for (var i = 0; i < v.length; i++) {
      if (v[i][0] === name) {
        info = { name: v[i][10] || v[i][0], type: v[i][1], start: v[i][2], end: v[i][3], dates: splitDates(v[i][4]), head: v[i][5], location: v[i][6], hours: v[i][7], whatsapp: v[i][8] };
        break;
      }
    }
  }
  if (!info) info = { name: name, dates: [] };
  info.next = nextDate(info.dates);
  var M = sheet(TAB.MEMBERS);
  var lm = M.getLastRow();
  var mates = [];
  if (lm >= 2) {
    var mv = M.getRange(2, 1, lm - 1, MEMBER_FIELDS.length).getDisplayValues();
    var bi = colIndex('board') - 1, si = colIndex('status') - 1, ci = colIndex('company') - 1, pi = colIndex('photo') - 1;
    mv.forEach(function (r) {
      if (r[bi] === name && r[si] !== 'Ended') {
        mates.push({ name: r[1], company: r[ci], photo: r[pi], me: String(r[0]).trim().toLowerCase() === email });
      }
    });
  }
  info.members = mates;
  return info;
}

function splitDates(s) {
  return String(s || '').split(/[,\n;]+/).map(function (x) { return x.trim(); }).filter(String);
}

function parseIL(d) {
  var m = String(d).match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
  if (!m) return null;
  var y = Number(m[3]); if (y < 100) y += 2000;
  return new Date(y, Number(m[2]) - 1, Number(m[1]));
}

function nextDate(dates) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  for (var i = 0; i < dates.length; i++) {
    var d = parseIL(dates[i]);
    if (d && d >= today) return dates[i];
  }
  return '';
}

function saveProfile(user, p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var m = findMember(user.email);
    if (!m) return { ok: false, error: 'not_member' };
    var sh = sheet(TAB.MEMBERS);
    var row = m.values.slice();
    MEMBER_FIELDS.forEach(function (f, i) {
      if (f[2] && Object.prototype.hasOwnProperty.call(p, f[0])) {
        var val = String(p[f[0]] == null ? '' : p[f[0]]).slice(0, 2000);
        if (/^[=+\-@]/.test(val)) val = "'" + val;
        row[i] = val;
      }
    });
    row[colIndex('updated') - 1] = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm');
    var editable = [];
    MEMBER_FIELDS.forEach(function (f, i) { if (f[2] || f[0] === 'updated') editable.push(i); });
    editable.forEach(function (i) { sh.getRange(m.row, i + 1).setValue(row[i]); });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
