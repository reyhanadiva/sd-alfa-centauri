/* Pembuat pop-up: dasar, ukuran & tampilan, isi (editor blok yang sama dengan artikel: article-editor.js, mode "popup"), pemicu, tampil di mana/kapan. */
(function () {
  'use strict';
  var E = ED, el = E.el, field = E.field;
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var S = boot.data;
  var root = document.getElementById('editor');
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var editor = null, blocksCard = null, infoText = '', wf = null;

  function norm() {
    S.size = S.size || {}; S.style = S.style || {};
    if (typeof S.size.width === 'number') S.size.width = S.size.width + 'px'; // isi lama: angka = px
    if (typeof S.size.width !== 'string') S.size.width = '';
    if (typeof S.size.height !== 'number') S.size.height = 480;
    if (S.size.heightMode !== 'fixed') S.size.heightMode = 'auto';
    if (!S.position) S.position = 'center';
    var st = S.style; st.theme = st.theme === 'custom' ? 'custom' : 'website'; if (['solid', 'gradient', 'image'].indexOf(st.bgType) < 0) st.bgType = 'solid';
    st.grad = st.grad || {}; st.image = st.image || {};
    if (st.grad.kind !== 'radial') st.grad.kind = 'linear'; if (!HEX.test(st.grad.c1 || '')) st.grad.c1 = '#FFFFFF'; if (!HEX.test(st.grad.c2 || '')) st.grad.c2 = '#DDE6FF'; if (typeof st.grad.angle !== 'number') st.grad.angle = 160;
    if (typeof st.image.src !== 'string') st.image.src = ''; if (typeof st.image.overlay !== 'number') st.image.overlay = 35; if (['center', 'top', 'bottom'].indexOf(st.image.pos) < 0) st.image.pos = 'center';
    if (!HEX.test(st.bg || '')) st.bg = '#FFFFFF'; if (!HEX.test(st.color || '')) st.color = '#1B2559'; if (typeof st.accent !== 'string') st.accent = ''; if (typeof st.radius !== 'number') st.radius = 24; if (typeof st.padding !== 'number') st.padding = 24; S.triggers = S.triggers || {}; S.pages = S.pages || {}; S.frequency = S.frequency || {}; S.schedule = S.schedule || {};
    S.triggers.load = S.triggers.load || { on: false, delay: 5 }; S.triggers.scroll = S.triggers.scroll || { on: false, percent: 50 }; S.triggers.exit = S.triggers.exit || { on: false };
    if (!Array.isArray(S.pages.list)) S.pages.list = [];
    if (!Array.isArray(S.blocks)) S.blocks = [];
  }
  norm();

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
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  function colorField(obj, key, label, hint, allowEmpty, after) {
    var hex = el('input', { type: 'text', maxlength: '7', placeholder: allowEmpty ? 'otomatis' : '#RRGGBB', value: obj[key] || '', 'aria-label': label });
    var pick = el('input', { type: 'color', value: HEX.test(obj[key] || '') ? obj[key] : '#1e2f78', 'aria-label': 'Pilih warna ' + label });
    hex.addEventListener('input', function () { var v = hex.value.trim(); if (v && v[0] !== '#') v = '#' + v; obj[key] = v; if (HEX.test(v)) pick.value = v; dirty(); if (after) after(); });
    pick.addEventListener('input', function () { obj[key] = pick.value.toUpperCase(); hex.value = obj[key]; dirty(); if (after) after(); });
    var kids = [hex, pick];
    if (allowEmpty) kids.push(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { obj[key] = ''; hex.value = ''; dirty(); if (after) after(); } }, 'Otomatis'));
    return field(label, hint, el('div', { class: 'row' }, kids));
  }

  /* ---------- Dasar ---------- */
  function mainCard() {
    var hint = el('small', { class: 'muted' });
    function upd() {
      var s = S.slug || slugify(S.name) || '…';
      hint.textContent = 'Shortcode di teks artikel: [popup:' + s + ']  ·  tautan tombol/menu/kolom alamat mana pun: #popup:' + s + '  ·  JavaScript: ENPopups.open("' + s + '")';
    }
    upd();
    return el('section', { class: 'card' },
      el('h2', { text: 'Dasar' }),
      el('div', { class: 'cols' },
        el('div', null,
          field('Nama pop-up (internal)', null, E.text(S, 'name', 100, 'mis. Promo Semester Baru', upd)),
          field('Alamat (slug)', 'Huruf kecil, angka, tanda hubung. Kosong = dibuat dari nama.', E.text(S, 'slug', 60, 'promo-semester', upd)),
          hint),
        el('div', null,
          field('Status', 'Draf tidak terlihat pengunjung (pratinjau tetap bisa dibuka dari panel).', sel([['draft', 'Draf'], ['published', 'Terbit']], S.status, function (v) { S.status = v; })))));
  }

  /* ---------- Ukuran & tampilan ---------- */
  /* Kotak pop-up yang sebenarnya digambar editor isi (ukuran asli, warna asli); kartu ini hanya mengirim pengaturannya ke sana. */
  function lookOf() {
    var c = E.widthCheck(S.size.width);
    return { style: S.style, size: { width: c.ok ? c.css : '', heightMode: S.size.heightMode, height: S.size.height }, position: S.position, overlay: S.overlay !== false, showClose: S.showClose !== false };
  }
  function syncLook() { if (editor) editor.setLook(lookOf()); }
  function widthField() {
    wf = E.widthField(S.size, 'width', { label: 'Lebar pop-up', onChange: syncLook });
    wf.setInfo(infoText);
    return wf.node;
  }
  function styleCard() {
    var st = S.style, custom = st.theme === 'custom';
    var hEl = num(S.size, 'height', 160, 900, syncLook);
    function themeCol() {
      if (!custom) {
        return el('div', null,
          field('Tema', 'Tema website = sama dengan pop-up formulir: Anak (latar hijau muda, bayangan biru, bulatan kuning) atau Dewasa (latar krem), mengikuti tampilan yang dipilih pengunjung.', sel([['website', 'Ikuti tema website (seperti pop-up formulir)'], ['custom', 'Tema kustom']], st.theme, function (v) { st.theme = v; draw(); })),
          colorField(st, 'accent', 'Warna tombol (opsional)', 'Kosong = mengikuti tema website (biru tua).', true));
      }
      var kids = [
        field('Tema', null, sel([['website', 'Ikuti tema website (seperti pop-up formulir)'], ['custom', 'Tema kustom']], st.theme, function (v) { st.theme = v; draw(); })),
        field('Jenis latar', 'Polos, gradasi, atau gambar.', sel([['solid', 'Warna polos'], ['gradient', 'Gradasi'], ['image', 'Gambar']], st.bgType, function (v) { st.bgType = v; draw(); }))
      ];
      if (st.bgType === 'solid') kids.push(colorField(st, 'bg', 'Warna latar', 'Format #RRGGBB.', false, syncLook));
      if (st.bgType === 'gradient') {
        kids.push(el('div', { class: 'row' },
          field('Bentuk', null, sel([['linear', 'Lurus (berarah)'], ['radial', 'Melingkar']], st.grad.kind, function (v) { st.grad.kind = v; syncLook(); })),
          field('Arah (derajat)', '0–360. Untuk gradasi lurus.', num(st.grad, 'angle', 0, 360, syncLook))));
        kids.push(colorField(st.grad, 'c1', 'Warna awal', null, false, syncLook));
        kids.push(colorField(st.grad, 'c2', 'Warna akhir', null, false, syncLook));
      }
      if (st.bgType === 'image') {
        var pbox = el('div', { class: 'imgpick' });
        var drawImg = function () {
          E.clear(pbox);
          pbox.appendChild(st.image.src ? el('img', { src: st.image.src, alt: '' }) : el('div', { class: 'noimg', text: 'Belum ada gambar latar' }));
          pbox.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
            ENPicker.open({ ratio: 4 / 3, ratioLabel: '4:3', outWidth: 1400, title: 'Gambar latar pop-up', onPick: function (p) { st.image.src = p; dirty(); drawImg(); syncLook(); } });
          } }, st.image.src ? 'Ganti gambar' : 'Pilih / unggah gambar'));
          if (st.image.src) pbox.appendChild(el('button', { type: 'button', class: 'link danger', onclick: function () { st.image.src = ''; dirty(); drawImg(); syncLook(); } }, 'Hapus gambar'));
        };
        drawImg();
        kids.push(field('Gambar latar', 'Disarankan gambar sederhana dan tidak terlalu ramai di bagian teks.', pbox));
        kids.push(el('div', { class: 'row' },
          field('Lapisan gelap (%)', '0–80. Membantu teks putih terbaca di atas gambar.', num(st.image, 'overlay', 0, 80, syncLook)),
          field('Bagian gambar yang ditampilkan', null, sel([['center', 'Tengah'], ['top', 'Atas'], ['bottom', 'Bawah']], st.image.pos, function (v) { st.image.pos = v; }))));
        kids.push(el('small', { class: 'muted', text: 'Untuk gambar gelap, ganti Warna teks menjadi putih (#FFFFFF).' }));
      }
      kids.push(colorField(st, 'color', 'Warna teks', null, false, syncLook));
      kids.push(colorField(st, 'accent', 'Warna tombol (opsional)', 'Kosong = otomatis mengikuti tampilan Anak (kuning) atau Dewasa (biru tua).', true));
      kids.push(el('div', { class: 'row' }, field('Sudut membulat (px)', '0–48', num(st, 'radius', 0, 48, syncLook)), field('Ruang dalam (px)', '0–56', num(st, 'padding', 0, 56, syncLook))));
      return el('div', null, kids);
    }
    var card = el('section', { class: 'card' },
      el('h2', { text: 'Ukuran & tampilan' }),
      el('div', { class: 'cols' },
        el('div', null,
          widthField(),
          field('Tinggi', 'Otomatis = mengikuti isi. Isi yang lebih tinggi dari layar tetap bisa digeser, tanpa batang gulir.', sel([['auto', 'Otomatis (ikuti isi)'], ['fixed', 'Tetap']], S.size.heightMode, function (v) { S.size.heightMode = v; hEl.disabled = v !== 'fixed'; syncLook(); })),
          field('Tinggi tetap (px)', '160–900. Dipakai bila Tinggi = Tetap.', hEl),
          field('Posisi', 'Tengah layar, atau sudut kanan/kiri bawah (cocok untuk promo kecil).', sel([['center', 'Tengah layar'], ['bottom-right', 'Pojok kanan bawah'], ['bottom-left', 'Pojok kiri bawah']], S.position, function (v) { S.position = v; syncLook(); }))),
        themeCol()),
      el('div', { class: 'checks' },
        check('Redupkan latar halaman di belakang pop-up', S, 'overlay', syncLook),
        check('Tutup saat pengunjung mengklik di luar pop-up', S, 'closeOnOverlay'),
        check('Tampilkan tombol tutup (X)', S, 'showClose', syncLook)),
      el('p', { class: 'muted' }, 'Hasilnya langsung terlihat di bagian "Isi pop-up" di bawah, dengan ukuran dan warna asli. Di sana ada tombol Anak / Dewasa dan Desktop / Tablet / HP untuk memeriksa tampilannya. ',
        el('button', { type: 'button', class: 'link', onclick: function () { var t = document.getElementById('ae-popup-section'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Ke isi pop-up ↓')));
    hEl.disabled = S.size.heightMode !== 'fixed';
    return card;
  }

  /* ---------- Isi: editor blok yang sama dengan artikel (article-editor.js), kanvasnya kotak pop-up itu sendiri ---------- */
  var LINK_ATTRS = /<a\s[^>]*>/g;
  function canon(v) {
    // server menambah target/rel pada tautan luar dan menulis tanda kutip sebagai entitas; itu bukan perubahan isi
    if (typeof v === 'string') return v.replace(LINK_ATTRS, function (m) { return m.replace(/\s(?:target|rel)="[^"]*"/g, ''); }).replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o; }
    return v;
  }
  function sameBlocks(a, b) { return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); }
  function targets() {
    var o = [];
    (boot.forms || []).forEach(function (f) { o.push({ v: '#form:' + f.slug, label: 'Buka formulir: ' + f.name + (f.status !== 'published' ? ' (draf)' : '') }); });
    (boot.popups || []).forEach(function (p) { o.push({ v: '#popup:' + p.slug, label: 'Buka pop-up: ' + p.name }); });
    (boot.quizzes || []).forEach(function (q) { o.push({ v: '#quiz:' + q.slug, label: 'Buka kuis: ' + q.name }); });
    return o;
  }
  function buildEditor() {
    if (!window.ArtEditor) {
      return el('section', { class: 'card' }, el('h2', { text: 'Isi pop-up' }), el('p', { class: 'flash err', text: 'Editor isi gagal dimuat. Muat ulang halaman dengan Ctrl+F5.' }));
    }
    editor = window.ArtEditor.create({
      mode: 'popup',
      blocks: Array.isArray(S.blocks) ? S.blocks : [],
      isAdmin: !!boot.isAdmin,
      csrf: boot.csrf,
      templatesUrl: 'templates.php', // shared list of saved blocks (Templat)
      forms: (boot.forms || []).map(function (f) { return { slug: f.slug, name: f.name + (f.status !== 'published' ? ' (draf)' : '') }; }),
      targets: targets(),
      look: lookOf(),
      // Editor (bukan Admin) melihat blok HTML yang sudah tersimpan lewat alamat ini
      frameUrl: function (bid) { return S.id ? 'popup-frame.php?id=' + S.id + '&b=' + encodeURIComponent(bid) : ''; },
      onChange: dirty,
      onInfo: function (t) { infoText = t; if (wf) wf.setInfo(t); },
    });
    bindBlocks();
    return el('section', { class: 'card ae-section', id: 'ae-popup-section' },
      el('h2', { text: 'Isi pop-up' }),
      el('p', { class: 'muted', text: 'Seret blok dari bilah di atas ke kotak pop-up, lalu klik blok untuk mengisinya. Kotak di bawah adalah pop-up dengan ukuran dan warna aslinya; pakai tombol Anak / Dewasa dan Desktop / Tablet / HP untuk memeriksa tampilannya. Maksimal 80 blok (blok di dalam kolom ikut dihitung).' }),
      editor.root);
  }
  // from here on S.blocks reads (and writes) the editor's content, so saving needs no copy step
  function bindBlocks() {
    Object.defineProperty(S, 'blocks', { configurable: true, enumerable: true, get: function () { return editor.getBlocks(); }, set: function (v) { editor.setBlocks(v); } });
  }

  /* ---------- Pemicu ---------- */
  function triggersCard() {
    var T = S.triggers;
    return el('section', { class: 'card' },
      el('h2', { text: 'Kapan pop-up muncul' }),
      el('div', { class: 'item' }, el('strong', { text: 'Saat tombol/tautan diklik' }), el('span', { class: 'muted', text: ' (selalu aktif untuk pop-up berstatus Terbit)' }),
        el('p', { class: 'muted', text: 'Pakai #popup:alamat sebagai tujuan tombol, menu, atau tautan di mana pun, atau [popup:alamat] di teks artikel. Pop-up yang dibuka dari klik mengabaikan aturan halaman, jadwal, dan frekuensi di bawah.' })),
      el('div', { class: 'item' }, check('Otomatis setelah halaman dibuka', T.load, 'on'), el('div', { class: 'row' }, field('Tunggu (detik)', '0–300', num(T.load, 'delay', 0, 300)))),
      el('div', { class: 'item' }, check('Otomatis saat pengunjung menggulir', T.scroll, 'on'), el('div', { class: 'row' }, field('Setelah menggulir (% halaman)', '5–95', num(T.scroll, 'percent', 5, 95)))),
      el('div', { class: 'item' }, check('Otomatis saat kursor mau keluar halaman (desktop saja)', T.exit, 'on'), el('small', { class: 'muted', text: 'Terdeteksi saat kursor keluar lewat tepi atas jendela. Tidak berlaku di HP.' })),
      el('small', { class: 'muted', text: 'Bila beberapa pop-up otomatis memenuhi syarat sekaligus, hanya satu yang muncul per kunjungan halaman.' }));
  }

  /* ---------- Tampil di ---------- */
  function targetCard() {
    var ta = el('textarea', { rows: '4', placeholder: '/\n/articles/*\n/program', value: S.pages.list.join('\n'), oninput: function (e) { S.pages.list = e.target.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); dirty(); } });
    var daysEl = num(S.frequency, 'days', 1, 365); daysEl.disabled = S.frequency.mode !== 'days';
    var start = el('input', { type: 'datetime-local', value: S.schedule.start || '', onchange: function (e) { S.schedule.start = e.target.value; dirty(); } });
    var end = el('input', { type: 'datetime-local', value: S.schedule.end || '', onchange: function (e) { S.schedule.end = e.target.value; dirty(); } });
    return el('section', { class: 'card' },
      el('h2', { text: 'Aturan tampil otomatis' }),
      el('p', { class: 'muted', text: 'Berlaku untuk pop-up yang muncul otomatis (bukan yang dibuka dari klik).' }),
      el('div', { class: 'cols' },
        el('div', null,
          field('Halaman', 'Beranda = /. Tanda * di akhir = semua halaman di bawahnya, mis. /articles/*', sel([['all', 'Semua halaman'], ['include', 'Hanya di halaman ini'], ['exclude', 'Semua halaman kecuali ini']], S.pages.mode, function (v) { S.pages.mode = v; })),
          field('Daftar halaman (satu per baris)', null, ta),
          field('Untuk tampilan', 'Tampilan Anak & Remaja atau Dewasa & Bisnis yang sedang dipilih pengunjung.', sel([['all', 'Semua'], ['kids', 'Hanya Anak & Remaja'], ['adult', 'Hanya Dewasa & Bisnis']], S.audience, function (v) { S.audience = v; })),
          field('Perangkat', null, sel([['all', 'Semua'], ['desktop', 'Hanya desktop'], ['mobile', 'Hanya HP']], S.devices, function (v) { S.devices = v; }))),
        el('div', null,
          field('Seberapa sering muncul', 'Dicatat di browser pengunjung.', sel([['always', 'Setiap kali halaman dibuka'], ['session', 'Sekali per kunjungan (sesi browser)'], ['days', 'Sekali per beberapa hari']], S.frequency.mode, function (v) { S.frequency.mode = v; daysEl.disabled = v !== 'days'; })),
          field('Jeda (hari)', 'Dipakai bila "Sekali per beberapa hari".', daysEl),
          field('Mulai tayang (WIB)', 'Kosong = langsung.', start), field('Berhenti tayang (WIB)', 'Kosong = tanpa batas.', end))));
  }

  function draw() {
    E.clear(root);
    root.appendChild(mainCard());
    root.appendChild(styleCard());
    var again = !!blocksCard;
    if (!blocksCard) blocksCard = buildEditor(); // built once: the editor keeps its state across redraws and saves
    root.appendChild(blocksCard);
    if (again && editor && editor.reloadPreviews) editor.reloadPreviews(); // moving the editor in the page reloads its HTML-block frames
    root.appendChild(triggersCard());
    root.appendChild(targetCard());
    if (E.revisions) root.appendChild(revCard().node);
    syncLook();
  }

  /* ---------- riwayat versi ---------- */
  var rev = null;
  function revCard() {
    if (!rev) {
      rev = E.revisions({
        kind: 'popup', getId: function () { return S.id || 0; }, getState: function () { return S; },
        keep: ['id', 'slug', 'status'],
        keepNote: 'Alamat (slug) dan status terbit tidak ikut dikembalikan.',
        preview: function (rid) { return 'popup-preview.php?id=' + S.id + '&rev=' + rid; },
        apply: function (m) {
          var fresh = m.blocks; // plain data: read before the editor takes over the property
          S = m; norm();
          if (editor) { bindBlocks(); editor.setBlocks(fresh); }
          draw();
        },
      });
    }
    return rev;
  }
  E.bindSave({
    csrf: boot.csrf,
    getState: function () { return S; },
    setState: function (d) {
      var wasNew = !S.id && d.id;
      var fresh = d.blocks;
      S = d; norm();
      if (editor) {
        bindBlocks();
        if (!sameBlocks(editor.getBlocks(), fresh)) editor.setBlocks(fresh, { keep: true }); // only when the server changed something (cleaned markup, new ids)
      }
      var v = document.getElementById('viewlink');
      v.href = 'popup-preview.php?id=' + S.id; v.hidden = false;
      if (wasNew) history.replaceState(null, '', 'popup.php?id=' + S.id);
    },
    redraw: draw,
    afterSave: function () { if (rev) rev.refresh(); }
  });
  draw();
})();
