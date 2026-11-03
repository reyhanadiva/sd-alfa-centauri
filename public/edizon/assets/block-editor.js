/* Pembuat blok isi (dipakai Pop-up dan halaman hasil Kuis). ENBlocks.create({blocks, forms, popups, quizzes, extra, hint, onDraw}) */
(function () {
  'use strict';
  var E = ED, el = E.el, field = E.field;
  var RATIOS = { '16:9': 16 / 9, '3:2': 3 / 2, '4:3': 4 / 3, '1:1': 1, '3:4': 3 / 4 };
  var BASE_TYPES = [['title', 'Judul'], ['subtitle', 'Sub judul'], ['p', 'Paragraf'], ['img', 'Gambar'], ['button', 'Tombol'], ['form', 'Formulir'], ['ul', 'Daftar poin'], ['quote', 'Kutipan'], ['video', 'Video'], ['callout', 'Kotak catatan'], ['hr', 'Garis pemisah'], ['spacer', 'Jarak kosong']];
  var EXTRA_LABEL = { score: 'Kartu skor', sections: 'Skor per bagian' };
  function dirty() { E.markDirty(); }
  function sel(opts, value, onchange) {
    var s = el('select', { onchange: function (e) { onchange(e.target.value); dirty(); } });
    opts.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); });
    return s;
  }
  function check(label, obj, key, after) {
    return el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: obj[key] ? 'checked' : null, onchange: function (e) { obj[key] = e.target.checked; dirty(); if (after) after(); } }), ' ' + label);
  }
  function num(obj, key, min, max, after) {
    return el('input', { type: 'number', min: String(min), max: String(max), value: String(obj[key]), oninput: function (e) { var v = parseInt(e.target.value, 10); obj[key] = isNaN(v) ? min : v; dirty(); if (after) after(); } });
  }

  function create(cfg) {
    var blocks = cfg.blocks;
    cfg.forms = cfg.forms || []; cfg.popups = cfg.popups || []; cfg.quizzes = cfg.quizzes || [];
    var extra = cfg.extra || [];
    var TYPES = BASE_TYPES.concat(extra.map(function (t) { return [t, EXTRA_LABEL[t] || t]; }));
    var TYPE_LABEL = {}; TYPES.forEach(function (t) { TYPE_LABEL[t[0]] = t[1]; });
    var blocksBox = el('div', { class: 'blocks' });
  /* ---------- Blok ---------- */
  function newBlock(t) {
    switch (t) {
      case 'title': return { t: 'title', text: '', align: 'left' };
      case 'subtitle': return { t: 'subtitle', text: '', align: 'left' };
      case 'p': return { t: 'p', html: '', align: 'left' };
      case 'img': return { t: 'img', src: '', alt: '', size: 'normal', link: '', align: 'left', _r: '16:9' };
      case 'button': return { t: 'button', label: '', url: '', style: 'solid', align: 'left', full: false };
      case 'form': return { t: 'form', slug: '' };
      case 'ul': return { t: 'ul', style: 'bullets', items: [] };
      case 'quote': return { t: 'quote', text: '', cite: '' };
      case 'video': return { t: 'video', url: '' };
      case 'callout': return { t: 'callout', tone: 'info', title: '', text: '' };
      case 'spacer': return { t: 'spacer', h: 24 };
      case 'score': return { t: 'score', style: 'card', align: 'center' };
      case 'sections': return { t: 'sections', title: 'Skor per bagian' };
      default: return { t: 'hr' };
    }
  }
  var ALIGN = [['left', 'Kiri'], ['center', 'Tengah'], ['right', 'Kanan']];
  function rte(b) {
    var ed = el('div', { class: 'rte', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Isi paragraf' });
    ed.innerHTML = b.html || ''; // isi berasal dari server yang sudah dibersihkan
    ed.addEventListener('input', function () { b.html = ed.innerHTML; dirty(); });
    ed.addEventListener('paste', function (e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
    function cmd(name, val) { ed.focus(); document.execCommand(name, false, val || null); b.html = ed.innerHTML; dirty(); }
    function tb(label, title, fn, cls) { return el('button', { type: 'button', class: 'tb ' + (cls || ''), title: title, 'aria-label': title, onmousedown: function (e) { e.preventDefault(); }, onclick: fn }, label); }
    return el('div', { class: 'rtewrap' }, el('div', { class: 'rtebar' },
      tb('B', 'Tebal', function () { cmd('bold'); }, 'b'), tb('I', 'Miring', function () { cmd('italic'); }, 'i'), tb('U', 'Garis bawah', function () { cmd('underline'); }, 'u'),
      tb('Tautan', 'Pasang tautan pada teks terpilih', function () {
        var u = window.prompt('Alamat tautan (https://…, /halaman, atau #popup:alamat):', 'https://');
        if (u && /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(u.trim())) cmd('createLink', u.trim());
      }),
      tb('Lepas tautan', 'Hapus tautan', function () { cmd('unlink'); }), tb('Bersihkan', 'Hapus format', function () { cmd('removeFormat'); })), ed);
  }
  function quickTargets() {
    var o = [['', '— isi cepat —'], ['#close', 'Tutup pop-up (#close)']];
    cfg.forms.forEach(function (f) { o.push(['#form:' + f.slug, 'Buka formulir: ' + f.name + (f.status !== 'published' ? ' (draf)' : '')]); });
    cfg.popups.forEach(function (p) { o.push(['#popup:' + p.slug, 'Buka pop-up: ' + p.name]); });
    cfg.quizzes.forEach(function (q) { o.push(['#quiz:' + q.slug, 'Buka kuis: ' + q.name]); });
    return o;
  }
  function blockBody(b, redraw) {
    var al = function () { return field('Posisi teks', null, sel(ALIGN, b.align || 'left', function (v) { b.align = v; })); };
    switch (b.t) {
      case 'title': return el('div', { class: 'row' }, field('Judul', 'Maksimal 150 huruf.', E.text(b, 'text', 150, 'mis. Diskon 20% semester baru')), al());
      case 'subtitle': return el('div', { class: 'row' }, field('Sub judul', 'Maksimal 250 huruf.', E.text(b, 'text', 250, 'mis. Daftar sebelum 30 November')), al());
      case 'p': return el('div', null, rte(b), al());
      case 'img': {
        var pbox = el('div', { class: 'imgpick' });
        var drawImg = function () {
          E.clear(pbox);
          pbox.appendChild(b.src ? el('img', { src: b.src, alt: '' }) : el('div', { class: 'noimg', text: 'Belum ada gambar' }));
          pbox.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
            var lab = b._r || '16:9';
            ENPicker.open({ ratio: RATIOS[lab], ratioLabel: lab, outWidth: b.size === 'small' ? 800 : 1400, title: 'Gambar pop-up', onPick: function (p) { b.src = p; dirty(); drawImg(); } });
          } }, b.src ? 'Ganti gambar' : 'Pilih / unggah gambar'));
        };
        drawImg();
        return el('div', null,
          el('div', { class: 'row' },
            field('Lebar gambar', '"Penuh" menempel ke tepi atas/samping pop-up.', sel([['full', 'Penuh (tepi ke tepi)'], ['normal', 'Sesuai kolom'], ['small', 'Kecil (55%)']], b.size, function (v) { b.size = v; })),
            field('Rasio potongan', 'Dipakai saat memotong gambar baru.', sel(Object.keys(RATIOS).map(function (k) { return [k, k]; }), b._r || '16:9', function (v) { b._r = v; })), al()),
          pbox, field('Teks alternatif', 'Menjelaskan gambar untuk pembaca layar. Disarankan.', E.text(b, 'alt', 150, '')),
          field('Tautan saat gambar diklik (opsional)', 'https://…, /halaman, #form:alamat, atau #popup:alamat.', E.text(b, 'link', 300, '')));
      }
      case 'button': {
        var url = E.text(b, 'url', 300, 'https://… atau /halaman atau #form:alamat atau #close');
        var quick = sel(quickTargets(), '', function (v) { if (v) { b.url = v; url.value = v; } });
        return el('div', null,
          el('div', { class: 'row' }, field('Tulisan tombol', 'Maksimal 40 huruf.', E.text(b, 'label', 40, 'Daftar sekarang')), field('Tujuan', 'Alamat web, jalur situs, #bagian, #form:alamat, #popup:alamat, atau #close.', url)),
          el('div', { class: 'row' }, field('Isi cepat', null, quick), field('Gaya', null, sel([['solid', 'Terisi'], ['outline', 'Garis tepi']], b.style, function (v) { b.style = v; })), al()),
          check('Tombol selebar pop-up', b, 'full'));
      }
      case 'form': {
        var opts = [['', '— pilih formulir —']];
        cfg.forms.forEach(function (f) { opts.push([f.slug, f.name + ' (' + f.slug + ')' + (f.status !== 'published' ? ' — masih draf' : '')]); });
        if (b.slug && !cfg.forms.some(function (f) { return f.slug === b.slug; })) opts.push([b.slug, b.slug + ' (tidak ditemukan)']);
        return el('div', null, field('Formulir', 'Formulir ditampilkan langsung di dalam pop-up dan tetap terkirim ke Zapier/database seperti biasa. Pastikan formulirnya berstatus Terbit.', sel(opts, b.slug, function (v) { b.slug = v; })),
          el('small', { class: 'muted', text: 'Tips: formulir tipe "Pop-up" paling cocok. Jangan taruh blok Formulir di pop-up kecil; beri lebar minimal 420 px.' }));
      }
      case 'ul': {
        var ta = el('textarea', { rows: '5', placeholder: 'Satu butir per baris', oninput: function (e) { b.items = e.target.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); dirty(); } });
        ta.value = (b.items || []).join('\n');
        return el('div', null, sel([['bullets', 'Poin (•)'], ['numbers', 'Nomor (1, 2, 3)']], b.style, function (v) { b.style = v; }), ta);
      }
      case 'quote': return el('div', null, field('Kutipan', null, E.area(b, 'text', 400, 3)), field('Sumber (opsional)', null, E.text(b, 'cite', 100, '')));
      case 'video': return field('Alamat video', 'Tautan YouTube, Vimeo, atau file .mp4 / .webm (https).', E.text(b, 'url', 300, 'https://www.youtube.com/watch?v=…'));
      case 'callout': return el('div', null, el('div', { class: 'row' }, field('Judul kotak', 'Opsional', E.text(b, 'title', 80, '')), field('Jenis', null, sel([['info', 'Info'], ['tip', 'Tips'], ['warning', 'Perhatian']], b.tone, function (v) { b.tone = v; }))), field('Isi', null, E.area(b, 'text', 500, 3)));
      case 'spacer': return field('Tinggi jarak (px)', '8–120', num(b, 'h', 8, 120));
      case 'score': return el('div', { class: 'row' }, field('Tampilan', 'Menampilkan skor total, persen, dan jumlah soal benar.', sel([['card', 'Kartu'], ['plain', 'Polos']], b.style, function (v) { b.style = v; })), al());
      case 'sections': return field('Judul (opsional)', 'Menampilkan skor setiap bagian (mis. Grammar, Listening) dengan batang kemajuan.', E.text(b, 'title', 100, 'Skor per bagian'));
      default: return el('p', { class: 'muted', text: 'Garis pemisah horizontal.' });
    }
  }
  function drawBlocks() {
    E.clear(blocksBox);
    if (!blocks.length) blocksBox.appendChild(el('p', { class: 'muted', text: 'Belum ada isi. Tambahkan blok pertama di bawah (biasanya Judul).' }));
    blocks.forEach(function (b, i) {
      var insert = el('select', { 'aria-label': 'Sisipkan blok di bawah', onchange: function (e) { if (!e.target.value) return; blocks.splice(i + 1, 0, newBlock(e.target.value)); dirty(); drawBlocks(); } }, el('option', { value: '' }, '＋ Sisipkan di bawah…'));
      TYPES.forEach(function (t) { insert.appendChild(el('option', { value: t[0] }, t[1])); });
      blocksBox.appendChild(el('div', { class: 'item blk' },
        el('div', { class: 'item-head' }, el('strong', { text: (i + 1) + '. ' + TYPE_LABEL[b.t] }), el('span', { class: 'grow' }), insert,
          el('span', { class: 'mv' },
            el('button', { type: 'button', 'aria-label': 'Naikkan', disabled: i === 0 ? 'disabled' : null, onclick: function () { E.move(blocks, i, -1, drawBlocks); } }, '↑'),
            el('button', { type: 'button', 'aria-label': 'Turunkan', disabled: i === blocks.length - 1 ? 'disabled' : null, onclick: function () { E.move(blocks, i, 1, drawBlocks); } }, '↓')),
          el('button', { type: 'button', class: 'link danger', onclick: function () { if (window.confirm('Hapus blok ini?')) { blocks.splice(i, 1); dirty(); drawBlocks(); } } }, 'Hapus')),
        blockBody(b, drawBlocks)));
    });
  }

  var add = el('div', { class: 'addbar' }, el('span', { class: 'fl', text: 'Tambah blok:' }));
    TYPES.forEach(function (t) {
      add.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
        blocks.push(newBlock(t[0])); dirty(); drawBlocks();
        var last = blocksBox.lastElementChild; if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } }, t[1]));
    });
    drawBlocks();
    return { node: el('div', null, cfg.hint || null, blocksBox, add), draw: drawBlocks };
  }
  window.ENBlocks = { create: create, RATIOS: RATIOS };
})();
