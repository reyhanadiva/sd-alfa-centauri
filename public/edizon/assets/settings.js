/* Pengaturan situs: identitas (nama, tagline, WhatsApp, logo) dan daftar webhook Zapier (Admin). */
(function () {
  'use strict';
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var E = window.ED, el = E.el;
  var root = document.getElementById('editor');
  var site = JSON.parse(JSON.stringify(boot.data));
  var hooks = JSON.parse(JSON.stringify(boot.hooks || []));
  var hooksDirty = false;
  ['name', 'tagline', 'waNumber', 'logoFull', 'logoWhite', 'logoMark', 'favicon'].forEach(function (k) { if (typeof site[k] !== 'string') site[k] = ''; });

  var LOGO = { ratio: 955 / 412, ratioLabel: 'logo lengkap (±7:3)', outWidth: 960, minZoom: 0.3, title: 'Logo lengkap' };
  var MARK = { ratio: 419 / 512, ratioLabel: 'simbol (±4:5)', outWidth: 420, minZoom: 0.3, title: 'Logo simbol' };
  var FAV = { ratio: 1, ratioLabel: '1:1 (kotak)', outWidth: 256, minZoom: 0.3, title: 'Ikon tab' };

  function logoField(label, hint, key, fallback, opts, dark, tall) {
    var box = el('div', { class: 'imgpick logo-prev' });
    function draw() {
      E.clear(box);
      var src = site[key] || fallback;
      var img = el('img', { src: src, alt: '', class: 'lp' + (dark ? ' dark' : '') + (tall ? ' tall' : '') });
      box.appendChild(img);
      box.appendChild(el('span', { class: 'muted', text: site[key] ? 'Gambar unggahan' : (fallback ? 'Bawaan website (' + fallback + ')' : 'Belum ada, memakai bawaan browser') }));
      var row = el('div', { class: 'row-btns' },
        el('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
          ENPicker.open(Object.assign({}, opts, { onPick: function (p) { site[key] = p; E.markDirty(); draw(); } }));
        } }, site[key] ? 'Ganti gambar' : 'Unggah gambar'),
        site[key] ? el('button', { type: 'button', class: 'link', onclick: function () { site[key] = ''; E.markDirty(); draw(); } }, 'Kembali ke bawaan') : null);
      box.appendChild(row);
    }
    draw();
    return el('div', { class: 'f' }, el('span', { class: 'fl', text: label }), el('small', { text: hint }), box);
  }

  function siteCard() {
    var waHint = el('small', { class: 'muted' });
    function waPreview() {
      var d = String(site.waNumber || '').replace(/\D/g, '');
      if (d.charAt(0) === '0') d = '62' + d.slice(1); else if (d.charAt(0) === '8') d = '62' + d;
      waHint.textContent = d.length >= 9 ? 'Tersimpan sebagai: ' + d + ' (wa.me/' + d + ')' : 'Tulis dengan format 0812… atau +62 812…';
    }
    var wa = E.text(site, 'waNumber', 25, '0812 3456 7890', waPreview);
    waPreview();
    return el('section', { class: 'card' },
      el('h2', { text: 'Identitas & WhatsApp' }),
      el('p', { class: 'muted', text: 'Dipakai di seluruh website dan halaman artikel. Nomor WhatsApp ini adalah tujuan SEMUA tombol WhatsApp di website; isi pesannya tetap diatur di bagian masing-masing.' }),
      el('div', { class: 'cols' },
        E.field('Nama situs', 'Dipakai pada judul tab, teks logo, dan footer. Maks 40 karakter.', E.text(site, 'name', 40, 'SD Alfa Centauri')),
        E.field('Tagline', 'Kalimat singkat pendamping nama sekolah (footer dan pratinjau pencarian). Maks 100 karakter.', E.text(site, 'tagline', 100, ''))),
      el('label', { class: 'f' }, el('span', { class: 'fl', text: 'Nomor WhatsApp admin (default)' }),
        el('small', { text: 'Boleh ditulis 0812…, +62 812… atau 62812…; disimpan sebagai 62812….' }), wa, waHint),
      el('div', { class: 'cols' },
        logoField('Logo lengkap', 'Header dan footer (latar terang). PNG/WebP transparan paling baik.', 'logoFull', boot.defaults.logoFull || '/images/logo-horizontal.png', LOGO, false, false),
        logoField('Logo lengkap, versi putih', 'Header saat di atas latar biru/gelap.', 'logoWhite', '/images/logo-horizontal-white.png', LOGO, true, false)),
      el('div', { class: 'cols' },
        logoField('Logo simbol', 'Ikon bintang: tombol asisten dan penanda kecil.', 'logoMark', '/images/logo-star.png', MARK, false, true),
        logoField('Ikon tab (favicon)', 'Ikon kecil di tab browser. Kosong = ikon bawaan. Berlaku setelah halaman termuat (pengunjung pertama melihat ikon bawaan sekejap).', 'favicon', '/icon.png', FAV, false, false)),
      el('p', { class: 'muted', text: 'Catatan: judul halaman untuk mesin pencari di HTML statis tetap memakai nilai bawaan (bawaan dari build); tab browser pengunjung mengikuti pengaturan ini setelah halaman termuat.' }));
  }

  function hooksCard() {
    if (!boot.admin) {
      return el('section', { class: 'card' }, el('h2', { text: 'Webhook Zapier' }), el('p', { class: 'muted', text: 'Hanya Admin yang dapat melihat dan mengubah daftar webhook Zapier.' }));
    }
    var list = el('div');
    function drawList() {
      E.clear(list);
      if (!hooks.length) list.appendChild(el('p', { class: 'muted', text: 'Belum ada webhook. Formulir akan disimpan ke database saja sampai webhook ditambahkan.' }));
      hooks.forEach(function (h, i) {
        ['form_id', 'label', 'webhook'].forEach(function (k) { if (typeof h[k] !== 'string') h[k] = ''; });
        function mark() { hooksDirty = true; E.markDirty(); }
        list.appendChild(el('div', { class: 'item' },
          el('div', { class: 'item-head' }, el('strong', { text: h.form_id || 'Webhook baru' }), el('span', { class: 'grow' }),
            el('button', { type: 'button', class: 'link danger', onclick: function () {
              if (window.confirm('Hapus webhook "' + (h.form_id || 'baru') + '"? Formulir yang memakainya tidak lagi diteruskan ke Zapier.')) { hooks.splice(i, 1); mark(); drawList(); }
            } }, 'Hapus')),
          el('div', { class: 'cols' },
            E.field('Form ID', '2–60 karakter: huruf, angka, - atau _. Dikirim ke Zapier sebagai form_id.', el('input', { type: 'text', maxlength: '60', value: h.form_id, placeholder: 'mis. 5ac3e5e2', oninput: function (e) { h.form_id = e.target.value; mark(); } })),
            E.field('Nama (opsional)', 'Untuk Anda saja, mis. "Free Trial".', el('input', { type: 'text', maxlength: '80', value: h.label, oninput: function (e) { h.label = e.target.value; mark(); } }))),
          E.field('URL webhook Zapier', 'Berbentuk https://hooks.zapier.com/hooks/catch/…', el('input', { type: 'text', maxlength: '400', value: h.webhook, placeholder: 'https://hooks.zapier.com/hooks/catch/…', oninput: function (e) { h.webhook = e.target.value; mark(); } }))));
      });
    }
    drawList();
    var errBox = el('div', { class: 'flash err', hidden: true });
    var msg = el('span', { class: 'muted' });
    var btn = el('button', { type: 'button', class: 'btn', onclick: function () {
      btn.disabled = true; btn.textContent = 'Menyimpan…'; errBox.hidden = true;
      post('settings.php?part=zapier', { hooks: hooks }).then(function (j) {
        if (!j.ok) { E.clear(errBox); errBox.hidden = false; errBox.appendChild(el('strong', { text: 'Belum bisa disimpan:' })); var ul = el('ul'); (j.errors || ['Gagal menyimpan.']).forEach(function (m) { ul.appendChild(el('li', { text: m })); }); errBox.appendChild(ul); return; }
        hooks = j.data.hooks; hooksDirty = false; msg.textContent = 'Tersimpan ' + j.savedAt; drawList();
      }).catch(function () { errBox.hidden = false; E.clear(errBox); errBox.appendChild(document.createTextNode('Koneksi terputus. Belum tersimpan.')); })
        .then(function () { btn.disabled = false; btn.textContent = 'Simpan webhook'; });
    } }, 'Simpan webhook');
    return el('section', { class: 'card' },
      el('h2', { text: 'Webhook Zapier' }),
      el('p', { class: 'muted', text: 'Setiap formulir punya Form ID dan webhook Zapier sendiri. Form Free Trial yang sudah ada memakai Form ID 5ac3e5e2. Formulir baru nantinya memilih Form ID dari daftar ini. URL ini rahasia: disimpan di database, tidak pernah ditampilkan di website, dan hanya terlihat oleh Admin.' }),
      errBox, list,
      el('div', { class: 'row-btns' },
        hooks.length < 40 ? el('button', { type: 'button', class: 'btn ghost', onclick: function () { hooks.push({ form_id: '', label: '', webhook: '' }); hooksDirty = true; E.markDirty(); drawList(); } }, '+ Tambah webhook') : null,
        btn, msg));
  }

  function post(url, data) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': boot.csrf }, body: JSON.stringify({ data: data }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Respons server tidak dikenali (status ' + r.status + ').'] }; }); });
  }

  function draw() { E.clear(root); root.appendChild(siteCard()); root.appendChild(hooksCard()); }

  var btnSave = document.getElementById('save');
  btnSave.addEventListener('click', function () {
    btnSave.disabled = true; btnSave.textContent = 'Menyimpan…';
    post('settings.php', site).then(function (j) {
      if (!j.ok) { E.showErrors(j.errors || ['Gagal menyimpan.']); return; }
      E.showErrors([]); site = JSON.parse(JSON.stringify(j.data));
      document.getElementById('dirty').hidden = true; E.dirty = hooksDirty;
      document.getElementById('last-saved').textContent = 'Terakhir disimpan: ' + j.savedAt + ' (tayang di website)';
      draw();
    }).catch(function () { E.showErrors(['Koneksi terputus. Perubahan Anda belum disimpan.']); })
      .then(function () { btnSave.disabled = false; btnSave.textContent = 'Simpan & terbitkan'; });
  });
  window.addEventListener('beforeunload', function (e) { if (E.dirty) { e.preventDefault(); e.returnValue = ''; } });

  ENPicker.init({ csrf: boot.csrf });
  draw();
})();
