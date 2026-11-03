/*
 * Pemilih & pemotong gambar untuk semua editor di panel.
 *  - Pilih gambar yang sudah pernah diunggah, ATAU unggah baru: gambar baru wajib dipotong dulu
 *    sesuai rasio yang pas untuk tempat pemakaiannya, lalu diunggah (server mengubahnya jadi WebP).
 *  - Dibangun dengan DOM tanpa innerHTML, gaya lewat kelas CSS (halaman panel melarang style inline).
 *
 * Pemakaian:
 *   ENPicker.init({ csrf: '...' });
 *   ENPicker.open({ ratio: 3 / 4, ratioLabel: '3:4', outWidth: 900, title: 'Foto pengajar', onPick: function (path) {} });
 */
(function () {
  'use strict';

  var cfg = { csrf: '', url: 'upload.php' };
  var UI = null;                 // elemen dialog (dibuat sekali, saat pertama dibuka)
  var cur = null;                // opsi pemakaian saat ini
  var st = null;                 // keadaan pemotong
  var ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
  var MAX_ORIGINAL = 25 * 1024 * 1024; // file asli boleh besar: yang diunggah hanya hasil potongan

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  /* ---------- kerangka dialog ---------- */
  function build() {
    if (UI) return;
    UI = {};
    UI.libTitle = el('strong', { text: 'Pilih gambar' });
    UI.file = el('input', { type: 'file', accept: ACCEPT.join(','), hidden: true, onchange: onFile });
    UI.libMsg = el('p', { class: 'muted' });
    UI.grid = el('div', { class: 'picker-grid' });
    UI.lib = el('dialog', { class: 'picker' },
      el('div', { class: 'picker-head' }, UI.libTitle,
        el('label', { class: 'btn ghost' }, 'Unggah gambar baru', UI.file),
        el('button', { type: 'button', class: 'link', onclick: function () { UI.lib.close(); } }, 'Tutup')),
      UI.libMsg, UI.grid);

    UI.cropHint = el('p', { class: 'muted' });
    UI.canvas = el('canvas', { class: 'crop-canvas', tabindex: '0', 'aria-label': 'Area potong gambar. Geser untuk mengatur posisi, tombol panah juga bisa dipakai.' });
    UI.zoom = el('input', { type: 'range', min: '1', max: '5', step: '0.01', value: '1', 'aria-label': 'Perbesar', oninput: function (e) { setZoom(parseFloat(e.target.value)); } });
    UI.warn = el('p', { class: 'flash err', hidden: true });
    UI.cropMsg = el('p', { class: 'muted', 'aria-live': 'polite' });
    UI.ok = el('button', { type: 'button', class: 'btn', onclick: upload }, 'Potong & gunakan');
    UI.cancel = el('button', { type: 'button', class: 'btn ghost', onclick: function () { cleanupCrop(); UI.crop.close(); } }, 'Batal');
    UI.crop = el('dialog', { class: 'picker cropper' },
      el('div', { class: 'picker-head' }, el('strong', { text: 'Potong gambar' })),
      UI.cropHint,
      el('div', { class: 'crop-stage' }, UI.canvas),
      el('label', { class: 'crop-zoom' }, el('span', { text: 'Perbesar' }), UI.zoom),
      UI.warn, UI.cropMsg,
      el('div', { class: 'crop-actions' }, UI.cancel, UI.ok));
    UI.crop.addEventListener('close', cleanupCrop);
    document.body.appendChild(UI.lib);
    document.body.appendChild(UI.crop);

    bindCanvas();
  }

  /* ---------- pustaka gambar ---------- */
  function loadMedia() {
    return fetch(cfg.url, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) { return j.ok ? j.items : []; });
  }
  function drawGrid(items) {
    clear(UI.grid);
    if (!items.length) UI.grid.appendChild(el('p', { class: 'muted', text: 'Belum ada gambar unggahan. Unggah gambar baru di atas.' }));
    items.forEach(function (m) {
      UI.grid.appendChild(el('button', { type: 'button', class: 'pg', title: m.original_name, onclick: function () { UI.lib.close(); if (cur && cur.onPick) cur.onPick(m.path); } },
        el('img', { src: m.path, alt: m.original_name, loading: 'lazy' })));
    });
  }

  function open(opts) {
    build();
    cur = {
      ratio: opts.ratio > 0 ? opts.ratio : 1,
      ratioLabel: opts.ratioLabel || '',
      outWidth: opts.outWidth > 0 ? opts.outWidth : 1200,
      title: opts.title || 'Pilih gambar',
      minZoom: opts.minZoom > 0 && opts.minZoom < 1 ? opts.minZoom : 1,
      onPick: opts.onPick
    };
    UI.libTitle.textContent = cur.title;
    UI.libMsg.textContent = 'Memilih gambar yang sudah ada langsung memakainya. Gambar baru akan dipotong dulu' +
      (cur.ratioLabel ? ' dengan rasio ' + cur.ratioLabel : '') + ' lalu otomatis diubah menjadi WebP.';
    drawGrid([]);
    UI.lib.showModal();
    loadMedia().then(drawGrid).catch(function () {});
  }

  /* ---------- pemotong ---------- */
  function onFile(e) {
    var f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (ACCEPT.indexOf(f.type) < 0) { UI.libMsg.textContent = 'Hanya gambar JPG, PNG, atau WebP yang diterima.'; return; }
    if (f.size > MAX_ORIGINAL) { UI.libMsg.textContent = 'File terlalu besar (maksimal 25 MB).'; return; }
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function () { startCrop(img, url, f); };
    img.onerror = function () { URL.revokeObjectURL(url); UI.libMsg.textContent = 'Gambar tidak bisa dibaca. Coba simpan ulang sebagai JPG atau PNG.'; };
    img.src = url;
  }

  function startCrop(img, url, file) {
    var maxW = Math.min(460, window.innerWidth - 72);
    var maxH = Math.max(240, Math.round(window.innerHeight * 0.5));
    var vw = maxW, vh = Math.round(vw / cur.ratio);
    if (vh > maxH) { vh = maxH; vw = Math.round(vh * cur.ratio); }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    UI.canvas.width = Math.round(vw * dpr);
    UI.canvas.height = Math.round(vh * dpr);
    UI.canvas.style.width = vw + 'px';
    UI.canvas.style.height = vh + 'px';
    st = {
      img: img, url: url, name: file.name,
      iw: img.naturalWidth, ih: img.naturalHeight,
      vw: vw, vh: vh, dpr: dpr,
      min: Math.max(vw / img.naturalWidth, vh / img.naturalHeight),
      zoom: 1, cx: img.naturalWidth / 2, cy: img.naturalHeight / 2,
      drag: null, busy: false
    };
    UI.zoom.min = String(cur.minZoom);
    UI.zoom.value = '1';
    UI.cropMsg.textContent = '';
    UI.ok.disabled = false;
    UI.ok.textContent = 'Potong & gunakan';
    UI.cropHint.textContent = 'Geser gambar untuk mengatur bagian yang tampil, geser slider (atau scroll) untuk memperbesar.' +
      (cur.ratioLabel ? ' Rasio dikunci ' + cur.ratioLabel + ' agar pas di website.' : '');
    UI.lib.close();
    UI.crop.showModal();
    clamp();
    paint();
    UI.canvas.focus();
  }

  function scale() { return st.min * st.zoom; }
  function clamp() {
    var s = scale(), hw = st.vw / s / 2, hh = st.vh / s / 2;
    st.cx = st.iw - hw < hw ? st.iw / 2 : Math.min(Math.max(st.cx, hw), st.iw - hw);
    st.cy = st.ih - hh < hh ? st.ih / 2 : Math.min(Math.max(st.cy, hh), st.ih - hh);
  }
  function source() {
    var s = scale(), sw = st.vw / s, sh = st.vh / s;
    return { sx: st.cx - sw / 2, sy: st.cy - sh / 2, sw: sw, sh: sh };
  }
  function outSize() {
    var src = source();
    var w = Math.max(1, Math.min(cur.outWidth, Math.round(src.sw))); // jangan diperbesar melebihi resolusi aslinya
    return { w: w, h: Math.max(1, Math.round(w / cur.ratio)) };
  }
  function paint() {
    var c = UI.canvas.getContext('2d'), src = source();
    c.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    c.clearRect(0, 0, st.vw, st.vh);
    c.fillStyle = '#e9edf3';
    c.fillRect(0, 0, st.vw, st.vh);
    c.imageSmoothingQuality = 'high';
    c.drawImage(st.img, src.sx, src.sy, src.sw, src.sh, 0, 0, st.vw, st.vh);
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 1;
    c.beginPath();
    for (var i = 1; i < 3; i++) {
      c.moveTo(Math.round(st.vw * i / 3) + .5, 0); c.lineTo(Math.round(st.vw * i / 3) + .5, st.vh);
      c.moveTo(0, Math.round(st.vh * i / 3) + .5); c.lineTo(st.vw, Math.round(st.vh * i / 3) + .5);
    }
    c.stroke();
    var low = src.sw < cur.outWidth * 0.75;
    UI.warn.hidden = !low;
    UI.warn.textContent = low ? 'Resolusi gambar cukup rendah untuk ukuran ini, hasilnya mungkin kurang tajam. Pakai foto yang lebih besar bila ada.' : '';
  }
  function setZoom(z) {
    st.zoom = Math.min(5, Math.max(cur.minZoom, z));
    UI.zoom.value = String(st.zoom);
    clamp();
    paint();
  }
  function bindCanvas() {
    var cv = UI.canvas;
    cv.addEventListener('pointerdown', function (e) {
      if (!st) return;
      cv.setPointerCapture(e.pointerId);
      st.drag = { x: e.clientX, y: e.clientY };
      cv.classList.add('grab');
    });
    cv.addEventListener('pointermove', function (e) {
      if (!st || !st.drag) return;
      var s = scale();
      st.cx -= (e.clientX - st.drag.x) / s;
      st.cy -= (e.clientY - st.drag.y) / s;
      st.drag = { x: e.clientX, y: e.clientY };
      clamp();
      paint();
    });
    function end() { if (st) st.drag = null; cv.classList.remove('grab'); }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', function (e) {
      if (!st) return;
      e.preventDefault();
      setZoom(st.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    }, { passive: false });
    cv.addEventListener('keydown', function (e) {
      if (!st) return;
      var step = 20 / scale(), k = e.key;
      if (k === 'ArrowLeft') st.cx -= step;
      else if (k === 'ArrowRight') st.cx += step;
      else if (k === 'ArrowUp') st.cy -= step;
      else if (k === 'ArrowDown') st.cy += step;
      else if (k === '+' || k === '=') return (e.preventDefault(), setZoom(st.zoom * 1.1));
      else if (k === '-') return (e.preventDefault(), setZoom(st.zoom / 1.1));
      else return;
      e.preventDefault();
      clamp();
      paint();
    });
  }
  function cleanupCrop() {
    if (st && st.url) URL.revokeObjectURL(st.url);
    st = null;
  }

  /* ---------- hasil potongan -> unggah ---------- */
  function toBlob(cb) {
    var src = source(), o = outSize();
    var oc = document.createElement('canvas');
    oc.width = o.w; oc.height = o.h;
    var c = oc.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(st.img, src.sx, src.sy, src.sw, src.sh, 0, 0, o.w, o.h);
    oc.toBlob(function (b) {
      if (b && b.type === 'image/webp') return cb(b);
      // browser lama tanpa WebP: kirim JPEG di atas latar putih (server tetap mengubahnya ke WebP)
      var fc = document.createElement('canvas');
      fc.width = o.w; fc.height = o.h;
      var f = fc.getContext('2d');
      f.fillStyle = '#fff'; f.fillRect(0, 0, o.w, o.h); f.drawImage(oc, 0, 0);
      fc.toBlob(cb, 'image/jpeg', 0.92);
    }, 'image/webp', 0.92);
  }
  function upload() {
    if (!st || st.busy) return;
    st.busy = true;
    UI.ok.disabled = true;
    UI.ok.textContent = 'Mengunggah…';
    UI.cropMsg.textContent = '';
    var fail = function (m) { if (st) st.busy = false; UI.ok.disabled = false; UI.ok.textContent = 'Potong & gunakan'; UI.cropMsg.textContent = m; };
    toBlob(function (blob) {
      if (!blob) return fail('Gambar tidak bisa diproses di browser ini.');
      var fd = new FormData();
      var base = (st.name || 'gambar').replace(/\.[^.]+$/, '').slice(0, 60) || 'gambar';
      fd.append('file', blob, base + (blob.type === 'image/webp' ? '.webp' : '.jpg'));
      fetch(cfg.url, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': cfg.csrf } })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Respons server tidak dikenali (status ' + r.status + ').' }; }); })
        .then(function (j) {
          if (!j.ok) return fail(j.error || 'Unggahan gagal.');
          var cb = cur && cur.onPick;
          cleanupCrop();
          UI.crop.close();
          if (cb) cb(j.path);
        })
        .catch(function () { fail('Koneksi terputus. Coba lagi.'); });
    });
  }

  window.ENPicker = {
    init: function (o) { if (o && o.csrf) cfg.csrf = o.csrf; if (o && o.url) cfg.url = o.url; },
    open: open
  };
})();
