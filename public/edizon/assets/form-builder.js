/* Pembuat formulir: identitas, Zapier, teks (Anak/Dewasa), dan susunan isian (langkah, baris, judul). Susunan digambar oleh form-editor.js. */
(function () {
  'use strict';
  var E = ED, el = E.el, field = E.field;
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var S = boot.data;
  var root = document.getElementById('editor');
  var TEXTS = [['eyebrow', 'Teks kecil di atas judul', 120, 1], ['title', 'Judul', 120, 1], ['intro', 'Pengantar (opsional)', 400, 3], ['submit', 'Tulisan tombol kirim', 120, 1], ['note', 'Catatan kecil di dekat tombol', 400, 2], ['successTitle', 'Judul setelah terkirim', 120, 1], ['successMsg', 'Pesan setelah terkirim', 400, 3]];
  if (!Array.isArray(S.fields)) S.fields = [];
  S.drafts = S.drafts !== false;

  function sel(opts, value, onchange) {
    var s = el('select', { onchange: function (e) { onchange(e.target.value); E.markDirty(); } });
    opts.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); });
    return s;
  }
  function check(label, obj, key, after) {
    return el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: obj[key] ? 'checked' : null, onchange: function (e) { obj[key] = e.target.checked; E.markDirty(); if (after) after(); } }), ' ' + label);
  }
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }

  function mainCard() {
    var urlHint = el('small', { class: 'muted' });
    function upd() {
      var s = S.slug || slugify(S.name) || '…';
      urlHint.textContent = 'Shortcode: [form:' + s + ']  ·  tautan tombol: #form:' + s + (S.layout === 'page' ? '  ·  halaman: /form/' + s : '');
    }
    upd();
    var hookOpts = [['', 'Tidak terhubung ke Zapier']].concat(boot.hooks.map(function (h) { return [h.formId, h.formId + (h.label ? ' (' + h.label + ')' : '')]; }));
    if (S.zapierFormId && !boot.hooks.some(function (h) { return h.formId === S.zapierFormId; })) hookOpts.push([S.zapierFormId, S.zapierFormId + ' (belum ada webhook)']);
    return el('section', { class: 'card' },
      el('h2', { text: 'Dasar' }),
      el('div', { class: 'cols' },
        el('div', null,
          field('Nama formulir (internal)', null, E.text(S, 'name', 100, 'mis. Pendaftaran Webinar', upd)),
          field('Alamat (slug)', boot.builtin ? 'Formulir bawaan: alamat tidak bisa diubah.' : 'Huruf kecil, angka, dan tanda hubung. Kosong = dibuat dari nama.', boot.builtin ? el('input', { type: 'text', value: S.slug, disabled: 'disabled' }) : E.text(S, 'slug', 60, 'webinar-april', upd)),
          urlHint),
        el('div', null,
          field('Tipe', 'Pop-up: jendela di atas halaman. Halaman: alamat sendiri di /form/…', sel([['popup', 'Pop-up'], ['page', 'Halaman']], S.layout, function (v) { S.layout = v; upd(); })),
          field('Status', 'Draf tidak bisa dibuka pengunjung.', sel([['draft', 'Draf'], ['published', 'Terbit']], S.status, function (v) { S.status = v; })),
          check('Jika pengiriman gagal, tawarkan kirim lewat WhatsApp', S, 'waFallback'),
          check('Simpan isian pengunjung sementara di perangkatnya (draf)', S, 'drafts'),
          el('small', { class: 'muted', text: 'Isian yang belum terkirim dipulihkan saat pengunjung membukanya lagi di perangkat yang sama. Disimpan hanya di browser pengunjung (bukan di server) selama 3 hari sejak perubahan terakhir, dihapus setelah terkirim, tanpa kotak persetujuan dan berkas. Formulir berisi data pribadi: pastikan sesuai kebijakan privasi Anda (UU PDP).' }))),
      el('h3', { text: 'Zapier' }),
      el('p', { class: 'muted', text: 'Semua isian yang terisi dikirim ke webhook Zapier, ditambah form_id, nama formulir, alamat, ID kiriman, audiens, halaman, dan querystring. URL webhook diatur Admin di Pengaturan situs. Data juga selalu tersimpan di database (menu Pendaftar).' }),
      el('div', { class: 'cols' },
        field('Form ID Zapier', null, sel(hookOpts, S.zapierFormId, function (v) { S.zapierFormId = v; })),
        field('Nama formulir di Zapier', 'Dikirim sebagai form_name.', E.text(S, 'zapierFormName', 100, 'New Form'))));
  }

  function textsCard() {
    var tab = el('div');
    var cur = 'kids';
    function draw() {
      E.clear(tab);
      var a = cur;
      tab.appendChild(el('p', { class: 'tabs' },
        el('a', { href: '#', class: a === 'kids' ? 'on' : '', onclick: function (e) { e.preventDefault(); cur = 'kids'; draw(); } }, 'Anak & Remaja'),
        el('a', { href: '#', class: a === 'adult' ? 'on' : '', onclick: function (e) { e.preventDefault(); cur = 'adult'; draw(); } }, 'Dewasa & Bisnis')));
      if (a === 'adult') tab.appendChild(el('p', { class: 'muted', text: 'Kosong = memakai teks Anak & Remaja.' }));
      TEXTS.forEach(function (t) {
        var obj = S.texts[a];
        tab.appendChild(field(t[1], null, t[3] > 1 ? E.area(obj, t[0], t[2], t[3]) : E.text(obj, t[0], t[2])));
      });
    }
    draw();
    return el('section', { class: 'card' }, el('h2', { text: 'Teks tampilan' }), tab);
  }

  var FE = window.FormEditor.create({
    lists: boot.lists || [],
    onChange: function () { E.markDirty(); },
    meta: function () { return { zapier: !!S.zapierFormId || !!boot.builtin }; }
  });
  FE.load(S);

  function draw() {
    E.clear(root);
    root.appendChild(mainCard());
    root.appendChild(textsCard());
    root.appendChild(FE.root);
  }
  E.bindSave({
    csrf: boot.csrf,
    getState: function () { FE.collect(S); return S; },
    setState: function (d) {
      var wasNew = !S.id && d.id;
      S = d; S.drafts = S.drafts !== false;
      FE.load(S);
      boot.builtin = S.slug === 'free-trial';
      var v = document.getElementById('viewlink');
      v.href = 'form-preview.php?id=' + S.id; v.hidden = false;
      if (wasNew) history.replaceState(null, '', 'form.php?id=' + S.id);
    },
    redraw: draw
  });
  draw();
})();
