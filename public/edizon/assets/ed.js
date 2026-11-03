/* Pembantu bersama untuk editor panel yang memakai simpan JSON (lokasi, coba gratis, footer). */
(function () {
  'use strict';
  var E = window.ED = {};
  E.dirty = false;
  E.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); };
  E.el = function (tag, attrs) {
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
  };
  var el = E.el;
  E.uid = function () { var a = new Uint8Array(4); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); };
  E.markDirty = function () { E.dirty = true; document.getElementById('dirty').hidden = false; };
  E.field = function (label, hint, input) {
    return el('label', { class: 'f' }, el('span', { class: 'fl', text: label }), hint ? el('small', { text: hint }) : null, input);
  };
  E.text = function (obj, key, max, ph, onchange) {
    return el('input', { type: 'text', maxlength: String(max), placeholder: ph || '', value: obj[key] || '', oninput: function (e) { obj[key] = e.target.value; E.markDirty(); if (onchange) onchange(e.target.value); } });
  };
  E.area = function (obj, key, max, rows, ph) {
    return el('textarea', { maxlength: String(max), rows: String(rows || 3), placeholder: ph || '', value: obj[key] || '', oninput: function (e) { obj[key] = e.target.value; E.markDirty(); } });
  };
  E.picker = function (obj, key, opts, cls) {
    var box = el('div', { class: 'imgpick' + (cls ? ' ' + cls : '') });
    function draw() {
      E.clear(box);
      if (obj[key]) box.appendChild(el('img', { src: obj[key], alt: '' }));
      else box.appendChild(el('div', { class: 'noimg' + (cls ? ' ' + cls : ''), text: 'Belum ada gambar' }));
      box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
        ENPicker.open(Object.assign({}, opts, { onPick: function (p) { obj[key] = p; E.markDirty(); draw(); } }));
      } }, obj[key] ? 'Ganti gambar' : 'Pilih / unggah gambar'));
    }
    draw();
    return box;
  };
  E.move = function (arr, i, d, redraw) { var x = arr.splice(i, 1)[0]; arr.splice(i + d, 0, x); E.markDirty(); redraw(); };
  E.showErrors = function (list) {
    var box = document.getElementById('errors');
    E.clear(box);
    if (!list || !list.length) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(el('strong', { text: 'Belum bisa disimpan:' }));
    var ul = el('ul'); list.forEach(function (m) { ul.appendChild(el('li', { text: m })); }); box.appendChild(ul);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  /* Lebar kotak pop-up / halaman hasil kuis: teks bebas "angka + satuan". Batas per satuan sama dengan popup_width_parse() di lib/popups.php. */
  var WUNITS = { px: [200, 2400], '%': [20, 100], vw: [20, 100], vh: [20, 200], vmin: [20, 100], vmax: [20, 100], rem: [12, 150], em: [12, 150], ch: [20, 200] };
  /** -> { ok, css, msg }: css = nilai yang dibaca ('' = bawaan 520px) */
  E.widthCheck = function (v) {
    var t = String(v == null ? '' : v).trim().toLowerCase();
    if (t === '') return { ok: true, css: '', msg: 'Kosong: memakai lebar bawaan 520px.' };
    var m = /^(\d{1,4}(?:\.\d{1,2})?)\s*(px|%|vw|vh|vmin|vmax|rem|em|ch)?$/.exec(t);
    if (!m) return { ok: false, msg: 'Lebar tidak dikenali. Contoh: 640px, 80vw, 70vh, 40rem, atau 90%.' };
    var u = m[2] || 'px', n = parseFloat(m[1]), r = WUNITS[u];
    if (n < r[0] || n > r[1]) return { ok: false, msg: 'Lebar dalam ' + u + ' harus antara ' + r[0] + ' dan ' + r[1] + '.' };
    return { ok: true, css: String(n) + u, msg: 'Dibaca ' + n + u + (m[2] ? '' : ' (tanpa satuan dianggap px)') + '.' };
  };
  /**
   * Kolom lebar (teks bebas, px / % / vw / vh / vmin / vmax / rem / em / ch; kosong = 520px) dengan pemeriksaan langsung dan tombol cepat.
   * o: { label, hint, onChange(css, check) }  ->  { node, setInfo(text) }  (setInfo: lebar sebenarnya di layar ini, dari editor isi)
   */
  E.widthField = function (obj, key, o) {
    o = o || {};
    var info = '';
    var inp = el('input', { type: 'text', maxlength: '12', placeholder: '520px', value: obj[key] || '', autocomplete: 'off', spellcheck: 'false', 'aria-label': o.label || 'Lebar',
      oninput: function (e) { obj[key] = e.target.value; E.markDirty(); change(); } });
    var msg = el('small', { class: 'wmsg', role: 'status' });
    function show() {
      var c = E.widthCheck(obj[key]);
      msg.className = 'wmsg' + (c.ok ? '' : ' bad');
      msg.textContent = c.ok ? c.msg + (info ? ' ' + info + '.' : '') : c.msg;
    }
    function change() { show(); if (o.onChange) { var c = E.widthCheck(obj[key]); o.onChange(c.ok ? c.css : '', c); } }
    function set(v) { obj[key] = v; inp.value = v; E.markDirty(); change(); }
    var presets = el('div', { class: 'presets' });
    [['Kecil', '380px'], ['Sedang', '520px'], ['Besar', '720px'], ['Selebar artikel', '960px'], ['80% lebar layar', '80vw']].forEach(function (p) {
      presets.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { set(p[1]); } }, p[0] + ' (' + p[1] + ')'));
    });
    presets.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { set(''); } }, 'Kosongkan'));
    show();
    return {
      node: el('div', null,
        E.field(o.label || 'Lebar', o.hint || 'Kosong = 520px. Tulis angka dan satuan: px, %, vw, vh, vmin, vmax, rem, em, atau ch (tanpa satuan = px). Di layar yang lebih sempit, kotak otomatis selebar layar.', inp),
        msg, presets,
        el('small', { class: 'muted', text: 'Batas: px 200–2400 · % 20–100 · vw 20–100 · vh 20–200 · vmin 20–100 · vmax 20–100 · rem/em 12–150 · ch 20–200. vw/vh mengikuti ukuran jendela pengunjung. Lebar teks artikel adalah 960px.' })),
      setInfo: function (t) { info = t || ''; show(); },
    };
  };
  /** ctx: { csrf, getState(), setState(data), redraw(), afterSave?(json) } */
  E.bindSave = function (ctx) {
    var btn = document.getElementById('save');
    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      fetch(location.pathname + location.search, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': ctx.csrf }, body: JSON.stringify({ data: ctx.getState() }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Respons server tidak dikenali (status ' + r.status + ').'] }; }); })
        .then(function (j) {
          if (!j.ok) { E.showErrors(j.errors || ['Gagal menyimpan.']); return; }
          E.showErrors([]);
          ctx.setState(JSON.parse(JSON.stringify(j.data))); E.dirty = false; document.getElementById('dirty').hidden = true;
          document.getElementById('last-saved').textContent = 'Terakhir disimpan: ' + j.savedAt + ' (tayang di website)';
          ctx.redraw();
          if (ctx.afterSave) ctx.afterSave(j);
        })
        .catch(function () { E.showErrors(['Koneksi terputus. Perubahan Anda belum disimpan.']); })
        .then(function () { btn.disabled = false; btn.textContent = 'Simpan & terbitkan'; });
    });
    window.addEventListener('beforeunload', function (e) { if (E.dirty) { e.preventDefault(); e.returnValue = ''; } });
  };
})();
