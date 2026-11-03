/* Form editor v2: steps, side-by-side fields, headings / text / dividers, drag and drop.
 * Shell and look follow the article editor (sticky dock with tiles, dashed drop areas, undo after delete).
 * The editor owns a small model (steps -> items -> field objects) and rebuilds the page from it after every structural change;
 * typing only updates the model, so inputs keep their focus. The page asks for the result with collect(state) when it saves.
 * Panel policy: no inline styles, no inline scripts. Everything is class names. */
import Sortable from 'sortablejs';

(function () {
  'use strict';

  var TYPES = [
    ['text', 'Teks pendek', 'Aa'], ['email', 'Email', '@'], ['phone', 'Telepon', '☎'], ['textarea', 'Teks panjang', '¶'], ['select', 'Dropdown', '▾'],
    ['radio', 'Pilihan tunggal', '◉'], ['checkbox', 'Pilihan ganda', '☑'], ['date', 'Tanggal', '▦'], ['file', 'Berkas', '⎙'], ['consent', 'Persetujuan', '✓'],
  ];
  var LAYOUT = [['x-h', 'Judul', 'H'], ['x-text', 'Teks', 'T'], ['x-hr', 'Garis', '―'], ['x-row', 'Baris', '▯▯']]; // tile keys of layout blocks start with x- so they never clash with a field type
  var TNAME = {};
  TYPES.forEach(function (t) { TNAME[t[0]] = t[1]; });
  var SHORT = { text: 1, email: 1, phone: 1, date: 1, select: 1 }; // short fields may share a row (same list as the server)
  var MAX_STEPS = 8, MAX_FIELDS = 30, ROW_MAX = 3;
  var seq = 0;

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'value') n.value = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c === null || c === undefined || c === false) continue;
        if (Array.isArray(c)) add(c);
        else n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    })(Array.prototype.slice.call(arguments, 2));
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function uid() { var a = new Uint8Array(4); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function U(o) { if (!o._u) o._u = 'u' + (++seq); return o._u; }
  function isTempKey(k) { return /^f[0-9a-f]{8}$/.test(k); }

  function fld(label, input, hint) { return el('label', { class: 'f' }, el('span', { class: 'fl', text: label }), hint ? el('small', { text: hint }) : null, input); }
  function selectBox(opts, value, onchange) {
    var s = el('select', { onchange: function (e) { onchange(e.target.value); } });
    opts.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); });
    return s;
  }

  function create(opts) {
    var onChange = opts.onChange || function () {};
    var meta = opts.meta || function () { return {}; };
    var model = [];         // [{id, name, items:[{t:'field',f}|{t:'row',id,fs:[f]}|{t:'h'|'text'|'hr',id,...}]}]
    var reg = {};           // data-u -> object, refilled on every draw
    var open = {};          // data-u of fields whose settings are shown
    var cur = 0;            // step that a click on a tile adds to
    var sortables = [];
    var lastDel = null, undoTimer = null, flash = '';
    var root = el('section', { class: 'card fe-root' });

    /* ---------- model <-> state ---------- */
    function normField(f) {
      f.options = Array.isArray(f.options) ? f.options : [];
      f.suggest = f.suggest && typeof f.suggest === 'object' ? f.suggest : { list: [], learn: false };
      f.suggest.list = Array.isArray(f.suggest.list) ? f.suggest.list : [];
      f.consent = f.consent || { text: '', url: '' };
      f.labelAdult = f.labelAdult || '';
      f.zkey = f.zkey || '';
      return f;
    }
    function load(S) {
      var byKey = {};
      (S.fields || []).forEach(function (f) {
        normField(f);
        f._saved = !isTempKey(f.key);
        f._o = { label: f.label || '', labelAdult: f.labelAdult || '' };
        byKey[f.key] = f;
      });
      var placed = {};
      model = (S.steps || []).map(function (st) {
        var items = [];
        (st.items || []).forEach(function (it) {
          if (it.t === 'field') { if (byKey[it.key] && !placed[it.key]) { placed[it.key] = 1; items.push({ t: 'field', f: byKey[it.key] }); } }
          else if (it.t === 'row') {
            var fs = (it.keys || []).filter(function (k) { return byKey[k] && !placed[k]; });
            fs.forEach(function (k) { placed[k] = 1; });
            if (fs.length) items.push({ t: 'row', id: it.id || 'r' + uid(), fs: fs.map(function (k) { return byKey[k]; }) });
          } else if (it.t === 'h') items.push({ t: 'h', id: it.id || 'h' + uid(), text: it.text || '', textAdult: it.textAdult || '', level: it.level === 3 ? 3 : 2 });
          else if (it.t === 'text') items.push({ t: 'text', id: it.id || 't' + uid(), text: it.text || '', textAdult: it.textAdult || '' });
          else if (it.t === 'hr') items.push({ t: 'hr', id: it.id || 'l' + uid() });
        });
        return { id: st.id || 's' + uid(), name: st.name || '', items: items };
      });
      if (!model.length) model = [{ id: 's' + uid(), name: '', items: [] }];
      // a field that no step lists goes to the last step, like the server does
      (S.fields || []).forEach(function (f) { if (!placed[f.key]) model[model.length - 1].items.push({ t: 'field', f: f }); });
      cur = Math.min(cur, model.length - 1);
      open = {}; lastDel = null; flash = '';
      draw();
    }
    function clean(f) {
      var o = {};
      Object.keys(f).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = f[k]; });
      return o;
    }
    function collect(S) {
      var fields = [], steps = [];
      model.forEach(function (st) {
        var items = [];
        st.items.forEach(function (it) {
          if (it.t === 'field') { fields.push(clean(it.f)); items.push({ t: 'field', key: it.f.key }); }
          else if (it.t === 'row') {
            it.fs.forEach(function (f) { fields.push(clean(f)); });
            if (it.fs.length >= 2) items.push({ t: 'row', id: it.id, keys: it.fs.map(function (f) { return f.key; }) });
            else it.fs.forEach(function (f) { items.push({ t: 'field', key: f.key }); });
          } else if (it.t === 'h') items.push({ t: 'h', id: it.id, text: it.text || '', textAdult: it.textAdult || '', level: it.level === 3 ? 3 : 2 });
          else if (it.t === 'text') items.push({ t: 'text', id: it.id, text: it.text || '', textAdult: it.textAdult || '' });
          else if (it.t === 'hr') items.push({ t: 'hr', id: it.id });
        });
        steps.push({ id: st.id, name: st.name || '', items: items });
      });
      S.fields = fields; S.steps = steps;
      return S;
    }
    function flat() {
      var o = [];
      model.forEach(function (st) {
        st.items.forEach(function (it) {
          if (it.t === 'field') o.push(it.f);
          else if (it.t === 'row') it.fs.forEach(function (f) { o.push(f); });
        });
      });
      return o;
    }
    function earlier(f) { var o = flat(), i = o.indexOf(f); return i < 0 ? [] : o.slice(0, i); }
    function label(f) { return (f.label || '').trim() || '(tanpa label)'; }

    /* where is an object? */
    function find(u) {
      for (var s = 0; s < model.length; s++) {
        var items = model[s].items;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.t === 'field' && it.f._u === u) return { s: s, list: items, i: i, item: it, f: it.f };
          if (it._u === u) return { s: s, list: items, i: i, item: it };
          if (it.t === 'row') for (var j = 0; j < it.fs.length; j++) if (it.fs[j]._u === u) return { s: s, list: items, i: i, item: it, row: it, j: j, f: it.fs[j] };
        }
      }
      return null;
    }

    /* ---------- creating things ---------- */
    function newField(type) {
      return { key: 'f' + uid(), type: type, label: '', labelAdult: '', hint: '', required: type === 'consent', options: [], zkey: '', suggest: { list: [], learn: false }, showIf: null, consent: { text: '', url: '' }, _saved: false, _o: { label: '', labelAdult: '' } };
    }
    function newItem(k) {
      if (k === 'x-h') return { t: 'h', id: 'h' + uid(), text: '', textAdult: '', level: 2 };
      if (k === 'x-text') return { t: 'text', id: 't' + uid(), text: '', textAdult: '' };
      if (k === 'x-hr') return { t: 'hr', id: 'l' + uid() };
      if (k === 'x-row') return { t: 'row', id: 'r' + uid(), fs: [] };
      return { t: 'field', f: newField(k) };
    }
    function fieldCount() { return flat().length; }
    function addFromTile(k) {
      if (TNAME[k] && fieldCount() >= MAX_FIELDS) { say('Batas ' + MAX_FIELDS + ' isian tercapai.'); return; }
      var it = newItem(k);
      model[cur].items.push(it);
      if (it.t === 'field') open[U(it.f)] = true;
      changed(); draw(it.t === 'field' ? U(it.f) : U(it));
    }

    function say(msg) { flash = msg; var b = root.querySelector('.fe-flash'); if (b) { b.textContent = msg; b.hidden = !msg; } }
    function changed() { onChange(); }

    /* ---------- moves, deletes ---------- */
    function move(u, d) {
      var p = find(u); if (!p) return;
      if (p.row) {
        var j = p.j + d;
        if (j < 0 || j >= p.row.fs.length) return;
        var x = p.row.fs.splice(p.j, 1)[0]; p.row.fs.splice(j, 0, x);
      } else {
        var i = p.i + d;
        if (i >= 0 && i < p.list.length) { var it = p.list.splice(p.i, 1)[0]; p.list.splice(i, 0, it); }
        else if (d < 0 && p.s > 0) { model[p.s - 1].items.push(p.list.splice(p.i, 1)[0]); cur = p.s - 1; }
        else if (d > 0 && p.s < model.length - 1) { model[p.s + 1].items.unshift(p.list.splice(p.i, 1)[0]); cur = p.s + 1; }
        else return;
      }
      changed(); draw(u, d < 0 ? 'up' : 'down');
    }
    function dissolve(row, items, at) { items.splice.apply(items, [at, 1].concat(row.fs.map(function (f) { return { t: 'field', f: f }; }))); }
    function remove(u) {
      var p = find(u); if (!p) return;
      var snap = { s: p.s, i: p.i, row: p.row ? p.row.id : null, j: p.j, item: p.row ? p.f : p.item };
      if (p.row) {
        p.row.fs.splice(p.j, 1);
        if (p.row.fs.length < 2 && p.row.fs.length) dissolve(p.row, p.list, p.i);
        else if (!p.row.fs.length) p.list.splice(p.i, 1);
      } else p.list.splice(p.i, 1);
      var gone = p.f || null;
      if (gone) flat().forEach(function (x) { if (x.showIf && x.showIf.key === gone.key) x.showIf = null; });
      lastDel = snap; showUndo();
      changed(); draw();
    }
    function undo() {
      if (!lastDel) return;
      var d = lastDel; lastDel = null;
      var st = model[Math.min(d.s, model.length - 1)];
      var row = d.row ? st.items.filter(function (x) { return x.t === 'row' && x.id === d.row; })[0] : null;
      if (row) row.fs.splice(Math.min(d.j, row.fs.length), 0, d.item);
      else st.items.splice(Math.min(d.i, st.items.length), 0, d.item.t ? d.item : { t: 'field', f: d.item });
      changed(); draw();
    }
    function showUndo() {
      clearTimeout(undoTimer);
      var b = root.querySelector('.fe-undo'); if (b) b.hidden = false;
      undoTimer = setTimeout(function () { lastDel = null; var x = root.querySelector('.fe-undo'); if (x) x.hidden = true; }, 12000);
    }
    function removeStep(s) {
      if (model.length < 2) return;
      var st = model.splice(s, 1)[0];
      var into = model[s > 0 ? s - 1 : 0];
      if (s > 0) st.items.forEach(function (it) { into.items.push(it); }); else into.items = st.items.concat(into.items);
      cur = Math.min(cur, model.length - 1);
      changed(); draw();
    }
    function moveStep(s, d) {
      var t = s + d; if (t < 0 || t >= model.length) return;
      var x = model.splice(s, 1)[0]; model.splice(t, 0, x); cur = t;
      changed(); draw();
    }
    function addStep() {
      if (model.length >= MAX_STEPS) return;
      model.push({ id: 's' + uid(), name: '', items: [] }); cur = model.length - 1;
      changed(); draw();
      var inputs = root.querySelectorAll('.fe-stepname'); if (inputs.length) inputs[inputs.length - 1].focus();
    }
    /* "side by side with the one above" without dragging (keyboard and touch) */
    function canJoin(p) {
      if (p.row) return true; // leaving a row is always possible
      var prev = p.list[p.i - 1];
      if (!prev || !SHORT[p.f.type]) return false;
      return (prev.t === 'field' && !!SHORT[prev.f.type]) || (prev.t === 'row' && prev.fs.length < ROW_MAX);
    }
    function toggleJoin(u) {
      var p = find(u); if (!p || !canJoin(p)) return;
      if (p.row) {
        p.row.fs.splice(p.j, 1);
        p.list.splice(p.i + 1, 0, { t: 'field', f: p.f });
        if (p.row.fs.length < 2) { dissolve(p.row, p.list, p.i); }
      } else {
        var prev = p.list[p.i - 1];
        p.list.splice(p.i, 1);
        if (prev.t === 'row') prev.fs.push(p.f);
        else p.list.splice(p.i - 1, 1, { t: 'row', id: 'r' + uid(), fs: [prev.f, p.f] });
      }
      changed(); draw(u);
    }
    function setType(f, v) {
      f.type = v;
      if (v === 'consent') f.required = true;
      var p = find(U(f));
      if (p && p.row && !SHORT[v]) { p.row.fs.splice(p.j, 1); p.list.splice(p.i + 1, 0, { t: 'field', f: f }); if (p.row.fs.length < 2) dissolve(p.row, p.list, p.i); say('Isian jenis ini tidak bisa sebaris, jadi dikeluarkan dari baris.'); }
      changed(); draw(U(f));
    }

    /* ---------- checks shown while editing (the server checks again on save) ---------- */
    function problems() {
      var out = [], o = flat(), idx = {};
      o.forEach(function (f, i) { idx[f.key] = i; });
      o.forEach(function (f, i) {
        if (f.showIf && f.showIf.key && !(idx[f.showIf.key] < i)) out.push({ u: U(f), msg: '"' + label(f) + '": isian pemicu "tampil jika" harus berada di atasnya (atau di langkah sebelumnya).' });
      });
      model.forEach(function (st, i) {
        if (model.length > 1 && !(st.name || '').trim()) out.push({ msg: 'Langkah ' + (i + 1) + ': nama wajib diisi.' });
        if (!st.items.length) out.push({ msg: 'Langkah ' + (i + 1) + ' masih kosong: tambahkan isian atau hapus langkahnya.' });
      });
      return out;
    }
    function drawProblems() {
      var box = root.querySelector('.fe-problems'); if (!box) return;
      clear(box);
      var ps = problems();
      box.hidden = !ps.length;
      Array.prototype.forEach.call(root.querySelectorAll('.fe-item.is-bad'), function (n) { n.classList.remove('is-bad'); });
      if (!ps.length) return;
      box.appendChild(el('strong', { text: 'Perlu diperbaiki sebelum disimpan:' }));
      var ul = el('ul'); ps.forEach(function (p) { ul.appendChild(el('li', { text: p.msg })); }); box.appendChild(ul);
      Array.prototype.forEach.call(root.querySelectorAll('.fe-item[data-u]'), function (n) {
        var bad = ps.some(function (p) { return p.u && p.u === n.getAttribute('data-u'); });
        n.classList.toggle('is-bad', bad);
      });
    }

    /* ---------- drawing ---------- */
    function trigger(f) {
      var s = el('select', { onchange: function (e) { var k = e.target.value; f.showIf = k ? { key: k, equals: f.showIf ? f.showIf.equals || '' : '' } : null; changed(); draw(U(f)); } });
      var ops = [];
      s.appendChild(el('option', { value: '' }, 'Selalu tampil'));
      earlier(f).forEach(function (x) { var op = el('option', { value: x.key }, ''); if (f.showIf && x.key === f.showIf.key) op.selected = true; ops.push([op, x]); s.appendChild(op); });
      function fill() { ops.forEach(function (o, n) { o[0].textContent = (o[1].label || '').trim() || '(isian ' + (n + 1) + ' tanpa label)'; }); }
      fill(); s.addEventListener('mousedown', fill); s.addEventListener('focus', fill);
      // a trigger that is no longer above this field stays visible so it can be fixed
      if (f.showIf && f.showIf.key && !ops.some(function (o) { return o[1].key === f.showIf.key; })) {
        var op = el('option', { value: f.showIf.key, selected: true }, '(isian di bawah atau sudah dihapus)'); s.appendChild(op);
      }
      return s;
    }
    function lines(arr, ph, rows) {
      return el('textarea', { rows: String(rows || 4), placeholder: ph, value: arr.join('\n'), oninput: function (e) { arr.length = 0; e.target.value.split('\n').forEach(function (x) { x = x.trim(); if (x) arr.push(x); }); changed(); } });
    }
    function text(obj, key, max, ph, cb) {
      return el('input', { type: 'text', maxlength: String(max), placeholder: ph || '', value: obj[key] || '', oninput: function (e) { obj[key] = e.target.value; changed(); if (cb) cb(e.target.value); } });
    }
    function check(lbl, obj, key, cb) {
      return el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: obj[key] ? 'checked' : null, onchange: function (e) { obj[key] = e.target.checked; changed(); if (cb) cb(); } }), ' ' + lbl);
    }

    function fieldBody(f, ttl, sub) {
      var body = el('div', { class: 'fe-body' });
      var zInput = text(f, 'zkey', 60, '', function () { updWarn(); });
      var warn = el('div', { class: 'fe-warn', role: 'note', hidden: true });
      function updWarn() {
        clear(warn);
        var m = meta();
        var renamed = f._saved && f.zkey === '' && ((f.label || '').trim() !== (f._o.label || '').trim() || (f.labelAdult || '') !== (f._o.labelAdult || ''));
        warn.hidden = !(renamed && m.zapier);
        if (warn.hidden) return;
        warn.appendChild(el('strong', { text: 'Nama kolom di Zapier ikut berubah. ' }));
        warn.appendChild(document.createTextNode('Selama "Kunci di Zapier" kosong, nama kolom mengikuti label. Zap yang sudah ada mencari kolom bernama "' + (f._o.label || '') + '".'));
        if (!f._o.labelAdult || f._o.labelAdult === f._o.label) {
          warn.appendChild(document.createTextNode(' '));
          warn.appendChild(el('button', { type: 'button', class: 'ae-linkbtn', onclick: function () { f.zkey = f._o.label; zInput.value = f.zkey; changed(); updWarn(); } }, 'Kunci nama lama'));
        } else warn.appendChild(document.createTextNode(' Isi "Kunci di Zapier" dengan nama kolom yang dipakai Zap Anda agar tidak berubah.'));
      }
      var labelIn = text(f, 'label', 100, 'mis. Nama sekolah', function (v) { ttl.textContent = (v || '').trim() || '(tanpa label)'; updWarn(); drawProblems(); });
      labelIn.setAttribute('data-focus', 'label');
      var p = find(U(f));
      body.appendChild(el('div', { class: 'cols' },
        el('div', null,
          fld('Jenis isian', selectBox(TYPES.map(function (t) { return [t[0], t[1]]; }), f.type, function (v) { setType(f, v); })),
          fld('Label (tampilan Anak & Remaja)', labelIn, 'Juga jadi placeholder dan nama kolom di Zapier bila "kunci Zapier" kosong.'),
          fld('Label (tampilan Dewasa & Bisnis)', text(f, 'labelAdult', 100, '', function () { updWarn(); }), 'Kosong = sama dengan label di atas.')),
        el('div', null,
          fld('Petunjuk kecil (opsional)', text(f, 'hint', 160)),
          f.type === 'consent' ? el('p', { class: 'muted', text: 'Persetujuan selalu wajib dicentang.' }) : check('Wajib diisi', f, 'required', function () { sub.textContent = subline(f); }),
          fld('Kunci di Zapier (opsional)', zInput, 'Nama kolom yang dikirim ke Zapier. Kosong = memakai label. Ubah hanya jika Zap yang ada memakai nama tertentu.'))));
      body.appendChild(warn); updWarn();
      if (SHORT[f.type] && p) {
        var can = canJoin(p);
        body.appendChild(el('label', { class: 'chk' + (can ? '' : ' is-off') },
          el('input', { type: 'checkbox', checked: p.row ? 'checked' : null, disabled: can ? null : 'disabled', onchange: function () { toggleJoin(U(f)); } }),
          ' Sebaris dengan isian di atasnya (maks. ' + ROW_MAX + ' per baris, hanya isian pendek)'));
      }
      if (['select', 'radio', 'checkbox'].indexOf(f.type) >= 0) body.appendChild(fld('Pilihan (satu per baris)', lines(f.options, 'Pilihan 1\nPilihan 2', 5), 'Maksimal 40 pilihan.'));
      if (f.type === 'consent') body.appendChild(el('div', { class: 'cols' }, fld('Tulisan tautan', text(f.consent, 'text', 60), 'mis. Kebijakan Privasi'), fld('Alamat tautan', text(f.consent, 'url', 300), 'https://… atau /kebijakan-privasi')));
      if (f.type === 'text') {
        body.appendChild(el('h3', { text: 'Saran isian otomatis' }));
        body.appendChild(el('p', { class: 'muted', text: 'Saat pengunjung mengetik, muncul saran dari daftar buatan Anda dan/atau dari isian pengunjung lain.' }));
        var shared = [['', 'Tidak memakai daftar bersama']].concat((opts.lists || []).map(function (l) { return [l.slug, l.name + ' (' + l.n + ' entri)']; }));
        body.appendChild(fld('Daftar bersama (opsional)', selectBox(shared, f.suggest.shared || '', function (v) { f.suggest.shared = v; changed(); draw(U(f)); }), 'Dipakai bersama isian lain di semua formulir, supaya penulisan seragam. Kelola di menu Daftar saran.'));
        body.appendChild(fld('Daftar khusus isian ini (satu per baris)', lines(f.suggest.list, 'SDN 1 Contoh\nSMP Negeri 2 Contoh', 5), 'Tambahan hanya untuk isian ini. Maksimal 500.'));
        body.appendChild(check('Pelajari juga dari isian pengunjung lain' + (f.suggest.shared ? ' (semua isian yang memakai daftar bersama ini)' : ' (hanya isian ini)'), f.suggest, 'learn'));
        body.appendChild(el('small', { class: 'muted', text: 'Nilai yang pernah diisi satu pengunjung langsung bisa disarankan ke pengunjung lain. Aktifkan hanya untuk data non-pribadi (mis. nama sekolah), bukan nama, email, atau nomor telepon.' }));
      }
      body.appendChild(el('h3', { text: 'Tampil hanya jika…' }));
      var showKey = f.showIf && f.showIf.key ? f.showIf.key : '';
      var eqIn = el('input', { type: 'text', maxlength: '80', placeholder: 'kosong = terisi apa saja', value: f.showIf ? f.showIf.equals || '' : '', oninput: function (e) { if (f.showIf) f.showIf.equals = e.target.value; changed(); } });
      body.appendChild(el('div', { class: 'cols' },
        fld('Isian pemicu', trigger(f), earlier(f).length ? 'Hanya isian yang tampil lebih dulu (di atas, atau di langkah sebelumnya) yang bisa dipilih.' : 'Belum ada isian di atas isian ini.'),
        showKey ? fld('Bernilai', eqIn, 'Cocokkan dengan pilihan/teks persis.') : el('div')));
      return body;
    }
    function subline(f) { return TNAME[f.type] + (f.required || f.type === 'consent' ? ' · wajib' : '') + (f.showIf && f.showIf.key ? ' · bersyarat' : ''); }

    function fieldItem(f, inRow, pos, total) {
      var u = U(f); reg[u] = f;
      var isOpen = !!open[u];
      var ttl = el('strong', { class: 'fe-ttl', text: label(f) });
      var sub = el('small', { class: 'muted fe-sub', text: subline(f) });
      var node = el('div', { class: 'fe-item fe-field' + (isOpen ? ' open' : ''), 'data-u': u, 'data-short': SHORT[f.type] ? '1' : '0' });
      var head = el('div', { class: 'fe-head' },
        el('span', { class: 'fe-h', title: 'Seret untuk memindahkan', 'aria-hidden': 'true', text: '⠿' }),
        el('span', { class: 'fe-ico', 'aria-hidden': 'true', text: (TYPES.filter(function (t) { return t[0] === f.type; })[0] || [0, 0, '?'])[2] }),
        el('div', { class: 'fe-grow' }, ttl, ' ', sub),
        el('button', { type: 'button', class: 'fe-b', 'data-act': 'up', title: inRow ? 'Geser ke kiri' : 'Naik', 'aria-label': (inRow ? 'Geser ke kiri: ' : 'Naik: ') + label(f), onclick: function () { move(u, -1); } }, inRow ? '←' : '↑'),
        el('button', { type: 'button', class: 'fe-b', 'data-act': 'down', title: inRow ? 'Geser ke kanan' : 'Turun', 'aria-label': (inRow ? 'Geser ke kanan: ' : 'Turun: ') + label(f), onclick: function () { move(u, 1); } }, inRow ? '→' : '↓'),
        el('button', { type: 'button', class: 'link', 'aria-expanded': isOpen ? 'true' : 'false', onclick: function () { open[u] = !isOpen; draw(isOpen ? null : u); } }, isOpen ? 'Tutup' : 'Ubah'),
        el('button', { type: 'button', class: 'link danger', 'aria-label': 'Hapus: ' + label(f), onclick: function () { remove(u); } }, 'Hapus'));
      node.appendChild(head);
      if (isOpen) node.appendChild(fieldBody(f, ttl, sub));
      return node;
    }
    function layoutItem(it) {
      var u = U(it); reg[u] = it;
      var node = el('div', { class: 'fe-item fe-lay fe-lay-' + it.t, 'data-u': u, 'data-short': '0' });
      var name = it.t === 'h' ? 'Judul' : it.t === 'text' ? 'Teks penjelas' : 'Garis pemisah';
      node.appendChild(el('div', { class: 'fe-head' },
        el('span', { class: 'fe-h', title: 'Seret untuk memindahkan', 'aria-hidden': 'true', text: '⠿' }),
        el('span', { class: 'fe-ico', 'aria-hidden': 'true', text: it.t === 'h' ? 'H' : it.t === 'text' ? 'T' : '―' }),
        el('div', { class: 'fe-grow' }, el('strong', { text: name })),
        el('button', { type: 'button', class: 'fe-b', 'data-act': 'up', 'aria-label': 'Naik: ' + name, title: 'Naik', onclick: function () { move(u, -1); } }, '↑'),
        el('button', { type: 'button', class: 'fe-b', 'data-act': 'down', 'aria-label': 'Turun: ' + name, title: 'Turun', onclick: function () { move(u, 1); } }, '↓'),
        el('button', { type: 'button', class: 'link danger', 'aria-label': 'Hapus: ' + name, onclick: function () { remove(u); } }, 'Hapus')));
      if (it.t === 'h') {
        var k = text(it, 'text', 120, 'Teks judul (Anak & Remaja)'); k.setAttribute('data-focus', 'label');
        node.appendChild(el('div', { class: 'fe-lbody' }, el('div', { class: 'cols' }, fld('Teks (Anak & Remaja)', k), fld('Teks (Dewasa & Bisnis)', text(it, 'textAdult', 120, ''), 'Kosong = sama.')),
          fld('Ukuran', selectBox([['2', 'Besar'], ['3', 'Sedang']], String(it.level), function (v) { it.level = v === '3' ? 3 : 2; changed(); }))));
      } else if (it.t === 'text') {
        var a = el('textarea', { rows: '2', maxlength: '400', placeholder: 'Teks penjelas (Anak & Remaja)', value: it.text || '', oninput: function (e) { it.text = e.target.value; changed(); } }); a.setAttribute('data-focus', 'label');
        node.appendChild(el('div', { class: 'fe-lbody' }, el('div', { class: 'cols' }, fld('Teks (Anak & Remaja)', a),
          fld('Teks (Dewasa & Bisnis)', el('textarea', { rows: '2', maxlength: '400', value: it.textAdult || '', oninput: function (e) { it.textAdult = e.target.value; changed(); } }), 'Kosong = sama.'))));
      } else node.appendChild(el('div', { class: 'fe-lbody' }, el('hr', { class: 'fe-hrprev' })));
      return node;
    }
    function rowItem(r) {
      var u = U(r); reg[u] = r;
      var list = el('div', { class: 'fe-list fe-rowlist', 'data-row': u, 'data-ph': 'Seret isian pendek ke sini' });
      r.fs.forEach(function (f, n) { list.appendChild(fieldItem(f, true, n, r.fs.length)); });
      var node = el('div', { class: 'fe-row', 'data-u': u, 'data-short': '0' },
        el('div', { class: 'fe-head' },
          el('span', { class: 'fe-h', title: 'Seret untuk memindahkan', 'aria-hidden': 'true', text: '⠿' }),
          el('span', { class: 'fe-ico', 'aria-hidden': 'true', text: '▯▯' }),
          el('div', { class: 'fe-grow' }, el('strong', { text: 'Baris' }), ' ', el('small', { class: 'muted', text: 'isian berdampingan (di ponsel disusun ke bawah), maks. ' + ROW_MAX })),
          el('button', { type: 'button', class: 'fe-b', 'data-act': 'up', 'aria-label': 'Naik: baris', title: 'Naik', onclick: function () { move(u, -1); } }, '↑'),
          el('button', { type: 'button', class: 'fe-b', 'data-act': 'down', 'aria-label': 'Turun: baris', title: 'Turun', onclick: function () { move(u, 1); } }, '↓'),
          el('button', { type: 'button', class: 'link', onclick: function () { var p = find(u); dissolve(r, p.list, p.i); changed(); draw(); } }, 'Pisahkan'),
          el('button', { type: 'button', class: 'link danger', 'aria-label': 'Hapus baris', onclick: function () { var p = find(u); p.list.splice(p.i, 1); changed(); draw(); } }, 'Hapus')),
        list);
      return node;
    }

    function stepSection(st, s) {
      var list = el('div', { class: 'fe-list fe-steplist', 'data-step': String(s), 'data-ph': 'Langkah ini masih kosong. Seret isian dari atas, atau klik sebuah kotak di atas.' });
      st.items.forEach(function (it) {
        if (it.t === 'field') list.appendChild(fieldItem(it.f, false));
        else if (it.t === 'row') list.appendChild(rowItem(it));
        else list.appendChild(layoutItem(it));
      });
      var multi = model.length > 1;
      var nameIn = el('input', { type: 'text', class: 'fe-stepname', maxlength: '40', placeholder: multi ? 'Nama langkah (mis. Data diri)' : 'Nama langkah (opsional bila hanya satu)', 'aria-label': 'Nama langkah ' + (s + 1), value: st.name || '',
        oninput: function (e) { st.name = e.target.value; changed(); drawProblems(); } });
      var sec = el('section', { class: 'fe-step' + (s === cur ? ' is-cur' : ''), 'data-s': String(s), 'aria-label': 'Langkah ' + (s + 1) },
        el('div', { class: 'fe-step-head' },
          el('span', { class: 'fe-badge', text: 'Langkah ' + (s + 1) }),
          nameIn,
          el('button', { type: 'button', class: 'fe-b', title: 'Pindahkan langkah ke atas', 'aria-label': 'Naikkan langkah ' + (s + 1), disabled: s === 0 ? 'disabled' : null, onclick: function () { moveStep(s, -1); } }, '↑'),
          el('button', { type: 'button', class: 'fe-b', title: 'Pindahkan langkah ke bawah', 'aria-label': 'Turunkan langkah ' + (s + 1), disabled: s === model.length - 1 ? 'disabled' : null, onclick: function () { moveStep(s, 1); } }, '↓'),
          multi ? el('button', { type: 'button', class: 'link danger', onclick: function () { removeStep(s); } }, 'Hapus langkah') : null),
        list);
      sec.addEventListener('focusin', function () { setCur(s); });
      sec.addEventListener('pointerdown', function () { setCur(s); });
      return sec;
    }
    function setCur(s) {
      if (cur === s) return;
      cur = s;
      Array.prototype.forEach.call(root.querySelectorAll('.fe-step'), function (n) { n.classList.toggle('is-cur', n.getAttribute('data-s') === String(s)); });
    }

    /* ---------- drag and drop ---------- */
    function rebuildFromDom() {
      var created = [];
      function itemOf(n) {
        if (n.classList.contains('fe-tile')) {
          var it = newItem(n.getAttribute('data-type')); created.push(it); return it;
        }
        var u = n.getAttribute('data-u'), o = reg[u];
        if (!o) return null;
        if (n.classList.contains('fe-row')) {
          var fs = [];
          Array.prototype.forEach.call(n.querySelectorAll(':scope > .fe-list > *'), function (c) {
            var x = itemOf(c); if (x && x.t === 'field') fs.push(x.f);
          });
          o.fs = fs; return o;
        }
        return o.t ? o : { t: 'field', f: o };
      }
      var next = [];
      Array.prototype.forEach.call(root.querySelectorAll('.fe-steplist'), function (list) {
        var s = parseInt(list.getAttribute('data-step'), 10), items = [];
        Array.prototype.forEach.call(list.children, function (c) { var x = itemOf(c); if (x) items.push(x); });
        next[s] = items;
      });
      next.forEach(function (items, s) { if (model[s]) model[s].items = items; });
      // field limit: drop what was just dropped in above the limit
      var over = fieldCount() - MAX_FIELDS;
      if (over > 0) {
        created.filter(function (x) { return x.t === 'field'; }).slice(-over).forEach(function (x) { var p = find(U(x.f)); if (p) { if (p.row) p.row.fs.splice(p.j, 1); else p.list.splice(p.i, 1); } });
        say('Batas ' + MAX_FIELDS + ' isian tercapai.');
      }
      var focus = null;
      created.forEach(function (x) { if (x.t === 'field') { open[U(x.f)] = true; focus = U(x.f); } else focus = focus || U(x); });
      changed(); draw(focus);
    }
    function sortOpts() {
      return {
        group: { name: 'fe', pull: true, put: function (to, from, dragEl) {
          if (!to.el.classList.contains('fe-rowlist')) return true;
          return dragEl.getAttribute('data-short') === '1' && to.el.children.length < ROW_MAX;
        } },
        handle: '.fe-h', draggable: '.fe-item,.fe-row', animation: 150, ghostClass: 'fe-ghost', chosenClass: 'fe-chosen', dragClass: 'fe-drag',
        fallbackOnBody: true, swapThreshold: 0.65, emptyInsertThreshold: 16,
        setData: function (dt) { try { dt.setData('application/x-fe-item', '1'); } catch (e) { /* nothing to do */ } },
        onStart: function () { root.classList.add('is-dragging'); },
        onEnd: function () { root.classList.remove('is-dragging'); rebuildFromDom(); },
      };
    }

    /* ---------- the page ---------- */
    function tile(t, kind) {
      return el('button', { type: 'button', class: 'fe-tile', 'data-type': t[0], 'data-short': SHORT[t[0]] ? '1' : '0', title: 'Seret ke langkah, atau klik untuk menambahkan di akhir langkah yang dipilih' },
        el('span', { class: 'ic', 'aria-hidden': 'true', text: t[2] }), t[1]);
    }
    function draw(focusU, act) {
      var y = window.scrollY;
      sortables.forEach(function (s) { try { s.destroy(); } catch (e) { /* already gone */ } });
      sortables = [];
      reg = {};
      clear(root);
      var palette = el('div', { class: 'fe-tiles' }, TYPES.map(function (t) { return tile(t); }), el('span', { class: 'fe-sep', 'aria-hidden': 'true' }), LAYOUT.map(function (t) { return tile(t); }));
      palette.addEventListener('click', function (e) { var t = e.target.closest('.fe-tile'); if (t) addFromTile(t.getAttribute('data-type')); });
      sortables.push(Sortable.create(palette, { group: { name: 'fe', pull: 'clone', put: false }, sort: false, draggable: '.fe-tile', animation: 0, fallbackOnBody: true,
        setData: function (dt) { try { dt.setData('application/x-fe-item', '1'); } catch (e) { /* nothing to do */ } },
        onStart: function () { root.classList.add('is-dragging'); }, onEnd: function () { root.classList.remove('is-dragging'); rebuildFromDom(); } }));
      var undoBox = el('span', { class: 'fe-undo', role: 'status', hidden: !lastDel }, 'Dihapus. ', el('button', { type: 'button', class: 'ae-linkbtn', onclick: undo }, 'Urungkan'));
      var dock = el('div', { class: 'fe-dock' },
        el('div', { class: 'fe-dock-bar' }, el('span', { class: 'fe-lbl', text: 'Tambah' }), el('span', { class: 'fe-grow' }), undoBox),
        palette);
      var counts = fieldCount() + ' isian · ' + model.length + ' langkah';
      root.appendChild(el('div', { class: 'fe-top' }, el('h2', { text: 'Susunan formulir' }), el('span', { class: 'muted fe-count', text: counts })));
      root.appendChild(el('p', { class: 'muted' }, 'Susun isian ke dalam langkah. Satu langkah = satu layar dengan tombol Kembali / Lanjut; formulir sependek ini cukup satu langkah. Seret ', el('span', { class: 'fe-hint-h', text: '⠿' }), ' untuk memindahkan, termasuk antar langkah.'));
      root.appendChild(dock);
      root.appendChild(el('div', { class: 'fe-flash flash', role: 'status', hidden: !flash, text: flash }));
      root.appendChild(el('div', { class: 'fe-problems flash err', role: 'alert', hidden: true }));
      var stepsBox = el('div', { class: 'fe-steps' });
      model.forEach(function (st, s) { stepsBox.appendChild(stepSection(st, s)); });
      root.appendChild(stepsBox);
      Array.prototype.forEach.call(stepsBox.querySelectorAll('.fe-list'), function (l) { sortables.push(Sortable.create(l, sortOpts())); });
      root.appendChild(el('div', { class: 'fe-addstep' },
        el('button', { type: 'button', class: 'btn ghost sm', disabled: model.length >= MAX_STEPS ? 'disabled' : null, onclick: addStep }, '+ Tambah langkah'),
        el('small', { class: 'muted', text: model.length >= MAX_STEPS ? 'Batas ' + MAX_STEPS + ' langkah tercapai.' : 'Maksimal ' + MAX_STEPS + ' langkah. Langkah yang semua isiannya sedang tersembunyi (karena "tampil jika") dilewati pengunjung.' })));
      drawProblems();
      window.scrollTo(window.scrollX, y);
      if (focusU) {
        var n = root.querySelector('[data-u="' + focusU + '"]');
        if (n) {
          var f = act ? n.querySelector(':scope > .fe-head [data-act="' + act + '"]') : n.querySelector('[data-focus]');
          if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
          try { n.scrollIntoView({ block: 'nearest' }); } catch (e) { /* abaikan */ }
        }
      }
      flash = '';
    }

    return { root: root, load: load, collect: collect, problems: problems, model: function () { return model; } };
  }

  window.FormEditor = { create: create };
})();
