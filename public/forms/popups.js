/*
 * Pop-up English Now. Dibuat dari panel (Buat Konten > Pop-up) dan dibaca dari /data/popups.json (tanpa database).
 *   ENPopups.open('alamat')              buka pop-up
 *   <a href="#popup:alamat">…</a>        tautan/tombol apa pun ke "#popup:alamat" membuka pop-up (shortcode [popup:alamat])
 * Pemicu otomatis: saat halaman dibuka (setelah N detik), saat menggulir, atau saat kursor mau keluar (desktop).
 * Dibangun dengan DOM + CSSOM (tanpa atribut style / innerHTML kecuali isi paragraf yang sudah dibersihkan server),
 * jadi aman di halaman ber-CSP ketat.
 */
(function () {
  'use strict';
  if (window.ENPopups) return;
  var BASE = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^\/]*$/, '') : '/forms/');
  var list = {};          // slug -> {slug,name,cfg}
  var loadP = null, cssP = null, current = null, autoShown = false;

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return n;
  }
  function aud() { return document.documentElement.getAttribute('data-audience') === 'adult' ? 'adult' : 'kids'; }
  function isMobile() { return window.matchMedia && window.matchMedia('(max-width: 767px)').matches; }
  function store(kind) { try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; } }

  function cssReady() {
    if (cssP) return cssP;
    if (document.querySelector('link[rel="stylesheet"][href*="/forms/popups.css"]')) { cssP = Promise.resolve(); return cssP; }
    cssP = new Promise(function (res) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + 'popups.css?v=3';
      var done = function () { res(); }; l.onload = done; l.onerror = done; setTimeout(done, 3000);
      document.head.appendChild(l);
    });
    return cssP;
  }
  function load() {
    if (loadP) return loadP;
    loadP = fetch('/data/popups.json', { credentials: 'omit', cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { (j && Array.isArray(j.popups) ? j.popups : []).forEach(function (p) { if (p && p.slug && p.cfg) list[p.slug] = p; }); })
      .catch(function () { /* tidak ada pop-up */ });
    return loadP;
  }

  /* ---------- warna ---------- */
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function onColor(hex) { return lum(hex) > 0.45 ? '#1B2559' : '#FFFFFF'; }
  var HEX = /^#[0-9a-fA-F]{6}$/;

  /* ---------- isi ---------- */
  var WIDTH_RE = /^\d{1,4}(?:\.\d{1,2})?(?:px|%|vw|vh|vmin|vmax|rem|em|ch)$/;
  /** lebar dari pengaturan: "80vh", "640px", angka lama (px); kosong/salah = 520px */
  function widthCss(w) {
    var s = (typeof w === 'number' ? String(w) + 'px' : String(w || '')).trim().toLowerCase();
    if (/^\d+(?:\.\d+)?$/.test(s)) s += 'px';
    return WIDTH_RE.test(s) ? s : '520px';
  }
  function embedVideo(b) {
    if (b.kind === 'file') { var v = el('video', { controls: true, preload: 'metadata' }); v.src = b.src; return el('div', { class: 'enp-video' }, v); }
    var f = el('iframe', { title: 'Video', loading: 'lazy', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin', allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen' });
    f.src = b.src;
    return el('div', { class: 'enp-video' }, f);
  }
  function alignClass(b) { return b.align && b.align !== 'left' ? ' enp-a-' + b.align : ''; }
  function ratioClass(r) { return /^(4:3|1:1|16:9|3:4|3:2)$/.test(r || '') ? ' enp-ar-' + r.replace(':', '-') : ''; }
  function caption(b) { return b.caption ? el('figcaption', { text: b.caption }) : null; }
  /** tombol/tautan: #close menutup pop-up, alamat luar dibuka di tab baru */
  function linkEl(url, cls, label) {
    var a = el('a', { class: cls, text: label });
    if (url === '#close') { a.href = '#'; a.setAttribute('data-enp-close', '1'); }
    else { a.href = url; if (/^https?:\/\//i.test(url) && url.indexOf(location.origin) !== 0) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } }
    return a;
  }
  var HF = ['auto', 'm', 'l', 'xl', 'vh'];
  var LS_MAX = 200000, LS_KEYS = 200;
  function htmlFrame(b, ctx, nested) {
    if (!b.src) return null;
    var h = HF.indexOf(b.h) >= 0 ? b.h : 'auto';
    var f = el('iframe', { class: 'enp-hf enp-hf-' + h, sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox', referrerpolicy: 'no-referrer', title: b.caption || 'Konten HTML', loading: 'lazy' });
    if (h === 'auto') f.setAttribute('data-auto', '1');
    if (b.scripts && ctx.ls) {
      // bingkai dengan JavaScript memperoleh penyimpanan pengganti: datanya dibawa lewat nama jendela (diisi SEBELUM bingkai dipasang)
      var key = ctx.ls + ':' + b.id, saved = '{}';
      try { var raw = window.localStorage.getItem('enhf:' + key); if (raw) { JSON.parse(raw); saved = raw; } } catch (e) { saved = '{}'; }
      f.setAttribute('data-ls', key);
      f.name = 'enls:' + saved;
    }
    f.src = b.src;
    return el('figure', { class: 'enp-fig enp-html' + (b.size === 'wide' && !nested ? ' enp-wide' : '') }, f, caption(b));
  }
  function frameOf(win, sel) {
    var fr = document.querySelectorAll(sel);
    for (var i = 0; i < fr.length; i++) if (fr[i].contentWindow === win) return fr[i];
    return null;
  }
  // bingkai blok HTML melaporkan tingginya lewat postMessage dan menyimpan data localStorage-nya lewat halaman ini (lihat articles.js; caranya sama)
  window.addEventListener('message', function (e) {
    var d = e.data, f;
    if (!d) return;
    if (d.enFrame === 1 && typeof d.h === 'number' && isFinite(d.h)) {
      f = frameOf(e.source, 'iframe.enp-hf[data-auto]');
      if (f) f.style.height = Math.max(20, Math.min(5000, Math.ceil(d.h))) + 'px';
    } else if (d.enFrame === 2 && d.ls && typeof d.ls === 'object') {
      f = frameOf(e.source, 'iframe.enp-hf[data-ls]');
      if (!f) return;
      var o = Object.create(null), n = 0, size = 0;
      Object.keys(d.ls).forEach(function (k) { var v = d.ls[k]; if (typeof v === 'string') { o[k] = v; n++; size += k.length + v.length; } });
      if (n > LS_KEYS || size > LS_MAX) return;
      try { window.localStorage.setItem('enhf:' + f.getAttribute('data-ls'), JSON.stringify(o)); } catch (err) { /* penyimpanan penuh atau diblokir */ }
    }
  });

  function renderCards(b) {
    var per = [2, 3, 4].indexOf(b.per) >= 0 ? b.per : 3;
    var grid = el('div', { class: 'enp-cards enp-cards-' + per });
    (b.items || []).forEach(function (it) {
      var card = el('article', { class: 'enp-card' });
      if (it.src && /^(\/|https:\/\/)/.test(it.src)) {
        var im = el('img', { alt: it.alt || '', loading: 'lazy' }); im.src = it.src;
        card.appendChild(el('div', { class: 'enp-card-img' + ratioClass(b.ratio || '4:3') }, im));
      }
      var body = el('div', { class: 'enp-card-body' });
      if (it.title) body.appendChild(el('h3', { class: 'enp-card-t', text: it.title }));
      if (it.text) body.appendChild(el('p', { class: 'enp-card-p', text: it.text }));
      if (it.label && it.url) body.appendChild(el('p', { class: 'enp-card-act' }, linkEl(it.url, 'enp-btn enp-btn-' + (b.btn === 'outline' ? 'outline' : 'solid') + ' enp-btn-sm', it.label)));
      card.appendChild(body);
      grid.appendChild(card);
    });
    return el('div', { class: 'enp-cardsw' }, grid);
  }
  function renderTable(b) {
    var rows = (b.rows || []).slice(), al = b.aligns || [];
    if (!rows.length) return null;
    var nc = rows[0].length;
    function row(r, tag) {
      var tr = el('tr');
      for (var i = 0; i < nc; i++) {
        var c = el(tag, { class: al[i] === 'center' ? 'ta-center' : al[i] === 'right' ? 'ta-right' : '', scope: tag === 'th' ? 'col' : null });
        c.innerHTML = r[i] || ''; // sel sudah dibersihkan server (tebal, miring, tautan)
        tr.appendChild(c);
      }
      return tr;
    }
    var t = el('table', { class: 'enp-table' });
    if (b.caption) t.appendChild(el('caption', { text: b.caption }));
    if (b.header) t.appendChild(el('thead', null, row(rows.shift(), 'th')));
    var tb = el('tbody'); rows.forEach(function (r) { tb.appendChild(row(r, 'td')); }); t.appendChild(tb);
    return el('div', { class: 'enp-tablewrap', role: 'region', tabindex: '0', 'aria-label': b.caption || 'Tabel' }, t);
  }
  function renderBlock(b, ctx, nested, extra) {
    switch (b.t) {
      case 'h': { var l = b.level === 3 || b.level === 4 ? b.level : 2; return el('h' + l, { class: 'enp-h enp-h' + l + (l === 2 ? ' enp-title' : '') + alignClass(b), text: b.text }); }
      case 'text': { var rt = el('div', { class: 'enp-rich' }); rt.innerHTML = b.html; return rt; } // HTML sudah dibersihkan server
      /* bentuk lama (sebelum pop-up memakai blok artikel); tetap dibaca kalau popups.json belum diterbitkan ulang */
      case 'title': return el('h2', { class: 'enp-h enp-h2 enp-title' + alignClass(b), text: b.text });
      case 'subtitle': return el('p', { class: 'enp-sub' + alignClass(b), text: b.text });
      case 'p': { var d = el('div', { class: 'enp-p' + alignClass(b) }); d.innerHTML = b.html; return d; }
      case 'img': {
        var img = el('img', { alt: b.alt || '', loading: 'lazy' }); img.src = b.src;
        var inner = img;
        if (b.link) {
          inner = el('a', { href: b.link }); inner.appendChild(img);
          if (/^https?:\/\//i.test(b.link)) { inner.target = '_blank'; inner.rel = 'noopener noreferrer'; }
        }
        var size = b.size === 'full' ? 'wide' : (b.size || 'normal');
        if (nested && size === 'wide') size = 'normal';
        return el('figure', { class: 'enp-fig enp-img enp-img-' + size + (size === 'wide' ? ' enp-wide' : '') + ratioClass(b.ratio) + alignClass(b) }, inner, caption(b));
      }
      case 'button': return el('div', { class: 'enp-btnrow' + alignClass(b) }, linkEl(b.url, 'enp-btn enp-btn-' + (b.style === 'outline' ? 'outline' : 'solid') + (b.full ? ' enp-btn-full' : ''), b.label));
      case 'form': {
        var box = el('div', { class: 'enp-form' });
        ctx.forms.push({ box: box, slug: b.slug });
        return box;
      }
      case 'ul': {
        var ul = el(b.style === 'numbers' ? 'ol' : 'ul', { class: 'enp-list' });
        (b.items || []).forEach(function (t) { ul.appendChild(el('li', { text: t })); });
        return ul;
      }
      case 'quote': return el('blockquote', { class: 'enp-quote' }, el('p', { text: b.text }), b.cite ? el('cite', { text: b.cite }) : null);
      case 'video': return b.src ? el('figure', { class: 'enp-fig' }, embedVideo(b), caption(b)) : null;
      case 'embed': {
        if (!/^https:\/\//i.test(b.url || '')) return null;
        var ef = el('iframe', { title: 'Konten tertanam', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation', referrerpolicy: 'no-referrer-when-downgrade', allowfullscreen: true });
        ef.src = b.url;
        return el('figure', { class: 'enp-fig' }, el('div', { class: 'enp-embed enp-h-' + (['m', 'l', 'xl'].indexOf(b.height) >= 0 ? b.height : 'l') }, ef), caption(b));
      }
      case 'html': return htmlFrame(b, ctx, nested);
      case 'callout': return el('aside', { class: 'enp-callout enp-tone-' + (b.tone || 'info') }, b.title ? el('strong', { text: b.title }) : null, el('p', { text: b.text }));
      case 'faq': {
        var fq = el('section', { class: 'enp-faq' });
        if (b.title) fq.appendChild(el('h3', { class: 'enp-faq-t', text: b.title }));
        (b.items || []).forEach(function (it) { fq.appendChild(el('details', { class: 'enp-faq-item' }, el('summary', { text: it.q }), el('p', { text: it.a }))); });
        return fq;
      }
      case 'cards': return renderCards(b);
      case 'table': return renderTable(b);
      case 'columns': {
        var cols = (b.cols || []).filter(Array.isArray);
        if (nested || cols.length < 2 || cols.length > 3) return null;
        var wrap = el('div', { class: 'enp-cols enp-cols-' + cols.length + ' enp-r-' + (cols.length === 3 ? '1-1-1' : (/^(1-1|1-2|2-1)$/.test(b.ratio || '') ? b.ratio : '1-1')) });
        cols.forEach(function (c) {
          var col = el('div', { class: 'enp-col' });
          c.forEach(function (x) { var n = renderBlock(x, ctx, true, extra); if (n) col.appendChild(n); });
          wrap.appendChild(col);
        });
        return el('div', { class: 'enp-colsw' }, wrap);
      }
      case 'hr': return el('hr', { class: 'enp-hr' });
      case 'spacer': { var s = el('div', { class: 'enp-spacer', 'aria-hidden': 'true' }); s.style.height = (parseInt(b.h, 10) || 24) + 'px'; return s; }
    }
    return extra ? (extra(b) || null) : null; // blocks only a host page knows (the quiz result's Skor and Skor per bagian), also inside columns
  }

  /* ---------- tampil / tutup ---------- */
  function close(instant) {
    if (!current) return;
    var c = current; current = null;
    document.removeEventListener('keydown', c.onKey, true);
    document.documentElement.style.overflow = c.prevOverflow;
    c.overlay.classList.remove('enp-in');
    var gone = function () { if (c.overlay.parentNode) c.overlay.parentNode.removeChild(c.overlay); };
    if (instant) gone(); else setTimeout(gone, 220);
    if (c.prevFocus && c.prevFocus.focus) try { c.prevFocus.focus(); } catch (e) { /* abaikan */ }
  }

  /** latar tema kustom: warna polos, gradasi, atau gambar (dengan lapisan gelap agar teks terbaca) */
  function paintBg(box, st) {
    var t = st.bgType || 'solid';
    if (t === 'gradient' && st.grad) {
      var g = st.grad, c1 = HEX.test(g.c1 || '') ? g.c1 : '#FFFFFF', c2 = HEX.test(g.c2 || '') ? g.c2 : '#DDE6FF';
      box.style.background = g.kind === 'radial' ? 'radial-gradient(circle at 30% 20%, ' + c1 + ', ' + c2 + ')' : 'linear-gradient(' + (parseInt(g.angle, 10) || 0) + 'deg, ' + c1 + ', ' + c2 + ')';
    } else if (t === 'image' && st.image && st.image.src) {
      var o = Math.min(80, Math.max(0, parseInt(st.image.overlay, 10) || 0)) / 100;
      var url = 'url("' + String(st.image.src).replace(/["\\\n]/g, '') + '")';
      box.style.backgroundImage = (o > 0 ? 'linear-gradient(rgba(0,0,0,' + o + '),rgba(0,0,0,' + o + ')),' : '') + url;
      box.style.backgroundSize = 'cover'; box.style.backgroundRepeat = 'no-repeat';
      box.style.backgroundPosition = st.image.pos === 'top' ? 'center top' : st.image.pos === 'bottom' ? 'center bottom' : 'center';
      box.style.backgroundColor = '#1B2559';
    } else {
      box.style.background = HEX.test(st.bg || '') ? st.bg : '#FFFFFF';
    }
  }

  function build(p, opts) {
    var cfg = p.cfg, st = cfg.style || {}, sz = cfg.size || {};
    var pos = cfg.position === 'bottom-right' ? 'br' : cfg.position === 'bottom-left' ? 'bl' : 'center';
    var custom = st.theme === 'custom';
    var overlay = el('div', { class: 'enp-overlay enp-pos-' + pos + (custom ? ' enp-theme-custom' : ' enp-theme-site'), 'data-audience': aud() });
    if (cfg.overlay === false) overlay.className += ' enp-noover';
    var box = el('div', { class: 'enp-box', role: 'dialog', 'aria-modal': cfg.overlay === false ? 'false' : 'true', tabindex: '-1' });
    var scroll = el('div', { class: 'enp-scroll' });
    var radius = (parseInt(st.radius, 10) || 0), pad = (parseInt(st.padding, 10) || 0);
    box.style.width = 'min(' + widthCss(sz.width) + ', 100%)';
    if (custom) {
      box.style.borderRadius = radius + 'px'; scroll.style.borderRadius = radius + 'px';
      box.style.color = HEX.test(st.color || '') ? st.color : '#1B2559';
      paintBg(box, st);
      box.style.setProperty('--enp-pad', pad + 'px');
      scroll.style.padding = pad + 'px';
    } else {
      box.style.setProperty('--enp-pad', '24px'); // tema website: ruang dalam diatur CSS (sama dengan formulir)
      scroll.appendChild(el('span', { class: 'enp-blob', 'aria-hidden': 'true' }));
    }
    if (HEX.test(st.accent || '')) { box.style.setProperty('--enp-accent', st.accent); box.style.setProperty('--enp-on', onColor(st.accent)); }
    if (sz.heightMode === 'fixed') scroll.style.height = 'min(' + (parseInt(sz.height, 10) || 480) + 'px, calc(100vh - 32px))';
    var ctx = { forms: [], ls: 'p:' + p.slug };
    (cfg.blocks || []).forEach(function (b) { var n = renderBlock(b, ctx, false); if (n) scroll.appendChild(n); });
    box.appendChild(scroll);
    var firstTitle = (cfg.blocks || []).filter(function (b) { return b.t === 'h' || b.t === 'title'; })[0];
    box.setAttribute('aria-label', firstTitle ? firstTitle.text : (p.name || 'Pop-up'));
    if (cfg.showClose !== false) box.appendChild(el('button', { type: 'button', class: 'enp-x', 'aria-label': 'Tutup', text: '×', 'data-enp-close': '1' }));
    overlay.appendChild(box);
    if (cfg.closeOnOverlay !== false && cfg.overlay !== false) overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    return { overlay: overlay, box: box, ctx: ctx };
  }

  function mountForms(ctx) {
    ctx.forms.forEach(function (f) {
      var tries = 0;
      (function go() {
        if (window.ENForms) { window.ENForms.mount(f.box, f.slug); return; }
        if (++tries > 60) { f.box.textContent = 'Formulir tidak tersedia.'; return; }
        setTimeout(go, 100);
      })();
    });
  }

  function show(p, opts) {
    opts = opts || {};
    if (current) close(true);
    cssReady().then(function () {
      var b = build(p, opts);
      var prevFocus = document.activeElement;
      var prevOverflow = document.documentElement.style.overflow;
      var modal = p.cfg.overlay !== false && (p.cfg.position || 'center') === 'center';
      if (modal) document.documentElement.style.overflow = 'hidden';
      function onKey(e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'Tab' && modal) {
          var f = b.box.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(b.overlay);
      current = { overlay: b.overlay, onKey: onKey, prevFocus: prevFocus, prevOverflow: prevOverflow, slug: p.slug };
      requestAnimationFrame(function () { b.overlay.classList.add('enp-in'); try { b.box.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } });
      mountForms(b.ctx);
    });
  }

  function open(slug, opts) {
    opts = opts || {};
    if (opts.def) { show(opts.def, opts); return; }
    load().then(function () { var p = list[String(slug).toLowerCase()]; if (p) show(p, opts); });
  }

  /* ---------- aturan tampil otomatis ---------- */
  function normPath(p) {
    p = String(p || '/').replace(/[?#].*$/, '').replace(/\/index\.(html|php)$/i, '/');
    if (p.charAt(0) !== '/') p = '/' + p;
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }
  function pageMatch(rule, path) {
    if (rule.slice(-1) === '*') {
      var b = normPath(rule.slice(0, -1).replace(/\/$/, '') || '/');
      return b === '/' ? true : (path === b || path.indexOf(b + '/') === 0);
    }
    return normPath(rule) === path;
  }
  function wib(s) { return s ? new Date(s + ':00+07:00').getTime() : NaN; }
  function staticOk(p) {
    var c = p.cfg, now = Date.now();
    var a = wib((c.schedule || {}).start), z = wib((c.schedule || {}).end);
    if (!isNaN(a) && now < a) return false;
    if (!isNaN(z) && now > z) return false;
    var pg = c.pages || { mode: 'all' }, path = normPath(location.pathname);
    if (pg.mode === 'include' && !(pg.list || []).some(function (r) { return pageMatch(r, path); })) return false;
    if (pg.mode === 'exclude' && (pg.list || []).some(function (r) { return pageMatch(r, path); })) return false;
    if (c.devices === 'desktop' && isMobile()) return false;
    if (c.devices === 'mobile' && !isMobile()) return false;
    return true;
  }
  function freqOk(p) {
    var f = (p.cfg.frequency || {}), key = 'enp:' + p.slug;
    if (f.mode === 'always') return true;
    var s = store(f.mode === 'session' ? 'session' : 'local');
    if (!s) return true;
    try {
      var t = parseInt(s.getItem(key) || '0', 10);
      if (!t) return true;
      return f.mode === 'session' ? false : (Date.now() - t) > (parseInt(f.days, 10) || 7) * 86400000;
    } catch (e) { return true; }
  }
  function remember(p) {
    var f = (p.cfg.frequency || {});
    if (f.mode === 'always') return;
    var s = store(f.mode === 'session' ? 'session' : 'local');
    if (s) try { s.setItem('enp:' + p.slug, String(Date.now())); } catch (e) { /* abaikan */ }
  }
  function fire(p) {
    if (autoShown || current) return;
    var a = p.cfg.audience || 'all';
    if (a !== 'all' && a !== aud()) return;
    if (!freqOk(p)) return;
    autoShown = true;
    remember(p);
    show(p);
  }
  function arm(p) {
    var t = p.cfg.triggers || {}, off = [];
    function once() { off.forEach(function (f) { f(); }); off = []; fire(p); }
    if (t.load && t.load.on) { var h = setTimeout(once, Math.max(0, parseInt(t.load.delay, 10) || 0) * 1000); off.push(function () { clearTimeout(h); }); }
    if (t.scroll && t.scroll.on) {
      var pct = Math.min(95, Math.max(5, parseInt(t.scroll.percent, 10) || 50));
      var onScroll = function () {
        var d = document.documentElement, max = d.scrollHeight - window.innerHeight;
        if (max > 0 && (window.scrollY / max) * 100 >= pct) once();
      };
      window.addEventListener('scroll', onScroll, { passive: true }); off.push(function () { window.removeEventListener('scroll', onScroll); });
    }
    if (t.exit && t.exit.on && !isMobile()) {
      var onOut = function (e) { if (!e.relatedTarget && e.clientY <= 0) once(); };
      document.addEventListener('mouseout', onOut); off.push(function () { document.removeEventListener('mouseout', onOut); });
    }
  }
  function isPreview() { return !!document.getElementById('enp-def'); }
  function boot() {
    load().then(function () {
      Object.keys(list).forEach(function (k) {
        var p = list[k], t = p.cfg.triggers || {};
        if (!((t.load && t.load.on) || (t.scroll && t.scroll.on) || (t.exit && t.exit.on))) return;
        if (staticOk(p)) arm(p);
      });
    });
  }

  /* ---------- tautan "#popup:alamat" & tombol tutup ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var closer = t.closest('[data-enp-close]');
    if (closer && current) { e.preventDefault(); close(); return; }
    var a = t.closest('a[href],[data-en-popup]');
    if (!a) return;
    var slug = a.getAttribute('data-en-popup');
    if (!slug) { var m = /#popup:([a-z0-9-]+)$/i.exec(a.getAttribute('href') || ''); if (m) slug = m[1].toLowerCase(); }
    var inside = current && a.closest('.enp-box');
    if (!slug) {
      // tautan ke formulir dari DALAM pop-up: tutup pop-up dulu, formulir dibuka oleh popup.js
      if (inside && /#form:[a-z0-9-]+$/i.test(a.getAttribute('href') || '')) close(true);
      return;
    }
    e.preventDefault(); e.stopPropagation();
    open(slug);
  }, true);
  window.addEventListener('hashchange', function () {
    var h = /^#popup:([a-z0-9-]+)$/i.exec(location.hash || '');
    if (h) open(h[1].toLowerCase());
  });

  /* dipakai kuis (quiz-run.js): menampilkan blok isi pop-up di tempat lain. Mengembalikan ctx; panggil mountForms(ctx) setelah dipasang ke halaman.
     opts.ls = awalan kunci penyimpanan untuk bingkai HTML dengan JavaScript (mis. "q:alamat-kuis") */
  function renderBlocks(blocks, parent, extra, opts) {
    var ctx = { forms: [], ls: opts && opts.ls ? String(opts.ls) : '' };
    (blocks || []).forEach(function (b) {
      var n = renderBlock(b, ctx, false, extra);
      if (n) parent.appendChild(n);
    });
    return ctx;
  }
  window.ENPopups = { open: open, close: close, renderBlocks: renderBlocks, mountForms: mountForms, width: widthCss };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (!isPreview()) boot(); });
  else if (!isPreview()) boot();
  // buka langsung bila alamat halaman sudah "#popup:alamat"
  window.addEventListener('load', function () { if (isPreview()) return; var h = /^#popup:([a-z0-9-]+)$/i.exec(location.hash || ''); if (h) open(h[1].toLowerCase()); });
})();
