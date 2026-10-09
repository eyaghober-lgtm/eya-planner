var KEY = 'aya-students-v1';
var SEED = [
  { name: 'Abdulilah', phone: '0555866235', map: 'https://maps.google.com/?q=24.900791,46.441021', area: 'West / NW Riyadh', per: 3 },
  { name: 'Jazi', phone: '', map: 'https://maps.google.com/?q=24.770063,46.630829', area: 'West, close to school', per: 3 },
  { name: 'Wahoub', phone: '', map: 'https://maps.google.com/?q=24.785006,46.575111', area: 'West / SW of school', per: 3 },
  { name: 'Lynn', phone: '', map: 'https://maps.google.com/?q=24.833565,46.642910', area: 'NW, close-west', per: 2 },
  { name: 'Rose', phone: '', map: 'https://maps.app.goo.gl/NYDYghhGph7nUYz89', area: 'Al Sahafah', per: 3 },
  { name: 'Lulwa', phone: '', map: 'https://maps.app.goo.gl/msV96mfUppFcS7PXA', area: 'Al Qirawan', per: 3 }
];
var students = load();
var editing = null;
var $ = function (id) { return document.getElementById(id); };

function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return SEED.map(function (s, i) { s.id = 's' + i; s.hold = false; return s; });
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(students)); } catch (e) {} }

function waLink(phone) {
  var n = String(phone || '').replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.indexOf('05') === 0) n = '966' + n.slice(1);
  else if (n.length === 9 && n.charAt(0) === '5') n = '966' + n;
  return 'https://wa.me/' + n;
}
function mapLink(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(v)) return 'https://maps.google.com/?q=' + v.replace(/\s+/g, '');
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://maps.google.com/?q=' + encodeURIComponent(v);
}
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function link(cls, text, href) {
  var a = el('a', cls + (href ? '' : ' off'), text);
  if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}
function btn(text, cls, fn) {
  var b = el('button', cls, text);
  b.type = 'button';
  b.onclick = fn;
  return b;
}

function render() {
  var list = $('list');
  list.textContent = '';
  var active = students.filter(function (s) { return !s.hold; }).length;
  $('count').textContent = active + ' active' + (students.length - active ? ' · ' + (students.length - active) + ' on hold' : '');
  if (!students.length) list.appendChild(el('div', 'empty', 'No students yet. Tap + Add.'));
  students.forEach(function (s) {
    var c = el('section', 'card' + (s.hold ? ' hold' : ''));
    var top = el('div', 'top');
    var left = el('div');
    left.appendChild(el('div', 'name', s.name));
    left.appendChild(el('div', 'sub', (s.area ? s.area + ' · ' : '') + s.per + '/week'));
    top.appendChild(left);
    if (s.hold) top.appendChild(el('span', 'badge', 'On hold'));
    c.appendChild(top);
    var act = el('div', 'actions');
    act.appendChild(link('map', 'Map', mapLink(s.map)));
    act.appendChild(link('wa', 'WhatsApp', waLink(s.phone)));
    c.appendChild(act);
    var more = el('div', 'more');
    more.appendChild(btn(s.hold ? 'Resume' : 'Hold', '', function () { s.hold = !s.hold; save(); render(); }));
    more.appendChild(btn('Edit', '', function () { openForm(s); }));
    more.appendChild(btn('Remove', 'del', function () {
      if (confirm('Remove ' + s.name + '?')) { students = students.filter(function (x) { return x !== s; }); save(); render(); }
    }));
    c.appendChild(more);
    list.appendChild(c);
  });
}

function openForm(s) {
  editing = s || null;
  var f = $('form');
  $('dlgTitle').textContent = s ? 'Edit student' : 'New student';
  f.name.value = s ? s.name : '';
  f.phone.value = s ? s.phone : '';
  f.map.value = s ? s.map : '';
  f.area.value = s ? s.area : '';
  f.per.value = s ? s.per : 3;
  $('dlg').showModal();
}
$('addBtn').onclick = function () { openForm(null); };
$('cancel').onclick = function () { $('dlg').close(); };
$('form').onsubmit = function () {
  var f = $('form');
  var data = { name: f.name.value.trim(), phone: f.phone.value.trim(), map: f.map.value.trim(), area: f.area.value.trim(), per: Number(f.per.value) || 3 };
  if (!data.name) return;
  if (editing) Object.assign(editing, data);
  else { data.id = 's' + Date.now(); data.hold = false; students.push(data); }
  save(); render();
};

render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
