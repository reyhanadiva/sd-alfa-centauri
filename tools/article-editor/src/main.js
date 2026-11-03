/* eslint-disable */
/* Article block editor (Phase 1 + 2: cards and table). Replaces the stacked-card block list in article.php with a sticky dock (blocks, block settings,
   text toolbar) above a page canvas. Blocks are dragged from the dock, reordered by handle or keyboard, and nested one level into columns.
   Everything is built with DOM calls and CSS class names: the panel's policy allows no <style> tags and no style attributes.

   Use:  var ed = ArtEditor.create({ blocks: [...], isAdmin: true, csrf: '…', articleId: function () { return 12; }, onChange: function () {} });
         container.appendChild(ed.root);  ed.getBlocks();  ed.setBlocks(list);  ed.destroy();
   The data is the article's block list (see art_validate_blocks in lib/articles.php).

   Modes (opts.mode): 'article' (default), 'popup' and 'result' (a quiz result page). Pop-ups and results use the same blocks as articles (the PHP side is
   popup_validate_blocks) plus a few of their own, and the canvas is the pop-up box itself at its real width and colours (ed.setLook), with a button to see it
   for the Anak or the Dewasa look. Extra options: forms (list for the Form block), vars / sections (variable names a result may use), frameUrl(blockId) (where
   an Editor's HTML preview comes from), look, audience. */
import Sortable from 'sortablejs';
import { makeEditor, stateOf, applyBlock, applySize, applyFont, applyAlign, cleanHtml, SIZES, FONTS } from './rte.js';

(function () {
  'use strict';
  var ED = window.ED;
  var el = ED.el;
  var uid = function () { return ED.uid().slice(0, 6); };

  /* ---- labels ---- */
  var L = {
    palette: 'Tambah blok',
    emptyCanvas: 'Seret blok dari bilah di atas ke sini untuk mulai menulis',
    dropHere: 'Lepas blok di sini',
    settings: 'Pengaturan blok', nothing: 'Pilih sebuah blok untuk melihat pengaturannya.',
    up: 'Naikkan', down: 'Turunkan', dup: 'Gandakan', del: 'Hapus',
    hide: '▾ Sembunyikan blok & pengaturan', show: '▸ Tampilkan blok & pengaturan',
  };

  var TYPES = {
    h: { label: 'Judul', icon: 'H', def: function (m) { return m && m !== 'article' ? { t: 'h', level: 2, text: '', align: 'left' } : { t: 'h', level: 2, text: '' }; } },
    text: { label: 'Teks', icon: '¶', def: function () { return { t: 'text', html: '<p></p>' }; } },
    img: { label: 'Gambar', icon: '▣', def: function (m) { return m && m !== 'article' ? { t: 'img', src: '', alt: '', caption: '', ratio: '16:9', size: 'normal', align: 'center', link: '' } : { t: 'img', src: '', alt: '', caption: '', ratio: '16:9', size: 'normal' }; } },
    button: { label: 'Tombol', icon: '▭', def: function (m) { return m && m !== 'article' ? { t: 'button', label: 'Coba kelas gratis', url: '#close', style: 'solid', align: 'center', full: false } : { t: 'button', label: 'Coba kelas gratis', url: '/#coba-gratis', style: 'solid' }; } },
    columns: { label: 'Kolom', icon: '▥', def: function () { return { t: 'columns', ratio: '1-1', cols: [[], []] }; } },
    cards: { label: 'Kartu', icon: '▦', def: function () { return { t: 'cards', per: 3, ratio: '4:3', btn: 'solid', items: [blankCard(), blankCard(), blankCard()] }; } },
    table: { label: 'Tabel', icon: '▤', def: function () { return { t: 'table', header: true, caption: '', aligns: ['left', 'left', 'left'], rows: [['', '', ''], ['', '', ''], ['', '', '']] }; } },
    quote: { label: 'Kutipan', icon: '❝', def: function () { return { t: 'quote', text: '', cite: '' }; } },
    callout: { label: 'Kotak catatan', icon: 'ⓘ', def: function () { return { t: 'callout', tone: 'info', title: '', text: '' }; } },
    faq: { label: 'Tanya jawab', icon: '?', def: function () { return { t: 'faq', title: '', items: [{ q: '', a: '' }] }; } },
    video: { label: 'Video', icon: '▶', def: function () { return { t: 'video', url: '', caption: '' }; } },
    embed: { label: 'Embed', icon: '⧉', def: function () { return { t: 'embed', url: '', height: 'l', caption: '' }; } },
    html: { label: 'HTML', icon: '</>', admin: true, def: function () { return { t: 'html', code: '', h: 'auto', scripts: false, size: 'normal', caption: '' }; } },
    hr: { label: 'Garis pemisah', icon: '―', def: function () { return { t: 'hr' }; } },
    /* only in pop-ups and quiz results */
    form: { label: 'Formulir', icon: '✎', modes: ['popup', 'result'], def: function () { return { t: 'form', slug: '' }; } },
    spacer: { label: 'Jarak kosong', icon: '↕', modes: ['popup', 'result'], def: function () { return { t: 'spacer', h: 24 }; } },
    score: { label: 'Skor', icon: '◎', modes: ['result'], def: function () { return { t: 'score', style: 'card', align: 'center' }; } },
    sections: { label: 'Skor per bagian', icon: '☰', modes: ['result'], def: function () { return { t: 'sections', title: 'Rincian per bagian' }; } },
  };

  /* image frame shapes. The number is what the panel's picker crops new uploads to. */
  var RATIOS = [
    { v: '4:3', label: '4:3', num: 4 / 3, cls: 'ar-4-3' },
    { v: '1:1', label: '1:1 (persegi)', num: 1, cls: 'ar-1-1' },
    { v: '16:9', label: '16:9 (layar lebar)', num: 16 / 9, cls: 'ar-16-9' },
    { v: '3:4', label: 'Potret (3:4)', num: 3 / 4, cls: 'ar-3-4' },
    { v: '3:2', label: 'Lanskap (3:2)', num: 3 / 2, cls: 'ar-3-2' },
  ];
  function ratioOf(v) { for (var i = 0; i < RATIOS.length; i++) if (RATIOS[i].v === v) return RATIOS[i]; return RATIOS[2]; }

  /* limits: the same numbers as ART_* in lib/articles.php */
  var CARD_MAX = 12, TBL_COLS = 8, TBL_ROWS = 30, CELL_MAX = 300, HTML_MAX = 300000;
  var HTML_HEIGHTS = ['auto', 'm', 'l', 'xl', 'vh'];
  function blankCard() { return { src: '', alt: '', title: '', text: '', label: '', url: '' }; }
  var HREF_OK = /^(https?:\/\/|\/|#|mailto:|tel:)/i;
  var ALIGNS = [{ v: 'left', label: 'Kiri' }, { v: 'center', label: 'Tengah' }, { v: 'right', label: 'Kanan' }];

  /* A table cell holds plain text with bold, italic, links and line breaks. Cell HTML is parsed with DOMParser (inert: nothing runs) and
     rebuilt node by node, and read back from the live cell the same way, so only those four things can ever get in or out. */
  function cellDom(html, into) {
    // style attributes are renamed first: parsing one would only make the browser report a policy violation, and none is ever kept
    html = String(html || '').replace(/<[^>]*>/g, function (tag) { return tag.replace(/\sstyle\s*=/gi, ' data-s='); });
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    (function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue.replace(/\u00a0/g, ' '))); return; }
        if (n.nodeType !== 1) return;
        var t = n.nodeName.toLowerCase(), x;
        if (t === 'script' || t === 'style' || t === 'template') return;
        if (t === 'br') dst.appendChild(document.createElement('br'));
        else if (t === 'strong' || t === 'b') { x = document.createElement('strong'); walk(n, x); dst.appendChild(x); }
        else if (t === 'em' || t === 'i') { x = document.createElement('em'); walk(n, x); dst.appendChild(x); }
        else if (t === 'a' && HREF_OK.test(n.getAttribute('href') || '')) { x = document.createElement('a'); x.setAttribute('href', n.getAttribute('href')); walk(n, x); dst.appendChild(x); }
        else walk(n, dst);
      });
    })(doc.body, into);
  }
  function cellHtml(td) {
    var out = '';
    (function walk(src) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { out += esc(n.nodeValue.replace(/\u00a0/g, ' ')); return; }
        if (n.nodeType !== 1) return;
        var t = n.nodeName.toLowerCase();
        if (t === 'br') out += '<br>';
        else if (t === 'strong' || t === 'b') { out += '<strong>'; walk(n); out += '</strong>'; }
        else if (t === 'em' || t === 'i') { out += '<em>'; walk(n); out += '</em>'; }
        else if (t === 'a' && HREF_OK.test(n.getAttribute('href') || '')) { out += '<a href="' + esc(n.getAttribute('href')) + '">'; walk(n); out += '</a>'; }
        else if (t === 'div' || t === 'p') { walk(n); out += '<br>'; }
        else if (t !== 'script' && t !== 'style') walk(n);
      });
    })(td);
    return out.replace(/(<br>)+$/, '');
  }

  var WIDTHS = [
    { k: 'pub', label: 'Desktop', tip: function () { return tplTip(); } },
    { k: 'tab', label: 'Tablet', tip: 'Layar tablet 768 px' },
    { k: 'mob', label: 'HP', tip: 'Layar HP 390 px' },
    { k: 'fill', label: 'Lebar penuh', tip: 'Pakai seluruh lebar layar' },
  ];
  /* The real widths of the published page, read from the template file the page loads (articles/template-vars.css). */
  function tplPx(name) {
    try {
      if (!window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()) return 0;
      var p = document.createElement('div');
      p.setAttribute('aria-hidden', 'true');
      p.style.position = 'absolute'; p.style.visibility = 'hidden'; p.style.left = '-9999px'; p.style.width = 'var(' + name + ')'; // CSSOM, allowed by the panel policy
      document.body.appendChild(p);
      var w = p.getBoundingClientRect().width;
      p.remove();
      return Math.round(w);
    } catch (e) { return 0; }
  }
  function tplTip() {
    var col = tplPx('--col'), wide = tplPx('--wide');
    if (!col) return 'Seperti saat terbit';
    return 'Seperti saat terbit: teks artikel selebar ' + col + ' px' + (wide ? ', blok lebar 90% layar (' + wide + ' px di layar ini; editor menampilkan sampai selebar areanya)' : '');
  }
  var PREF = 'artEditor.dock.collapsed';
  function prefGet() { try { return window.localStorage.getItem(PREF) === '1'; } catch (e) { return false; } }
  function prefSet(v) { try { window.localStorage.setItem(PREF, v ? '1' : '0'); } catch (e) { /* storage can be blocked */ } }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isBlk(n) { return n && n.classList && n.classList.contains('ae-blk'); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fit(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; } // CSSOM: allowed by the panel policy
  function selectEl(label, opts, value, onchange) {
    var s = el('select', { 'aria-label': label, onchange: function (e) { onchange(e.target.value); } },
      opts.map(function (o) { return el('option', { value: o.v, text: o.label }); }));
    s.value = value;
    return s;
  }
  function field(label, input, hint) { return el('label', { class: 'ae-f' }, el('span', { text: label }), input, hint ? el('small', { text: hint }) : null); }
  function note(text) { return el('p', { class: 'muted ae-note', text: text }); }
  function setDragData(dt) { try { dt.setData('application/x-ae-block', '1'); } catch (e) { /* not available: nothing to do */ } }

  /** old articles: paragraph and list blocks become one text block each; images without a frame shape get 16:9 */
  function norm(b, mode) {
    if (!b || typeof b !== 'object') return null;
    var pop = !!mode && mode !== 'article';
    var al = function (v) { return v === 'center' || v === 'right' ? v : 'left'; };
    if (b.t === 'p') return { id: b.id, t: 'text', html: '<p>' + (b.html || '') + '</p>' };
    if (b.t === 'ul') {
      var tag = b.style === 'numbers' ? 'ol' : 'ul';
      return { id: b.id, t: 'text', html: '<' + tag + '>' + (b.items || []).map(function (i) { return '<li><p>' + esc(i) + '</p></li>'; }).join('') + '</' + tag + '>' };
    }
    if (b.t === 'h') { b = Object.assign({}, b); b.level = b.level >= 2 && b.level <= 4 ? b.level : 2; if (pop) b.align = al(b.align); }
    if (b.t === 'img') {
      b = Object.assign({}, b); b.ratio = b.ratio || '16:9';
      b.size = pop ? (b.size === 'wide' || b.size === 'small' ? b.size : 'normal') : (b.size === 'wide' ? 'wide' : 'normal');
      if (pop) { b.align = al(b.align); b.link = typeof b.link === 'string' ? b.link : ''; }
    }
    if (b.t === 'button' && pop) { b = Object.assign({}, b); b.align = al(b.align); b.full = !!b.full; b.style = b.style === 'outline' ? 'outline' : 'solid'; }
    if (b.t === 'form') { b = Object.assign({}, b); b.slug = typeof b.slug === 'string' ? b.slug : ''; }
    if (b.t === 'spacer') { b = Object.assign({}, b); b.h = Math.max(8, Math.min(120, parseInt(b.h, 10) || 24)); }
    if (b.t === 'score') { b = Object.assign({}, b); b.style = b.style === 'plain' ? 'plain' : 'card'; b.align = al(b.align); }
    if (b.t === 'sections') { b = Object.assign({}, b); b.title = typeof b.title === 'string' ? b.title : ''; }
    if (b.t === 'columns') {
      b = Object.assign({}, b);
      b.cols = (b.cols || []).map(function (c) { return (c || []).map(function (x) { return norm(x, mode); }).filter(Boolean); });
      while (b.cols.length < 2) b.cols.push([]);
      b.cols = b.cols.map(function (c) { return c.filter(function (x) { return x.t !== 'html'; }); }); // an HTML block is top level only
    }
    if (b.t === 'html') {
      b = Object.assign({}, b);
      b.code = typeof b.code === 'string' ? b.code : '';
      b.scripts = b.scripts === true;
      b.h = HTML_HEIGHTS.indexOf(b.h) >= 0 ? b.h : 'auto';
      b.size = b.size === 'wide' ? 'wide' : 'normal';
      b.caption = typeof b.caption === 'string' ? b.caption : '';
    }
    if (b.t === 'cards') {
      b = Object.assign({}, b);
      b.per = b.per === 2 || b.per === 4 ? b.per : 3;
      b.ratio = RATIOS.some(function (r) { return r.v === b.ratio; }) ? b.ratio : '4:3';
      b.btn = b.btn === 'outline' ? 'outline' : 'solid';
      b.items = (Array.isArray(b.items) ? b.items : []).slice(0, CARD_MAX).map(function (i) { return Object.assign(blankCard(), i); });
      if (!b.items.length) b.items.push(blankCard());
    }
    if (b.t === 'table') {
      b = Object.assign({}, b);
      var rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, TBL_ROWS).map(function (r) {
        return (Array.isArray(r) ? r : []).slice(0, TBL_COLS).map(function (c) { return typeof c === 'string' ? c : ''; });
      });
      var n = Math.max(1, rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0));
      if (!rows.length) rows.push([]);
      rows.forEach(function (r) { while (r.length < n) r.push(''); });
      var al = Array.isArray(b.aligns) ? b.aligns : [];
      b.rows = rows; b.aligns = [];
      for (var i = 0; i < n; i++) b.aligns.push(al[i] === 'center' || al[i] === 'right' ? al[i] : 'left');
      b.header = !!b.header; b.caption = b.caption || '';
    }
    return b;
  }

  function create(opts) {
    opts = opts || {};
    var mode = opts.mode === 'popup' || opts.mode === 'result' ? opts.mode : 'article';
    var pop = mode !== 'article';                       // pop-up or quiz result: the canvas is the box itself
    var WHAT = mode === 'result' ? 'halaman hasil' : 'pop-up';
    var state = { sel: null, ed: null, cell: null }; // ed: the text editor of the chosen block; cell: the chosen table cell (bold, italic, link only)
    var rootList, cvWrap, tb, setBox, dockBody, undoBox, lastDel = null, undoTimer = null, loading = false;
    var tbRefs = {};

    /* changed(true) = a structural change (add, move, delete, duplicate): its own undo step at once. Anything else (typing, a setting) is grouped after a short pause. */
    function changed(now) {
      if (loading) return;
      if (opts.onChange) opts.onChange();
      if (now === true) snapNow(); else { clearTimeout(histTimer); histTimer = setTimeout(snapNow, HIST_PAUSE); syncHist(); }
      outLater(now === true);
    }

    /* ---------- history: undo / redo of everything in the editor. Snapshots of the whole page, this session only. ---------- */
    var HIST_MAX = 100, HIST_BYTES = 24e6, HIST_PAUSE = 500;
    var hist = { s: [], i: -1 }, histTimer = null, histMsgTimer = null, undoB, redoB, histMsg;
    function snapNow() {
      clearTimeout(histTimer); histTimer = null;
      var j = JSON.stringify(serializeList(rootList));
      if (hist.i >= 0 && hist.s[hist.i] === j) { syncHist(); return; }
      hist.s.length = hist.i + 1; // a new change ends the redo line
      hist.s.push(j); hist.i = hist.s.length - 1;
      var bytes = 0; hist.s.forEach(function (x) { bytes += x.length; });
      while (hist.s.length > 1 && (hist.s.length > HIST_MAX + 1 || bytes > HIST_BYTES)) { bytes -= hist.s.shift().length; hist.i--; }
      syncHist();
    }
    function histReset() {
      clearTimeout(histTimer); histTimer = null;
      hist = { s: [JSON.stringify(serializeList(rootList))], i: 0 };
      syncHist();
    }
    function syncHist() {
      if (!undoB) return;
      undoB.disabled = !(hist.i > 0 || histTimer);
      redoB.disabled = !!histTimer || hist.i >= hist.s.length - 1;
    }
    function histSay(t) {
      histMsg.textContent = t; clearTimeout(histMsgTimer);
      histMsgTimer = setTimeout(function () { histMsg.textContent = ''; }, 2500);
    }
    function restoreSnap(j) {
      var selId = state.sel ? state.sel.getAttribute('data-id') : null;
      var typing = !!(root && root.contains(document.activeElement) && cvWrap.contains(document.activeElement));
      var sx = window.pageXOffset, sy = window.pageYOffset;
      load(JSON.parse(j));
      undoBox.hidden = true; lastDel = null; clearTimeout(undoTimer);
      if (selId) {
        var b = rootList.querySelector('[data-id="' + selId + '"]');
        if (b) { select(b); if (typing && b._api.focus) b._api.focus(); }
      }
      window.scrollTo(sx, sy);
      if (opts.onChange) opts.onChange();
      syncHist(); outLater(true);
    }
    function undo() {
      if (histTimer) snapNow(); // the last typing is still waiting for its pause: make it a step first
      if (hist.i <= 0) { histSay('Tidak ada yang bisa diurungkan'); return false; }
      hist.i--; restoreSnap(hist.s[hist.i]); histSay('Diurungkan'); return true;
    }
    function redo() {
      if (histTimer || hist.i >= hist.s.length - 1) { histSay('Tidak ada yang bisa diulang'); return false; }
      hist.i++; restoreSnap(hist.s[hist.i]); histSay('Diulang'); return true;
    }

    /* ---------- lists, Sortable ---------- */
    function serializeList(list) {
      return Array.prototype.filter.call(list.children, isBlk).map(function (b) { return b._api.get(); });
    }
    function destroyList(list) {
      Array.prototype.filter.call(list.children, isBlk).forEach(function (b) { b._api.destroy(); });
      var s = Sortable.get(list); if (s) s.destroy();
    }
    function stripIds(d) {
      var c = JSON.parse(JSON.stringify(d));
      (function walk(x) { delete x.id; if (x.cols) x.cols.forEach(function (col) { col.forEach(walk); }); })(c);
      return c;
    }
    // By default Sortable puts the dragged block's text into the drag data, and a text editor under the pointer at drop time would paste it.
    // A private data type keeps Firefox happy (it needs some data) and gives editors nothing to paste.
    function listOpts() {
      return {
        setData: setDragData,
        group: { name: 'blocks', pull: true, put: function (to, from, dragEl) { var k = dragEl.getAttribute('data-type'); return !(to.el.classList.contains('ae-col') && (k === 'columns' || k === 'html' || k === 'score' || k === 'sections')); } }, // none of these nest
        handle: '.ae-blk-h', draggable: '.ae-blk', animation: 150,
        ghostClass: 'ae-ghost', chosenClass: 'ae-chosen', dragClass: 'ae-drag',
        fallbackOnBody: true, swapThreshold: 0.65, emptyInsertThreshold: 16,
        onAdd: function (evt) {
          if (evt.item.classList.contains('ae-tile')) {
            var b = buildBlock(TYPES[evt.item.getAttribute('data-type')].def(mode));
            evt.item.replaceWith(b); select(b); if (b._api.focus) b._api.focus();
          }
          changed(true);
        },
        onUpdate: function () { changed(true); }, onRemove: function () { changed(true); },
        // a frame that is moved in the page reloads (and loses a posted document): load the moved block's preview again, and keep the pointer out of frames while dragging
        onStart: function () { if (root) root.classList.add('is-dragging'); },
        onEnd: function (evt) { if (root) root.classList.remove('is-dragging'); if (evt.item && evt.item._api && evt.item._api.reload) evt.item._api.reload(); },
      };
    }

    /* ---------- block types ---------- */
    var BUILD = {
      h: function (d, blk) {
        // a one-line-looking textarea that grows, so long headings wrap instead of being cut off
        var inp = el('textarea', { rows: '1', class: 'ae-h-in ae-h' + d.level, maxlength: '150', placeholder: 'Judul bagian', 'aria-label': 'Teks judul', value: d.text || '',
          oninput: function (e) { d.text = e.target.value.replace(/\n/g, ' '); fit(inp); changed(); },
          onkeydown: function (e) { if (e.key === 'Enter') e.preventDefault(); } });
        setTimeout(function () { fit(inp); }, 0);
        function paint() { if (pop) blk.setAttribute('data-align', d.align || 'left'); }
        paint();
        return {
          body: inp,
          get: function () { var o = { id: d.id, t: 'h', level: d.level, text: d.text || '' }; if (pop) o.align = d.align || 'left'; return o; },
          destroy: function () {}, focus: function () { inp.focus(); },
          settings: function () {
            var out = [field('Tingkat judul', selectEl('Tingkat judul', [{ v: '2', label: 'Besar (H2)' }, { v: '3', label: 'Sedang (H3)' }, { v: '4', label: 'Kecil (H4)' }], String(d.level), function (v) {
              d.level = parseInt(v, 10); inp.className = 'ae-h-in ae-h' + d.level; fit(inp); changed();
            }), pop ? 'Besar (H2) cocok untuk judul utama ' + WHAT + '.' : 'Judul artikel sendiri adalah H1.')];
            if (pop) out.push(field('Rata teks', selectEl('Rata teks', ALIGNS, d.align || 'left', function (v) { d.align = v; paint(); changed(); })));
            return out;
          },
        };
      },
      text: function (d) {
        var host = el('div', { class: 'ae-rte-host' });
        var ed = makeEditor(host, d.html, {
          update: function () { d.html = cleanHtml(ed); host.classList.toggle('is-empty', ed.isEmpty); changed(); },
          selection: function () { if (state.ed === ed) syncTb(); },
        });
        host.classList.toggle('is-empty', ed.isEmpty);
        return {
          body: host, ed: ed,
          get: function () { return { id: d.id, t: 'text', html: cleanHtml(ed) }; },
          destroy: function () { ed.destroy(); }, focus: function () { ed.commands.focus('end'); },
          settings: function () { return [note('Pakai bilah alat di atas halaman untuk judul, ukuran, huruf, tebal, miring, garis bawah, coret, rata teks, tautan, dan daftar.')]; },
        };
      },
      img: function (d, blk) {
        var frame = el('div', { class: 'ae-fr' });
        var cap = el('figcaption', { class: 'ae-cap' });
        function again() { if (state.sel === blk) renderSettings(); }
        function pick() {
          var r = ratioOf(d.ratio);
          if (!window.ENPicker) return;
          // the panel's own picker: choose an uploaded image as it is, or upload a new one that must be cropped to this shape first
          window.ENPicker.open({ ratio: r.num, ratioLabel: r.v, outWidth: d.size === 'wide' ? 1800 : 1400, title: pop ? 'Gambar ' + WHAT : 'Gambar isi artikel', onPick: function (p) { d.src = p; draw(); again(); changed(); } });
        }
        function draw() {
          frame.className = 'ae-fr ae-' + ratioOf(d.ratio).cls;
          clear(frame);
          if (d.src) frame.appendChild(el('img', { src: d.src, alt: d.alt || '' }));
          else frame.appendChild(el('button', { type: 'button', class: 'ae-fr-empty', onclick: pick },
            el('span', { class: 'ic', 'aria-hidden': 'true', text: '▣' }), el('span', { text: 'Pilih atau unggah gambar' })));
          cap.textContent = d.caption || ''; cap.hidden = !d.caption;
        }
        function sizeOf() { return d.size === 'wide' ? 'wide' : (pop && d.size === 'small' ? 'small' : 'normal'); }
        function mark() { blk.setAttribute('data-size', sizeOf()); if (pop) blk.setAttribute('data-align', d.align || 'center'); } // lets the canvas show a wide / small image as such (top level only)
        draw(); mark();
        return {
          body: el('figure', { class: 'ae-fig' }, frame, cap),
          get: function () {
            var o = { id: d.id, t: 'img', src: d.src || '', alt: d.alt || '', caption: d.caption || '', ratio: d.ratio, size: sizeOf() };
            if (pop) { o.align = d.align || 'center'; o.link = d.link || ''; }
            return o;
          },
          destroy: function () {}, focus: function () {},
          settings: function () {
            var row = el('div', { class: 'ae-imgrow' }, d.src ? el('img', { class: 'ae-thumb', src: d.src, alt: '' }) : el('span', { class: 'ae-thumb ae-thumb-empty', text: 'Belum ada' }));
            row.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: pick }, d.src ? 'Ganti gambar' : 'Pilih / unggah'));
            if (d.src) row.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { d.src = ''; draw(); again(); changed(); } }, 'Kosongkan'));
            var out = [
              el('div', { class: 'ae-f ae-f-img' }, el('span', { text: 'Gambar' }), row),
              field('Bentuk bingkai', selectEl('Bentuk bingkai', RATIOS, d.ratio, function (v) { d.ratio = v; draw(); changed(); }), 'Gambar baru dipotong sesuai bentuk ini. Gambar lama tampil terpotong di tengah.'),
            ];
            if (blk.parentNode && blk.parentNode.classList.contains('ae-col')) out.push(note('Di dalam kolom, gambar selalu selebar kolomnya.'));
            else if (pop) {
              out.push(field('Lebar', selectEl('Lebar', [{ v: 'normal', label: 'Selebar isi ' + WHAT }, { v: 'small', label: 'Kecil (55%)' }, { v: 'wide', label: 'Tepi ke tepi' }], sizeOf(), function (v) { d.size = v; mark(); changed(); }), 'Tepi ke tepi: sampai ke sisi kotak, tanpa sudut membulat.'));
              out.push(field('Rata gambar', selectEl('Rata gambar', ALIGNS, d.align || 'center', function (v) { d.align = v; mark(); changed(); }), 'Terlihat untuk gambar kecil.'));
            } else out.push(field('Lebar', selectEl('Lebar', [{ v: 'normal', label: 'Sesuai kolom artikel' }, { v: 'wide', label: 'Lebih lebar dari teks' }], d.size === 'wide' ? 'wide' : 'normal', function (v) { d.size = v; mark(); changed(); }), 'Lebar tampil di halaman terbit.'));
            out.push(field('Teks alternatif', el('input', { type: 'text', maxlength: '150', value: d.alt || '', oninput: function (e) {
              d.alt = e.target.value; var im = frame.querySelector('img'); if (im) im.setAttribute('alt', d.alt); changed();
            } }), 'Menjelaskan gambar untuk pembaca layar dan mesin pencari. Disarankan.'));
            out.push(field('Keterangan (opsional)', el('input', { type: 'text', maxlength: '200', value: d.caption || '', oninput: function (e) { d.caption = e.target.value; cap.textContent = d.caption; cap.hidden = !d.caption; changed(); } })));
            if (pop) out.push(field('Tautan gambar (opsional)', el('input', { type: 'text', maxlength: '300', value: d.link || '', placeholder: 'https://… atau #form:nama', oninput: function (e) { d.link = e.target.value.trim(); changed(); } }), 'Gambar bisa diklik. Sama seperti tujuan tombol.'));
            return out;
          },
        };
      },
      button: function (d, blk) {
        var a = el('span', { class: 'ae-btn ae-btn-' + (d.style === 'outline' ? 'outline' : 'solid'), text: d.label || 'Tombol' });
        function paint() { if (pop) { blk.setAttribute('data-align', d.align || 'center'); blk.classList.toggle('is-full', !!d.full); } }
        paint();
        return {
          body: el('div', { class: 'ae-btn-wrap' }, a),
          get: function () {
            var o = { id: d.id, t: 'button', label: d.label || '', url: d.url || '', style: d.style === 'outline' ? 'outline' : 'solid' };
            if (pop) { o.align = d.align || 'center'; o.full = !!d.full; }
            return o;
          },
          destroy: function () {},
          settings: function () {
            var urlIn = el('input', { type: 'text', maxlength: '300', value: d.url || '', oninput: function (e) { d.url = e.target.value; changed(); } });
            var out = [
              field('Tulisan tombol', el('input', { type: 'text', maxlength: '60', value: d.label || '', oninput: function (e) { d.label = e.target.value; a.textContent = d.label || 'Tombol'; changed(); } })),
              field('Tujuan', urlIn,
                pop ? '#close menutup ' + WHAT + '. https://…, jalur seperti /#coba-gratis, atau #form:nama / #popup:nama / #quiz:nama' + (mode === 'result' ? '. Boleh memuat variabel, mis. {name}' : '')
                  : 'https://…, jalur seperti /#coba-gratis, atau #form:nama / #popup:nama / #quiz:nama'),
            ];
            if (pop) {
              // quick fill: close, and the forms, pop-ups and quizzes that exist (opts.targets = [{ v: '#form:daftar', label: 'Buka formulir: Daftar' }, …])
              var quick = [{ v: '', label: '— isi cepat —' }, { v: '#close', label: 'Tutup ' + WHAT + ' (#close)' }].concat(opts.targets || []);
              var qs = selectEl('Isi cepat tujuan', quick, '', function (v) { if (v) { d.url = v; urlIn.value = v; changed(); } qs.value = ''; });
              out.push(field('Isi cepat', qs));
            }
            out.push(field('Gaya', selectEl('Gaya', [{ v: 'solid', label: 'Penuh' }, { v: 'outline', label: 'Garis tepi' }], d.style === 'outline' ? 'outline' : 'solid', function (v) { d.style = v; a.className = 'ae-btn ae-btn-' + v; changed(); })));
            if (pop) {
              out.push(field('Rata tombol', selectEl('Rata tombol', ALIGNS, d.align || 'center', function (v) { d.align = v; paint(); changed(); })));
              out.push(field('Lebar tombol', selectEl('Lebar tombol', [{ v: '0', label: 'Sesuai tulisan' }, { v: '1', label: 'Selebar kotak' }], d.full ? '1' : '0', function (v) { d.full = v === '1'; paint(); changed(); })));
            }
            return out;
          },
        };
      },
      quote: function (d) {
        var ta = el('textarea', { rows: '1', class: 'ae-q-in', maxlength: '500', placeholder: 'Tulis kutipan…', 'aria-label': 'Kutipan', value: d.text || '', oninput: function (e) { d.text = e.target.value; fit(ta); changed(); } });
        var cite = el('input', { type: 'text', class: 'ae-q-cite', maxlength: '100', placeholder: 'Sumber (opsional)', 'aria-label': 'Sumber kutipan', value: d.cite || '', oninput: function (e) { d.cite = e.target.value; changed(); } });
        setTimeout(function () { fit(ta); }, 0);
        return {
          body: el('blockquote', { class: 'ae-quote' }, ta, cite),
          get: function () { return { id: d.id, t: 'quote', text: d.text || '', cite: d.cite || '' }; },
          destroy: function () {}, focus: function () { ta.focus(); },
          settings: function () { return [note('Ketik kutipan dan sumbernya langsung di halaman.')]; },
        };
      },
      callout: function (d) {
        var box = el('aside', { class: 'ae-callout ae-tone-' + (d.tone || 'info') });
        var title = el('input', { type: 'text', class: 'ae-co-title', maxlength: '80', placeholder: 'Judul kotak (opsional)', 'aria-label': 'Judul kotak', value: d.title || '', oninput: function (e) { d.title = e.target.value; changed(); } });
        var ta = el('textarea', { rows: '1', class: 'ae-co-in', maxlength: '800', placeholder: 'Isi catatan…', 'aria-label': 'Isi kotak', value: d.text || '', oninput: function (e) { d.text = e.target.value; fit(ta); changed(); } });
        box.appendChild(title); box.appendChild(ta);
        setTimeout(function () { fit(ta); }, 0);
        return {
          body: box,
          get: function () { return { id: d.id, t: 'callout', tone: d.tone || 'info', title: d.title || '', text: d.text || '' }; },
          destroy: function () {}, focus: function () { ta.focus(); },
          settings: function () {
            return [field('Jenis', selectEl('Jenis kotak', [{ v: 'info', label: 'Info' }, { v: 'tip', label: 'Tips' }, { v: 'warning', label: 'Perhatian' }], d.tone || 'info', function (v) { d.tone = v; box.className = 'ae-callout ae-tone-' + v; changed(); }))];
          },
        };
      },
      faq: function (d) {
        d.items = Array.isArray(d.items) && d.items.length ? d.items : [{ q: '', a: '' }];
        var title = el('input', { type: 'text', class: 'ae-faq-title', maxlength: '120', placeholder: 'Judul bagian (opsional), mis. Pertanyaan yang sering diajukan', 'aria-label': 'Judul bagian tanya jawab', value: d.title || '', oninput: function (e) { d.title = e.target.value; changed(); } });
        var list = el('div', { class: 'ae-faq-items' });
        function draw() {
          clear(list);
          d.items.forEach(function (it, i) {
            var q = el('input', { type: 'text', class: 'ae-faq-q', maxlength: '200', placeholder: 'Pertanyaan ' + (i + 1), 'aria-label': 'Pertanyaan ' + (i + 1), value: it.q || '', oninput: function (e) { it.q = e.target.value; changed(); } });
            var a = el('textarea', { rows: '1', class: 'ae-faq-a', maxlength: '1200', placeholder: 'Jawaban: jawab langsung di kalimat pertama', 'aria-label': 'Jawaban ' + (i + 1), value: it.a || '', oninput: function (e) { it.a = e.target.value; fit(a); changed(); } });
            setTimeout(function () { fit(a); }, 0);
            list.appendChild(el('div', { class: 'ae-faq-item' }, q, a,
              d.items.length > 1 ? el('button', { type: 'button', class: 'ae-linkbtn ae-danger', onclick: function () { d.items.splice(i, 1); draw(); changed(); } }, 'Hapus butir') : null));
          });
          if (d.items.length < 15) list.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { d.items.push({ q: '', a: '' }); draw(); changed(); } }, '+ Tambah pertanyaan'));
        }
        draw();
        return {
          body: el('section', { class: 'ae-faq' }, title, list),
          get: function () { return { id: d.id, t: 'faq', title: d.title || '', items: d.items.map(function (i) { return { q: i.q || '', a: i.a || '' }; }) }; },
          destroy: function () {}, focus: function () { title.focus(); },
          settings: function () { return [note('Tanya jawab juga dikirim ke mesin pencari dan asisten AI sebagai data terstruktur (FAQPage). Setiap butir butuh pertanyaan dan jawaban; maksimal 15.')]; },
        };
      },
      video: function (d, blk) {
        var box = el('div', { class: 'ae-ph ae-ph-video' });
        var cap = el('figcaption', { class: 'ae-cap' });
        function draw() {
          clear(box);
          box.appendChild(el('span', { class: 'ic', 'aria-hidden': 'true', text: '▶' }));
          box.appendChild(el('span', { text: d.url ? d.url : 'Alamat video belum diisi. Isi di pengaturan blok.' }));
          cap.textContent = d.caption || ''; cap.hidden = !d.caption;
        }
        draw();
        return {
          body: el('figure', { class: 'ae-fig' }, box, cap),
          get: function () { return { id: d.id, t: 'video', url: d.url || '', caption: d.caption || '' }; },
          destroy: function () {}, focus: function () {},
          settings: function () {
            return [
              field('Alamat video', el('input', { type: 'text', maxlength: '300', placeholder: 'https://www.youtube.com/watch?v=…', value: d.url || '', oninput: function (e) { d.url = e.target.value.trim(); draw(); changed(); } }), 'Tautan YouTube, Vimeo, atau file .mp4 / .webm (https).'),
              field('Keterangan (opsional)', el('input', { type: 'text', maxlength: '200', value: d.caption || '', oninput: function (e) { d.caption = e.target.value; draw(); changed(); } })),
            ];
          },
        };
      },
      embed: function (d) {
        var box = el('div', { class: 'ae-ph ae-ph-embed ae-eh-' + (d.height || 'l') });
        var cap = el('figcaption', { class: 'ae-cap' });
        function draw() {
          clear(box);
          box.appendChild(el('span', { class: 'ic', 'aria-hidden': 'true', text: '⧉' }));
          box.appendChild(el('span', { text: d.url ? d.url : 'Alamat halaman belum diisi. Isi di pengaturan blok.' }));
          cap.textContent = d.caption || ''; cap.hidden = !d.caption;
        }
        draw();
        return {
          body: el('figure', { class: 'ae-fig' }, box, cap),
          get: function () { return { id: d.id, t: 'embed', url: d.url || '', height: d.height || 'l', caption: d.caption || '' }; },
          destroy: function () {}, focus: function () {},
          settings: function () {
            return [
              field('Alamat halaman', el('input', { type: 'text', maxlength: '400', placeholder: 'https://…', value: d.url || '', oninput: function (e) { d.url = e.target.value.trim(); draw(); changed(); } }),
                'https saja. ' + (opts.isAdmin ? 'Sebagai Admin, Anda boleh memakai situs apa pun yang mengizinkan ditanam.' : 'Situs yang diizinkan: YouTube, Vimeo, Google (Docs, Maps, Forms, Drive), Spotify, SoundCloud, Canva, Figma, Padlet, Wordwall, Quizlet, Kahoot, CodePen, OpenStreetMap, dan sejenisnya.')),
              field('Tinggi', selectEl('Tinggi', [{ v: 'm', label: 'Sedang' }, { v: 'l', label: 'Tinggi' }, { v: 'xl', label: 'Sangat tinggi' }], d.height || 'l', function (v) { d.height = v; box.className = 'ae-ph ae-ph-embed ae-eh-' + v; changed(); })),
              field('Keterangan (opsional)', el('input', { type: 'text', maxlength: '200', value: d.caption || '', oninput: function (e) { d.caption = e.target.value; draw(); changed(); } })),
              note('Beberapa situs menolak ditanam. Cek di Pratinjau.'),
            ];
          },
        };
      },
      /* Own HTML. The code never runs inside the panel page: it is shown in a sandboxed iframe whose document comes from article-frame.php
         (its own security policy, no same-origin access). Admin: the code in the box is posted to that page by a hidden form that targets the
         frame, so nothing is saved. Editors cannot change the code; they see the saved block through a GET of the same page. */
      html: function (d, blk) {
        var admin = !!opts.isAdmin;
        var fname = 'aehf-' + d.id, timer = null, tries = 0, rev = 0;
        var counter = el('small', { class: 'ae-code-n' });
        function drawCount() {
          var n = (d.code || '').length;
          counter.textContent = n.toLocaleString('id-ID') + ' dari ' + HTML_MAX.toLocaleString('id-ID') + ' huruf';
          counter.className = 'ae-code-n' + (n > HTML_MAX * 0.9 ? ' warn' : '');
        }
        var ta = el('textarea', { class: 'ae-code', rows: '10', wrap: 'off', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', maxlength: String(HTML_MAX),
          'aria-label': 'Kode HTML', placeholder: admin ? '<div>…</div>' : '', readonly: !admin, value: d.code || '',
          oninput: function (e) { d.code = e.target.value; drawCount(); schedule(700); changed(); } });
        var frame = el('iframe', { class: 'ae-hf', name: fname, title: 'Pratinjau blok HTML. Dijalankan terpisah dari halaman.', referrerpolicy: 'no-referrer' });
        frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox'); // never allow-same-origin
        var hint = el('div', { class: 'ae-ph ae-hf-empty' });
        var form = el('form', { method: 'post', action: opts.frameAction || 'article-frame.php', target: fname, hidden: true, class: 'ae-hf-form' },
          el('input', { type: 'hidden', name: '_csrf', value: opts.csrf || '' }), el('input', { type: 'hidden', name: 'scripts', value: '0' }), el('textarea', { name: 'code', hidden: true }));
        var cap = el('figcaption', { class: 'ae-cap' });
        function sizeFrame() {
          frame.className = 'ae-hf ae-hf-' + d.h;
          if (d.h === 'auto') frame.setAttribute('data-auto', '1'); else { frame.removeAttribute('data-auto'); frame.style.height = ''; } // CSSOM: allowed by the panel policy
        }
        function articleId() { var v = typeof opts.articleId === 'function' ? opts.articleId() : opts.articleId; return parseInt(v, 10) || 0; }
        // where an Editor's preview of the saved block comes from: pop-ups and results give their own address, articles use article-frame.php
        function savedSrc() {
          if (typeof opts.frameUrl === 'function') return opts.frameUrl(d.id) || '';
          var id = articleId();
          return id ? 'article-frame.php?id=' + id + '&b=' + encodeURIComponent(d.id) : '';
        }
        function say(text) { clear(hint); hint.appendChild(el('span', { class: 'ic', 'aria-hidden': 'true', text: '</>' })); hint.appendChild(el('span', { text: text })); }
        function schedule(ms) { clearTimeout(timer); timer = setTimeout(refresh, ms); }
        function refresh() {
          clearTimeout(timer);
          // a form can only target a frame that is in the page; blocks are put in the page right after they are built
          if (!frame.isConnected) { if (tries++ < 30) timer = setTimeout(refresh, 100); return; }
          tries = 0;
          if (admin) {
            var empty = !(d.code || '').trim();
            frame.hidden = empty; hint.hidden = !empty;
            if (empty) { say('Tempel kode HTML di kotak di atas. Pratinjau muncul di sini.'); return; }
            form.elements.scripts.value = d.scripts ? '1' : '0';
            form.elements.code.value = d.code;
            form.submit();
          } else {
            var src = savedSrc();
            frame.hidden = !src; hint.hidden = !!src;
            if (!src) { say(pop ? 'Simpan dulu untuk melihat pratinjau.' : 'Simpan artikel dulu untuk melihat pratinjau.'); return; }
            frame.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'r=' + (++rev);
          }
        }
        function draw() { cap.textContent = d.caption || ''; cap.hidden = !d.caption; }
        sizeFrame(); drawCount(); draw();
        blk.setAttribute('data-size', d.size === 'wide' ? 'wide' : 'normal'); // the canvas shows a wide block as wide (top level only)
        schedule(0);
        return {
          body: el('figure', { class: 'ae-fig ae-html' },
            el('div', { class: 'ae-hf-lbl' }, el('span', { text: admin ? 'Kode HTML' : 'Kode HTML (hanya Admin yang bisa mengubah)' }), counter), ta,
            el('div', { class: 'ae-hf-lbl' }, el('span', { text: 'Pratinjau terisolasi, seperti di halaman terbit' })), frame, hint, form, cap),
          get: function () { return { id: d.id, t: 'html', code: d.code || '', scripts: d.scripts === true, h: d.h, size: d.size === 'wide' ? 'wide' : 'normal', caption: d.caption || '' }; },
          destroy: function () { clearTimeout(timer); }, focus: function () { if (admin) ta.focus(); },
          reload: function () { if (admin) schedule(0); }, // the posted document is lost when the frame is moved in the page (Editors' frames load from an address and come back by themselves)
          settings: function () {
            var js = selectEl('JavaScript', [{ v: '0', label: 'Mati (disarankan)' }, { v: '1', label: 'Hidup' }], d.scripts ? '1' : '0', function (v) { d.scripts = v === '1'; schedule(0); changed(); });
            js.disabled = !admin;
            return [
              field('Tinggi bingkai', selectEl('Tinggi bingkai', [{ v: 'auto', label: 'Otomatis (mengikuti isi)' }, { v: 'm', label: 'Sedang (320 px)' }, { v: 'l', label: 'Tinggi (480 px)' }, { v: 'xl', label: 'Sangat tinggi (680 px)' }, { v: 'vh', label: 'Setinggi layar' }], d.h,
                function (v) { d.h = v; sizeFrame(); if (v === 'auto') schedule(0); changed(); }), 'Otomatis mengikuti isi, jadi jangan dipakai untuk kode yang memakai 100vh (tinggi layar). Untuk halaman seperti itu pilih "Setinggi layar": isinya digulung di dalam bingkai.'),
              field('JavaScript', js, admin ? 'Hidup: skrip di kode (langsung atau dari https://) berjalan, tetap terkurung di bingkai.' : 'Hanya Admin yang bisa mengubahnya.'),
              pop ? field('Lebar', selectEl('Lebar', [{ v: 'normal', label: 'Selebar isi ' + WHAT }, { v: 'wide', label: 'Tepi ke tepi' }], d.size === 'wide' ? 'wide' : 'normal', function (v) { d.size = v; blk.setAttribute('data-size', v); changed(); }), 'Tepi ke tepi: sampai ke sisi kotak.')
                : field('Lebar', selectEl('Lebar', [{ v: 'normal', label: 'Sesuai kolom artikel' }, { v: 'wide', label: 'Lebih lebar dari teks' }], d.size === 'wide' ? 'wide' : 'normal', function (v) { d.size = v; blk.setAttribute('data-size', v); changed(); }), 'Lebar tampil di halaman terbit.'),
              field('Keterangan (opsional)', el('input', { type: 'text', maxlength: '200', value: d.caption || '', oninput: function (e) { d.caption = e.target.value; draw(); changed(); } })),
              note(admin
                ? 'Kode berjalan di bingkai terpisah dengan kebijakan keamanannya sendiri: CSS dan JavaScript-nya tidak memengaruhi halaman ini atau halaman terbit, dan sebaliknya. Gambar, font, dan CSS dari https:// boleh dipakai.'
                  + (mode === 'result' ? ' Di halaman hasil, {variabel} di kode (di luar <script>) diganti nilainya, dan skrip bisa membaca window.ENQ (nama, skor, persen, level, dst.). Pratinjau di sini memakai contoh nilai.' : pop ? ' Pop-up memuat bingkai ini dari alamat terpisah, jadi kodenya tidak ikut diunduh di setiap halaman.' : ' Isinya tidak dihitung untuk SEO dan ekspor Markdown.')
                : 'Hanya Admin yang bisa menambah atau mengubah kode. Anda tetap bisa memindah atau menghapus blok ini, dan mengatur tinggi, lebar, dan keterangannya.'),
            ];
          },
        };
      },
      hr: function (d) {
        return {
          body: el('hr', { class: 'ae-hr' }),
          get: function () { return { id: d.id, t: 'hr' }; },
          destroy: function () {}, focus: function () {},
          settings: function () { return [note('Garis pemisah horizontal.')]; },
        };
      },
      cards: function (d, blk) {
        var grid = el('div', { class: 'ae-cards ae-cards-' + d.per });
        var addBtn = el('button', { type: 'button', class: 'btn ghost sm ae-cards-add', onclick: function () { d.items.push(blankCard()); draw(); changed(); var c = grid.lastChild; if (c) { var f = c.querySelector('.ae-card-t'); if (f) f.focus(); } } }, '+ Tambah kartu');
        function pick(it) {
          if (!window.ENPicker) return;
          var r = ratioOf(d.ratio);
          // the same picker as the Image block: pick an uploaded picture, or upload one that is cropped to the frame shape first
          window.ENPicker.open({ ratio: r.num, ratioLabel: r.v, outWidth: 900, title: 'Gambar kartu', onPick: function (p) { it.src = p; draw(); changed(); } });
        }
        function shift(i, dir, act) {
          var j = i + dir; if (j < 0 || j >= d.items.length) return;
          var t = d.items[i]; d.items[i] = d.items[j]; d.items[j] = t;
          draw(); changed();
          var b = grid.children[j] && grid.children[j].querySelector('[data-act="' + act + '"]'); if (b) b.focus();
        }
        function cardEl(it, i) {
          var n = i + 1;
          var frame = el('div', { class: 'ae-fr ae-' + ratioOf(d.ratio).cls });
          if (it.src) frame.appendChild(el('img', { src: it.src, alt: it.alt || '' }));
          else frame.appendChild(el('button', { type: 'button', class: 'ae-fr-empty', 'aria-label': 'Pilih gambar untuk kartu ' + n, onclick: function () { pick(it); } },
            el('span', { class: 'ic', 'aria-hidden': 'true', text: '▣' }), el('span', { text: 'Gambar' })));
          var ta = el('textarea', { rows: '1', class: 'ae-in ae-card-p', maxlength: '300', placeholder: 'Teks singkat', 'aria-label': 'Teks kartu ' + n, value: it.text || '', oninput: function (e) { it.text = e.target.value; fit(ta); changed(); } });
          setTimeout(function () { fit(ta); }, 0);
          var del = btn('✕', 'Hapus kartu ' + n, function () { d.items.splice(i, 1); draw(); changed(); }, 'ae-danger');
          if (d.items.length < 2) del.hidden = true;
          var left = btn('◀', 'Geser kartu ' + n + ' ke kiri', function () { shift(i, -1, 'left'); }); left.setAttribute('data-act', 'left');
          var right = btn('▶', 'Geser kartu ' + n + ' ke kanan', function () { shift(i, 1, 'right'); }); right.setAttribute('data-act', 'right');
          left.disabled = i === 0; right.disabled = i === d.items.length - 1;
          var handle = el('button', { type: 'button', class: 'ae-card-h', 'aria-label': 'Pindahkan kartu ' + n + '. Seret, atau pakai tombol geser.', title: 'Seret untuk memindah' }, '⠇');
          var c = el('div', { class: 'ae-card', role: 'group', 'aria-label': 'Kartu ' + n },
            el('div', { class: 'ae-card-bar' }, handle, el('span', { class: 'ae-card-n', text: 'Kartu ' + n }), el('span', { class: 'ae-grow' }), left, right, del),
            frame,
            it.src ? el('div', { class: 'ae-card-imgact' },
              el('button', { type: 'button', class: 'ae-linkbtn', onclick: function () { pick(it); } }, 'Ganti gambar'),
              el('button', { type: 'button', class: 'ae-linkbtn ae-danger', onclick: function () { it.src = ''; it.alt = ''; draw(); changed(); } }, 'Hapus gambar'),
              el('input', { type: 'text', class: 'ae-in ae-card-alt', maxlength: '150', placeholder: 'Teks alternatif gambar', 'aria-label': 'Teks alternatif gambar kartu ' + n, value: it.alt || '', oninput: function (e) { it.alt = e.target.value; var im = frame.querySelector('img'); if (im) im.setAttribute('alt', it.alt); changed(); } })) : null,
            el('input', { type: 'text', class: 'ae-in ae-card-t', maxlength: '80', placeholder: 'Judul kartu', 'aria-label': 'Judul kartu ' + n, value: it.title || '', oninput: function (e) { it.title = e.target.value; changed(); } }),
            ta,
            el('div', { class: 'ae-card-btn' },
              el('input', { type: 'text', class: 'ae-in ae-card-lbl', maxlength: '40', placeholder: 'Tombol (opsional): tulisan', 'aria-label': 'Tulisan tombol kartu ' + n, value: it.label || '', oninput: function (e) { it.label = e.target.value; changed(); } }),
              el('input', { type: 'text', class: 'ae-in ae-card-url', maxlength: '300', placeholder: 'Tujuan: https://… atau #form:nama', 'aria-label': 'Tujuan tombol kartu ' + n, value: it.url || '', oninput: function (e) { it.url = e.target.value; changed(); } })));
          c._item = it;
          return c;
        }
        function draw() {
          clear(grid);
          d.items.forEach(function (it, i) { grid.appendChild(cardEl(it, i)); });
          addBtn.hidden = d.items.length >= CARD_MAX;
        }
        draw();
        var sort = Sortable.create(grid, {
          setData: setDragData, group: { name: 'cards', pull: false, put: false }, handle: '.ae-card-h', draggable: '.ae-card', animation: 150,
          ghostClass: 'ae-ghost', chosenClass: 'ae-chosen', dragClass: 'ae-drag', fallbackOnBody: true, swapThreshold: 0.65,
          // Sortable has already moved the element: read the new order from the page, then rebuild so the numbers in the labels are right
          onUpdate: function () { d.items = Array.prototype.map.call(grid.children, function (c) { return c._item; }).filter(Boolean); changed(); setTimeout(draw, 0); },
        });
        return {
          body: el('div', { class: 'ae-cardsbox' }, grid, addBtn),
          get: function () {
            return { id: d.id, t: 'cards', per: d.per, ratio: d.ratio, btn: d.btn === 'outline' ? 'outline' : 'solid',
              items: d.items.map(function (i) { return { src: i.src || '', alt: i.alt || '', title: i.title || '', text: i.text || '', label: i.label || '', url: i.url || '' }; }) };
          },
          destroy: function () { sort.destroy(); },
          focus: function () { var f = grid.querySelector('.ae-card-t'); if (f) f.focus(); },
          settings: function () {
            return [
              field('Kartu per baris', selectEl('Kartu per baris', [{ v: '2', label: '2 kartu' }, { v: '3', label: '3 kartu' }, { v: '4', label: '4 kartu' }], String(d.per), function (v) { d.per = parseInt(v, 10); grid.className = 'ae-cards ae-cards-' + d.per; changed(); }),
                'Di HP kartu selalu satu per baris.'),
              field('Bentuk gambar', selectEl('Bentuk gambar', RATIOS, d.ratio, function (v) { d.ratio = v; draw(); changed(); }), 'Sama untuk semua kartu. Gambar baru dipotong sesuai bentuk ini.'),
              field('Gaya tombol', selectEl('Gaya tombol', [{ v: 'solid', label: 'Penuh' }, { v: 'outline', label: 'Garis tepi' }], d.btn === 'outline' ? 'outline' : 'solid', function (v) { d.btn = v; changed(); })),
              note('Ketik judul, teks, dan tujuan tombol langsung di kartu. Seret ⠇ untuk mengurutkan. Kartu tanpa tombol tidak punya tautan. Maksimal ' + CARD_MAX + ' kartu; judul 80, teks 300 huruf.'),
            ];
          },
        };
      },
      table: function (d, blk) {
        var cur = { r: 0, c: 0 };       // the cell the row/column buttons act on
        var cells = [], saved = null, ui = {}, msgTimer = null;
        var scroll = el('div', { class: 'ae-tbl-scroll' });
        var info = el('span', { class: 'ae-tbl-info' });
        var msg = el('span', { class: 'ae-tbl-msg', role: 'status' });
        var cap = el('input', { type: 'text', class: 'ae-in ae-tbl-cap', maxlength: '150', placeholder: 'Keterangan tabel (opsional)', 'aria-label': 'Keterangan tabel', value: d.caption || '', oninput: function (e) { d.caption = e.target.value; changed(); } });
        var addRow = el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { rowAt(d.rows.length); } }, '+ Baris');
        var addCol = el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { colAt(nCols()); } }, '+ Kolom');
        function nCols() { return d.rows[0].length; }
        function say(t) { msg.textContent = t; clearTimeout(msgTimer); msgTimer = setTimeout(function () { msg.textContent = ''; }, 5000); }
        function cellEl() { return cells[cur.r] && cells[cur.r][cur.c]; }
        function focusCell() { var td = cellEl(); if (td) td.focus(); }
        function blankRow() { var r = []; for (var i = 0; i < nCols(); i++) r.push(''); return r; }

        /* structure */
        function rowAt(at) {
          if (d.rows.length >= TBL_ROWS) { say('Maksimal ' + TBL_ROWS + ' baris.'); return; }
          d.rows.splice(at, 0, blankRow()); cur.r = at; draw(); changed(); focusCell();
        }
        function colAt(at) {
          if (nCols() >= TBL_COLS) { say('Maksimal ' + TBL_COLS + ' kolom.'); return; }
          d.rows.forEach(function (r) { r.splice(at, 0, ''); }); d.aligns.splice(at, 0, 'left'); cur.c = at; draw(); changed(); focusCell();
        }
        function delRow() {
          if (d.rows.length <= 1) { say('Tabel butuh minimal satu baris.'); return; }
          d.rows.splice(cur.r, 1); cur.r = Math.min(cur.r, d.rows.length - 1); draw(); changed(); focusCell();
        }
        function delCol() {
          if (nCols() <= 1) { say('Tabel butuh minimal satu kolom.'); return; }
          d.rows.forEach(function (r) { r.splice(cur.c, 1); }); d.aligns.splice(cur.c, 1); cur.c = Math.min(cur.c, nCols() - 1); draw(); changed(); focusCell();
        }
        // Excel / Google Sheets copy gives tab- and line-separated text: fill cells from the chosen one, growing the table up to the limits
        function pasteGrid(r0, c0, g) {
          var cut = false;
          g.forEach(function (line, i) {
            line.forEach(function (v, j) {
              var r = r0 + i, c = c0 + j;
              if (r >= TBL_ROWS || c >= TBL_COLS) { cut = true; return; }
              while (d.rows.length <= r) d.rows.push(blankRow());
              while (nCols() <= c) { d.rows.forEach(function (x) { x.push(''); }); d.aligns.push('left'); }
              var t = v.replace(/\s+/g, ' ').trim();
              if (t.length > CELL_MAX) { t = t.slice(0, CELL_MAX); cut = true; }
              d.rows[r][c] = esc(t);
            });
          });
          cur.r = r0; cur.c = c0; draw(); changed(); focusCell();
          if (cut) say('Sebagian data terpotong. Batas: ' + TBL_COLS + ' kolom, ' + TBL_ROWS + ' baris, ' + CELL_MAX + ' huruf per sel.');
        }

        /* the toolbar above the page works on the chosen cell: bold, italic, link. The text selection is remembered because the link box takes the focus. */
        function inCells(n) { return !!n && scroll.contains(n); }
        function anchorOf(n) { while (n && n !== scroll) { if (n.nodeName === 'A') return n; n = n.parentNode; } return null; }
        function onSel() {
          var s = window.getSelection();
          if (s && s.rangeCount && inCells(s.anchorNode)) { saved = s.getRangeAt(0).cloneRange(); if (state.cell === adapter) syncTb(); }
        }
        document.addEventListener('selectionchange', onSel);
        function restore() {
          var td = cellEl(); if (!td) return false;
          td.focus();
          if (saved && td.contains(saved.startContainer)) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); }
          return true;
        }
        function sync() { var td = cellEl(); if (td) { d.rows[cur.r][cur.c] = cellHtml(td); changed(); if (state.cell === adapter) syncTb(); } }
        var adapter = {
          toggle: function (name) { if (restore()) { document.execCommand(name, false, null); sync(); } },
          state: function () {
            var s = window.getSelection(), a = s && s.rangeCount && inCells(s.anchorNode) ? anchorOf(s.anchorNode) : null, r = { link: !!a };
            try { r.bold = document.queryCommandState('bold'); r.italic = document.queryCommandState('italic'); } catch (e) { /* not available */ }
            return r;
          },
          href: function () { var a = anchorOf(saved && saved.startContainer); return a ? (a.getAttribute('href') || '') : ''; },
          link: function (u) {
            if (!restore()) return '';
            var s = window.getSelection(), a = anchorOf(s.anchorNode);
            if (s.isCollapsed) { if (!a) return 'Blok dulu teksnya, lalu tautkan.'; a.setAttribute('href', u); }
            else document.execCommand('createLink', false, u);
            sync(); return '';
          },
          unlink: function () {
            if (!restore()) return;
            var s = window.getSelection(), a = anchorOf(s.anchorNode);
            if (s.isCollapsed && a) { var rg = document.createRange(); rg.selectNodeContents(a); s.removeAllRanges(); s.addRange(rg); } // the browser's unlink does nothing for a bare cursor
            document.execCommand('unlink'); sync();
          },
        };

        function refreshUi() {
          if (!ui.pos) return;
          var n = nCols(), rows = d.rows.length;
          ui.pos.textContent = 'Sel terpilih: baris ' + (cur.r + 1) + ' dari ' + rows + ', kolom ' + (cur.c + 1) + ' dari ' + n + '.';
          ui.rowAbove.disabled = (d.header && cur.r === 0) || rows >= TBL_ROWS; ui.rowBelow.disabled = rows >= TBL_ROWS; ui.rowDel.disabled = rows <= 1;
          ui.colLeft.disabled = ui.colRight.disabled = n >= TBL_COLS; ui.colDel.disabled = n <= 1;
          ui.align.value = d.aligns[cur.c] || 'left';
        }

        function draw() {
          clear(scroll); cells = [];
          var body = el('tbody');
          d.rows.forEach(function (row, r) {
            var tr = el('tr'); cells[r] = [];
            row.forEach(function (html, c) {
              var head = d.header && r === 0;
              var td = el(head ? 'th' : 'td', { class: 'ae-tc ae-al-' + (d.aligns[c] || 'left'), contenteditable: 'true', spellcheck: 'true',
                'aria-label': head ? 'Judul kolom ' + (c + 1) : 'Baris ' + (r + 1) + ', kolom ' + (c + 1) });
              if (head) td.setAttribute('scope', 'col');
              cellDom(html, td);
              d.rows[r][c] = cellHtml(td); // from here on the data is what the cell shows: only strong, em, a, br and text
              td.classList.toggle('ae-over', td.textContent.length > CELL_MAX);
              td.addEventListener('focus', function () { cur.r = r; cur.c = c; if (state.sel === blk) { state.cell = adapter; syncTb(); } refreshUi(); });
              td.addEventListener('input', function () { d.rows[r][c] = cellHtml(td); td.classList.toggle('ae-over', td.textContent.length > CELL_MAX); changed(); });
              td.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var below = cells[r + 1] && cells[r + 1][c]; if (below) below.focus(); return; } // Shift+Enter makes a line break
                if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault(); // underline is not allowed in cells
              });
              td.addEventListener('beforeinput', function (e) {
                var t = e.inputType || '';
                if (t === 'insertFromDrop' || t === 'insertParagraph' || t === 'formatUnderline' || t === 'formatStrikeThrough') { e.preventDefault(); return; }
                if (t === 'insertText' || t === 'insertReplacementText') {
                  var selLen = String(window.getSelection() || '').length;
                  if (td.textContent.length - selLen + (e.data ? e.data.length : 1) > CELL_MAX) { e.preventDefault(); say('Satu sel maksimal ' + CELL_MAX + ' huruf.'); }
                }
              });
              td.addEventListener('paste', function (e) {
                e.preventDefault();
                var txt = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\r/g, '');
                if (!txt) return;
                var g = txt.replace(/\n+$/, '').split('\n').map(function (l) { return l.split('\t'); });
                if (g.length > 1 || g[0].length > 1) { pasteGrid(r, c, g); return; }
                var room = CELL_MAX - (td.textContent.length - String(window.getSelection() || '').length);
                if (room <= 0) { say('Satu sel maksimal ' + CELL_MAX + ' huruf.'); return; }
                document.execCommand('insertText', false, g[0][0].replace(/\s+/g, ' ').slice(0, room));
              });
              tr.appendChild(td); cells[r][c] = td;
            });
            body.appendChild(tr);
          });
          scroll.appendChild(el('table', { class: 'ae-tbl' }, body));
          info.textContent = nCols() + ' kolom × ' + d.rows.length + ' baris (maks. ' + TBL_COLS + ' × ' + TBL_ROWS + ')';
          addRow.disabled = d.rows.length >= TBL_ROWS; addCol.disabled = nCols() >= TBL_COLS;
          refreshUi();
        }
        draw();
        return {
          body: el('div', { class: 'ae-tblbox' }, cap, scroll, el('div', { class: 'ae-tbl-foot' }, addRow, addCol, info, msg)),
          get: function () { return { id: d.id, t: 'table', header: !!d.header, caption: d.caption || '', aligns: d.aligns.slice(), rows: d.rows.map(function (r) { return r.slice(); }) }; },
          destroy: function () { document.removeEventListener('selectionchange', onSel); clearTimeout(msgTimer); },
          focus: function () { cur.r = 0; cur.c = 0; focusCell(); },
          cellApi: function () { var a = document.activeElement; return a && a.classList && a.classList.contains('ae-tc') && scroll.contains(a) ? adapter : null; },
          settings: function () {
            ui = {};
            function b(label, tip, fn) { return el('button', { type: 'button', class: 'btn ghost sm', title: tip, onclick: fn }, label); }
            ui.rowAbove = b('+ Atas', 'Sisipkan baris di atas sel terpilih', function () { rowAt(cur.r); });
            ui.rowBelow = b('+ Bawah', 'Sisipkan baris di bawah sel terpilih', function () { rowAt(cur.r + 1); });
            ui.rowDel = b('Hapus baris', 'Hapus baris sel terpilih', delRow);
            ui.colLeft = b('+ Kiri', 'Sisipkan kolom di kiri sel terpilih', function () { colAt(cur.c); });
            ui.colRight = b('+ Kanan', 'Sisipkan kolom di kanan sel terpilih', function () { colAt(cur.c + 1); });
            ui.colDel = b('Hapus kolom', 'Hapus kolom sel terpilih', delCol);
            ui.pos = note('');
            ui.align = selectEl('Rata teks kolom', [{ v: 'left', label: 'Kiri' }, { v: 'center', label: 'Tengah' }, { v: 'right', label: 'Kanan' }], 'left', function (v) { d.aligns[cur.c] = v; draw(); changed(); focusCell(); });
            var out = [
              ui.pos,
              field('Baris judul', selectEl('Baris judul', [{ v: '1', label: 'Ya: baris pertama jadi judul kolom' }, { v: '0', label: 'Tidak' }], d.header ? '1' : '0', function (v) { d.header = v === '1'; draw(); changed(); })),
              field('Rata teks kolom terpilih', ui.align),
              el('div', { class: 'ae-f ae-f-btns' }, el('span', { text: 'Baris' }), el('div', { class: 'ae-btnrow' }, ui.rowAbove, ui.rowBelow, ui.rowDel)),
              el('div', { class: 'ae-f ae-f-btns' }, el('span', { text: 'Kolom' }), el('div', { class: 'ae-btnrow' }, ui.colLeft, ui.colRight, ui.colDel)),
              note('Ketik langsung di sel. Tebal, miring, tautan: bilah alat di atas. Enter = sel di bawah, Shift+Enter = baris baru. Bisa tempel dari Excel / Google Sheets. Maks. ' + TBL_COLS + ' kolom, ' + TBL_ROWS + ' baris, ' + CELL_MAX + ' huruf per sel. Di HP, tabel lebar bisa digeser ke samping.'),
            ];
            refreshUi();
            return out;
          },
        };
      },
      columns: function (d) {
        var wrap = el('div', { class: 'ae-cols', 'data-n': String(d.cols.length), 'data-ratio': d.ratio || '1-1' });
        var cols = [];
        function addCol(items) {
          var c = el('div', { class: 'ae-col ae-list', 'data-ph': L.dropHere });
          (items || []).forEach(function (b) { var x = buildBlock(b); if (x) c.appendChild(x); });
          Sortable.create(c, listOpts());
          cols.push(c); wrap.appendChild(c);
        }
        d.cols.forEach(addCol);
        function setCount(n) {
          if (n === cols.length) return;
          if (n < cols.length) {
            var keep = cols[n - 1];
            while (cols.length > n) {
              var c = cols.pop();
              while (c.firstChild) keep.appendChild(c.firstChild); // never lose content when columns are removed
              var s = Sortable.get(c); if (s) s.destroy();
              c.remove();
            }
          } else { while (cols.length < n) addCol([]); }
          d.ratio = n === 3 ? '1-1-1' : '1-1';
          wrap.setAttribute('data-n', String(n)); wrap.setAttribute('data-ratio', d.ratio);
          changed(true); renderSettings();
        }
        return {
          body: wrap,
          get: function () { return { id: d.id, t: 'columns', ratio: cols.length === 3 ? '1-1-1' : (d.ratio === '1-2' || d.ratio === '2-1' ? d.ratio : '1-1'), cols: cols.map(serializeList) }; },
          destroy: function () { cols.forEach(destroyList); },
          settings: function () {
            var out = [field('Jumlah kolom', selectEl('Jumlah kolom', [{ v: '2', label: '2 kolom' }, { v: '3', label: '3 kolom' }], String(cols.length), function (v) { setCount(parseInt(v, 10)); }))];
            if (cols.length === 2) {
              out.push(field('Pembagian lebar', selectEl('Pembagian lebar', [{ v: '1-1', label: 'Sama (50 / 50)' }, { v: '1-2', label: 'Sempit + lebar (33 / 67)' }, { v: '2-1', label: 'Lebar + sempit (67 / 33)' }], d.ratio, function (v) {
                d.ratio = v; wrap.setAttribute('data-ratio', v); changed();
              })));
            }
            out.push(note('Di layar sempit, kolom tersusun ke bawah; kolom pertama di atas. Kolom tidak bisa diletakkan di dalam kolom.'));
            return out;
          },
        };
      },
      /* ---- only in pop-ups and quiz results ---- */
      form: function (d) {
        var box = el('div', { class: 'ae-ph ae-ph-form' });
        function nameOf(slug) { var f = (opts.forms || []).filter(function (x) { return x.slug === slug; })[0]; return f ? (f.name || f.slug) : ''; }
        function draw() {
          clear(box);
          box.appendChild(el('span', { class: 'ic', 'aria-hidden': 'true', text: '✎' }));
          box.appendChild(el('strong', { text: d.slug ? 'Formulir: ' + (nameOf(d.slug) || d.slug) : 'Formulir belum dipilih' }));
          box.appendChild(el('span', { text: d.slug ? 'Isian formulir tampil di sini saat ' + WHAT + ' dibuka.' : 'Pilih formulirnya di pengaturan blok.' }));
        }
        draw();
        return {
          body: box,
          get: function () { return { id: d.id, t: 'form', slug: d.slug || '' }; },
          destroy: function () {}, focus: function () {},
          settings: function () {
            var list = (opts.forms || []).map(function (f) { return { v: f.slug, label: f.name || f.slug }; });
            if (d.slug && !list.some(function (x) { return x.v === d.slug; })) list.push({ v: d.slug, label: d.slug + ' (tidak ditemukan)' });
            list.unshift({ v: '', label: '— Pilih formulir —' });
            return [
              field('Formulir', selectEl('Formulir', list, d.slug || '', function (v) { d.slug = v; draw(); changed(); }), 'Dibuat di menu Formulir. Hanya formulir yang sudah terbit yang tampil.'),
              note('Gunakan satu formulir per ' + WHAT + '.'),
            ];
          },
        };
      },
      spacer: function (d) {
        var lbl = el('span', { class: 'ae-spacer-l' });
        var sp = el('div', { class: 'ae-spacer' }, lbl);
        function draw() { sp.style.height = d.h + 'px'; lbl.textContent = 'Jarak ' + d.h + ' px'; } // CSSOM: allowed by the panel policy
        draw();
        return {
          body: sp,
          get: function () { return { id: d.id, t: 'spacer', h: d.h }; },
          destroy: function () {}, focus: function () {},
          settings: function () {
            var inp = el('input', { type: 'number', min: '8', max: '120', step: '4', value: String(d.h),
              oninput: function (e) { var n = parseInt(e.target.value, 10); if (n >= 8 && n <= 120) { d.h = n; draw(); changed(); } },
              onchange: function (e) { d.h = Math.max(8, Math.min(120, parseInt(e.target.value, 10) || 24)); e.target.value = String(d.h); draw(); changed(); } });
            return [field('Tinggi jarak (px)', inp, 'Antara 8 dan 120.')];
          },
        };
      },
      score: function (d, blk) {
        var card = el('div', { class: 'ae-score' });
        function sample() { return Object.assign({ pts: 42, max: 60, pct: 70, correct: 14, count: 20 }, opts.sample || {}); }
        function draw() {
          var s = sample();
          card.className = 'ae-score' + (d.style === 'plain' ? ' ae-score-plain' : '');
          blk.setAttribute('data-align', d.align || 'center');
          clear(card);
          var fill = el('i'); fill.style.width = Math.max(0, Math.min(100, s.pct)) + '%'; // CSSOM: allowed by the panel policy
          card.appendChild(el('div', { class: 'ae-score-num' }, el('strong', { text: String(s.pts) }), el('span', { text: ' / ' + s.max })));
          card.appendChild(el('p', { class: 'ae-score-sub', text: s.pct + '% · ' + s.correct + ' dari ' + s.count + ' soal benar' }));
          card.appendChild(el('div', { class: 'ae-scorebar' }, fill));
          card.appendChild(el('small', { class: 'ae-sample', text: 'Contoh nilai. Peserta melihat skornya sendiri.' }));
        }
        draw();
        return {
          body: card, redraw: draw,
          get: function () { return { id: d.id, t: 'score', style: d.style === 'plain' ? 'plain' : 'card', align: d.align || 'center' }; },
          destroy: function () {}, focus: function () {},
          settings: function () {
            return [
              field('Gaya', selectEl('Gaya', [{ v: 'card', label: 'Kartu' }, { v: 'plain', label: 'Polos (tanpa kotak)' }], d.style === 'plain' ? 'plain' : 'card', function (v) { d.style = v; draw(); changed(); })),
              field('Rata', selectEl('Rata', ALIGNS, d.align || 'center', function (v) { d.align = v; draw(); changed(); })),
              note('Menampilkan skor, persen, jumlah soal benar, dan batang kemajuan milik peserta. Satu blok cukup.'),
            ];
          },
        };
      },
      sections: function (d) {
        var title = el('input', { type: 'text', class: 'ae-secs-t', maxlength: '100', placeholder: 'Judul (opsional), mis. Rincian per bagian', 'aria-label': 'Judul rincian', value: d.title || '', oninput: function (e) { d.title = e.target.value; changed(); } });
        var list = el('div', { class: 'ae-secs-list' });
        function draw() {
          clear(list);
          var names = (opts.sections && opts.sections.length ? opts.sections : [{ name: 'Bagian 1' }, { name: 'Bagian 2' }]);
          names.forEach(function (sc, i) {
            var pct = [80, 55, 65, 40][i % 4], fill = el('i'); fill.style.width = pct + '%'; // CSSOM: allowed by the panel policy
            list.appendChild(el('div', { class: 'ae-sec' }, el('div', { class: 'ae-sec-h' }, el('span', { text: sc.name || ('Bagian ' + (i + 1)) }), el('strong', { text: pct / 10 + ' / 10' })), el('div', { class: 'ae-scorebar' }, fill)));
          });
          list.appendChild(el('small', { class: 'ae-sample', text: 'Contoh nilai. Daftar bagian diambil dari pengaturan kuis.' }));
        }
        draw();
        return {
          body: el('div', { class: 'ae-secs' }, title, list), redraw: draw,
          get: function () { return { id: d.id, t: 'sections', title: d.title || '' }; },
          destroy: function () {}, focus: function () { title.focus(); },
          settings: function () { return [note('Menampilkan skor peserta untuk setiap bagian kuis. Bagian diatur di pengaturan kuis.')]; },
        };
      },
    };

    function btn(text, label, fn, cls) {
      return el('button', { type: 'button', class: 'ae-blk-a' + (cls ? ' ' + cls : ''), 'aria-label': label, title: label, onclick: fn }, text);
    }
    function move(blk, dir) {
      var sib = dir < 0 ? blk.previousElementSibling : blk.nextElementSibling;
      if (!isBlk(sib)) return;
      if (dir < 0) blk.parentNode.insertBefore(blk, sib); else sib.after(blk);
      if (blk._api.reload) blk._api.reload();
      changed(true);
    }
    /* keyboard: a block moves to the next / previous column, out of the columns block, or into the columns block beside it */
    function moveSide(blk, dir) {
      var list = blk.parentNode, k = blk.getAttribute('data-type');
      var kids = function (l) { return Array.prototype.filter.call(l.children, isBlk); };
      if (list.classList.contains('ae-col')) {
        var wrap = list.parentNode, cols = Array.prototype.filter.call(wrap.children, function (c) { return c.classList.contains('ae-col'); });
        var i = cols.indexOf(list), j = i + dir, idx = kids(list).indexOf(blk);
        if (j >= 0 && j < cols.length) {
          var sibs = kids(cols[j]), ref = sibs[Math.min(idx, sibs.length)];
          if (ref) cols[j].insertBefore(blk, ref); else cols[j].appendChild(blk);
        } else {
          var cb = wrap.closest('.ae-blk-columns');
          if (dir < 0) cb.before(blk); else cb.after(blk);
        }
      } else {
        if (k === 'columns' || k === 'html' || k === 'score' || k === 'sections') return false; // these never nest
        var sib = dir < 0 ? blk.previousElementSibling : blk.nextElementSibling;
        if (!isBlk(sib) || sib.getAttribute('data-type') !== 'columns') return false;
        var cs = sib.querySelectorAll(':scope > .ae-cols > .ae-col'), dst = dir > 0 ? cs[0] : cs[cs.length - 1];
        if (dir > 0 && kids(dst)[0]) dst.insertBefore(blk, kids(dst)[0]); else dst.appendChild(blk);
      }
      if (blk._api.reload) blk._api.reload();
      changed(true);
      return true;
    }
    function dupBlock(blk) {
      var copy = buildBlock(stripIds(blk._api.get()));
      blk.after(copy); select(copy); changed(true);
    }
    function removeBlock(blk) {
      var list = blk.parentNode, idx = Array.prototype.indexOf.call(list.children, blk);
      var data = blk._api.get();
      if (state.sel === blk || blk.contains(state.sel)) select(null);
      blk._api.destroy(); blk.remove();
      lastDel = { data: data, list: list, index: idx };
      showUndo(); changed(true);
    }
    function showUndo() {
      undoBox.hidden = false; clearTimeout(undoTimer);
      undoTimer = setTimeout(function () { undoBox.hidden = true; lastDel = null; }, 15000);
    }
    function undoDelete() {
      if (!lastDel) return;
      var list = lastDel.list.isConnected ? lastDel.list : rootList;
      var b = buildBlock(lastDel.data);
      var ref = Array.prototype.filter.call(list.children, isBlk)[lastDel.index];
      if (ref) list.insertBefore(b, ref); else list.appendChild(b);
      lastDel = null; undoBox.hidden = true; clearTimeout(undoTimer);
      select(b); changed(true);
    }

    function buildBlock(data) {
      data = norm(data, mode);
      var t = data && TYPES[data.t]; if (!t) return null;
      data.id = data.id || uid();
      var blk = el('div', { class: 'ae-blk ae-blk-' + data.t, 'data-type': data.t, 'data-id': data.id });
      var api = BUILD[data.t](data, blk);
      blk._api = api;
      var handle = el('button', { type: 'button', class: 'ae-blk-h', 'aria-label': 'Pindahkan blok ' + t.label + '. Seret, atau tekan panah atas / bawah. Panah kiri / kanan memindahkan ke kolom di sebelahnya.', title: 'Seret untuk memindah',
        onkeydown: function (e) {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(blk, e.key === 'ArrowUp' ? -1 : 1); handle.focus(); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (moveSide(blk, e.key === 'ArrowLeft' ? -1 : 1)) handle.focus(); }
        } }, '⠇');
      var bar = el('div', { class: 'ae-blk-bar' },
        handle, el('span', { class: 'ae-blk-t', text: t.label }), el('span', { class: 'ae-grow' }),
        btn('▲', L.up, function () { move(blk, -1); }),
        btn('▼', L.down, function () { move(blk, 1); }),
        (data.t === 'html' && !opts.isAdmin) ? null : btn('⧉', L.dup, function () { dupBlock(blk); }),
        btn('✕', L.del, function () { removeBlock(blk); }, 'ae-danger'));
      blk.appendChild(bar); blk.appendChild(api.body);
      return blk;
    }

    /* ---------- selection, settings, toolbar ---------- */
    function select(blk) {
      if (state.sel === blk) return;
      if (state.sel) state.sel.classList.remove('is-sel');
      state.sel = blk || null;
      if (blk) blk.classList.add('is-sel');
      state.ed = blk && blk._api.ed ? blk._api.ed : null;
      state.cell = blk && blk._api.cellApi ? blk._api.cellApi() : null;
      renderSettings(); syncTb();
      if (outOn) outMark();
      if (tplOn) tplSync();
    }
    function renderSettings() {
      clear(setBox);
      var b = state.sel;
      if (!b) { setBox.appendChild(el('p', { class: 'muted', text: L.nothing })); return; }
      setBox.appendChild(el('div', { class: 'ae-set-h' }, el('span', { class: 'ae-set-t', text: TYPES[b.getAttribute('data-type')].label })));
      b._api.settings().forEach(function (n) { setBox.appendChild(n); });
    }

    var ALIGN_LABEL = { left: 'Rata kiri', center: 'Rata tengah', right: 'Rata kanan', justify: 'Rata kiri-kanan' };
    function buildToolbar() {
      var keep = function (e) { e.preventDefault(); }; // keep the text selection while clicking toolbar buttons
      function tbtn(key, content, label, fn, cls, cellFn) {
        var b = el('button', { type: 'button', class: 'ae-tbb' + (cls ? ' ' + cls : ''), 'aria-label': label, title: label, onmousedown: keep, onclick: function () {
          if (state.ed) fn(state.ed); else if (state.cell && cellFn) cellFn(state.cell);
        } }, content);
        tbRefs[key] = b; return b;
      }
      tbRefs.block = selectEl('Paragraf atau judul', [{ v: 'p', label: 'Paragraf' }, { v: 'h2', label: 'Judul 2' }, { v: 'h3', label: 'Judul 3' }, { v: 'h4', label: 'Judul 4' }], 'p', function (v) { if (state.ed) applyBlock(state.ed, v); });
      tbRefs.size = selectEl('Ukuran teks', SIZES, 'normal', function (v) { if (state.ed) applySize(state.ed, v); });
      tbRefs.font = selectEl('Jenis huruf', FONTS, 'default', function (v) { if (state.ed) applyFont(state.ed, v); });
      var linkRow = el('div', { class: 'ae-link', hidden: true });
      var linkIn = el('input', { type: 'text', placeholder: 'https://… atau /halaman, #form:nama, mailto:…', 'aria-label': 'Alamat tautan', maxlength: '300' });
      var linkMsg = el('span', { class: 'ae-link-msg' });
      function okUrl(u) { return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(u) && !/^\s*javascript:/i.test(u); }
      linkRow.appendChild(linkIn);
      linkRow.appendChild(el('button', { type: 'button', class: 'btn sm', onmousedown: keep, onclick: function () {
        var u = linkIn.value.trim();
        if (!okUrl(u)) { linkMsg.textContent = 'Pakai https://, /jalur, #anchor, mailto: atau tel:'; return; }
        linkMsg.textContent = '';
        if (state.ed) state.ed.chain().focus().extendMarkRange('link').setLink({ href: u }).run();
        else if (state.cell) { var m = state.cell.link(u); if (m) { linkMsg.textContent = m; return; } }
        linkRow.hidden = true;
      } }, 'Terapkan'));
      linkRow.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onmousedown: keep, onclick: function () {
        if (state.ed) state.ed.chain().focus().extendMarkRange('link').unsetLink().run(); else if (state.cell) state.cell.unlink();
        linkRow.hidden = true; linkMsg.textContent = '';
      } }, 'Lepas tautan'));
      linkRow.appendChild(linkMsg);
      tbRefs.linkRow = linkRow; tbRefs.linkIn = linkIn;

      function alignBtn(v) { return tbtn('al-' + v, el('span', { class: 'ae-ic ae-ic-' + v, 'aria-hidden': 'true' }), ALIGN_LABEL[v], function (ed) { applyAlign(ed, v); }); }
      var row = el('div', { class: 'ae-tbrow' },
        tbRefs.block, tbRefs.size, tbRefs.font,
        tbtn('bold', 'B', 'Tebal', function (ed) { ed.chain().focus().toggleBold().run(); }, 'b', function (c) { c.toggle('bold'); }),
        tbtn('italic', 'I', 'Miring', function (ed) { ed.chain().focus().toggleItalic().run(); }, 'i', function (c) { c.toggle('italic'); }),
        tbtn('underline', 'U', 'Garis bawah', function (ed) { ed.chain().focus().toggleUnderline().run(); }, 'u'),
        tbtn('strike', 'S', 'Coret', function (ed) { ed.chain().focus().toggleStrike().run(); }, 's'),
        tbtn('link', 'Tautan', 'Tautan', function (ed) { linkIn.value = stateOf(ed).href; linkRow.hidden = !linkRow.hidden; if (!linkRow.hidden) linkIn.focus(); }, '',
          function (c) { linkIn.value = c.href(); linkRow.hidden = !linkRow.hidden; if (!linkRow.hidden) linkIn.focus(); }),
        alignBtn('left'), alignBtn('center'), alignBtn('right'), alignBtn('justify'),
        tbtn('ul', '• Daftar', 'Daftar poin', function (ed) { ed.chain().focus().toggleBulletList().run(); }),
        tbtn('ol', '1. Daftar', 'Daftar nomor', function (ed) { ed.chain().focus().toggleOrderedList().run(); }),
        tbtn('clear', 'Bersihkan', 'Hapus format teks (tebal, miring, ukuran, huruf, rata)', function (ed) { ed.chain().focus().unsetAllMarks().setParagraph().updateAttributes('paragraph', { align: null }).run(); }));
      tb = el('div', { class: 'ae-tb', role: 'toolbar', 'aria-label': 'Format teks' }, row, linkRow);
      return tb;
    }
    var TB_KEYS = ['block', 'size', 'font', 'bold', 'italic', 'underline', 'strike', 'link', 'al-left', 'al-center', 'al-right', 'al-justify', 'ul', 'ol', 'clear'];
    var CELL_KEYS = ['bold', 'italic', 'link']; // what a table cell can use
    function syncTb() {
      var ed = state.ed, cell = ed ? null : state.cell, off = !ed && !cell;
      tb.setAttribute('aria-disabled', off ? 'true' : 'false');
      TB_KEYS.forEach(function (k) { tbRefs[k].disabled = off || (!!cell && CELL_KEYS.indexOf(k) < 0); });
      var toggles = ['bold', 'italic', 'underline', 'strike', 'link', 'ul', 'ol', 'al-left', 'al-center', 'al-right', 'al-justify'];
      if (off) { tbRefs.linkRow.hidden = true; toggles.forEach(function (k) { tbRefs[k].classList.remove('on'); tbRefs[k].setAttribute('aria-pressed', 'false'); }); return; }
      if (cell) {
        var cs = cell.state();
        toggles.forEach(function (k) { var v = !!cs[k]; tbRefs[k].classList.toggle('on', v); tbRefs[k].setAttribute('aria-pressed', v ? 'true' : 'false'); });
        return;
      }
      var s = stateOf(ed);
      tbRefs.block.value = s.block; tbRefs.size.value = s.size; tbRefs.font.value = s.font;
      var on = { bold: s.bold, italic: s.italic, underline: s.underline, strike: s.strike, link: s.link, ul: s.ul, ol: s.ol, 'al-left': s.align === 'left', 'al-center': s.align === 'center', 'al-right': s.align === 'right', 'al-justify': s.align === 'justify' };
      toggles.forEach(function (k) { tbRefs[k].classList.toggle('on', !!on[k]); tbRefs[k].setAttribute('aria-pressed', on[k] ? 'true' : 'false'); });
    }

    /* ---------- outline: every block in order (columns nested), to select, reorder, duplicate and delete ---------- */
    var outOn = false, outTimer = null, outSec = null, outList = null, outBtn = null;
    function plain(h) {
      return String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    }
    function snip(d) {
      var s = '', it = d.items && d.items[0];
      switch (d.t) {
        case 'h': s = d.text; break;
        case 'text': s = plain(d.html); break;
        case 'img': s = d.alt || d.caption || String(d.src || '').split('/').pop(); break;
        case 'button': s = d.label; break;
        case 'cards': s = d.items.length + ' kartu' + (it && it.title ? ' · ' + it.title : ''); break;
        case 'table': s = plain(d.rows && d.rows[0] ? d.rows[0][0] : ''); break;
        case 'quote': s = plain(d.text); break;
        case 'callout': s = d.title || plain(d.text); break;
        case 'faq': s = d.title || (it ? plain(it.q) : ''); break;
        case 'video': case 'embed': s = d.url; break;
        case 'html': s = d.caption || 'kode HTML'; break;
        case 'form': s = d.slug; break;
        case 'spacer': s = d.h + ' px'; break;
        case 'sections': s = d.title; break;
        case 'columns': s = d.cols.length + ' kolom'; break;
      }
      s = String(s || '').replace(/\s+/g, ' ').trim();
      return s.length > 44 ? s.slice(0, 43) + '…' : s;
    }
    function olBtn(text, label, key, fn, cls) {
      return el('button', { type: 'button', class: 'ae-ol-a' + (cls ? ' ' + cls : ''), 'data-k': key, 'aria-label': label, title: label, onclick: fn }, text);
    }
    function outKey(e, b) {
      var k = e.key;
      if (e.altKey && /^Arrow(Up|Down|Left|Right)$/.test(k)) {
        e.preventDefault();
        if (k === 'ArrowUp') move(b, -1); else if (k === 'ArrowDown') move(b, 1); else moveSide(b, k === 'ArrowLeft' ? -1 : 1);
        drawOutline();
        return;
      }
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End') {
        var all = Array.prototype.slice.call(outList.querySelectorAll('.ae-ol-b')), i = all.indexOf(e.currentTarget);
        var j = k === 'Home' ? 0 : k === 'End' ? all.length - 1 : i + (k === 'ArrowDown' ? 1 : -1);
        if (all[j]) { e.preventDefault(); all[j].focus(); }
      }
    }
    function outRows(list, ul) {
      var kids = Array.prototype.filter.call(list.children, isBlk);
      if (!kids.length) { ul.appendChild(el('li', { class: 'ae-ol-empty', text: '(kosong)' })); return; }
      kids.forEach(function (b) {
        var d = b._api.get(), k = d.t, sel = b === state.sel;
        var li = el('li', { class: 'ae-ol-i', 'data-id': b.getAttribute('data-id') });
        li.appendChild(el('div', { class: 'ae-ol-r' + (sel ? ' is-sel' : '') },
          el('button', { type: 'button', class: 'ae-ol-b', 'data-k': 'main', 'aria-current': sel ? 'true' : 'false', title: 'Klik untuk memilih blok. Alt + panah memindahkan blok.',
            onclick: function () { select(b); b.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, onkeydown: function (e) { outKey(e, b); } },
            el('span', { class: 'ic', 'aria-hidden': 'true', text: TYPES[k].icon }), el('span', { class: 'ae-ol-t', text: TYPES[k].label }), el('span', { class: 'ae-ol-s', text: snip(d) })),
          olBtn('▲', L.up, 'up', function () { move(b, -1); }),
          olBtn('▼', L.down, 'down', function () { move(b, 1); }),
          (k === 'html' && !opts.isAdmin) ? null : olBtn('⧉', L.dup, 'dup', function () { dupBlock(b); }),
          olBtn('✕', L.del, 'del', function () { removeBlock(b); }, 'ae-danger')));
        if (k === 'columns') {
          var sub = el('ul', { class: 'ae-ol-cols' });
          Array.prototype.forEach.call(b.querySelectorAll(':scope > .ae-cols > .ae-col'), function (c, n) {
            var cl = el('ul', { class: 'ae-ol' });
            outRows(c, cl);
            sub.appendChild(el('li', { class: 'ae-ol-col' }, el('span', { class: 'ae-ol-ch', text: 'Kolom ' + (n + 1) }), cl));
          });
          li.appendChild(sub);
        }
        ul.appendChild(li);
      });
    }
    function drawOutline() {
      clearTimeout(outTimer); outTimer = null;
      if (!outOn) return;
      var a = document.activeElement, keep = null;
      if (a && outList.contains(a)) { var li = a.closest('.ae-ol-i'); keep = li ? { id: li.getAttribute('data-id'), k: a.getAttribute('data-k') } : null; }
      var sc = outList.scrollTop;
      clear(outList); outRows(rootList, outList); outList.scrollTop = sc;
      if (keep) {
        var row = outList.querySelector('.ae-ol-i[data-id="' + keep.id + '"]');
        var t = row && (row.querySelector('.ae-ol-r [data-k="' + keep.k + '"]') || row.querySelector('.ae-ol-b'));
        if (t) t.focus({ preventScroll: true });
      }
    }
    function outLater(now) {
      if (!outOn) return;
      if (now) { drawOutline(); return; }
      clearTimeout(outTimer); outTimer = setTimeout(drawOutline, 250);
    }
    function outMark() {
      var id = state.sel ? state.sel.getAttribute('data-id') : null, hit = null;
      Array.prototype.forEach.call(outList.querySelectorAll('.ae-ol-r'), function (r) {
        var on = r.parentNode.getAttribute('data-id') === id;
        r.classList.toggle('is-sel', on); r.firstChild.setAttribute('aria-current', on ? 'true' : 'false');
        if (on) hit = r;
      });
      if (hit) { // keep the chosen row in view inside the list (CSSOM scrolling; the page itself does not move)
        if (hit.offsetTop < outList.scrollTop) outList.scrollTop = hit.offsetTop;
        else if (hit.offsetTop + hit.offsetHeight > outList.scrollTop + outList.clientHeight) outList.scrollTop = hit.offsetTop + hit.offsetHeight - outList.clientHeight;
      }
    }
    /* The dock shows one of three panes beside the block settings: the block palette, the outline (Struktur) or the templates (Templat). */
    function setPane(p) {
      outOn = p === 'out'; tplOn = p === 'tpl' && !!tplSec;
      outBtn.setAttribute('aria-pressed', outOn ? 'true' : 'false'); outBtn.classList.toggle('on', outOn);
      if (tplBtn) { tplBtn.setAttribute('aria-pressed', tplOn ? 'true' : 'false'); tplBtn.classList.toggle('on', tplOn); }
      palSec.hidden = outOn || tplOn; outSec.hidden = !outOn; if (tplSec) tplSec.hidden = !tplOn;
      if ((outOn || tplOn) && dockBody.hidden) setCollapsed(false);
      if (outOn) { drawOutline(); outMark(); }
      if (tplOn) { tplTouched = false; tplSync(); tplLoad(); }
    }
    function setOutline(on) { setPane(on ? 'out' : 'pal'); }

    /* ---------- templates: save the chosen block (with what is inside it) or the whole page, and put a saved one back in ---------- */
    var tplOn = false, tplSec = null, tplBtn = null, tplBusy = false, tplTouched = false, tplItems = null;
    var tplName, tplScope, tplMsg, tplUl;
    var TPL_MODE = { article: 'Artikel', popup: 'Pop-up', result: 'Halaman hasil' };
    var NO_NEST = { columns: 1, html: 1, score: 1, sections: 1 }; // blocks that cannot sit inside a column
    function tplSay(t, bad) { if (!tplMsg) return; tplMsg.textContent = t || ''; tplMsg.className = 'ae-tp-msg' + (bad ? ' is-bad' : ''); }
    function tplErr(j) { return (j && j.errors && j.errors.length ? j.errors : ['Templat tidak bisa diproses.']).join(' '); }
    function tplCall(method, qs, body) {
      var o = { method: method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
      if (body) { o.headers['Content-Type'] = 'application/json'; o.headers['X-CSRF-Token'] = opts.csrf || ''; o.body = JSON.stringify(body); }
      return fetch(opts.templatesUrl + (qs ? '?' + qs : ''), o).then(function (r) {
        return r.json().catch(function () { return { ok: false, errors: ['Respons server tidak dikenali (status ' + r.status + ').'] }; });
      });
    }
    /* "Blok yang dipilih" only makes sense with a block chosen; it is the pre-set scope until the writer picks the other one */
    function tplSync() {
      if (!tplSec) return;
      var has = !!state.sel, t = has ? TYPES[state.sel.getAttribute('data-type')] : null;
      tplScope.options[0].disabled = !has;
      tplScope.options[0].textContent = has ? 'Blok yang dipilih: ' + t.label + (state.sel.getAttribute('data-type') === 'columns' ? ' (dan isinya)' : '') : 'Blok yang dipilih (pilih blok dulu)';
      if (!has) tplScope.value = 'page'; else if (!tplTouched) tplScope.value = 'sel';
    }
    /* msg: what to say once the list is fresh (an action's result); without it the line shows the loading and then clears */
    function tplLoad(msg) {
      if (!tplSec) return Promise.resolve();
      if (!msg) tplSay('Memuat…');
      return tplCall('GET', '').then(function (j) {
        if (!j.ok) { tplSay(tplErr(j), true); return; }
        tplItems = j.items || []; tplSay(msg || ''); tplDraw();
      }).catch(function () { tplSay('Koneksi terputus. Daftar templat tidak bisa dimuat.', true); });
    }
    function tplDraw() {
      clear(tplUl);
      if (!tplItems.length) { tplUl.appendChild(el('li', { class: 'ae-tp-empty', text: 'Belum ada templat. Simpan satu dari halaman ini.' })); return; }
      tplItems.forEach(function (it) {
        var box = el('div', { class: 'ae-tp-x', hidden: true });
        tplUl.appendChild(el('li', { class: 'ae-tp-i', 'data-id': String(it.id) },
          el('div', { class: 'ae-tp-r' },
            el('div', { class: 'ae-tp-m' }, el('strong', { class: 'ae-tp-n', text: it.name }),
              el('span', { class: 'ae-tp-s', text: it.count + ' blok · ' + (TPL_MODE[it.mode] || it.mode) + ' · ' + it.by + ' · ' + it.at + (it.html ? ' · memuat HTML' + (opts.isAdmin ? '' : ' (dilewati)') : '') })),
            el('div', { class: 'ae-tp-a' },
              el('button', { type: 'button', class: 'btn sm', 'data-act': 'insert', title: 'Sisipkan di bawah blok yang dipilih (atau di akhir halaman)', onclick: function () { tplInsert(it); } }, 'Sisipkan'),
              it.can ? el('button', { type: 'button', class: 'btn ghost sm', 'data-act': 'rename', onclick: function () { tplRenameBox(it, box); } }, 'Ganti nama') : null,
              it.can ? el('button', { type: 'button', class: 'btn ghost sm', 'data-act': 'del', onclick: function () { tplDelBox(it, box); } }, 'Hapus') : null)),
          box));
      });
    }
    function tplBoxes(except) { Array.prototype.forEach.call(tplUl.querySelectorAll('.ae-tp-x'), function (b) { if (b !== except) b.hidden = true; }); }
    function tplRenameBox(it, box) {
      tplBoxes(box); clear(box); box.hidden = false;
      var inp = el('input', { type: 'text', maxlength: '80', value: it.name, 'aria-label': 'Nama baru', 'data-f': 'rename' });
      var go = function () {
        tplCall('POST', '', { action: 'rename', id: it.id, name: inp.value }).then(function (j) {
          if (!j.ok) { tplSay(tplErr(j), true); return; }
          tplLoad('Nama templat diganti.');
        }).catch(function () { tplSay('Koneksi terputus.', true); });
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') { box.hidden = true; } });
      box.appendChild(inp);
      box.appendChild(el('button', { type: 'button', class: 'btn sm', 'data-act': 'rename-ok', onclick: go }, 'Simpan'));
      box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { box.hidden = true; } }, 'Batal'));
      inp.focus(); inp.select();
    }
    function tplDelBox(it, box) {
      tplBoxes(box); clear(box); box.hidden = false;
      box.appendChild(el('span', { text: 'Hapus templat "' + it.name + '"? Halaman yang sudah memakainya tidak berubah. ' }));
      var yes = el('button', { type: 'button', class: 'btn sm', 'data-act': 'del-ok', onclick: function () {
        tplCall('POST', '', { action: 'delete', id: it.id }).then(function (j) {
          if (!j.ok) { tplSay(tplErr(j), true); return; }
          tplLoad('Templat dihapus.');
        }).catch(function () { tplSay('Koneksi terputus.', true); });
      } }, 'Ya, hapus');
      box.appendChild(yes);
      box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', onclick: function () { box.hidden = true; } }, 'Batal'));
      yes.focus();
    }
    function tplSave() {
      if (tplBusy) return;
      var name = tplName.value.trim();
      if (!name) { tplSay('Beri nama templat.', true); tplName.focus(); return; }
      var blocks;
      if (tplScope.value === 'sel' && state.sel) blocks = [state.sel._api.get()]; else blocks = serializeList(rootList);
      if (!blocks.length) { tplSay('Halaman masih kosong. Tambahkan blok dulu.', true); return; }
      tplBusy = true; tplSay('Menyimpan…');
      tplCall('POST', '', { action: 'save', name: name, mode: mode, scope: tplScope.value, blocks: blocks.map(stripIds) }).then(function (j) {
        if (!j.ok) { tplSay(tplErr(j), true); return; }
        tplName.value = ''; tplTouched = false;
        var extra = j.dropped ? ' ' + j.dropped + ' blok tidak ikut karena kosong atau belum lengkap' + (j.notes && j.notes.length ? ' (' + j.notes.join(' ') + ')' : '') + '.' : '';
        return tplLoad('Templat "' + j.item.name + '" disimpan (' + j.kept + ' blok).' + extra);
      }).catch(function () { tplSay('Koneksi terputus. Templat belum tersimpan.', true); })
        .then(function () { tplBusy = false; });
    }
    /* keep what the open editor can hold: a block type that does not exist here (the Score block in a pop-up), an Admin-only type for an editor, and anything that cannot sit in a column */
    function tplFit(list, nested, skipped) {
      var out = [];
      (list || []).forEach(function (b) {
        var d = b && TYPES[b.t];
        if (!d || (d.modes && d.modes.indexOf(mode) < 0) || (d.admin && !opts.isAdmin) || (nested && NO_NEST[b.t])) { skipped.push(d ? d.label : String(b && b.t || '?')); return; }
        if (b.t === 'columns') b = Object.assign({}, b, { cols: (b.cols || []).map(function (c) { return tplFit(c, true, skipped); }) });
        out.push(b);
      });
      return out;
    }
    /* below the chosen block (or its column block), otherwise at the end of the page; one undo step */
    function tplInsert(it) {
      if (tplBusy) return;
      tplBusy = true; tplSay('Memuat templat…');
      tplCall('GET', 'id=' + encodeURIComponent(String(it.id))).then(function (j) {
        if (!j.ok || !j.template) { tplSay(tplErr(j), true); return; }
        var skipped = [], list = tplFit(j.template.blocks, false, skipped), made = [];
        list.forEach(function (b) { var x = buildBlock(stripIds(b)); if (x) made.push(x); });
        var notes = [];
        if (skipped.length) notes.push(skipped.length + ' blok dilewati karena jenisnya tidak ada di ' + (mode === 'article' ? 'artikel' : WHAT) + ' ini (' + skipped.filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') + ').');
        if (j.template.htmlSkipped) notes.push(j.template.htmlSkipped + ' blok HTML dilewati: hanya Admin yang bisa memasangnya.');
        if (!made.length) { tplSay('Tidak ada blok yang bisa dipasang di sini.' + (notes.length ? ' ' + notes.join(' ') : ''), true); return; }
        var ref = state.sel;
        while (ref && ref.parentNode !== rootList) ref = ref.parentNode && ref.parentNode.closest ? ref.parentNode.closest('.ae-blk') : null;
        var at = ref;
        made.forEach(function (b) { if (at) { at.after(b); at = b; } else rootList.appendChild(b); });
        select(made[0]); changed(true);
        made[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        tplSay('Templat "' + j.template.name + '" disisipkan (' + made.length + ' blok). Ctrl+Z mengurungkan.' + (notes.length ? ' ' + notes.join(' ') : ''));
      }).catch(function () { tplSay('Koneksi terputus. Templat tidak bisa dimuat.', true); })
        .then(function () { tplBusy = false; });
    }

    /* ---------- loading ---------- */
    function load(blocks) {
      loading = true;
      destroyList(rootList);
      Sortable.create(rootList, listOpts());
      clear(rootList);
      select(null);
      (blocks || []).forEach(function (b) { var x = buildBlock(b); if (x) rootList.appendChild(x); });
      loading = false;
      outLater(true);
    }

    /* ---------- the shell ---------- */
    rootList = el('div', { class: 'ae-list ae-rootlist', 'data-ph': L.emptyCanvas });
    /* Pop-up and result: the canvas is the box itself (.ae-popbox) on a stage the size of the visitor's screen. Same markup in both, so one set of rules paints either. */
    var popStage = null, popBox = null, popScroll = null, popX = null, popBlob = null, popInfo = null;
    if (pop) {
      popScroll = el('div', { class: 'ae-cv ae-cv-pop' }, rootList);
      popBlob = el('span', { class: 'ae-popblob', 'aria-hidden': 'true' });
      popX = el('span', { class: 'ae-popx', 'aria-hidden': 'true', text: '×' });
      popBox = el('div', { class: 'ae-popbox' }, popBlob, popScroll, popX);
      popStage = el('div', { class: 'ae-popstage' }, popBox);
      cvWrap = el('div', { class: 'ae-cvwrap ae-popwrap w-fill is-' + mode }, popStage);
    } else cvWrap = el('div', { class: 'ae-cvwrap w-pub' + (opts.fullWidth ? ' is-fullart' : '') }, el('div', { class: 'ae-cv' }, rootList));
    setBox = el('div', { class: 'ae-setbox' });

    function addFromTile(k) {
      var b = buildBlock(TYPES[k].def(mode));
      var sel = state.sel;
      if (sel) {
        var ref = sel;
        if ((k === 'columns' || k === 'html' || k === 'score' || k === 'sections') && sel.parentNode.classList.contains('ae-col')) ref = sel.closest('.ae-blk-columns'); // top level only
        ref.after(b);
      } else rootList.appendChild(b);
      select(b); if (b._api.focus) b._api.focus(); changed(true);
      b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    var palette = el('div', { class: 'ae-tiles' }, Object.keys(TYPES).filter(function (k) { return (!TYPES[k].admin || opts.isAdmin) && (!TYPES[k].modes || TYPES[k].modes.indexOf(mode) >= 0); }).map(function (k) {
      return el('button', { type: 'button', class: 'ae-tile', 'data-type': k, title: 'Seret ke halaman, atau klik untuk menambahkan di bawah blok yang dipilih' },
        el('span', { class: 'ic', 'aria-hidden': 'true', text: TYPES[k].icon }), TYPES[k].label);
    }));
    // One delegated listener: after a tile is dragged, SortableJS leaves a copy of it in the palette (cloneNode keeps no event listeners).
    palette.addEventListener('click', function (e) {
      var t = e.target.closest('.ae-tile');
      if (t) addFromTile(t.getAttribute('data-type'));
    });
    Sortable.create(palette, { group: { name: 'blocks', pull: 'clone', put: false }, sort: false, draggable: '.ae-tile', animation: 0, fallbackOnBody: true, setData: setDragData,
      onStart: function () { root.classList.add('is-dragging'); }, onEnd: function () { root.classList.remove('is-dragging'); } });

    /* preview width: class names only (the panel allows no inline styles) */
    var DEVS = pop ? [
      { k: 'pub', label: 'Desktop', tip: 'Layar komputer, seukuran jendela ini' },
      { k: 'tab', label: 'Tablet', tip: 'Layar tablet 768 px' },
      { k: 'mob', label: 'HP', tip: 'Layar HP 390 px' },
    ] : WIDTHS;
    var view = el('div', { class: 'ae-view', role: 'group', 'aria-label': 'Lebar tampilan' }, DEVS.map(function (w, i) {
      return el('button', { type: 'button', class: 'btn ghost sm' + (i === 0 ? ' on' : ''), 'aria-pressed': i === 0 ? 'true' : 'false', title: typeof w.tip === 'function' ? w.tip() : w.tip, 'data-w': w.k, onclick: function () { setWidth(w.k); } }, w.label);
    }));
    var viewK = 'pub', fullArt = !!opts.fullWidth;
    function applyCv() { cvWrap.className = pop ? 'ae-cvwrap ae-popwrap w-fill is-' + mode + ' dev-' + viewK : 'ae-cvwrap w-' + viewK + (fullArt ? ' is-fullart' : ''); }
    function setWidth(k) {
      viewK = k; applyCv(); if (pop) paintLook();
      Array.prototype.forEach.call(view.querySelectorAll('button'), function (b) {
        var on = b.getAttribute('data-w') === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    var palSec = el('section', { class: 'ae-pal', 'aria-label': L.palette }, el('span', { class: 'ae-lbl', text: L.palette }), palette);
    outList = el('ul', { class: 'ae-ol ae-ol-root' });
    outSec = el('section', { class: 'ae-out', id: 'ae-outline', 'aria-label': 'Struktur halaman', hidden: true },
      el('span', { class: 'ae-lbl', text: 'Struktur halaman' }), outList,
      el('p', { class: 'muted ae-note', text: 'Alt + panah memindahkan blok; kiri / kanan memindahkannya antar kolom.' }));
    if (opts.templatesUrl) {
      tplName = el('input', { type: 'text', maxlength: '80', placeholder: 'Nama templat', 'aria-label': 'Nama templat', 'data-f': 'tpl-name', onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); tplSave(); } } });
      tplScope = el('select', { 'aria-label': 'Yang disimpan', 'data-f': 'tpl-scope', onchange: function () { tplTouched = true; } },
        el('option', { value: 'sel' }, 'Blok yang dipilih'), el('option', { value: 'page' }, 'Seluruh halaman'));
      tplScope.value = 'page';
      tplMsg = el('p', { class: 'ae-tp-msg', role: 'status' });
      tplUl = el('ul', { class: 'ae-tp-list' });
      tplSec = el('section', { class: 'ae-tpl', id: 'ae-templates', 'aria-label': 'Templat blok', hidden: true },
        el('span', { class: 'ae-lbl', text: 'Templat blok' }),
        el('div', { class: 'ae-tp-save' }, tplName, tplScope, el('button', { type: 'button', class: 'btn sm', 'data-act': 'tpl-save', onclick: tplSave }, 'Simpan templat')),
        tplMsg, tplUl);
      tplBtn = el('button', { type: 'button', class: 'btn ghost sm ae-tplbtn', 'aria-pressed': 'false', 'aria-controls': 'ae-templates', title: 'Simpan blok atau halaman ini sebagai templat, atau sisipkan templat yang sudah tersimpan', onclick: function () { setPane(tplOn ? 'pal' : 'tpl'); } }, 'Templat');
    }
    dockBody = el('div', { class: 'ae-dock-body', id: 'ae-dock-body' }, palSec, outSec, tplSec,
      el('section', { class: 'ae-set', 'aria-label': L.settings }, el('span', { class: 'ae-lbl', text: L.settings }), setBox));
    var collapse = el('button', { type: 'button', class: 'btn ghost sm ae-collapse', 'aria-controls': 'ae-dock-body', onclick: function () { setCollapsed(!dockBody.hidden); } });
    function setCollapsed(c) {
      dockBody.hidden = !!c;
      collapse.setAttribute('aria-expanded', c ? 'false' : 'true');
      collapse.textContent = c ? L.show : L.hide;
      prefSet(!!c);
    }
    undoBox = el('span', { class: 'ae-undo', role: 'status', hidden: true }, 'Blok dihapus. ', el('button', { type: 'button', class: 'ae-linkbtn', onclick: undoDelete }, 'Kembalikan blok'));
    /* ---- pop-up / result only: the look of the box, the Anak / Dewasa switch, and (results) the variables a text can use ---- */
    var HEX = /^#[0-9a-fA-F]{6}$/, WRE = /^(\d{1,4}(?:\.\d{1,2})?)(px|%|vw|vh|vmin|vmax|rem|em|ch)$/;
    var look = { style: {}, size: {}, position: 'center', overlay: true, showClose: true };
    var AUD = 'artEditor.popup.audience';
    var audK = opts.audience === 'adult' || opts.audience === 'kids' ? opts.audience : (function () { try { return window.localStorage.getItem(AUD) === 'adult' ? 'adult' : 'kids'; } catch (e) { return 'kids'; } })();
    var audBtns = el('div', { class: 'ae-view ae-aud', role: 'group', 'aria-label': 'Lihat tampilan untuk' }, pop ? [{ k: 'kids', label: 'Anak' }, { k: 'adult', label: 'Dewasa' }].map(function (a) {
      return el('button', { type: 'button', class: 'btn ghost sm', 'data-a': a.k, title: 'Lihat tampilan versi ' + a.label, onclick: function () { setAudience(a.k, true); } }, a.label);
    }) : []);
    function setAudience(a, remember) {
      audK = a === 'adult' ? 'adult' : 'kids';
      Array.prototype.forEach.call(audBtns.querySelectorAll('button'), function (b) { var on = b.getAttribute('data-a') === audK; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      if (popStage) popStage.setAttribute('data-audience', audK);
      if (remember) { try { window.localStorage.setItem(AUD, audK); } catch (e) { /* storage can be blocked */ } }
      if (opts.onAudience) opts.onAudience(audK);
    }
    function lum(hex) {
      var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function onColor(hex) { return lum(hex) > 0.45 ? '#1B2559' : '#FFFFFF'; }
    /* same reading as ENPopups.width: "80vh", "640px", a bare number is px, empty or wrong = 520px */
    function widthOf(w) {
      var t = (typeof w === 'number' ? String(w) + 'px' : String(w || '')).trim().toLowerCase();
      if (/^\d+(?:\.\d+)?$/.test(t)) t += 'px';
      var m = WRE.exec(t);
      return m ? { n: parseFloat(m[1]), u: m[2] } : { n: 520, u: 'px' };
    }
    // the screen being pretended: Desktop is this window, Tablet and HP are fixed sizes
    function vp() { return viewK === 'tab' ? { w: 768, h: 1024 } : viewK === 'mob' ? { w: 390, h: 844 } : { w: window.innerWidth, h: window.innerHeight }; }
    function vpPx(x) {
      var v = vp();
      return x.u === 'vw' ? x.n * v.w / 100 : x.u === 'vh' ? x.n * v.h / 100 : x.u === 'vmin' ? x.n * Math.min(v.w, v.h) / 100 : x.u === 'vmax' ? x.n * Math.max(v.w, v.h) / 100 : null;
    }
    function cssWidth(w) { var x = widthOf(w), p = vpPx(x); return p !== null ? (Math.round(p * 100) / 100) + 'px' : x.n + x.u; }
    function paintBg(box, st) {
      var t = st.bgType || 'solid';
      if (t === 'gradient' && st.grad) {
        var g = st.grad, c1 = HEX.test(g.c1 || '') ? g.c1 : '#FFFFFF', c2 = HEX.test(g.c2 || '') ? g.c2 : '#DDE6FF';
        box.style.background = g.kind === 'radial' ? 'radial-gradient(circle at 30% 20%, ' + c1 + ', ' + c2 + ')' : 'linear-gradient(' + (parseInt(g.angle, 10) || 0) + 'deg, ' + c1 + ', ' + c2 + ')';
      } else if (t === 'image' && st.image && st.image.src) {
        var o = Math.min(80, Math.max(0, parseInt(st.image.overlay, 10) || 0)) / 100;
        box.style.backgroundImage = (o > 0 ? 'linear-gradient(rgba(0,0,0,' + o + '),rgba(0,0,0,' + o + ')),' : '') + 'url("' + String(st.image.src).replace(/["\\\n]/g, '') + '")';
        box.style.backgroundSize = 'cover'; box.style.backgroundRepeat = 'no-repeat';
        box.style.backgroundPosition = st.image.pos === 'top' ? 'center top' : st.image.pos === 'bottom' ? 'center bottom' : 'center';
        box.style.backgroundColor = '#1B2559';
      } else box.style.background = HEX.test(st.bg || '') ? st.bg : '#FFFFFF';
    }
    function updateInfo() {
      if (!popInfo || !popBox) return;
      var x = widthOf((look.size || {}).width), p = vpPx(x);
      var want = p !== null ? p : (x.u === 'px' ? x.n : (x.u === 'rem' || x.u === 'em') ? x.n * 16 : null); // % and ch depend on the area: no number to compare
      var w = Math.round(popBox.getBoundingClientRect().width);
      var t = 'Lebar ' + WHAT + ' di tampilan ini: ' + (w || '…') + ' px';
      if (want !== null && w && want > w + 1) t += ' (diminta ' + Math.round(want) + ' px, dipotong selebar area editor)';
      if (want !== null && want > 960) t += '. Lebih lebar dari teks artikel (960 px)';
      popInfo.textContent = t;
      if (typeof opts.onInfo === 'function') opts.onInfo(t);
    }
    function paintLook() {
      if (!pop) return;
      var st = look.style || {}, sz = look.size || {}, box = popBox, sc = popScroll;
      var custom = mode === 'popup' && st.theme === 'custom';
      var posK = look.position === 'bottom-right' ? 'br' : look.position === 'bottom-left' ? 'bl' : 'center';
      popStage.className = 'ae-popstage ' + (custom ? 'ae-pop-custom' : 'ae-pop-site') + ' is-' + mode + (mode === 'popup' && look.overlay === false ? ' is-noover' : '') + ' pos-' + posK;
      popStage.setAttribute('data-audience', audK);
      ['borderRadius', 'color', 'background', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition', 'backgroundColor'].forEach(function (k) { box.style[k] = ''; }); // CSSOM: allowed by the panel policy
      sc.style.borderRadius = ''; sc.style.padding = ''; sc.style.minHeight = '';
      box.style.removeProperty('--ae-accent'); box.style.removeProperty('--ae-on'); box.style.removeProperty('--ae-pad');
      box.style.width = 'min(' + cssWidth(sz.width) + ', 100%)';
      if (custom) {
        var radius = parseInt(st.radius, 10) || 0, pad = parseInt(st.padding, 10) || 0;
        box.style.borderRadius = radius + 'px'; sc.style.borderRadius = radius + 'px';
        box.style.color = HEX.test(st.color || '') ? st.color : '#1B2559';
        paintBg(box, st);
        box.style.setProperty('--ae-pad', pad + 'px'); sc.style.padding = pad + 'px';
      } else box.style.setProperty('--ae-pad', '24px');
      if (HEX.test(st.accent || '')) { box.style.setProperty('--ae-accent', st.accent); box.style.setProperty('--ae-on', onColor(st.accent)); }
      if (sz.heightMode === 'fixed') sc.style.minHeight = (parseInt(sz.height, 10) || 480) + 'px';
      popX.hidden = mode === 'result' || look.showClose === false;
      popBlob.hidden = custom;
      updateInfo();
    }
    var varsBar = null, varsChips = null, varsMsg = null, varsTimer = null, lastTarget = null;
    function varsSay(t) { varsMsg.textContent = t; clearTimeout(varsTimer); varsTimer = setTimeout(function () { varsMsg.textContent = ''; }, 4000); }
    function drawVars() {
      if (!varsBar) return;
      clear(varsChips);
      (opts.vars || []).forEach(function (v) {
        var name = typeof v === 'string' ? v : v.v, label = typeof v === 'string' ? '' : (v.label || '');
        varsChips.appendChild(el('button', { type: 'button', class: 'ae-var', title: (label ? label + ': ' : '') + 'sisipkan ' + name, 'aria-label': 'Sisipkan ' + name + (label ? ', ' + label : ''),
          onmousedown: function (e) { e.preventDefault(); }, onclick: function () { insertVar(name); } }, name));
      });
      varsBar.hidden = !(opts.vars || []).length;
    }
    // a variable goes where the cursor last was: a text field, a text block, or a table cell (the chip keeps the focus where it is)
    function insertVar(v) {
      var t = lastTarget;
      if (!t || !t.isConnected || !root.contains(t)) { varsSay('Klik dulu di teks yang ingin diisi variabel.'); return; }
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') {
        var a = t.selectionStart, b = t.selectionEnd;
        if (a == null || b == null) { a = b = t.value.length; }
        if (t.maxLength > 0 && t.value.length - (b - a) + v.length > t.maxLength) { varsSay('Kolom ini sudah penuh.'); return; }
        t.focus(); t.setRangeText(v, a, b, 'end'); t.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (t.classList && t.classList.contains('ae-tc')) {
        t.focus(); document.execCommand('insertText', false, v);
      } else {
        var blk = t.closest ? t.closest('.ae-blk') : null;
        if (blk && blk._api && blk._api.ed) blk._api.ed.chain().focus().insertContent(v).run(); else varsSay('Klik dulu di teks yang ingin diisi variabel.');
      }
    }
    if (mode === 'result') {
      varsChips = el('span', { class: 'ae-vars-c' });
      varsMsg = el('span', { class: 'ae-vars-m', role: 'status' });
      varsBar = el('div', { class: 'ae-vars' }, el('span', { class: 'ae-vars-l', text: 'Sisipkan variabel:' }), varsChips, varsMsg);
    }
    if (pop) popInfo = el('span', { class: 'ae-popinfo', role: 'status' });

    undoB = el('button', { type: 'button', class: 'btn ghost sm', title: 'Urungkan perubahan terakhir (Ctrl+Z)', 'aria-label': 'Urungkan perubahan terakhir', onclick: function () { undo(); } }, '↶ Urungkan');
    redoB = el('button', { type: 'button', class: 'btn ghost sm', title: 'Ulangi perubahan yang diurungkan (Ctrl+Y)', 'aria-label': 'Ulangi perubahan yang diurungkan', onclick: function () { redo(); } }, '↷ Ulangi');
    histMsg = el('span', { class: 'ae-histmsg', role: 'status' });
    outBtn = el('button', { type: 'button', class: 'btn ghost sm ae-outbtn', 'aria-pressed': 'false', 'aria-controls': 'ae-outline', title: 'Daftar semua blok: pilih, pindah, gandakan atau hapus', onclick: function () { setOutline(!outOn); } }, 'Struktur');
    var hbox = el('div', { class: 'ae-hist', role: 'group', 'aria-label': 'Riwayat perubahan' }, undoB, redoB, histMsg);
    var dock = el('div', { class: 'ae-dock' }, el('div', { class: 'ae-dock-bar' }, collapse, view, pop ? audBtns : null, hbox, outBtn, tplBtn, el('span', { class: 'ae-grow' }), popInfo, undoBox), dockBody, buildToolbar(), varsBar);

    var root = el('div', { class: 'ae-root' + (pop ? ' ae-mode-' + mode : '') }, dock, el('div', { class: 'ae-stage', 'aria-label': pop ? (mode === 'result' ? 'Halaman hasil kuis' : 'Pop-up') : 'Halaman artikel' }, cvWrap));
    /* keep the focused block from hiding under the sticky dock when the keyboard scrolls the page (CSSOM, allowed by the panel policy) */
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(function () { document.documentElement.style.scrollPaddingTop = (dock.offsetHeight + 12) + 'px'; }); ro.observe(dock); }

    /* HTML blocks with automatic height report the height of their content; the frame's origin is opaque, so the sender is matched by window */
    function onFrameMsg(e) {
      var m = e.data;
      if (!m || m.enFrame !== 1 || typeof m.h !== 'number' || !isFinite(m.h)) return;
      var frames = root.querySelectorAll('iframe.ae-hf[data-auto]');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === e.source) { frames[i].style.height = Math.max(20, Math.min(5000, Math.ceil(m.h))) + 'px'; return; } // CSSOM: allowed by the panel policy
      }
    }
    window.addEventListener('message', onFrameMsg);
    // remember the last text the writer clicked in (the link box of the toolbar and number fields do not take variables)
    function onFocusIn(e) {
      var t = e.target;
      if (!t || !varsBar || varsBar.contains(t) || (tb && tb.contains(t))) return;
      var ce = t.isContentEditable || (t.classList && t.classList.contains('ae-tc'));
      var tx = (t.tagName === 'INPUT' && /^(text|url|search)?$/i.test(t.getAttribute('type') || '')) || t.tagName === 'TEXTAREA';
      if (ce || (tx && !t.readOnly && !t.classList.contains('ae-code'))) lastTarget = t;
    }
    root.addEventListener('focusin', onFocusIn);
    var ro2 = null;
    function onWinResize() { if (pop) paintLook(); }
    if (pop) {
      window.addEventListener('resize', onWinResize);
      if (window.ResizeObserver) { ro2 = new ResizeObserver(updateInfo); ro2.observe(popBox); }
    }

    /* Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) undo and redo the whole page, also while typing in a text, so the editor's own text history stays out of it.
       Fields outside the canvas and the block settings (the page's title, the link box of the toolbar) keep their normal undo. */
    var active = false;
    function track(e) { active = !!e.target && root.contains(e.target); }
    function onKey(e) {
      var k = String(e.key || '').toLowerCase();
      if (!(e.ctrlKey || e.metaKey) || e.altKey || (k !== 'z' && k !== 'y')) return;
      var t = e.target, editable = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
      if (editable) { if (!(cvWrap.contains(t) || setBox.contains(t))) return; }
      else if (!root.contains(t) && !(active && (!t || t === document.body))) return;
      e.preventDefault(); e.stopPropagation();
      if (k === 'y' || e.shiftKey) redo(); else undo();
    }
    function onBefore(e) {
      if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); } else if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); }
    }
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', track, true);
    document.addEventListener('focusin', track, true);
    cvWrap.addEventListener('beforeinput', onBefore);
    setBox.addEventListener('beforeinput', onBefore);

    cvWrap.addEventListener('focusin', function (e) { var b = e.target.closest('.ae-blk'); if (b) select(b); });
    cvWrap.addEventListener('click', function (e) {
      var b = e.target.closest('.ae-blk');
      if (b && !cvWrap.contains(b)) return; // the block was just deleted by its own button
      select(b || null);
    });

    setCollapsed(prefGet());
    renderSettings(); syncTb();
    Sortable.create(rootList, listOpts());
    if (pop) { look = Object.assign(look, opts.look || {}); setAudience(audK, false); paintLook(); drawVars(); }
    load(opts.blocks || []);
    histReset();

    return {
      root: root,
      getBlocks: function () { return serializeList(rootList); },
      /* a new content (another quiz result, a saved revision) starts a fresh history; { keep: true } adds it as one more step instead (what the server cleaned after a save) */
      setBlocks: function (list, o) {
        if (o && o.keep) { snapNow(); load(list); snapNow(); } else { load(list); histReset(); }
      },
      undo: undo, redo: redo,
      canUndo: function () { return hist.i > 0 || !!histTimer; },
      canRedo: function () { return !histTimer && hist.i < hist.s.length - 1; },
      /* the page re-attaches the editor after every save, and a frame that is moved in the page reloads (an Admin's posted preview would go blank): load the previews again */
      reloadPreviews: function () {
        Array.prototype.forEach.call(rootList.querySelectorAll('.ae-blk-html'), function (b) { if (b._api && b._api.reload) b._api.reload(); });
      },
      /* the article uses the whole browser width on the published page: the Desktop view shows every block at the full canvas width */
      setFullWidth: function (on) {
        if (pop) return;
        fullArt = !!on; applyCv();
        var b = view.querySelector('button[data-w="pub"]');
        if (b) b.title = fullArt ? 'Artikel ini memakai lebar layar penuh (opsi di bagian atas)' : tplTip();
      },
      /* pop-up / result: the colours, width and position of the box (the same shape as a pop-up's config: style, size, position, overlay, showClose) */
      setLook: function (l) { if (!pop) return; look = Object.assign({}, look, l || {}); paintLook(); },
      setAudience: function (a) { if (pop) setAudience(a, false); },
      getAudience: function () { return audK; },
      getInfo: function () { return popInfo ? popInfo.textContent : ''; },
      /* result: what a text may use ({name} …), the quiz's sections (for the Sections block), the example numbers shown by the Score block */
      setResultInfo: function (info) {
        info = info || {};
        if (info.vars) opts.vars = info.vars;
        if (info.sections) opts.sections = info.sections;
        if (info.sample) opts.sample = info.sample;
        if (info.forms) opts.forms = info.forms;
        if (info.targets) opts.targets = info.targets;
        drawVars();
        Array.prototype.forEach.call(rootList.querySelectorAll('.ae-blk-score,.ae-blk-sections'), function (b) { if (b._api && b._api.redraw) b._api.redraw(); });
      },
      destroy: function () {
        destroyList(rootList); window.removeEventListener('message', onFrameMsg); window.removeEventListener('resize', onWinResize);
        root.removeEventListener('focusin', onFocusIn); clearTimeout(varsTimer); clearTimeout(histTimer); clearTimeout(histMsgTimer); clearTimeout(outTimer);
        document.removeEventListener('keydown', onKey, true); document.removeEventListener('pointerdown', track, true); document.removeEventListener('focusin', track, true);
        if (ro) ro.disconnect(); if (ro2) ro2.disconnect(); document.documentElement.style.scrollPaddingTop = '';
      },
    };
  }

  window.ArtEditor = { create: create, ratios: RATIOS, types: TYPES };
})();
