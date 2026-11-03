/* Halaman SEO & AI: pemilih gambar beranda, pratinjau pencarian, pemeriksaan sederhana, dan tombol periksa beranda. */
(function () {
  'use strict';
  var E = window.ED, el = E.el;
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var state = {}, imgVal = boot.image || '';
  ENPicker.init({ csrf: boot.csrf });
  function $(id) { return document.getElementById(id); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
  var hidden = $('h_image'), mount = $('h_image_mount');
  Object.defineProperty(state, 'image', { enumerable: true, get: function () { return imgVal; }, set: function (v) { imgVal = v || ''; hidden.value = imgVal; if (window.refreshHome) window.refreshHome(); } });
  function drawPicker() {
    E.clear(mount);
    var box = E.picker(state, 'image', { ratio: 1200 / 630, ratioLabel: '1,91:1', outWidth: 1200, title: 'Gambar beranda untuk berbagi' }, 'wide');
    mount.appendChild(box);
  }
  drawPicker();
  function item(s, t, hint) { return el('li', null, el('span', { class: 'dot', 'data-s': s }), el('span', null, el('strong', { text: t }), hint ? el('small', { class: 'muted', text: ' ' + hint }) : null)); }
  function refresh() {
    var t = $('h_title').value, d = $('h_description').value, kw = $('h_keyword').value.trim();
    $('h_title_n').textContent = t.length + ' huruf' + (t ? '' : ' (memakai judul bawaan)');
    $('h_desc_n').textContent = d.length + ' huruf' + (d ? '' : ' (memakai deskripsi bawaan)');
    var serp = $('h_serp'); E.clear(serp);
    serp.appendChild(el('div', { class: 'serp-url', text: boot.host || 'situs-anda' }));
    serp.appendChild(el('div', { class: 'serp-title', text: clip(t || 'SD Alfa Centauri | Sekolah Dasar di Bandung', 60) }));
    serp.appendChild(el('div', { class: 'serp-desc', text: clip(d || 'Deskripsi bawaan dari build.', 160) }));
    var ul = $('h_checks'); E.clear(ul);
    ul.appendChild(t ? (t.length >= 30 && t.length <= 60 ? item('good', 'Panjang judul baik: ' + t.length) : item('ok', 'Panjang judul: ' + t.length, 'idealnya 30-60')) : item('ok', 'Memakai judul bawaan build'));
    ul.appendChild(d ? (d.length >= 120 && d.length <= 160 ? item('good', 'Panjang deskripsi baik: ' + d.length) : item('ok', 'Panjang deskripsi: ' + d.length, 'idealnya 120-160')) : item('ok', 'Memakai deskripsi bawaan build'));
    if (kw) {
      var inT = norm(t).indexOf(norm(kw)) >= 0, inD = norm(d).indexOf(norm(kw)) >= 0;
      ul.appendChild(inT ? item('good', 'Kata kunci ada di judul') : item('bad', 'Kata kunci belum ada di judul'));
      ul.appendChild(inD ? item('good', 'Kata kunci ada di deskripsi') : item('bad', 'Kata kunci belum ada di deskripsi'));
    }
    ul.appendChild(state.image ? item('good', 'Ada gambar untuk berbagi') : item('ok', 'Belum ada gambar untuk berbagi', 'tautan dibagikan tanpa gambar'));
  }
  ['h_title', 'h_description', 'h_keyword'].forEach(function (id) { $(id).addEventListener('input', refresh); });
  window.refreshHome = refresh;
  refresh();
  $('home-check').addEventListener('click', function () {
    var r = $('home-check-r'); r.textContent = 'Memeriksa…';
    fetch('/', { cache: 'no-store' }).then(function (x) { return x.text(); }).then(function (h) {
      r.textContent = h.indexOf('<!--en-seo-home-->') >= 0 ? 'Aktif: beranda memakai SEO dari panel.' : 'Belum aktif: server masih menyajikan index.html langsung (lihat langkah 1 di atas).';
    }).catch(function () { r.textContent = 'Tidak bisa memeriksa.'; });
  });
})();
