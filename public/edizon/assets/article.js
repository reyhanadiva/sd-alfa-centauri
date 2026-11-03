/* Editor artikel: data utama, kategori & tag (dengan saran otomatis), dan editor isi berbasis blok (article-editor.js). */
(function () {
  'use strict';
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var ED = window.ED, el = ED.el;
  var S = boot.data;
  var root = document.getElementById('editor');

  function dirty() { ED.markDirty(); }
  function select(opts, value, onchange) {
    var s = el('select', { onchange: function (e) { onchange(e.target.value); dirty(); } });
    opts.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); });
    return s;
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  /* ---------- saran otomatis ---------- */
  function suggest(input, source, onPick) {
    var wrap = el('div', { class: 'sg-wrap' });
    var list = el('ul', { class: 'sg', role: 'listbox', hidden: true });
    var items = [], active = -1;
    function hide() { list.hidden = true; active = -1; }
    function render() {
      ED.clear(list);
      items = source(input.value);
      if (!items.length) { hide(); return; }
      items.forEach(function (it, i) {
        list.appendChild(el('li', { role: 'option', class: i === active ? 'on' : '', onmousedown: function (e) { e.preventDefault(); pick(it); } },
          el('span', { text: it.name }), el('small', { text: it.n + ' artikel' })));
      });
      list.hidden = false;
    }
    function pick(it) { hide(); onPick(it.name); }
    input.addEventListener('input', function () { active = -1; render(); });
    input.addEventListener('focus', render);
    input.addEventListener('blur', function () { setTimeout(hide, 120); });
    input.addEventListener('keydown', function (e) {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; render(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(items[active]); }
      else if (e.key === 'Escape') hide();
    });
    wrap.appendChild(input); wrap.appendChild(list);
    return wrap;
  }
  function matching(pool, q, skip) {
    q = norm(q);
    return pool.filter(function (t) { return (!skip || skip.indexOf(norm(t.name)) < 0) && (q === '' || norm(t.name).indexOf(q) >= 0); }).slice(0, 8);
  }

  /* ---------- bagian atas ---------- */
  function buildMain() {
    var slugHint = el('small', { class: 'muted' });
    function slugPreview() { slugHint.textContent = 'Alamat: /articles/' + (S.slug || slugify(S.title) || '…'); }
    function slugify(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
    var card = el('div', { class: 'card' },
      ED.field('Judul', 'Wajib. Maks 160 huruf.', ED.text(S, 'title', 160, 'Judul artikel', slugPreview)),
      ED.field('Subjudul', 'Opsional. Satu kalimat pendukung di bawah judul.', ED.text(S, 'subtitle', 300, '')),
      el('label', { class: 'f' }, el('span', { class: 'fl', text: 'Alamat (slug)' }), el('small', { text: 'Kosongkan agar dibuat otomatis dari judul. Hanya huruf kecil, angka, dan tanda hubung.' }),
        ED.text(S, 'slug', 80, 'otomatis dari judul', slugPreview), slugHint),
      el('div', { class: 'f' }, el('span', { class: 'fl', text: 'Gambar utama (hero)' }), el('small', { text: 'Rasio 16:9. Wajib agar artikel bisa terbit.' }),
        ED.picker(S, 'hero', { ratio: 16 / 9, ratioLabel: '16:9', outWidth: 1800, title: 'Gambar utama artikel' }, 'wide')),
      ED.field('Ringkasan', 'Tampil di daftar artikel. Kosong = diambil dari paragraf pertama. Maks 220 huruf.', ED.area(S, 'excerpt', 220, 2, '')),
      ED.field('Penulis', 'Kosongkan untuk memakai nama akun penulisnya: ' + S.writer + '.', ED.text(S, 'author', 80, S.writer)));
    slugPreview();
    return card;
  }

  function buildMeta() {
    /* kategori */
    var cat = el('input', { type: 'text', maxlength: '60', placeholder: 'Mis. Tips Belajar', value: S.category || '', oninput: function (e) { S.category = e.target.value; dirty(); } });
    var catBox = suggest(cat, function (q) { return matching(boot.terms.categories, q); }, function (name) { S.category = name; cat.value = name; dirty(); });
    /* tag */
    var chips = el('div', { class: 'tagchips' });
    var tin = el('input', { type: 'text', maxlength: '40', placeholder: S.tags.length >= 8 ? 'Maksimal 8 tag' : 'Ketik lalu Enter atau koma' });
    function drawChips() {
      ED.clear(chips);
      S.tags.forEach(function (t, i) {
        chips.appendChild(el('span', { class: 'tchip' }, '#' + t, el('button', { type: 'button', 'aria-label': 'Hapus tag ' + t, onclick: function () { S.tags.splice(i, 1); dirty(); drawChips(); } }, '×')));
      });
      tin.disabled = S.tags.length >= 8;
    }
    function addTag(v) {
      v = String(v || '').replace(/^#+/, '').trim();
      if (!v || S.tags.length >= 8) return;
      if (!S.tags.some(function (x) { return norm(x) === norm(v); })) { S.tags.push(v); dirty(); }
      tin.value = ''; drawChips(); tin.focus();
    }
    var tagBox = suggest(tin, function (q) { return matching(boot.terms.tags, q, S.tags.map(norm)); }, addTag);
    tin.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tin.value); }
      else if (e.key === 'Backspace' && tin.value === '' && S.tags.length) { S.tags.pop(); dirty(); drawChips(); }
    });
    tin.addEventListener('blur', function () { setTimeout(function () { if (tin.value.trim()) addTag(tin.value); }, 150); });
    drawChips();
    /* tampilan */
    var auds = el('div', { class: 'checks' });
    [['kids', 'Anak & Remaja'], ['adult', 'Dewasa & Bisnis']].forEach(function (a) {
      var cb = el('input', { type: 'checkbox', onchange: function (e) {
        var i = S.audiences.indexOf(a[0]);
        if (e.target.checked && i < 0) S.audiences.push(a[0]);
        if (!e.target.checked && i >= 0) S.audiences.splice(i, 1);
        dirty();
      } });
      cb.checked = S.audiences.indexOf(a[0]) >= 0;
      auds.appendChild(el('label', { class: 'chk' }, cb, ' ' + a[1]));
    });
    /* lebar isi artikel: disimpan sebagai S.seo.layout ('full' atau ''), bersama data SEO */
    var full = el('input', { type: 'checkbox', id: 'art-full', onchange: function (e) {
      S.seo = S.seo || {}; S.seo.layout = e.target.checked ? 'full' : '';
      if (editor) editor.setFullWidth(e.target.checked);
      dirty();
    } });
    full.checked = !!S.seo && S.seo.layout === 'full';
    var pub = el('input', { type: 'datetime-local', value: S.publishedAt || '', onchange: function (e) { S.publishedAt = e.target.value; dirty(); } });
    return el('div', { class: 'card' },
      el('div', { class: 'cols' },
        el('div', null, el('div', { class: 'f' }, el('span', { class: 'fl', text: 'Kategori' }), el('small', { text: 'Satu kategori. Pilih dari saran atau buat baru.' }), catBox),
          el('div', { class: 'f' }, el('span', { class: 'fl', text: 'Tag' }), el('small', { text: 'Sampai 8. Artikel dengan tag yang sama saling disarankan.' }), chips, tagBox)),
        el('div', null, el('div', { class: 'f' }, el('span', { class: 'fl', text: 'Tampil di' }), el('small', { text: 'Seperti pada pengajar: artikel muncul hanya pada tampilan yang dicentang. Minimal satu agar bisa terbit.' }), auds),
          el('div', { class: 'f' }, el('span', { class: 'fl', text: 'Lebar isi artikel' }),
            el('small', { text: 'Dicentang: isi artikel (teks, gambar, tabel, blok HTML) memakai seluruh lebar browser, bukan lebar template. Judul dan tag tetap di tengah. Cocok untuk halaman HTML penuh. Tidak dicentang: lebar template.' }),
            el('label', { class: 'chk' }, full, ' Pakai lebar layar penuh')),
          ED.field('Status', 'Draf tidak terlihat publik.', select([['draft', 'Draf'], ['published', 'Terbit']], S.status, function (v) { S.status = v; })),
          ED.field('Tanggal terbit (WIB)', 'Kosong = saat pertama kali diterbitkan. Tanggal di masa depan = tayang terjadwal.', pub))));
  }

  /* ---------- isi artikel: editor blok (article-editor.js) ---------- */
  var editor = null, blocksCard = null;
  var LINK_ATTRS = /<a\s[^>]*>/g;
  function canon(v) {
    // the server adds target/rel to external links and writes quotes as &quot; / &#039; (the editors keep them as typed), and trims text: none of that is a content change
    if (typeof v === 'string') return v.replace(LINK_ATTRS, function (m) { return m.replace(/\s(?:target|rel)="[^"]*"/g, ''); }).replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o; }
    return v;
  }
  function sameBlocks(a, b) { return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); }

  function buildBlocks() {
    if (!window.ArtEditor) {
      return el('div', { class: 'card' }, el('h2', { text: 'Isi artikel' }), el('p', { class: 'flash err', text: 'Editor isi gagal dimuat. Muat ulang halaman dengan Ctrl+F5.' }));
    }
    var box = null;
    editor = window.ArtEditor.create({
      blocks: Array.isArray(S.blocks) ? S.blocks : [],
      isAdmin: !!boot.isAdmin,
      csrf: boot.csrf,
      templatesUrl: 'templates.php', // shared list of saved blocks (Templat)
      fullWidth: !!S.seo && S.seo.layout === 'full',
      articleId: function () { return S.id || 0; }, // read when a preview is loaded: a new article gets its id after the first save
      // the SEO analysis listens for input events on #editor; blocks moved or deleted by dragging and clicking do not raise one by themselves
      onChange: function () { dirty(); if (box) box.dispatchEvent(new Event('input', { bubbles: true })); },
    });
    // from here on S.blocks always reads (and writes) the editor's current content, so saving and the SEO analysis need no copy step
    Object.defineProperty(S, 'blocks', { configurable: true, enumerable: true, get: function () { return editor.getBlocks(); }, set: function (v) { editor.setBlocks(v); } });
    box = el('section', { class: 'ae-section' },
      el('h2', { text: 'Isi artikel' }),
      el('p', { class: 'muted', text: 'Seret blok dari bilah di atas ke halaman, lalu klik blok untuk mengisinya. Pengaturan blok dan format teks ada di bilah yang sama. Judul artikel sendiri adalah H1, jadi mulai isi dari Judul (H2).' }),
      editor.root);
    return box;
  }

  function draw() {
    ED.clear(root);
    root.appendChild(buildMain());
    root.appendChild(buildMeta());
    var again = !!blocksCard;
    if (!blocksCard) blocksCard = buildBlocks(); // built once: the editor keeps its state (and focus history) across saves
    root.appendChild(blocksCard);
    if (again && editor && editor.reloadPreviews) editor.reloadPreviews(); // moving the editor in the page reloads its HTML-block frames
    if (window.ArtSEO) root.appendChild(window.ArtSEO.build(S));
    if (window.ED.revisions) root.appendChild(revCard().node);
  }

  /* ---------- riwayat versi ---------- */
  var rev = null;
  function revCard() {
    if (!rev) {
      rev = ED.revisions({
        kind: 'article', getId: function () { return S.id || 0; }, getState: function () { return S; },
        keep: ['id', 'slug', 'status', 'publishedAt', 'writer', 'url'],
        keepNote: 'Alamat (slug), status terbit, dan tanggal terbit tidak ikut dikembalikan.',
        preview: function (rid) { return 'article-preview.php?id=' + S.id + '&rev=' + rid; },
        apply: function (m) {
          var blocks = m.blocks; delete m.blocks; // S.blocks is the editor itself: set it through the editor
          Object.assign(S, m);
          if (editor) editor.setBlocks(blocks);
          draw();
        },
      });
    }
    return rev;
  }

  /* ---------- pratinjau (isi editor saat ini, tanpa menyimpan) ---------- */
  var pform = null;
  document.getElementById('preview').addEventListener('click', function () {
    if (!pform) {
      pform = el('form', { method: 'post', action: 'article-preview.php', target: '_blank', hidden: true },
        el('input', { type: 'hidden', name: '_csrf', value: boot.csrf }), el('input', { type: 'hidden', name: 'data' }));
      document.body.appendChild(pform);
    }
    pform.querySelector('[name=data]').value = JSON.stringify(S);
    pform.submit();
  });

  /* ---------- simpan ---------- */
  var btn = document.getElementById('save');
  btn.addEventListener('click', function () {
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    fetch('article.php' + (S.id ? '?id=' + S.id : ''), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': boot.csrf }, body: JSON.stringify({ data: S }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Respons server tidak dikenali (status ' + r.status + ').'] }; }); })
      .then(function (j) {
        if (!j.ok) { ED.showErrors(j.errors || ['Gagal menyimpan.']); return; }
        ED.showErrors([]);
        var wasNew = !S.id;
        var fresh = j.data, blocks = fresh.blocks;
        delete fresh.blocks;
        Object.assign(S, fresh); // in place: the editor and the other fields keep pointing at S
        if (editor && !sameBlocks(editor.getBlocks(), blocks)) editor.setBlocks(blocks, { keep: true }); // only when the server changed something (cleaned markup, new ids)
        ED.dirty = false; document.getElementById('dirty').hidden = true;
        document.getElementById('last-saved').textContent = 'Terakhir disimpan: ' + j.savedAt + (S.status === 'published' ? ' (terbit)' : ' (draf)');
        var v = document.getElementById('viewlink'); if (v) { v.hidden = false; v.href = 'article-preview.php?id=' + S.id; }
        if (wasNew && window.history && history.replaceState) history.replaceState(null, '', 'article.php?id=' + S.id);
        document.title = 'Edit artikel · Panel SD Alfa Centauri';
        draw();
        if (rev) rev.refresh();
      })
      .catch(function () { ED.showErrors(['Koneksi terputus. Perubahan Anda belum disimpan.']); })
      .then(function () { btn.disabled = false; btn.textContent = 'Simpan'; });
  });
  window.addEventListener('beforeunload', function (e) { if (ED.dirty) { e.preventDefault(); e.returnValue = ''; } });

  ENPicker.init({ csrf: boot.csrf });
  draw();
})();
