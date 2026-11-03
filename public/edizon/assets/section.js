/* Editor section beranda (umum): dirender dari skema (lib/sections.php). Tab Bahasa Indonesia / English / Umum. */
(function () {
  'use strict';
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var E = window.ED, el = E.el;
  var schema = boot.schema;
  var root = document.getElementById('editor');
  var tabsEl = document.getElementById('langtabs');
  var state = JSON.parse(JSON.stringify(boot.data || {}));
  var TABS = [['id', 'Bahasa Indonesia'], ['en', 'English']];
  if (schema.shared && schema.shared.length) TABS.push(['shared', 'Umum (kedua bahasa)']);
  var cur = 'id';
  var focusKey = null;

  /* ---------- bentuk data ---------- */
  function blank(n) {
    switch (n.t) {
      case 'group': return fill(n.fields, {});
      case 'list': case 'strs': case 'imgs': case 'pairs': return [];
      case 'title2': return ['', ''];
      case 'nums': var a = []; for (var i = 0; i < n.exact; i++) a.push(null); return a;
      case 'num': return null;
      case 'select': return Object.keys(n.opts)[0];
      default: return '';
    }
  }
  function fill(fields, obj) {
    fields.forEach(function (n) {
      var v = obj[n.k];
      if (v === undefined || v === null) { obj[n.k] = blank(n); if (n.t === 'num') obj[n.k] = null; return; }
      if (n.t === 'group') { if (typeof v !== 'object' || Array.isArray(v)) obj[n.k] = blank(n); else fill(n.fields, v); }
      else if (n.t === 'list') { if (!Array.isArray(v)) obj[n.k] = []; else v.forEach(function (it, i) { if (typeof it !== 'object' || !it) v[i] = it = {}; fill(n.fields, it); }); }
      else if (n.t === 'title2') { if (!Array.isArray(v)) obj[n.k] = ['', '']; else { v[0] = v[0] || ''; v[1] = v[1] || ''; } }
      else if (n.t === 'strs' || n.t === 'imgs' || n.t === 'pairs') { if (!Array.isArray(v)) obj[n.k] = []; }
      else if (n.t === 'nums') { var a = Array.isArray(v) ? v.slice(0, n.exact) : []; while (a.length < n.exact) a.push(null); obj[n.k] = a; }
      else if (n.t !== 'num' && typeof v !== 'string') obj[n.k] = String(v);
    });
    return obj;
  }
  function normalize() {
    ['id', 'en'].forEach(function (l) { if (!state[l] || typeof state[l] !== 'object') state[l] = {}; fill(schema.fields, state[l]); });
    if (schema.shared && schema.shared.length) { if (!state.shared || typeof state.shared !== 'object') state.shared = {}; fill(schema.shared, state.shared); }
    else delete state.shared;
  }
  normalize();

  /* ---------- sinkron antar bahasa ---------- */
  function other() { return cur === 'id' ? 'en' : (cur === 'en' ? 'id' : null); }
  function walk(rootObj, path) {
    var o = rootObj;
    for (var i = 0; i < path.length; i++) { if (o === undefined || o === null) return undefined; o = o[path[i]]; }
    return o;
  }
  function idxCount(path) { return path.filter(function (p) { return typeof p === 'number'; }).length; }
  function syncSet(path, value) {
    var ol = other(); if (!ol || idxCount(path) > 1) return;
    var parent = walk(state[ol], path.slice(0, -1));
    if (parent && typeof parent === 'object') parent[path[path.length - 1]] = JSON.parse(JSON.stringify(value));
  }
  function mirrorOp(path, fn) {
    var ol = other(); if (!ol || idxCount(path) > 0) return;
    var arr = walk(state[ol], path);
    if (Array.isArray(arr)) fn(arr);
  }

  /* ---------- kontrol ---------- */
  function field(n, input, extra) {
    return el('div', { class: 'f' }, el('span', { class: 'fl', text: n.l + (n.req ? ' *' : '') }), n.h ? el('small', { text: n.h }) : null,
      n.max && (n.t === 'text' || n.t === 'area' || n.t === 'rich' || n.t === 'link') ? el('small', { class: 'muted', text: 'Maksimal ' + n.max + ' karakter.' }) : null, input, extra || null);
  }
  function textInput(n, obj, path) {
    return el('input', { type: 'text', maxlength: String(n.max), value: obj[n.k] || '', 'data-k': path.join('.'), oninput: function (e) { obj[n.k] = e.target.value; E.markDirty(); if (n.s) syncSet(path, e.target.value); } });
  }
  function control(n, obj, path) {
    var p = path.concat([n.k]);
    switch (n.t) {
      case 'text': case 'rich': case 'link': return field(n, textInput(n, obj, p));
      case 'area': return field(n, el('textarea', { maxlength: String(n.max), rows: String(n.rows || 3), value: obj[n.k] || '', 'data-k': p.join('.'), oninput: function (e) { obj[n.k] = e.target.value; E.markDirty(); } }));
      case 'num': return field(n, el('input', { type: 'number', min: String(n.min || 0), max: String(n.maxv || 999999), step: '1', value: obj[n.k] === null ? '' : String(obj[n.k]),
        oninput: function (e) { var v = e.target.value; obj[n.k] = v === '' ? null : parseInt(v, 10); E.markDirty(); if (n.s) syncSet(p, obj[n.k]); } }));
      case 'select': {
        var sel = el('select', { onchange: function (e) { obj[n.k] = e.target.value; E.markDirty(); if (n.s) syncSet(p, obj[n.k]); } });
        Object.keys(n.opts).forEach(function (k) { var o = el('option', { value: k, text: n.opts[k] }); if (obj[n.k] === k) o.selected = true; sel.appendChild(o); });
        return field(n, sel);
      }
      case 'title2': return el('div', { class: 'f' }, el('span', { class: 'fl', text: n.l }), n.h ? el('small', { text: n.h }) : null,
        el('div', { class: 'cols' },
          el('input', { type: 'text', maxlength: String(n.max), value: obj[n.k][0], placeholder: 'Bagian pertama', oninput: function (e) { obj[n.k][0] = e.target.value; E.markDirty(); } }),
          el('input', { type: 'text', maxlength: String(n.max), value: obj[n.k][1], placeholder: 'Bagian kedua (miring, berwarna)', oninput: function (e) { obj[n.k][1] = e.target.value; E.markDirty(); } })));
      case 'image': return imageField(n, obj, p);
      case 'strs': return strsField(n, obj);
      case 'imgs': return imgsField(n, obj, p);
      case 'nums': return numsField(n, obj);
      case 'pairs': return pairsField(n, obj);
      case 'group': return el('section', { class: 'card sub' }, el('h2', { text: n.l }), fields(n.fields, obj[n.k], p));
      case 'list': return listField(n, obj, p);
    }
    return null;
  }
  function fields(list, obj, path) {
    var wrap = el('div', { class: 'fields' });
    list.forEach(function (n) { var c = control(n, obj, path); if (c) wrap.appendChild(c); });
    return wrap;
  }
  function pickOpts(n) { return { ratio: n.ratio || 1, ratioLabel: n.rl || '', outWidth: n.w || 1200, title: n.l, minZoom: 0.3 }; }
  function imageField(n, obj, p) {
    var box = el('div', { class: 'imgpick' });
    function draw() {
      E.clear(box);
      if (obj[n.k]) box.appendChild(el('img', { src: obj[n.k], alt: '' })); else box.appendChild(el('div', { class: 'noimg', text: 'Belum ada gambar' }));
      box.appendChild(el('div', { class: 'row-btns' },
        el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
          ENPicker.open(Object.assign({}, pickOpts(n), { onPick: function (path) { obj[n.k] = path; E.markDirty(); if (n.s) syncSet(p, path); draw(); } }));
        } }, obj[n.k] ? 'Ganti gambar' : 'Pilih / unggah gambar'),
        obj[n.k] && !n.req ? el('button', { type: 'button', class: 'link danger', onclick: function () { obj[n.k] = ''; E.markDirty(); if (n.s) syncSet(p, ''); draw(); } }, 'Hapus gambar') : null));
    }
    draw();
    return field(n, box, n.rl ? el('small', { class: 'muted', text: 'Rasio ' + n.rl + ' (dipotong otomatis).' }) : null);
  }
  function imgsField(n, obj, p) {
    var box = el('div', { class: 'imgs' });
    function draw() {
      E.clear(box);
      var row = el('div', { class: 'imgs-row' });
      obj[n.k].forEach(function (src, i) {
        row.appendChild(el('div', { class: 'thumb' }, el('img', { src: src, alt: '' }),
          el('button', { type: 'button', class: 'link danger', onclick: function () { obj[n.k].splice(i, 1); E.markDirty(); if (n.s) syncSet(p, obj[n.k]); draw(); } }, 'Hapus')));
      });
      box.appendChild(row);
      if (obj[n.k].length < n.mx) box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
        ENPicker.open({ ratio: 4 / 5, ratioLabel: '4:5', outWidth: 1200, title: n.l, minZoom: 0.3, onPick: function (path) { obj[n.k].push(path); E.markDirty(); if (n.s) syncSet(p, obj[n.k]); draw(); } });
      } }, '+ Tambah foto'));
    }
    draw();
    return field(n, box);
  }
  function strsField(n, obj) {
    var box = el('div', { class: 'strs' });
    function draw() {
      E.clear(box);
      obj[n.k].forEach(function (v, i) {
        box.appendChild(el('div', { class: 'strrow' },
          el('input', { type: 'text', maxlength: String(n.max), value: v, oninput: function (e) { obj[n.k][i] = e.target.value; E.markDirty(); } }),
          el('button', { type: 'button', class: 'link danger', onclick: function () { obj[n.k].splice(i, 1); E.markDirty(); draw(); } }, 'Hapus')));
      });
      if (!n.exact && obj[n.k].length < n.mx) box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { obj[n.k].push(''); E.markDirty(); draw(); } }, '+ Tambah'));
    }
    if (n.exact) while (obj[n.k].length < n.exact) obj[n.k].push('');
    draw();
    return field(n, box);
  }
  function numsField(n, obj) {
    var box = el('div', { class: 'cols' });
    obj[n.k].forEach(function (v, i) {
      box.appendChild(el('label', { class: 'f' }, el('span', { class: 'fl', text: (n.labels && n.labels[i]) || ('Angka ' + (i + 1)) }),
        el('input', { type: 'number', min: '0', step: '1', value: v === null ? '' : String(v), oninput: function (e) { var x = e.target.value; obj[n.k][i] = x === '' ? null : parseInt(x, 10); E.markDirty(); } })));
    });
    return el('div', { class: 'f' }, el('span', { class: 'fl', text: n.l }), box);
  }
  function pairsField(n, obj) {
    var box = el('div', { class: 'pairs' });
    function draw() {
      E.clear(box);
      obj[n.k].forEach(function (pr, i) {
        box.appendChild(el('div', { class: 'pairrow' },
          el('input', { type: 'text', maxlength: String(n.maxa), value: pr[0], placeholder: n.la, oninput: function (e) { pr[0] = e.target.value; E.markDirty(); } }),
          el('input', { type: 'text', maxlength: String(n.maxb), value: pr[1], placeholder: n.lb, oninput: function (e) { pr[1] = e.target.value; E.markDirty(); } }),
          el('button', { type: 'button', class: 'link danger', onclick: function () { obj[n.k].splice(i, 1); E.markDirty(); draw(); } }, 'Hapus')));
      });
      if (obj[n.k].length < n.mx) box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { obj[n.k].push(['', '']); E.markDirty(); draw(); } }, '+ Tambah baris'));
    }
    draw();
    return field(n, box);
  }
  function itemTitle(n, it, i) {
    for (var k = 0; k < n.fields.length; k++) { var f = n.fields[k]; if ((f.t === 'text' || f.t === 'rich') && it[f.k]) return it[f.k].replace(/\*\*/g, ''); }
    return 'Item ' + (i + 1);
  }
  function listField(n, obj, p) {
    var arr = obj[n.k];
    var box = el('section', { class: 'card sub listbox' });
    var fixed = !!n.fixed;
    function redraw() { draw(); }
    function add() {
      var it = fill(n.fields, {});
      arr.push(it);
      if (n.mirror) mirrorOp(p, function (oa) { oa.push(fill(n.fields, {})); });
      E.markDirty(); focusKey = p.concat([arr.length - 1]).join('.'); redraw();
    }
    function itemEl(it, i) {
      var title = el('strong', { text: itemTitle(n, it, i) });
      var head = el('div', { class: 'item-head' }, el('span', { class: 'num', text: String(i + 1).padStart(2, '0') }), title, el('span', { class: 'grow' }),
        i > 0 ? el('button', { type: 'button', class: 'link', 'aria-label': 'Naikkan', onclick: function () { E.move(arr, i, -1, redraw); if (n.mirror) mirrorOp(p, function (oa) { if (oa.length > i) { var x = oa.splice(i, 1)[0]; oa.splice(i - 1, 0, x); } }); } }, '↑') : null,
        i < arr.length - 1 ? el('button', { type: 'button', class: 'link', 'aria-label': 'Turunkan', onclick: function () { E.move(arr, i, 1, redraw); if (n.mirror) mirrorOp(p, function (oa) { if (oa.length > i + 1) { var x = oa.splice(i, 1)[0]; oa.splice(i + 1, 0, x); } }); } }, '↓') : null,
        !fixed && arr.length > (n.min === undefined ? 1 : n.min) ? el('button', { type: 'button', class: 'link danger', onclick: function () {
          if (!window.confirm('Hapus ' + (n.it || 'item') + ' ini?')) return;
          arr.splice(i, 1); if (n.mirror) mirrorOp(p, function (oa) { if (oa.length > i) oa.splice(i, 1); });
          E.markDirty(); redraw();
        } }, 'Hapus') : null);
      var body = fields(n.fields, it, p.concat([i]));
      body.addEventListener('input', function () { title.textContent = itemTitle(n, it, i); });
      return el('div', { class: 'item', 'data-k': p.concat([i]).join('.') }, head, body);
    }
    function draw() {
      E.clear(box);
      box.appendChild(el('div', { class: 'bar' }, el('h2', { text: n.l + ' (' + arr.length + ')' }),
        !fixed && arr.length < n.mx ? el('button', { type: 'button', class: 'btn ghost sm', onclick: add }, '+ Tambah ' + (n.it || 'item')) : null));
      if (n.mirror && !fixed && cur !== 'shared') box.appendChild(el('p', { class: 'muted', text: 'Menambah, menghapus, dan mengurutkan item di sini ikut berlaku di bahasa lain (tulisannya perlu diterjemahkan sendiri).' }));
      arr.forEach(function (it, i) { box.appendChild(itemEl(it, i)); });
      if (!arr.length) box.appendChild(el('p', { class: 'muted', text: 'Belum ada ' + (n.it || 'item') + '.' }));
      if (!fixed && arr.length >= 5 && arr.length < n.mx) box.appendChild(el('div', { class: 'bar' }, el('span'), el('button', { type: 'button', class: 'btn ghost sm', onclick: add }, '+ Tambah ' + (n.it || 'item'))));
    }
    draw();
    return box;
  }

  /* ---------- tampilan ---------- */
  function drawTabs() {
    E.clear(tabsEl);
    TABS.forEach(function (t) {
      tabsEl.appendChild(el('a', { href: '#' + t[0], role: 'tab', class: t[0] === cur ? 'on' : '', 'aria-selected': t[0] === cur ? 'true' : 'false',
        onclick: function (e) { e.preventDefault(); cur = t[0]; draw(); } }, t[1]));
    });
  }
  function draw() {
    drawTabs();
    E.clear(root);
    var flds = cur === 'shared' ? schema.shared : schema.fields;
    if (cur === 'shared') root.appendChild(el('p', { class: 'muted', text: 'Nilai di tab ini berlaku untuk Bahasa Indonesia dan English.' }));
    else if (cur === 'en') root.appendChild(el('p', { class: 'muted', text: 'Terjemahan Inggris. Foto, ikon, dan tautan ikut tersinkron dari Bahasa Indonesia saat diubah di salah satu tab.' }));
    root.appendChild(fields(flds, state[cur], []));
    if (focusKey) {
      var f = root.querySelector('[data-k="' + focusKey + '"]'); focusKey = null;
      if (f) { f.scrollIntoView({ block: 'center' }); var i = f.querySelector('input,textarea'); if (i) i.focus(); }
    }
  }

  E.bindSave({
    csrf: boot.csrf,
    getState: function () { return state; },
    setState: function (d) { state = d; normalize(); },
    redraw: draw
  });
  document.getElementById('reset').addEventListener('click', function () {
    if (!boot.hasDefaults) { E.showErrors(['Isi bawaan belum tersedia (jalankan npm run seed).']); return; }
    if (!window.confirm('Kembalikan semua isian di halaman ini (kedua bahasa) ke isi bawaan website? Perubahan belum tersimpan sampai Anda menekan Simpan & terbitkan.')) return;
    state = JSON.parse(JSON.stringify(boot.defaults)); normalize(); E.markDirty(); draw();
  });
  draw();
})();
