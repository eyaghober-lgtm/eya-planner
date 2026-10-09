/* Aya's Lesson Planner — phone app. Planning engine ported from the design. */
var SCHOOL = { lat: 24.7658335, lng: 46.6944546 };
var WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
var WORK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
var FULL = { Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
var AR_DAY = { Sat: 'السبت', Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة' };
var START = 14 * 60, LIMIT = 20 * 60, EARLY_LIMIT = 19 * 60, BUFFER = 10;
var CL = {
  west: { label: 'West', color: '#1D5FA8', tint: '#E6EFFA' },
  far: { label: 'Far west', color: '#7A4FD6', tint: '#EEEAFB' },
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
var DEF = { students: null, refused: {}, dur: {}, marks: {}, after: {}, extra: {}, before: {}, durDay: {}, traffic: {}, dayStart: {}, phones: {}, lang: 'ar', approvedSig: '', myPhone: '', remind: false, remindMin: 20, myName: 'Aya', order: {}, total: {}, cancelled: {}, skip: {}, cancels: {} };
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
function beforeOf() { return 0; }
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
    var arrive = t + d, start = arrive;
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
function needOf(s) { return Math.max(0, s.per - (S.skip[s.id] || 0)); }
function allowedDays(s) {
  var r = S.refused[s.id] || [];
  return (s.fixed || WORK).filter(function (d) { return r.indexOf(d) < 0 && !S.cancelled[d + '|' + s.id]; });
}
function buildPlan() {
  var plan = {}, missing = [];
  WEEK.forEach(function (d) { plan[d] = []; });
  Object.keys(S.extra).forEach(function (id) {
    if (!BY[id] || BY[id].hold) return;
    S.extra[id].forEach(function (d) { if (plan[d] && plan[d].indexOf(id) < 0 && !S.cancelled[d + '|' + id]) plan[d].push(id); });
  });
  STUDENTS.slice().sort(function (a, b) {
    return ((a.fixed ? 0 : 1) - (b.fixed ? 0 : 1)) || (allowedDays(a).length - allowedDays(b).length) || (b.per - a.per);
  }).forEach(function (s) {
    var allowed = allowedDays(s);
    var placed = WEEK.filter(function (d) { return plan[d].indexOf(s.id) >= 0; }).length;
    var need = needOf(s);
    for (var k = placed; k < need; k++) {
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
    if (placed < need) missing.push(s.name + ': ' + (need - placed) + ' session(s) left out — too many refused days or those afternoons are full. Try freeing a day.');
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
function a(text, cls, href, onclick) {
  var e = h('a', cls + (href ? '' : ' off'), text);
  if (onclick) e.onclick = onclick;
  if (href) { e.href = href; e.target = '_blank'; e.rel = 'noopener'; }
  return e;
}
function chg(fn) { fn(); save(); render(); }
function copy(text, key) { try { navigator.clipboard.writeText(text); } catch (e) {} UI.copied = key; render(); }

/* ---------- views ---------- */
function avatar(s) {
  var c = CL[s.cluster || 'pending'] || CL.pending;
  var e = h('span', 'avatar', (s.name || '?').trim().charAt(0).toUpperCase());
  e.style.background = c.color;
  return e;
}
function nextHero(r, vd) {
  var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  var nxt = r.stops.filter(function (x) { return !S.marks[vd + '|' + x.id] && x.end > nowMin; })[0];
  var box = h('section', 'hero');
  if (!nxt) { box.appendChild(h('div', 'herolbl', 'All done')); box.appendChild(h('div', 'herotitle', 'No more lessons today')); return box; }
  var s = BY[nxt.id], inMin = nxt.start - nowMin;
  box.appendChild(h('div', 'herolbl', 'Next lesson'));
  box.appendChild(h('div', 'herorow', [avatar(s), h('div', '', [h('div', 'herotitle', s.name), h('div', 'herosub', fmt(nxt.start) + ' – ' + fmt(nxt.end) + (inMin > 0 ? ' · in ' + (inMin >= 60 ? Math.floor(inMin / 60) + ' h ' + (inMin % 60) + ' min' : inMin + ' min') : ' · now'))])]));
  box.appendChild(h('div', 'herosub', 'Leave school by ' + fmt(nxt.start - nxt.drive) + ' · ' + (nxt.drive - BUFFER) + ' min drive + parking'));
  box.appendChild(h('div', 'actions', [a('Map', 'heroact', mapLink(s.map)), a('On my way', 'heroact', waLink(phoneOf(s), 'السلام عليكم حبيبتي، أنا في الطريق وبوصل الساعة ' + fmtAr(nxt.start) + ' تقريباً إن شاء الله'), function () { startTrack(s); })]));
  return box;
}
function stopCard(x, day, opts) {
  var s = BY[x.id], c = CL[s.cluster || 'pending'] || CL.pending, key = day + '|' + x.id, done = !!S.marks[key];
  var card = h('div', 'stop' + (done ? ' done' : ''), null);
  card.style.borderLeftColor = c.color;
  card.appendChild(h('div', 'drive', '↓ ' + (x.drive - BUFFER) + ' min drive + ' + BUFFER + ' min parking' + (x.wait > 0 ? ' · ' + x.wait + ' min spare' : '')));
  card.appendChild(h('div', 'time', fmt(x.start) + ' – ' + fmt(x.end)));
  card.appendChild(h('div', 'name', [avatar(s), s.name, (S.extra[x.id] || []).indexOf(day) >= 0 ? h('span', 'tag', 'MUST COME') : null]));
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
    a('On my way', 'wa', waLink(phoneOf(s), 'السلام عليكم حبيبتي، أنا في الطريق وبوصل الساعة ' + fmtAr(x.start) + ' تقريباً إن شاء الله'), function () { startTrack(s); }),
    a('I’ve arrived', 'wa', waLink(phoneOf(s), 'السلام عليكم حبيبتي، وصلت وأنا عند الباب'), function () { stopTrack(); }),
    btn(done ? 'Done ✓' : 'Mark done', 'donebtn', function () {
      chg(function () {
        if (S.marks[key]) { delete S.marks[key]; S.total[x.id] = Math.max(0, (S.total[x.id] || 0) - 1); }
        else { S.marks[key] = true; S.total[x.id] = (S.total[x.id] || 0) + 1; stopTrack(); }
      });
    }, done)
  ]);
  card.appendChild(act);
  if (opts && opts.n > 1) {
    var mvr = h('div', 'chips', [h('span', 'lbl', 'Order:')]);
    mvr.appendChild(btn('↑ Earlier', 'chip', function () { moveStop(opts.plan, day, opts.i, -1); }));
    mvr.appendChild(btn('↓ Later', 'chip', function () { moveStop(opts.plan, day, opts.i, 1); }));
    card.appendChild(mvr);
  }
  var late = h('div', 'chips', [h('span', 'lbl', 'Running late:')]);
  [10, 20, 30].forEach(function (n) {
    late.appendChild(a(n + ' min', 'chip latelink', waLink(phoneOf(s), lateMsg(s, x.start + n))));
  });
  card.appendChild(late);
  if (!done) {
    if (UI.cancelOpen === key) {
      var mv = h('div', 'chips', [h('span', 'lbl', 'Moved to:')]);
      WORK.filter(function (d) { return d !== day; }).forEach(function (d) {
        mv.appendChild(btn(d, 'chip', function () {
          chg(function () {
            S.cancelled[key] = { to: d };
            var l = (S.extra[x.id] || []).filter(function (z) { return z !== day; });
            if (l.indexOf(d) < 0) l.push(d);
            S.extra[x.id] = l;
            S.cancels[x.id] = (S.cancels[x.id] || 0) + 1;
            UI.cancelOpen = null;
          });
        }));
      });
      mv.appendChild(btn('Cancel, no makeup', 'chip warnchip', function () {
        chg(function () { S.cancelled[key] = { to: null }; S.skip[x.id] = (S.skip[x.id] || 0) + 1; S.cancels[x.id] = (S.cancels[x.id] || 0) + 1; UI.cancelOpen = null; });
      }));
      mv.appendChild(btn('Close', 'chip', function () { UI.cancelOpen = null; render(); }));
      card.appendChild(mv);
      card.appendChild(h('p', 'sub', 'Cancelled lessons are not counted.'));
    } else {
      card.appendChild(btn('Cancelled / moved to another day', 'cancelbtn', function () { UI.cancelOpen = key; render(); }));
    }
  }
  return card;
}
function lateMsg(s, newStart) {
  return 'السلام عليكم حبيبتي، عذراً منك والله، بتأخر عليكم شوي بسبب الزحمة. إن شاء الله أوصل الساعة ' + fmtAr(newStart) + ' تقريباً. الله يعطيكم العافية على تفهمكم 🌹';
}
function dayNavLink(stops) {
  var pts = stops.map(function (x) { return BY[x.id]; }).filter(function (s) { return s.lat != null && s.lng != null; });
  if (!pts.length) return '';
  var ll = function (s) { return s.lat + ',' + s.lng; };
  var url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + ll(SCHOOL) + '&destination=' + ll(pts[pts.length - 1]);
  if (pts.length > 1) url += '&waypoints=' + encodeURIComponent(pts.slice(0, -1).map(ll).join('|'));
  return url;
}
function dayRoute(plan, d) {
  var man = S.order[d];
  if (!man || !man.length || !plan[d].length) return route(plan[d], S.dur, d);
  var ids = man.filter(function (id) { return plan[d].indexOf(id) >= 0; });
  plan[d].forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
  return walk(ids, S.dur, d);
}
function hhmm(m) { return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
function moveStop(plan, d, i, dir) {
  var ids = dayRoute(plan, d).stops.map(function (x) { return x.id; });
  var j = i + dir;
  if (j < 0 || j >= ids.length) return;
  var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
  chg(function () { S.order[d] = ids; });
}

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
  if (vd === real) root.appendChild(nextHero(r, vd));
  var nav = dayNavLink(r.stops);
  if (nav) root.appendChild(a('Navigate whole route in Maps', 'navbtn', nav));
  r.stops.forEach(function (x, i) { root.appendChild(stopCard(x, vd, { i: i, n: r.stops.length, plan: plan })); });
  if (S.order[vd]) root.appendChild(btn('Reset to automatic order', 'wide', function () { chg(function () { delete S.order[vd]; }); }));
  root.appendChild(h('p', 'sub', 'Last lesson ends ' + fmt(r.end)));
}

function viewWeek(root, built) {
  var plan = built.plan, planned = 0, req = 0, latest = null, done = Object.keys(S.marks).length;
  STUDENTS.forEach(function (s) { req += Math.max(needOf(s), (S.extra[s.id] || []).length); });
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
    var tm = h('div', 'chips', [h('span', 'lbl', 'Start time:')]);
    var ti = h('input', 'timein', null, { type: 'time', value: hhmm(startOf(d)) });
    ti.setAttribute('aria-label', 'Start time for ' + FULL[d]);
    ti.onchange = function () {
      var m = /^(\d\d):(\d\d)$/.exec(ti.value);
      if (!m) return;
      var v = +m[1] * 60 + +m[2];
      chg(function () { if (v === defStart(d)) delete S.dayStart[d]; else S.dayStart[d] = v; });
    };
    tm.appendChild(ti);
    sec.appendChild(tm);
    if (d !== 'Sat') {
      var st = h('div', 'chips', [h('span', 'lbl', 'Quick:')]);
      (d === 'Fri' ? [12 * 60, 14 * 60, 16 * 60] : [14 * 60, 15 * 60]).forEach(function (m) {
        st.appendChild(btn(fmt(m).replace(':00', ''), 'chip', function () { chg(function () { if (m === defStart(d)) delete S.dayStart[d]; else S.dayStart[d] = m; }); }, startOf(d) === m));
      });
      sec.appendChild(st);
    }
    r.stops.forEach(function (x, i) { sec.appendChild(stopCard(x, d, { i: i, n: r.stops.length, plan: plan })); });
    if (S.order[d]) sec.appendChild(btn('Reset to automatic order', 'wide', function () { chg(function () { delete S.order[d]; }); }));
    if (r.stops.length) sec.appendChild(h('p', 'sub', (r.ok ? '' : 'Runs late · ') + 'Last lesson ends ' + fmt(r.end)));
    root.appendChild(sec);
  });
  var cks = Object.keys(S.cancelled);
  if (cks.length) {
    var cc = h('section', 'card', [h('b', '', 'Cancelled / moved this week')]);
    cks.forEach(function (k) {
      var parts = k.split('|'), id = parts[1], day = parts[0], info = S.cancelled[k], st = BY[id];
      if (!st) return;
      cc.appendChild(h('div', 'dayhead', [
        h('span', '', st.name + ' · ' + FULL[day] + (info.to ? ' → ' + FULL[info.to] : ' (no makeup)')),
        btn('Undo', 'chip', function () {
          chg(function () {
            delete S.cancelled[k];
            if (info.to) S.extra[id] = (S.extra[id] || []).filter(function (z) { return z !== info.to; });
            else S.skip[id] = Math.max(0, (S.skip[id] || 0) - 1);
            S.cancels[id] = Math.max(0, (S.cancels[id] || 0) - 1);
          });
        })
      ]));
    });
    root.appendChild(cc);
  }
  root.appendChild(btn('Start a new week', 'wide', function () {
    if (confirm('Clear this week’s ticks, cancellations, must-come days, start times and traffic? Total sessions are kept.')) chg(function () { S.marks = {}; S.extra = {}; S.cancelled = {}; S.skip = {}; S.order = {}; S.approvedSig = ''; S.dayStart = {}; S.durDay = {}; S.traffic = {}; });
  }));
}

function viewStudents(root, plan) {
  root.appendChild(btn('+ Add student', 'wide primary', function () { UI.editing = null; render(); }));
  S.students.forEach(function (s) {
    var c = CL[s.cluster || 'pending'] || CL.pending;
    var card = h('section', 'card' + (s.hold ? ' hold' : ''));
    card.appendChild(h('div', 'dayhead', [
      h('div', 'who', [avatar(s), h('div', '', [h('b', 'name', s.name), h('div', 'sub', (s.area ? s.area + ' · ' : '') + s.per + '×/week')])]),
      s.hold ? h('span', 'badge', 'On hold') : h('span', 'badge', c.label)
    ]));
    if (!s.hold) {
      var days = WEEK.filter(function (d) { return plan[d].indexOf(s.id) >= 0; });
      card.appendChild(h('p', 'sub', days.length ? 'Planned: ' + days.map(function (d) { return FULL[d]; }).join(', ') : 'Not planned yet this week'));
      var tot = h('div', 'chips', [h('span', 'lbl', 'Total sessions: ' + (S.total[s.id] || 0) + ' · done this week: ' + Object.keys(S.marks).filter(function (k) { return k.split('|')[1] === s.id; }).length + ' (edit in Profile)')]);
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
    var ph = h('input', 'phonein', null, { type: 'tel', placeholder: 'WhatsApp number (05XXXXXXXX)', value: phoneOf(s) });
    ph.setAttribute('inputmode', 'tel');
    ph.setAttribute('aria-label', 'WhatsApp number for ' + s.name);
    ph.onchange = function () { S.phones[s.id] = ph.value.trim(); save(); render(); };
    card.appendChild(h('div', 'lbl', 'WhatsApp number (saved on this phone)'));
    card.appendChild(ph);
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
  root.appendChild(settingsCard());
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
    h('div', 'actions', [btn(UI.copied === '__me' ? 'Copied' : 'Copy', '', function () { copy(mine, '__me'); }), a('Send to my WhatsApp', 'wa', S.myPhone ? waLink(S.myPhone, mine) : 'https://wa.me/?text=' + encodeURIComponent(mine))])
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

/* ---------- profile ---------- */
function viewProfile(root) {
  var grand = 0, weekDone = Object.keys(S.marks).length, canc = 0;
  S.students.forEach(function (s) { grand += S.total[s.id] || 0; canc += S.cancels[s.id] || 0; });
  var nm = h('input', 'phonein', null, { type: 'text', value: S.myName, placeholder: 'Your name' });
  nm.setAttribute('aria-label', 'Your name');
  nm.onchange = function () { S.myName = nm.value.trim() || 'Aya'; save(); render(); };
  root.appendChild(h('section', 'hero', [
    h('div', 'herorow', [h('span', 'avatar', (S.myName || 'A').charAt(0).toUpperCase()), h('div', '', [h('div', 'herotitle', S.myName || 'Aya'), h('div', 'herosub', 'Teacher profile')])]),
    h('div', 'stats prof', [
      [grand, 'Total sessions'], [weekDone, 'Done this week'], [canc, 'Cancelled']
    ].map(function (p) { return h('div', 'stat', [h('b', '', String(p[0])), h('span', '', p[1])]); }))
  ]));
  root.appendChild(h('section', 'card', [h('b', '', 'Your name'), nm]));
  root.appendChild(h('p', 'sub', 'Type each student’s total including lessons you taught before using this app. From now on the counter goes up by itself each time you tap “Mark done”. Cancelled lessons never count.'));
  S.students.forEach(function (s) {
    var wd = Object.keys(S.marks).filter(function (k) { return k.split('|')[1] === s.id; }).length;
    var inp = h('input', 'numin', null, { type: 'number', min: '0', value: String(S.total[s.id] || 0) });
    inp.setAttribute('inputmode', 'numeric');
    inp.setAttribute('aria-label', 'Total sessions for ' + s.name);
    inp.onchange = function () { S.total[s.id] = Math.max(0, parseInt(inp.value, 10) || 0); save(); render(); };
    root.appendChild(h('section', 'card' + (s.hold ? ' hold' : ''), [
      h('div', 'dayhead', [h('div', 'who', [avatar(s), h('div', '', [h('b', 'name', s.name), h('div', 'sub', 'This week: ' + wd + ' done · cancelled: ' + (S.cancels[s.id] || 0))])]),
        h('div', 'counter', [
          btn('−', 'cbtn', function () { chg(function () { S.total[s.id] = Math.max(0, (S.total[s.id] || 0) - 1); }); }),
          inp,
          btn('+', 'cbtn', function () { chg(function () { S.total[s.id] = (S.total[s.id] || 0) + 1; }); })
        ])
      ])
    ]));
  });
}

/* ---------- arrival tracking ---------- */
var TRACK = null;
function arrivalMsg() { return 'السلام عليكم حبيبتي، باقي لي حوالي خمس دقايق وأوصل إن شاء الله، الله يعطيكم العافية 🌹'; }
function bar() { return document.getElementById('arrbar'); }
function stopTrack() {
  if (TRACK && TRACK.watch != null) navigator.geolocation.clearWatch(TRACK.watch);
  TRACK = null;
  bar().hidden = true;
}
function startTrack(s) {
  if (!navigator.geolocation) { alert('This phone/browser has no location.'); return; }
  if (s.lat == null || s.lng == null) { alert('Add ' + s.name + '’s location first (Students → Edit) so I can tell when you are close.'); return; }
  stopTrack();
  TRACK = { id: s.id, fired: false, min: null };
  TRACK.watch = navigator.geolocation.watchPosition(onPos, function () {
    if (TRACK) { TRACK.err = true; drawBar(); }
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  drawBar();
}
function onPos(p) {
  if (!TRACK) return;
  var s = BY[TRACK.id];
  var km = hav({ lat: p.coords.latitude, lng: p.coords.longitude }, s) * 1.35;
  TRACK.err = false;
  TRACK.min = Math.round(km / 35 * 60);
  if (!TRACK.fired && TRACK.min <= 5) {
    TRACK.fired = true;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    notify('5 minutes from ' + s.name, 'Tap to send “I’m almost there” on WhatsApp', waLink(phoneOf(s), arrivalMsg()));
  }
  drawBar();
}
function drawBar() {
  var b = bar();
  if (!TRACK) { b.hidden = true; return; }
  var s = BY[TRACK.id];
  b.hidden = false;
  b.textContent = '';
  var near = TRACK.fired;
  b.className = near ? 'near' : '';
  b.appendChild(h('div', 'arrtxt', TRACK.err ? 'Waiting for location… (allow location for this app)' : TRACK.min == null ? 'Finding you…' : near ? s.name + ': about 5 minutes away!' : s.name + ': about ' + TRACK.min + ' min away'));
  var row = h('div', 'arrrow');
  if (near) row.appendChild(a(phoneOf(s) ? 'Send “almost there”' : 'Add number first', 'arrsend', waLink(phoneOf(s), arrivalMsg())));
  row.appendChild(btn('Stop', 'arrstop', function () { stopTrack(); }));
  b.appendChild(row);
}

/* ---------- settings & reminders ---------- */
function settingsCard() {
  var my = h('input', 'phonein', null, { type: 'tel', placeholder: 'My WhatsApp number (05XXXXXXXX)', value: S.myPhone });
  my.setAttribute('inputmode', 'tel');
  my.setAttribute('aria-label', 'My WhatsApp number');
  my.onchange = function () { S.myPhone = my.value.trim(); save(); render(); };
  var card = h('section', 'card', [h('b', '', 'My settings'), h('div', 'lbl', 'My number — sends my schedule straight to my own WhatsApp'), my]);
  var rm = h('div', 'chips', [h('span', 'lbl', 'Remind me before leaving:')]);
  [10, 20, 30].forEach(function (n) { rm.appendChild(btn(n + ' min', 'chip', function () { chg(function () { S.remindMin = n; }); }, S.remindMin === n)); });
  card.appendChild(rm);
  var supported = 'Notification' in window;
  card.appendChild(btn(S.remind ? 'Reminders ON ✓' : 'Turn on reminders', 'wide' + (S.remind ? '' : ' primary'), function () {
    if (S.remind) { chg(function () { S.remind = false; }); return; }
    if (!supported) { alert('This browser does not support notifications.'); return; }
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') { S.remind = true; save(); notify('Reminders are on', 'You will be told when it is time to leave for each lesson.'); render(); }
      else alert('Notifications are blocked. Allow them in the browser/site settings.');
    });
  }, S.remind));
  card.appendChild(h('div', 'lbl', 'Backup — your data lives only on this phone'));
  var file = h('input', '', null, { type: 'file', accept: 'application/json' });
  file.style.display = 'none';
  file.onchange = function () {
    var f = file.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var d = JSON.parse(rd.result);
        if (!d || !Array.isArray(d.students)) throw new Error('bad');
        if (!confirm('Replace everything on this phone with this backup?')) return;
        Object.keys(DEF).forEach(function (k) { if (d[k] !== undefined) S[k] = d[k]; });
        save(); render();
      } catch (e) { alert('That file is not a valid backup.'); }
    };
    rd.readAsText(f);
  };
  card.appendChild(h('div', 'actions', [
    btn('Download backup', '', function () {
      var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      var l = h('a', '', null, { href: URL.createObjectURL(blob), download: 'aya-planner-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
      document.body.appendChild(l); l.click(); l.remove();
    }),
    btn('Restore backup', '', function () { file.click(); }),
    file
  ]));
  card.appendChild(h('p', 'sub', 'Reminders ring while the app is open or running in the background on your phone. If the phone closes the app completely, open it once and today’s reminders are set again.'));
  return card;
}
function notify(title, body, url) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(title, { body: body, icon: 'icons/icon.svg', vibrate: [150, 80, 150], data: { url: url || '' } }); });
    else new Notification(title, { body: body });
  } catch (e) {}
}
var TIMERS = [];
function scheduleReminders(plan) {
  TIMERS.forEach(clearTimeout); TIMERS = [];
  if (!S.remind || !('Notification' in window) || Notification.permission !== 'granted') return;
  var JS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], d = JS[new Date().getDay()], now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  var r = dayRoute(plan, d), prevEnd = startOf(d);
  r.stops.forEach(function (x) {
    var leave = x.start - x.drive;
    var at = Math.min(leave, x.start) - S.remindMin;
    if (S.marks[d + '|' + x.id]) return;
    var ms = (at - nowMin) * 60000;
    if (ms > 0 && ms < 864e5) TIMERS.push(setTimeout(function () {
      notify('Lesson at ' + fmt(x.start) + ' — ' + BY[x.id].name, 'Leave in ' + S.remindMin + ' min · drive ' + (x.drive - BUFFER) + ' min + parking');
    }, ms));
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
  var ICON = {
    today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    week: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    students: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.4 3.5 6"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>'
  };
  [['today', 'Today'], ['week', 'Week'], ['students', 'Students'], ['profile', 'Profile'], ['send', 'Send']].forEach(function (t) {
    var b = btn('', 'tab', function () { UI.tab = t[0]; render(); window.scrollTo(0, 0); }, UI.tab === t[0]);
    b.textContent = '';
    var ic = h('span', 'ico');
    ic.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[t[0]] + '</svg>';
    b.appendChild(ic); b.appendChild(h('span', 'tl', t[1]));
    tabs.appendChild(b);
  });
  var held = S.students.length - STUDENTS.length;
  var hr = new Date().getHours();
  var greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('count').textContent = greet + ', ' + (S.myName || 'Aya') + ' · ' + STUDENTS.length + ' active' + (held ? ' · ' + held + ' on hold' : '');
  if (UI.tab === 'today') viewToday(root, built.plan);
  else if (UI.tab === 'week') viewWeek(root, built);
  else if (UI.tab === 'students') viewStudents(root, built.plan);
  else if (UI.tab === 'profile') viewProfile(root);
  else viewSend(root, built.plan);
  scheduleReminders(built.plan);
  if (UI.editing !== undefined && !document.getElementById('dlg').open) openForm();
}
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});

document.getElementById('refresh').onclick = function () {
  var b = this;
  b.classList.add('spin');
  b.querySelector('span').textContent = 'Updating…';
  var jobs = [];
  if ('caches' in window) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
  Promise.all(jobs).catch(function () {}).then(function () { setTimeout(function () { location.reload(); }, 400); });
};
