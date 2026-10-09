/* Aya's Lesson Planner — phone app. Planning engine ported from the design. */
var SCHOOL = { lat: 24.7658335, lng: 46.6944546 };
var WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
var WORK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
var FULL = { Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
var AR_DAY = { Sat: 'السبت', Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة' };
var START = 14 * 60, LIMIT = 20 * 60, EARLY_LIMIT = 19 * 60, BUFFER = 10;
var CL = {
  west: { label: 'West', color: '#1D5FA8', tint: '#E6EFFA' },
  far: { label: 'Far west', color: '#5B3FC4', tint: '#EEEAFB' },
  east: { label: 'East', color: '#B4500A', tint: '#FBEEE4' },
  north: { label: 'North', color: '#0B7468', tint: '#E3F2EF' },
  pending: { label: 'Location pending', color: '#5F6672', tint: '#EDEEF0' }
};
var SEED = [
  { id: 'abdulilah', name: 'Abdulilah', per: 3, dur: 1, cluster: 'far', area: 'West / NW Riyadh', lat: 24.900791, lng: 46.441021, km: 29.7, late: true, phone: '0555866235', fixed: ['Sat', 'Thu', 'Fri'], note: 'Fixed days: Saturday, Thursday and Friday. Can take the 7–8 PM slot.', map: 'https://maps.google.com/?q=24.900791,46.441021' },
  { id: 'jazi', name: 'Jazi', per: 3, dur: 1, cluster: 'west', area: 'West, close to school', lat: 24.770063, lng: 46.630829, km: 6.4, map: 'https://maps.google.com/?q=24.770063,46.630829' },
  { id: 'wahoub', name: 'Wahoub', per: 3, dur: 1, cluster: 'west', area: 'West / SW of school', lat: 24.785006, lng: 46.575111, km: 12.2, map: 'https://maps.google.com/?q=24.785006,46.575111' },
  { id: 'lynn', name: 'Lynn', per: 2, dur: 1, cluster: 'west', area: 'NW, close-west', lat: 24.833565, lng: 46.64291, km: 9.2, before: 17 * 60, map: 'https://maps.google.com/?q=24.833565,46.642910' },
  { id: 'rose', name: 'Rose', per: 3, dur: 1, cluster: 'north', area: 'Al Sahafah (approx.)', lat: 24.8065, lng: 46.6385, km: null, map: 'https://maps.app.goo.gl/NYDYghhGph7nUYz89?g_st=ic', durChoice: true },
  { id: 'lulwa', name: 'Lulwa', per: 3, dur: 1, cluster: 'north', area: 'Al Qirawan', lat: 24.862, lng: 46.612, km: null, map: 'https://maps.app.goo.gl/msV96mfUppFcS7PXA' }
];
var KEY = 'aya-planner-v2';
var DEF = { students: null, refused: {}, dur: {}, marks: {}, after: {}, extra: {}, before: {}, durDay: {}, traffic: {}, dayStart: {}, phones: {}, lang: 'ar', approvedSig: '' };
var S = load();
var UI = { tab: 'today', viewDay: null, copied: '', editing: undefined };

function load() {
  var s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  var o = {};
  Object.keys(DEF).forEach(function (k) { o[k] = s[k] !== undefined ? s[k] : (DEF[k] && typeof DEF[k] === 'object' ? JSON.parse(JSON.stringify(DEF[k])) : DEF[k]); });
  if (!o.students) o.students = JSON.parse(JSON.stringify(SEED));
  return o;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------- helpers ---------- */
var STUDENTS = [], BY = {};
function sync() {
  STUDENTS = S.students.filter(function (s) { return !s.hold; });
  BY = {};
  S.students.forEach(function (s) { BY[s.id] = s; });
}
function fmt(m) { var h = Math.floor(m / 60), mi = m % 60; return (h % 12 || 12) + ':' + (mi < 10 ? '0' : '') + mi + ' ' + (h >= 12 ? 'PM' : 'AM'); }
function fmtAr(m) { var h = Math.floor(m / 60), mi = m % 60; return (h % 12 || 12) + ':' + (mi < 10 ? '0' : '') + mi + (h >= 12 ? ' م' : ' ص'); }
function waLink(phone, text) {
  var n = String(phone || '').replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.indexOf('05') === 0) n = '966' + n.slice(1);
  else if (n.length === 9 && n.charAt(0) === '5') n = '966' + n;
  return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
}
function phoneOf(s) { return S.phones[s.id] || s.phone || ''; }
function parseLoc(v) {
  v = (v || '').trim();
  var m = v.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/) || v.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}
function mapLink(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  var p = parseLoc(v);
  return p ? 'https://maps.google.com/?q=' + p.lat + ',' + p.lng : 'https://maps.google.com/?q=' + encodeURIComponent(v);
}
function hav(a, b) {
  var R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function drive(a, b) {
  if (a.lat == null || b.lat == null) return 20;
  return Math.max(5, Math.round((hav(a, b) * 1.35 / 35 * 60) / 5) * 5);
}

/* ---------- planning engine ---------- */
function durOf(id, dur, day) { return (day && S.durDay[day + '|' + id]) || (dur && dur[id]) || BY[id].dur || 1; }
function defStart(day) { return day === 'Sat' ? 10 * 60 : (day === 'Fri' ? 12 * 60 : START); }
function startOf(day) { return S.dayStart[day] || defStart(day); }
function beforeOf(id) { var v = S.before[id]; if (v === undefined) v = BY[id].before || 0; return v; }
function perms(a) {
  if (a.length <= 1) return [a.slice()];
  var out = [];
  a.forEach(function (x, i) { perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); });
  return out;
}
function walk(order, dur, day) {
  var cur = SCHOOL, t = startOf(day), stops = [], ok = true, sum = 0;
  order.forEach(function (id) {
    var d = Math.round(drive(cur, BY[id]) * (S.traffic[day] || 1) / 5) * 5 + BUFFER;
    var arrive = t + d, start = Math.max(arrive, S.after[id] || 0);
    if (day === 'Sat' || day === 'Fri') start = Math.ceil(start / 30) * 30;
    var end = start + durOf(id, dur, day) * 60;
    stops.push({ id: id, drive: d, wait: start - arrive, start: start, end: end });
    var lim = BY[id].late ? LIMIT : EARLY_LIMIT;
    if (beforeOf(id)) lim = Math.min(lim, beforeOf(id));
    if (end > lim) ok = false;
    sum += d; t = end; cur = BY[id];
  });
  return { stops: stops, end: t, ok: ok, driveSum: sum };
}
function route(ids, dur, day) {
  var best = null;
  perms(ids).forEach(function (p) {
    var r = walk(p, dur, day);
    if (!best || (r.ok && !best.ok) || (r.ok === best.ok && (r.end < best.end || (r.end === best.end && r.driveSum < best.driveSum)))) best = r;
  });
  return best || { stops: [], end: startOf(day), ok: true, driveSum: 0 };
}
function affinity(a, b) {
  if (a === b) return 3;
  var m = { 'far-west': 1, 'north-west': 1, 'east-far': -5, 'east-west': -3, 'east-north': -1, 'far-north': -1 };
  return m[[a, b].sort().join('-')] || 0;
}
function allowedDays(s) {
  var r = S.refused[s.id] || [];
  return (s.fixed || WORK).filter(function (d) { return r.indexOf(d) < 0; });
}
function buildPlan() {
  var plan = {}, missing = [];
  WEEK.forEach(function (d) { plan[d] = []; });
  Object.keys(S.extra).forEach(function (id) {
    if (!BY[id] || BY[id].hold) return;
    S.extra[id].forEach(function (d) { if (plan[d] && plan[d].indexOf(id) < 0) plan[d].push(id); });
  });
  STUDENTS.slice().sort(function (a, b) {
    return ((a.fixed ? 0 : 1) - (b.fixed ? 0 : 1)) || (allowedDays(a).length - allowedDays(b).length) || (b.per - a.per);
  }).forEach(function (s) {
    var allowed = allowedDays(s);
    var placed = WEEK.filter(function (d) { return plan[d].indexOf(s.id) >= 0; }).length;
    for (var k = placed; k < s.per; k++) {
      var best = null, bs = -1e9;
      allowed.forEach(function (d) {
        if (plan[d].indexOf(s.id) >= 0) return;
        if (!route(plan[d].concat(s.id), S.dur, d).ok) return;
        var sc = -2 * plan[d].length;
        plan[d].forEach(function (o) { sc += affinity(s.cluster || 'pending', BY[o].cluster || 'pending'); });
        var i = WEEK.indexOf(d);
        [i - 1, i + 1].forEach(function (j) { var dd = WEEK[j]; if (dd && dd !== 'Fri' && plan[dd].indexOf(s.id) >= 0) sc -= 4; });
        if (sc > bs) { bs = sc; best = d; }
      });
      if (best) { plan[best].push(s.id); placed++; }
    }
    if (placed < s.per) missing.push(s.name + ': ' + (s.per - placed) + ' session(s) left out — too many refused days or those afternoons are full. Try freeing a day.');
  });
  WORK.forEach(function (d) {
    if (plan[d].length && !route(plan[d], S.dur, d).ok) missing.push(FULL[d] + ' runs late — check the times or move someone.');
  });
  return { plan: plan, missing: missing };
}

/* ---------- tiny DOM helpers ---------- */
function h(tag, cls, kids, attrs) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  (Array.isArray(kids) ? kids : kids == null ? [] : [kids]).forEach(function (k) {
    if (k == null || k === false) return;
    e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
  });
  if (attrs) Object.keys(attrs).forEach(function (a) { e[a] = attrs[a]; });
  return e;
}
function btn(text, cls, fn, on) {
  var b = h('button', (cls || '') + (on ? ' on' : ''), text, { type: 'button' });
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.onclick = fn;
  return b;
}
function a(text, cls, href) {
  var e = h('a', cls + (href ? '' : ' off'), text);
  if (href) { e.href = href; e.target = '_blank'; e.rel = 'noopener'; }
  return e;
}
function chg(fn) { fn(); save(); render(); }
function copy(text, key) { try { navigator.clipboard.writeText(text); } catch (e) {} UI.copied = key; render(); }

/* ---------- views ---------- */
function stopCard(x, day, big) {
  var s = BY[x.id], c = CL[s.cluster || 'pending'] || CL.pending, key = day + '|' + x.id, done = !!S.marks[key];
  var card = h('div', 'stop' + (done ? ' done' : ''), null);
  card.style.borderLeftColor = c.color;
  card.appendChild(h('div', 'drive', '↓ ' + (x.drive - BUFFER) + ' min drive + ' + BUFFER + ' min parking' + (x.wait > 0 ? ' · ' + x.wait + ' min spare' : '')));
  card.appendChild(h('div', 'time', fmt(x.start) + ' – ' + fmt(x.end)));
  card.appendChild(h('div', 'name', [s.name, (S.extra[x.id] || []).indexOf(day) >= 0 ? h('span', 'tag', 'MUST COME') : null]));
  card.appendChild(h('div', 'sub', s.area || ''));
  if (s.durChoice) {
    var l = h('div', 'chips', [h('span', 'lbl', 'Length:')]);
    [1, 2].forEach(function (n) {
      l.appendChild(btn(n + 'h', 'chip', function () { chg(function () { S.durDay[day + '|' + x.id] = n; }); }, durOf(x.id, S.dur, day) === n));
    });
    card.appendChild(l);
  }
  var act = h('div', 'actions', [
    a('Map', 'map', mapLink(s.map)),
    a('On my way', 'wa', waLink(phoneOf(s), 'السلام عليكم حبيبتي، أنا في الطريق وبوصل الساعة ' + fmtAr(x.start) + ' تقريباً إن شاء الله')),
    a('I’ve arrived', 'wa', waLink(phoneOf(s), 'السلام عليكم حبيبتي، وصلت وأنا عند الباب')),
    btn(done ? 'Done ✓' : 'Mark done', 'donebtn', function () {
      chg(function () { if (S.marks[key]) delete S.marks[key]; else S.marks[key] = true; });
    }, done)
  ]);
  card.appendChild(act);
  return card;
}
function dayRoute(plan, d) { return route(plan[d], S.dur, d); }

function viewToday(root, plan) {
  var JS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], real = JS[new Date().getDay()];
  var vd = UI.viewDay || real;
  var pick = h('div', 'chips scroll');
  WEEK.forEach(function (d) { pick.appendChild(btn(d + (d === real ? ' •' : ''), 'chip', function () { UI.viewDay = d; render(); }, d === vd)); });
  root.appendChild(pick);
  var r = dayRoute(plan, vd);
  root.appendChild(h('h2', '', (vd === real ? 'Today · ' : '') + FULL[vd]));
  if (!r.stops.length) { root.appendChild(h('p', 'empty', 'No lessons this day — enjoy your afternoon.')); return; }
  root.appendChild(h('p', 'sub', r.stops.length + ' lesson(s) · leave school ' + fmt(startOf(vd))));
  r.stops.forEach(function (x) { root.appendChild(stopCard(x, vd)); });
  root.appendChild(h('p', 'sub', 'Last lesson ends ' + fmt(r.end)));
}

function viewWeek(root, built) {
  var plan = built.plan, planned = 0, req = 0, latest = null, done = Object.keys(S.marks).length;
  STUDENTS.forEach(function (s) { req += Math.max(s.per, (S.extra[s.id] || []).length); });
  WEEK.forEach(function (d) { var r = dayRoute(plan, d); planned += r.stops.length; if (r.stops.length && (latest === null || r.end > latest)) latest = r.end; });
  root.appendChild(h('div', 'stats', [
    [planned + ' / ' + req, 'Planned'], [done, 'Done'], [Math.max(0, planned - done), 'Left'], [latest === null ? '—' : fmt(latest), 'Latest finish']
  ].map(function (p) { return h('div', 'stat', [h('b', '', String(p[0])), h('span', '', p[1])]); })));
  if (built.missing.length) root.appendChild(h('div', 'warn', [h('b', '', 'Some sessions don’t fit this week')].concat(built.missing.map(function (m) { return h('p', '', m); }))));
  WEEK.forEach(function (d) {
    var r = dayRoute(plan, d);
    if (d === 'Fri' && !r.stops.length) return;
    var sec = h('section', 'card');
    sec.appendChild(h('div', 'dayhead', [h('b', '', FULL[d]), h('span', 'sub', r.stops.length ? r.stops.length + ' lesson(s) · start ' + fmt(startOf(d)) : 'Free afternoon')]));
    var tr = h('div', 'chips', [h('span', 'lbl', 'Traffic:')]);
    [[1, 'Normal'], [1.5, 'Heavy'], [2, 'Very heavy']].forEach(function (o) {
      tr.appendChild(btn(o[1], 'chip' + (o[0] > 1 ? ' warnchip' : ''), function () { chg(function () { if (o[0] === 1) delete S.traffic[d]; else S.traffic[d] = o[0]; }); }, (S.traffic[d] || 1) === o[0]));
    });
    sec.appendChild(tr);
    if (d !== 'Sat') {
      var st = h('div', 'chips', [h('span', 'lbl', 'Leave school:')]);
      (d === 'Fri' ? [12 * 60, 14 * 60, 16 * 60] : [14 * 60, 15 * 60]).forEach(function (m) {
        st.appendChild(btn(fmt(m).replace(':00', ''), 'chip', function () { chg(function () { if (m === defStart(d)) delete S.dayStart[d]; else S.dayStart[d] = m; }); }, startOf(d) === m));
      });
      sec.appendChild(st);
    }
    r.stops.forEach(function (x) { sec.appendChild(stopCard(x, d)); });
    if (r.stops.length) sec.appendChild(h('p', 'sub', 'Last lesson ends ' + fmt(r.end)));
    root.appendChild(sec);
  });
  root.appendChild(btn('Start a new week', 'wide', function () {
    if (confirm('Clear this week’s ticks, must-come days, start times and traffic?')) chg(function () { S.marks = {}; S.extra = {}; S.approvedSig = ''; S.dayStart = {}; S.durDay = {}; S.traffic = {}; });
  }));
}

function viewStudents(root, plan) {
  root.appendChild(btn('+ Add student', 'wide primary', function () { UI.editing = null; render(); }));
  S.students.forEach(function (s) {
    var c = CL[s.cluster || 'pending'] || CL.pending;
    var card = h('section', 'card' + (s.hold ? ' hold' : ''));
    card.appendChild(h('div', 'dayhead', [
      h('div', '', [h('b', 'name', s.name), h('div', 'sub', (s.area ? s.area + ' · ' : '') + s.per + '×/week')]),
      s.hold ? h('span', 'badge', 'On hold') : h('span', 'badge', c.label)
    ]));
    if (!s.hold) {
      var days = WEEK.filter(function (d) { return plan[d].indexOf(s.id) >= 0; });
      card.appendChild(h('p', 'sub', days.length ? 'Planned: ' + days.map(function (d) { return FULL[d]; }).join(', ') : 'Not planned yet this week'));
      var tot = h('div', 'chips', [h('span', 'lbl', 'Total sessions: ' + Object.keys(S.marks).filter(function (k) { return k.split('|')[1] === s.id; }).length + ' this week')]);
      card.appendChild(tot);
      card.appendChild(h('div', 'lbl', 'Tap the days they refuse'));
      var ch = h('div', 'chips');
      (s.fixed || WORK).forEach(function (d) {
        var ref = (S.refused[s.id] || []).indexOf(d) >= 0;
        ch.appendChild(btn(d, 'chip' + (ref ? ' refuse' : ''), function () {
          chg(function () { var l = (S.refused[s.id] || []).slice(), i = l.indexOf(d); if (i >= 0) l.splice(i, 1); else l.push(d); S.refused[s.id] = l; });
        }, ref));
      });
      card.appendChild(ch);
      card.appendChild(h('div', 'lbl', 'Lesson can start'));
      var af = h('div', 'chips');
      [0, 15 * 60, 16 * 60, 17 * 60].forEach(function (m) {
        af.appendChild(btn(m ? 'After ' + fmt(m).replace(':00', '') : 'Any time', 'chip', function () { chg(function () { if (m) S.after[s.id] = m; else delete S.after[s.id]; }); }, (S.after[s.id] || 0) === m));
      });
      card.appendChild(af);
      card.appendChild(h('div', 'lbl', 'Lesson must finish'));
      var bf = h('div', 'chips');
      [0, 17 * 60, 18 * 60].forEach(function (m) {
        bf.appendChild(btn(m ? 'Done by ' + fmt(m).replace(':00', '') : 'Any time', 'chip', function () { chg(function () { S.before[s.id] = m; }); }, beforeOf(s.id) === m));
      });
      card.appendChild(bf);
      card.appendChild(h('div', 'lbl', (S.extra[s.id] || []).length ? 'Must come this week' : 'Must-come day? (e.g. before an exam)'));
      var ex = h('div', 'chips');
      WORK.forEach(function (d) {
        var on = (S.extra[s.id] || []).indexOf(d) >= 0;
        ex.appendChild(btn((on ? '+ ' : '') + d, 'chip' + (on ? ' must' : ''), function () {
          chg(function () { var l = (S.extra[s.id] || []).slice(), i = l.indexOf(d); if (i >= 0) l.splice(i, 1); else l.push(d); S.extra[s.id] = l; });
        }, on));
      });
      card.appendChild(ex);
      if (s.durChoice) {
        card.appendChild(h('div', 'lbl', 'Usual lesson length'));
        var du = h('div', 'chips');
        [1, 2].forEach(function (n) { du.appendChild(btn(n + ' hour' + (n > 1 ? 's' : ''), 'chip', function () { chg(function () { S.dur[s.id] = n; }); }, durOf(s.id, S.dur) === n)); });
        card.appendChild(du);
      }
    }
    if (s.note) card.appendChild(h('p', 'sub', s.note));
    card.appendChild(h('div', 'actions', [a('Map', 'map', mapLink(s.map)), a('WhatsApp', 'wa', waLink(phoneOf(s)))]));
    card.appendChild(h('div', 'actions', [
      btn(s.hold ? 'Resume' : 'Hold', '', function () { chg(function () { s.hold = !s.hold; }); }),
      btn('Edit', '', function () { UI.editing = s; render(); }),
      btn('Remove', 'del', function () { if (confirm('Remove ' + s.name + '?')) chg(function () { S.students = S.students.filter(function (x) { return x !== s; }); }); })
    ]));
    root.appendChild(card);
  });
}

function viewSend(root, plan) {
  var lessonsBy = {}, lines = [], sig = [];
  WEEK.forEach(function (d) {
    var r = dayRoute(plan, d);
    sig.push(r.stops.map(function (x) { return x.id + '@' + x.start; }));
    if (!r.stops.length) return;
    lines.push(FULL[d].toUpperCase() + ' (start ' + fmt(startOf(d)) + ')');
    r.stops.forEach(function (x) {
      lines.push('• ' + fmt(x.start) + ' – ' + fmt(x.end) + '  ' + BY[x.id].name + ' (' + x.drive + ' min trip incl. parking)');
      (lessonsBy[x.id] = lessonsBy[x.id] || []).push({ d: d, start: x.start, end: x.end });
    });
    lines.push('');
  });
  var sg = JSON.stringify(sig), approved = !!S.approvedSig && S.approvedSig === sg;
  root.appendChild(h('h2', '', 'Approve & send'));
  root.appendChild(h('p', 'sub', approved ? 'Plan approved. Your schedule is first, then a message for each student.' : (S.approvedSig ? 'You changed the plan after approving — approve again to refresh the messages.' : 'Happy with the week? Approve it to unlock the messages.')));
  root.appendChild(btn(approved ? 'Approved ✓' : 'Approve this week', 'wide primary', function () { chg(function () { S.approvedSig = approved ? '' : sg; }); }, approved));
  if (!approved) return;
  var lg = h('div', 'chips', [h('span', 'lbl', 'Message language:')]);
  [['ar', 'العربية'], ['en', 'English'], ['both', 'Both']].forEach(function (o) { lg.appendChild(btn(o[1], 'chip', function () { chg(function () { S.lang = o[0]; }); }, S.lang === o[0])); });
  root.appendChild(lg);
  var mine = lines.length ? 'MY LESSONS THIS WEEK\n\n' + lines.join('\n').trim() : 'No lessons planned this week.';
  root.appendChild(h('section', 'card', [
    h('b', '', 'My schedule'), h('pre', '', mine),
    h('div', 'actions', [btn(UI.copied === '__me' ? 'Copied' : 'Copy', '', function () { copy(mine, '__me'); }), a('Send to my WhatsApp', 'wa', 'https://wa.me/?text=' + encodeURIComponent(mine))])
  ]));
  STUDENTS.forEach(function (s) {
    var ls = lessonsBy[s.id] || [];
    var ar = ls.length
      ? 'السلام عليكم ورحمة الله وبركاته\nمساء الخير، أتمنى تكونون بخير وعافية.\n\nهذه مواعيد دروس ' + s.name + ' لهذا الأسبوع:\n' + ls.map(function (l) { return '• ' + AR_DAY[l.d] + ': ' + fmtAr(l.start) + ' – ' + fmtAr(l.end); }).join('\n') + '\n\nشكراً لكم.'
      : 'السلام عليكم ورحمة الله وبركاته\nمساء الخير، حبيت أبلغكم إنه ما في دروس لـ ' + s.name + ' هذا الأسبوع. شكراً لكم.';
    var en = ls.length
      ? 'Assalamu alaikum, good evening! Here are ' + s.name + '’s lessons for this week:\n' + ls.map(function (l) { return '• ' + FULL[l.d] + ': ' + fmt(l.start) + ' – ' + fmt(l.end); }).join('\n') + '\n\nThank you!'
      : 'Assalamu alaikum, good evening! There are no lessons planned for ' + s.name + ' this week. Thank you!';
    var text = S.lang === 'en' ? en : S.lang === 'both' ? ar + '\n\n— — —\n\n' + en : ar;
    root.appendChild(h('section', 'card', [
      h('b', '', s.name), h('pre', '', text),
      h('div', 'actions', [btn(UI.copied === s.id ? 'Copied' : 'Copy', '', function () { copy(text, s.id); }), a('Send on WhatsApp', 'wa', waLink(phoneOf(s), text))])
    ]));
  });
}

/* ---------- add / edit dialog ---------- */
function openForm() {
  var s = UI.editing, f = document.getElementById('form');
  document.getElementById('dlgTitle').textContent = s ? 'Edit student' : 'New student';
  f.name.value = s ? s.name : '';
  f.phone.value = s ? phoneOf(s) : '';
  f.map.value = s ? s.map || '' : '';
  f.area.value = s ? s.area || '' : '';
  f.per.value = s ? s.per : 3;
  document.getElementById('dlg').showModal();
}
function closeForm() { UI.editing = undefined; var d = document.getElementById('dlg'); if (d.open) d.close(); }
document.getElementById('cancel').onclick = function () { closeForm(); render(); };
document.getElementById('form').onsubmit = function () {
  var f = this, s = UI.editing;
  var name = f.name.value.trim();
  if (!name) return false;
  var loc = parseLoc(f.map.value);
  var data = { name: name, map: f.map.value.trim(), area: f.area.value.trim(), per: Math.min(7, Math.max(1, Number(f.per.value) || 3)) };
  if (loc) { data.lat = loc.lat; data.lng = loc.lng; data.km = Math.round(hav(SCHOOL, loc) * 10) / 10; }
  if (s) {
    Object.assign(s, data);
    if (!loc && s.id.indexOf('s_') === 0) { s.lat = null; s.lng = null; }
    s.phone = f.phone.value.trim(); delete S.phones[s.id];
  } else {
    data.id = 's_' + Date.now(); data.dur = 1; data.phone = f.phone.value.trim(); data.hold = false;
    data.cluster = loc ? (loc.lng < 46.55 ? 'far' : loc.lng < 46.66 ? 'west' : loc.lat > 24.8 ? 'north' : 'east') : 'pending';
    S.students.push(data);
  }
  UI.editing = undefined; save(); render();
  return true;
};

/* ---------- main render ---------- */
function render() {
  sync();
  var built = buildPlan(), root = document.getElementById('view');
  root.textContent = '';
  var tabs = document.getElementById('tabs');
  tabs.textContent = '';
  [['today', 'Today'], ['week', 'Week'], ['students', 'Students'], ['send', 'Send']].forEach(function (t) {
    tabs.appendChild(btn(t[1], 'tab', function () { UI.tab = t[0]; render(); window.scrollTo(0, 0); }, UI.tab === t[0]));
  });
  var held = S.students.length - STUDENTS.length;
  document.getElementById('count').textContent = STUDENTS.length + ' active' + (held ? ' · ' + held + ' on hold' : '');
  if (UI.tab === 'today') viewToday(root, built.plan);
  else if (UI.tab === 'week') viewWeek(root, built);
  else if (UI.tab === 'students') viewStudents(root, built.plan);
  else viewSend(root, built.plan);
  if (UI.editing !== undefined && !document.getElementById('dlg').open) openForm();
}
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
