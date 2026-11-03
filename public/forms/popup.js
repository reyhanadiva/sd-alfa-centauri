/*
 * Formulir English Now (pop-up dan halaman). Dipakai website, halaman artikel, dan halaman /form/<slug>.
 *   ENForms.open('slug')                       buka pop-up
 *   ENForms.mount(el, 'slug')                  tampilkan formulir di dalam halaman
 *   <a href="#form:slug">…</a>                 tautan apa pun ke "#form:slug" membuka pop-up (shortcode [form:slug])
 * Tema mengikuti atribut data-audience pada <html> (kids / adult). Dibangun dengan DOM tanpa innerHTML.
 * Formulir bisa berlangkah (Kembali / Lanjut), punya isian sebaris dan judul/teks penjelas, dan menyimpan draf di perangkat pengunjung (def.drafts).
 */
(function () {
  'use strict';
  if (window.ENForms) return;
  var BASE = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^\/]*$/, '') : '/forms/');
  var cache = {};

  /* forms.css dimuat saat dibutuhkan (tidak memblokir tampilan halaman). Halaman yang sudah punya <link> tidak dimuat dua kali. */
  var cssP = null;
  function cssReady() {
    if (cssP) return cssP;
    var ex = document.querySelector('link[rel="stylesheet"][href*="/forms/forms.css"]');
    if (ex) { cssP = Promise.resolve(); return cssP; }
    cssP = new Promise(function (res) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = BASE + 'forms.css';
      var done = function () { res(); };
      l.onload = done; l.onerror = done; setTimeout(done, 3000);
      document.head.appendChild(l);
    });
    return cssP;
  }
  function withCss(p) { return Promise.all([cssReady(), p]).then(function (r) { return r[1]; }); }
  /* siapkan CSS saat browser sedang santai, supaya pop-up tetap terbuka cepat */
  function warm() { var run = function () { cssReady(); draftSweep(); }; if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 }); else setTimeout(run, 2000); }
  if (document.readyState === 'complete') warm(); else window.addEventListener('load', warm);

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'value') n.value = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) n.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }
  function aud() { return document.documentElement.getAttribute('data-audience') === 'adult' ? 'adult' : 'kids'; }
  function loadDef(slug) {
    if (cache[slug]) return Promise.resolve(cache[slug]);
    return fetch(BASE + 'def.php?slug=' + encodeURIComponent(slug), { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (!j || !j.ok) throw new Error('nf'); cache[slug] = j.form; return j.form; });
  }

  /* ---------- draf isian di perangkat pengunjung (localStorage) ----------
   * Disimpan: isian teks, pilihan, tanggal. TIDAK disimpan: kotak persetujuan dan berkas.
   * Berlaku def.draftDays hari sejak perubahan terakhir, dihapus setelah terkirim, dan dibuang bila susunan isian formulir berubah (def.rev). */
  var DRAFT_PREFIX = 'enf:draft:';
  function draftStore() {
    try { var s = window.localStorage, t = '__enf'; s.setItem(t, '1'); s.removeItem(t); return s; } catch (e) { return null; }
  }
  function draftSweep() {
    var s = draftStore();
    if (!s) return;
    try {
      var drop = [];
      for (var i = 0; i < s.length; i++) {
        var k = s.key(i);
        if (!k || k.indexOf(DRAFT_PREFIX) !== 0) continue;
        var d = null;
        try { d = JSON.parse(s.getItem(k)); } catch (e) { d = null; }
        if (!d || typeof d.exp !== 'number' || d.exp < Date.now()) drop.push(k);
      }
      drop.forEach(function (k) { s.removeItem(k); });
    } catch (e) { /* abaikan */ }
  }
  function draftRead(s, slug, rev) {
    var k = DRAFT_PREFIX + slug;
    try {
      var raw = s.getItem(k);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== 1 || d.rev !== rev || typeof d.exp !== 'number' || d.exp < Date.now() || !d.vals || typeof d.vals !== 'object') { s.removeItem(k); return null; }
      return d;
    } catch (e) {
      try { s.removeItem(k); } catch (x) { /* abaikan */ }
      return null;
    }
  }

  /* ---------- isi formulir ---------- */
  function build(def, opts) {
    opts = opts || {};
    var a = aud();
    var T = def.texts[a];
    var steps = def.steps && def.steps.length ? def.steps : [{ id: 's1', name: '', items: def.fields.map(function (f) { return { t: 'field', key: f.key }; }) }];
    var byKey = {};
    def.fields.forEach(function (f) { byKey[f.key] = f; });
    var root = el('div', { class: 'enf-body' });
    var form = el('form', { class: 'enf-form', novalidate: 'novalidate', enctype: 'multipart/form-data' });
    var rows = {};      // key -> {field, wrap, get(), set(v), input}
    var rowEls = [];    // {el, keys}
    var stepEls = [];   // {id, name, el, keys}
    var cur = 0;        // langkah yang sedang tampil
    var finished = false;
    var sending = false;
    var errBox = el('p', { class: 'enf-err', role: 'alert', hidden: true });
    var KEY = DRAFT_PREFIX + def.slug;
    var store = !opts.preview && def.drafts !== false ? draftStore() : null;
    var timer = null;
    var notice = null;

    function labelOf(f) { return a === 'adult' ? f.labelAdult : f.label; }
    function valueOf(k) { return rows[k] ? rows[k].get() : ''; }
    function isEmpty(v) { return Array.isArray(v) ? !v.length : String(v).trim() === ''; }
    function visible(f) {
      if (!f.showIf || !f.showIf.key) return true;
      var ref = byKey[f.showIf.key];
      if (!ref || !visible(ref)) return false;
      var v = valueOf(f.showIf.key), eq = f.showIf.equals || '';
      if (Array.isArray(v)) return eq === '' ? v.length > 0 : v.indexOf(eq) >= 0;
      return eq === '' ? String(v).trim() !== '' : String(v).trim() === eq;
    }
    function refresh() {
      def.fields.forEach(function (f) { if (rows[f.key]) rows[f.key].wrap.hidden = !visible(f); });
      rowEls.forEach(function (r) { r.el.hidden = r.keys.every(function (k) { return rows[k].wrap.hidden; }); });
      drawNav();
    }
    function clearErr() { errBox.hidden = true; }
    function fail(p) {
      errBox.textContent = p.msg; errBox.hidden = false;
      var t = p.key && rows[p.key] ? rows[p.key].wrap.querySelector('input,select,textarea') : null;
      if (t) try { t.focus(); } catch (e) { /* abaikan */ }
    }

    /* ----- satu isian ----- */
    function makeField(f) {
      var label = labelOf(f), ph = label + (f.required || f.type === 'consent' ? '' : ' (opsional)');
      var input, get, set, wrap = el('div', { class: 'enf-field enf-t-' + f.type }), showLabel = false;
      var id = 'enf-' + def.slug + '-' + f.key;
      function setText(v) { input.value = String(v).slice(0, 2000); return true; }
      switch (f.type) {
        case 'textarea':
          input = el('textarea', { class: 'enf-in', rows: '3', name: f.key, placeholder: ph, 'aria-label': label, id: id });
          get = function () { return input.value; }; set = setText; break;
        case 'select':
          input = el('select', { class: 'enf-in', name: f.key, 'aria-label': label, id: id }, el('option', { value: '' }, ph), f.options.map(function (o) { return el('option', { value: o }, o); }));
          get = function () { return input.value; };
          set = function (v) { if (f.options.indexOf(v) < 0) return false; input.value = v; return true; }; break;
        case 'radio':
          showLabel = true;
          input = el('div', { class: 'enf-opts' }, f.options.map(function (o) {
            return el('label', { class: 'enf-opt' }, el('input', { type: 'radio', name: f.key, value: o }), el('span', { text: o }));
          }));
          get = function () { var c = input.querySelector('input:checked'); return c ? c.value : ''; };
          set = function (v) {
            var hit = false;
            Array.prototype.forEach.call(input.querySelectorAll('input'), function (i) { if (i.value === v) { i.checked = true; hit = true; } });
            return hit;
          }; break;
        case 'checkbox':
          showLabel = true;
          input = el('div', { class: 'enf-opts' }, f.options.map(function (o) {
            return el('label', { class: 'enf-opt' }, el('input', { type: 'checkbox', name: f.key + '[]', value: o }), el('span', { text: o }));
          }));
          get = function () { return Array.prototype.map.call(input.querySelectorAll('input:checked'), function (c) { return c.value; }); };
          set = function (v) {
            if (!Array.isArray(v)) return false;
            var hit = false;
            Array.prototype.forEach.call(input.querySelectorAll('input'), function (i) { if (v.indexOf(i.value) >= 0) { i.checked = true; hit = true; } });
            return hit;
          }; break;
        case 'consent':
          input = el('label', { class: 'enf-opt enf-consent' }, el('input', { type: 'checkbox', name: f.key, value: '1' }),
            el('span', null, label, f.consent && f.consent.url ? [' ', el('a', { href: f.consent.url, target: '_blank', rel: 'noopener noreferrer', text: f.consent.text || 'Baca selengkapnya' })] : null));
          get = function () { return input.querySelector('input').checked ? '1' : ''; }; break;   // tidak pernah masuk draf
        case 'date':
          showLabel = true;
          input = el('input', { class: 'enf-in', type: 'date', name: f.key, id: id, 'aria-label': label });
          get = function () { return input.value; };
          set = function (v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; input.value = v; return true; }; break;
        case 'file':
          showLabel = true;
          input = el('input', { class: 'enf-in enf-file', type: 'file', name: f.key, id: id, accept: '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*', 'aria-label': label });
          get = function () { return input.files && input.files.length ? input.files[0].name : ''; }; break;   // tidak pernah masuk draf
        default:
          input = el('input', { class: 'enf-in', type: f.type === 'email' ? 'email' : (f.type === 'phone' ? 'tel' : 'text'), name: f.key, id: id, placeholder: ph, 'aria-label': label,
            inputmode: f.type === 'phone' ? 'tel' : (f.type === 'email' ? 'email' : null), autocomplete: f.type === 'phone' ? 'tel' : (f.type === 'email' ? 'email' : 'off'), maxlength: f.type === 'text' ? '200' : null });
          get = function () { return input.value; }; set = setText;
      }
      if (showLabel) wrap.appendChild(el('span', { class: 'enf-lbl', text: label + (f.required ? '' : ' (opsional)') }));
      if (f.type === 'text' && f.suggest && !opts.preview) wrap.appendChild(suggestBox(input, def.slug, f.key)); else wrap.appendChild(input);
      if (f.type === 'file') wrap.appendChild(el('small', { class: 'enf-hint', text: 'Hanya PDF, JPG, PNG, atau WebP. Maksimal 5 MB.' }));
      if (f.hint) wrap.appendChild(el('small', { class: 'enf-hint', text: f.hint }));
      rows[f.key] = { field: f, wrap: wrap, get: get, set: set, input: input };
      function onEdit() { clearErr(); refresh(); later(); }
      wrap.addEventListener('input', onEdit);
      wrap.addEventListener('change', onEdit);
      return wrap;
    }

    /* ----- langkah, baris, judul ----- */
    steps.forEach(function (st) {
      var box = el('div', { class: 'enf-step', 'data-step': st.id, hidden: true });
      var keys = [];
      (st.items || []).forEach(function (it) {
        if (it.t === 'field') {
          if (byKey[it.key] && !rows[it.key]) { box.appendChild(makeField(byKey[it.key])); keys.push(it.key); }
        } else if (it.t === 'row') {
          var ks = (it.keys || []).filter(function (k) { return byKey[k] && !rows[k]; });
          if (!ks.length) return;
          var r = el('div', { class: 'enf-row enf-cols-' + ks.length }, ks.map(function (k) { keys.push(k); return makeField(byKey[k]); }));
          rowEls.push({ el: r, keys: ks });
          box.appendChild(r);
        } else if (it.t === 'h' || it.t === 'text') {
          var txt = a === 'adult' ? (it.textAdult || it.text) : it.text;
          if (!txt) return;
          box.appendChild(it.t === 'h' ? el(it.level === 3 ? 'h4' : 'h3', { class: 'enf-lh', text: txt }) : el('p', { class: 'enf-lt', text: txt }));
        } else if (it.t === 'hr') {
          box.appendChild(el('hr', { class: 'enf-hr' }));
        }
      });
      stepEls.push({ id: st.id, name: st.name || '', el: box, keys: keys });
    });
    // pengaman: isian yang tidak tercantum di langkah mana pun ikut ke langkah terakhir
    def.fields.forEach(function (f) {
      if (rows[f.key]) return;
      var last = stepEls[stepEls.length - 1];
      last.el.appendChild(makeField(f)); last.keys.push(f.key);
    });
    stepEls.forEach(function (s) { form.appendChild(s.el); });

    /* langkah yang seluruh isiannya tersembunyi (karena "tampil jika") dilewati */
    function stepOn(i) {
      var ks = stepEls[i].keys;
      return !ks.length || ks.some(function (k) { return visible(byKey[k]); });
    }
    function activeSteps() { var r = []; stepEls.forEach(function (s, i) { if (stepOn(i)) r.push(i); }); return r; }

    /* ----- kemajuan dan tombol ----- */
    var progT = el('p', { class: 'enf-prog-t', 'aria-live': 'polite' });
    var bar = el('div', { class: 'enf-bar', 'aria-hidden': 'true' });
    var prog = el('div', { class: 'enf-prog', hidden: true }, progT, bar);
    var back = el('button', { type: 'button', class: 'enf-btn enf-ghost', hidden: true, onclick: function () {
      var act = activeSteps(), p = act.indexOf(cur);
      if (p > 0) go(act[p - 1]);
    } }, 'Kembali');
    var btn = el('button', { type: 'submit', class: 'enf-btn' }, T.submit || 'Kirim');
    function drawNav() {
      var act = activeSteps();
      if (!act.length) return;
      if (act.indexOf(cur) < 0) {
        var nx = act.filter(function (i) { return i > cur; })[0];
        cur = nx !== undefined ? nx : act[act.length - 1];
        stepEls.forEach(function (s, j) { s.el.hidden = j !== cur; });
      }
      var pos = act.indexOf(cur), total = act.length;
      prog.hidden = total < 2;
      if (total > 1) {
        progT.textContent = 'Langkah ' + (pos + 1) + ' dari ' + total + (stepEls[cur].name ? ' · ' + stepEls[cur].name : '');
        while (bar.firstChild) bar.removeChild(bar.firstChild);
        act.forEach(function (i, n) { bar.appendChild(el('span', { class: n <= pos ? 'on' : '' })); });
      }
      back.hidden = pos < 1;
      if (!sending) btn.textContent = pos < total - 1 ? 'Lanjut' : (T.submit || 'Kirim');
    }
    function go(i) {
      cur = i;
      stepEls.forEach(function (s, j) { s.el.hidden = j !== cur; });
      clearErr(); drawNav(); save();
      try { (prog.hidden ? form : prog).scrollIntoView({ block: 'nearest' }); } catch (e) { /* abaikan */ }
    }

    /* ----- pemeriksaan ringan di browser; pemeriksaan sebenarnya dilakukan server ----- */
    function check(i) {
      var out = null;
      stepEls[i].keys.forEach(function (k) {
        if (out) return;
        var f = byKey[k];
        if (rows[k].wrap.hidden) return;
        var v = valueOf(k), empty = isEmpty(v);
        if ((f.required || f.type === 'consent') && empty) out = { key: k, msg: labelOf(f) + (f.type === 'consent' ? ' harus disetujui.' : ' wajib diisi.') };
        else if (f.type === 'phone' && !empty && String(v).replace(/\D/g, '').length < 9) out = { key: k, msg: labelOf(f) + ' sepertinya belum lengkap.' };
        else if (f.type === 'email' && !empty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) out = { key: k, msg: labelOf(f) + ': alamat email tidak valid.' };
      });
      return out;
    }

    /* ----- draf ----- */
    function snapshot() {
      var vals = {};
      def.fields.forEach(function (f) {
        if (f.type === 'consent' || f.type === 'file') return;
        var v = rows[f.key].get();
        if (!isEmpty(v)) vals[f.key] = Array.isArray(v) ? v.slice(0, 50) : String(v).slice(0, 2000);
      });
      return vals;
    }
    function save() {
      clearTimeout(timer); timer = null;
      if (!store || finished) return;
      try {
        var vals = snapshot();
        if (!Object.keys(vals).length) { store.removeItem(KEY); return; }
        store.setItem(KEY, JSON.stringify({ v: 1, rev: def.rev, exp: Date.now() + (def.draftDays || 3) * 864e5, step: stepEls[cur].id, vals: vals }));
      } catch (e) { /* penyimpanan penuh atau diblokir: abaikan */ }
    }
    function later() { if (!store) return; clearTimeout(timer); timer = setTimeout(save, 400); }
    function flush() {
      if (!root.isConnected) { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); return; }
      if (timer) save();
    }
    root.enfFlush = function () { if (timer) save(); };
    function startOver() {
      if (store) try { store.removeItem(KEY); } catch (e) { /* abaikan */ }
      form.reset();
      clearErr(); refresh();
      var act = activeSteps();
      go(act.length ? act[0] : 0);
      if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
      notice = null;
    }
    if (store) {
      window.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', flush);
    }

    // kolom jebakan spam
    form.appendChild(el('input', { class: 'enf-hp', type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }));
    form.appendChild(errBox);
    form.appendChild(el('div', { class: 'enf-foot' }, T.note ? el('p', { class: 'enf-note', text: T.note }) : el('span'), el('div', { class: 'enf-nav' }, back, btn)));
    if (store) form.appendChild(el('small', { class: 'enf-hint enf-saves', text: 'Isian Anda disimpan sementara di perangkat ini sampai terkirim (maksimal ' + (def.draftDays || 3) + ' hari).' }));
    form.insertBefore(prog, stepEls[0].el);

    /* pulihkan draf (bila ada), lalu tentukan langkah awal */
    var start = 0, restored = false;
    if (store) {
      var d = draftRead(store, def.slug, def.rev);
      if (d) {
        def.fields.forEach(function (f) {
          var s = rows[f.key].set;
          if (s && d.vals[f.key] !== undefined && s(d.vals[f.key])) restored = true;
        });
        stepEls.forEach(function (s, i) { if (s.id === d.step) start = i; });
      }
    }
    cur = start;
    stepEls.forEach(function (s, j) { s.el.hidden = j !== cur; });
    refresh();
    if (restored && !opts.quiet) {
      notice = el('div', { class: 'enf-draft', role: 'status' }, el('span', { text: 'Isian Anda yang belum terkirim sudah kami pulihkan.' }), el('button', { type: 'button', class: 'enf-link', onclick: startOver }, 'Mulai dari awal'));
      form.insertBefore(notice, prog);
    }

    function success(via) {
      finished = true; clearTimeout(timer);
      if (store) try { store.removeItem(KEY); } catch (e) { /* abaikan */ }
      root.className = 'enf-body enf-done';
      while (root.firstChild) root.removeChild(root.firstChild);
      if (via === 'whatsapp') {
        var lines = [];
        def.fields.forEach(function (f) { var v = valueOf(f.key); if (rows[f.key].wrap.hidden || !v || (Array.isArray(v) && !v.length)) return; lines.push(labelOf(f) + ': ' + (Array.isArray(v) ? v.join(', ') : v)); });
        var msg = 'Halo, saya ingin mengirim formulir "' + def.name + '".\n\n' + lines.join('\n');
        root.appendChild(el('p', { class: 'enf-h2', text: 'Satu langkah lagi' }));
        root.appendChild(el('p', { class: 'enf-p', text: 'Data belum terkirim otomatis. Kirim lewat WhatsApp supaya admin kami bisa menindaklanjuti.' }));
        root.appendChild(el('a', { class: 'enf-btn', href: 'https://wa.me/' + (def.wa || '') + '?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener noreferrer', text: 'Kirim lewat WhatsApp' }));
      } else {
        root.appendChild(el('p', { class: 'enf-h2', text: T.successTitle || 'Terima kasih!' }));
        root.appendChild(el('p', { class: 'enf-p', text: T.successMsg || '' }));
        if (opts.preview) root.appendChild(el('p', { class: 'enf-note', text: 'Pratinjau: data tidak dikirim.' }));
      }
      if (opts.onDone) opts.onDone();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var act = activeSteps(), pos = act.indexOf(cur), p, i;
      if (pos < act.length - 1) {            // bukan langkah terakhir: periksa langkah ini, lalu lanjut
        p = check(cur);
        if (p) { fail(p); return; }
        go(act[pos + 1]);
        return;
      }
      for (i = 0; i < act.length; i++) {     // langkah terakhir: periksa semua langkah dari awal
        p = check(act[i]);
        if (p) { if (act[i] !== cur) go(act[i]); fail(p); return; }
      }
      if (opts.preview) { success('server'); return; }
      sending = true; btn.disabled = true; back.disabled = true; btn.textContent = 'Mengirim…';
      var fd = new FormData(form);
      fd.append('form', def.slug); fd.append('audience', a); fd.append('qs', location.search.replace(/^\?/, '')); fd.append('page', location.pathname);
      fetch(BASE + 'submit.php', { method: 'POST', body: fd, credentials: 'omit' })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'bad' }; }).then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (x) {
          if (x.j.ok) { success('server'); return; }
          if (x.status === 422 && x.j.errors) { errBox.textContent = x.j.errors[0]; errBox.hidden = false; return; }
          if (x.status === 429) { errBox.textContent = 'Terlalu banyak kiriman. Coba lagi beberapa menit lagi.'; errBox.hidden = false; return; }
          if (def.waFallback) success('whatsapp'); else { errBox.textContent = 'Pengiriman gagal. Coba lagi sebentar lagi.'; errBox.hidden = false; }
        })
        .catch(function () { if (def.waFallback) success('whatsapp'); else { errBox.textContent = 'Koneksi terputus. Coba lagi.'; errBox.hidden = false; } })
        .then(function () { sending = false; btn.disabled = false; back.disabled = false; drawNav(); });
    });

    if (T.eyebrow) root.appendChild(el('p', { class: 'enf-eyebrow', text: T.eyebrow }));
    root.appendChild(el('h2', { class: 'enf-h', id: 'enf-title-' + def.slug, text: T.title }));
    if (T.intro) root.appendChild(el('p', { class: 'enf-intro', text: T.intro }));
    root.appendChild(form);
    return root;
  }

  /* ---------- saran isian (autocomplete) ---------- */
  function suggestBox(input, slug, key) {
    var wrap = el('div', { class: 'enf-sg-wrap' });
    var list = el('ul', { class: 'enf-sg', role: 'listbox', hidden: true });
    var timer = null, items = [], act = -1;
    function hide() { list.hidden = true; act = -1; }
    function draw() {
      while (list.firstChild) list.removeChild(list.firstChild);
      if (!items.length) { hide(); return; }
      items.forEach(function (t, i) {
        list.appendChild(el('li', { role: 'option', class: i === act ? 'on' : '', onmousedown: function (e) { e.preventDefault(); input.value = t; hide(); input.dispatchEvent(new Event('input', { bubbles: true })); } }, t));
      });
      list.hidden = false;
    }
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      timer = setTimeout(function () {
        fetch(BASE + 'suggest.php?slug=' + encodeURIComponent(slug) + '&field=' + encodeURIComponent(key) + '&q=' + encodeURIComponent(q), { credentials: 'omit' })
          .then(function (r) { return r.json(); }).then(function (j) { if (input.value.trim() === q) { items = (j && j.items) || []; act = -1; draw(); } }).catch(function () {});
      }, 180);
    });
    input.addEventListener('focus', function () { if (input.value.trim() === '') input.dispatchEvent(new Event('input')); });
    input.addEventListener('blur', function () { setTimeout(hide, 120); });
    input.addEventListener('keydown', function (e) {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); act = (act + 1) % items.length; draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act = (act - 1 + items.length) % items.length; draw(); }
      else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); input.value = items[act]; hide(); }
      else if (e.key === 'Escape') hide();
    });
    wrap.appendChild(input); wrap.appendChild(list);
    return wrap;
  }

  /* ---------- pop-up ---------- */
  var current = null;
  function open(slug, opts) {
    opts = opts || {};
    if (current) close();
    var prevFocus = document.activeElement;
    var overlay = el('div', { class: 'enf-overlay', 'data-audience': aud() });
    var card = el('div', { class: 'enf-card', role: 'dialog', 'aria-modal': 'true' });
    var closeBtn = el('button', { type: 'button', class: 'enf-x', 'aria-label': 'Tutup', onclick: close }, '×');
    card.appendChild(el('span', { class: 'enf-blob', 'aria-hidden': 'true' }));
    card.appendChild(closeBtn);
    var holder = el('div', { class: 'enf-holder' }, el('p', { class: 'enf-p', text: 'Memuat…' }));
    card.appendChild(holder);
    overlay.appendChild(card);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    overlay.hidden = true;
    cssReady().then(function () { overlay.hidden = false; });
    document.body.appendChild(overlay);
    current = { close: close };
    function close() {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      current = null;
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* abaikan */ }
    }
    withCss(opts.def ? Promise.resolve(opts.def) : loadDef(slug)).then(function (def) {
      if (def.layout === 'page' && !opts.def) { close(); location.assign('/form/' + def.slug); return; }  // formulir bertipe halaman
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      card.setAttribute('aria-labelledby', 'enf-title-' + def.slug);
      holder.appendChild(build(def, opts));
      var first = holder.querySelector('.enf-step:not([hidden]) input,.enf-step:not([hidden]) select,.enf-step:not([hidden]) textarea');
      if (first) setTimeout(function () { try { first.focus(); } catch (e) { /* abaikan */ } }, 80);
    }).catch(function () {
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      holder.appendChild(el('p', { class: 'enf-h2', text: 'Formulir tidak tersedia' }));
      holder.appendChild(el('p', { class: 'enf-p', text: 'Maaf, formulir ini sedang tidak bisa dibuka. Silakan hubungi admin lewat WhatsApp.' }));
    });
  }
  function close() { if (current) current.close(); }

  function mount(container, slug, opts) {
    opts = opts || {};
    container.className += ' enf-page';
    container.setAttribute('data-enf-mounted', '1');
    function draw(def, again) {
      var old = container.querySelector('.enf-body');
      if (old && old.enfFlush) old.enfFlush();   // simpan dulu isian yang sedang diketik (bila draf aktif)
      while (container.firstChild) container.removeChild(container.firstChild);
      var o = {}; Object.keys(opts).forEach(function (k) { o[k] = opts[k]; }); if (again) o.quiet = true;
      container.appendChild(build(def, o));
    }
    withCss(opts.def ? Promise.resolve(opts.def) : loadDef(slug)).then(draw).catch(function () { container.appendChild(el('p', { class: 'enf-p', text: 'Formulir tidak tersedia.' })); });
    // ganti tema Anak/Dewasa = teks dan label ikut berganti
    new MutationObserver(function () { (opts.def ? Promise.resolve(opts.def) : loadDef(slug)).then(function (d) { if (!container.querySelector('.enf-done')) draw(d, true); }); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-audience'] });
  }

  /* tautan "#form:slug" di mana pun */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href],[data-en-form]') : null;
    if (!a) return;
    var slug = a.getAttribute('data-en-form');
    if (!slug) { var m = /#form:([a-z0-9-]+)$/i.exec(a.getAttribute('href') || ''); if (m) slug = m[1].toLowerCase(); }
    if (!slug) return;
    e.preventDefault(); e.stopPropagation();
    open(slug);
  }, true);

  window.ENForms = { open: open, close: close, mount: mount };
  window.addEventListener('hashchange', function () {
    var h = /^#form:([a-z0-9-]+)$/i.exec(location.hash || '');
    if (h) open(h[1].toLowerCase());
  });
  document.addEventListener('DOMContentLoaded', function () {
    var hash = /^#form:([a-z0-9-]+)$/i.exec(location.hash || '');
    if (hash) open(hash[1].toLowerCase());
    Array.prototype.forEach.call(document.querySelectorAll('[data-enf-mount]'), function (n) { if (!n.getAttribute('data-enf-mounted')) mount(n, n.getAttribute('data-enf-mount')); });
  });
})();
