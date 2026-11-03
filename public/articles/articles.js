/* Halaman artikel: pilih tampilan (Anak / Dewasa), batasi saran artikel, dan tombol "tampilkan lebih banyak". */
(function () {
  'use strict';
  var de = document.documentElement, KEY = 'en-audience';
  function valid(a) { return a === 'kids' || a === 'adult'; }
  var only = de.getAttribute('data-only');
  var q = null, s = null;
  try { q = new URLSearchParams(location.search).get('for'); } catch (e) { /* abaikan */ }
  try { s = localStorage.getItem(KEY); } catch (e) { /* abaikan */ }
  var aud = valid(only) ? only : (valid(q) ? q : (valid(s) ? s : 'kids'));
  de.setAttribute('data-audience', aud);
  if (!only && valid(q)) { try { localStorage.setItem(KEY, q); } catch (e) { /* abaikan */ } }

  function layout() {
    var grids = document.querySelectorAll('.grid');
    Array.prototype.forEach.call(grids, function (g) {
      var limit = parseInt(g.getAttribute('data-limit') || '0', 10);
      var page = parseInt(g.getAttribute('data-page') || '0', 10);
      var shown = limit || (page ? (parseInt(g.getAttribute('data-shown') || '0', 10) || page) : 0);
      var n = 0, hidden = 0;
      Array.prototype.forEach.call(g.children, function (c) {
        var auds = (c.getAttribute('data-aud') || '').split(' ');
        if (auds.indexOf(aud) < 0) { c.classList.remove('over'); return; }
        n++;
        if (shown && n > shown) { c.classList.add('over'); hidden++; } else { c.classList.remove('over'); }
      });
      if (g.id === 'list') {
        var btn = document.getElementById('show-more'), empty = document.getElementById('list-empty');
        if (btn) btn.hidden = hidden === 0;
        if (empty) empty.hidden = n !== 0;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btns = document.querySelectorAll('.aud button');
    function mark() { Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set') === aud ? 'true' : 'false'); }); }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        aud = b.getAttribute('data-set');
        de.setAttribute('data-audience', aud);
        try { localStorage.setItem(KEY, aud); } catch (e) { /* abaikan */ }
        var list = document.getElementById('list'); if (list) list.removeAttribute('data-shown');
        mark(); layout();
      });
    });
    var more = document.getElementById('show-more'), list = document.getElementById('list');
    if (more && list) more.addEventListener('click', function () {
      var page = parseInt(list.getAttribute('data-page'), 10) || 9;
      var cur = parseInt(list.getAttribute('data-shown') || '0', 10) || page;
      list.setAttribute('data-shown', String(cur + page));
      layout();
    });
    mark(); layout();
  });

  /* Blok HTML: kode Admin tampil di <iframe sandbox>. Bingkai melaporkan tingginya lewat postMessage. Asal bingkai "opaque" (origin tidak bisa dipakai),
     jadi pesan dicocokkan lewat event.source dengan bingkai di halaman ini, dan tinggi dibatasi. */
  var LS_MAX = 200000, LS_KEYS = 200; // batas data localStorage per blok
  function frameOf(win, sel) {
    var fr = document.querySelectorAll(sel);
    for (var i = 0; i < fr.length; i++) if (fr[i].contentWindow === win) return fr[i];
    return null;
  }
  window.addEventListener('message', function (e) {
    var d = e.data, f;
    if (!d) return;
    if (d.enFrame === 1 && typeof d.h === 'number' && isFinite(d.h)) {
      f = frameOf(e.source, 'iframe.a-hf[data-auto]');
      if (f) f.style.height = Math.max(20, Math.min(5000, Math.ceil(d.h))) + 'px';
    } else if (d.enFrame === 2 && d.ls && typeof d.ls === 'object') {
      // penyimpanan pengganti localStorage milik bingkai (bingkai tidak boleh memakai localStorage asli): simpan di sini, terpisah untuk tiap blok
      f = frameOf(e.source, 'iframe.a-hf[data-ls]');
      if (!f) return;
      var o = Object.create(null), n = 0, size = 0;
      Object.keys(d.ls).forEach(function (k) { var v = d.ls[k]; if (typeof v === 'string') { o[k] = v; n++; size += k.length + v.length; } });
      if (n > LS_KEYS || size > LS_MAX) return;
      try { localStorage.setItem('enhf:' + f.getAttribute('data-ls'), JSON.stringify(o)); } catch (err) { /* penyimpanan penuh atau diblokir */ }
    }
  });
  // bingkai dengan JavaScript: beri data tersimpan lewat nama jendela, baru muat bingkainya
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('iframe.a-hf[data-ls][data-src]'), function (f) {
      var saved = '{}';
      try { var s = localStorage.getItem('enhf:' + f.getAttribute('data-ls')); if (s) { JSON.parse(s); saved = s; } } catch (err) { saved = '{}'; }
      // nama jendela hanya terbawa ke dokumen baru bila diisi sebelum bingkai dipasang di halaman, jadi bingkai disalin lalu menggantikan yang lama
      var c = f.cloneNode(false);
      c.name = 'enls:' + saved;
      c.src = f.getAttribute('data-src');
      c.removeAttribute('data-src');
      f.parentNode.replaceChild(c, f);
    });
  });
  /* pratinjau isi editor yang belum disimpan: formulir tersembunyi mengirim kode ke bingkai (hanya ada di halaman Pratinjau panel) */
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('form.a-hf-post'), function (f) { f.submit(); });
  });
})();
