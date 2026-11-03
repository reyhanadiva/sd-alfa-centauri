/* Kartu SEO artikel: kolom SEO, kata kunci terkait, pratinjau pencarian & berbagi, serta analisis langsung
 * (SEO, keterbacaan, visibilitas AI) bergaya Yoast. Analisis dibuat untuk teks Indonesia (dan Inggris); pencocokan kata kunci
 * memakai frasa utuh tanpa memperhitungkan imbuhan, jadi "belajar" dan "pembelajaran" dianggap berbeda. */
(function () {
  'use strict';
  var E = window.ED, el = E.el;
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var EXTRA = boot.seo || {};

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function plain(html) { var d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, ' '); return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
  function words(s) { return String(s || '').split(/\s+/).filter(Boolean); }
  function slugOf(S) { return S.slug || String(S.title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  /** 2 = frasa utuh, 1 = semua kata ada tetapi terpisah, 0 = tidak ada */
  function match(text, kp) {
    var h = ' ' + norm(text) + ' ', k = norm(kp);
    if (!k) return 0;
    if (h.indexOf(' ' + k + ' ') >= 0) return 2;
    return k.split(' ').every(function (w) { return h.indexOf(' ' + w + ' ') >= 0; }) ? 1 : 0;
  }
  function count(text, kp) {
    var h = ' ' + norm(text) + ' ', k = ' ' + norm(kp) + ' ', n = 0, i = 0;
    if (k.trim() === '') return 0;
    while ((i = h.indexOf(k, i)) >= 0) { n++; i += k.length - 1; }
    return n;
  }

  var TRANSITION = ['namun', 'tetapi', 'tapi', 'karena', 'sebab', 'oleh karena itu', 'oleh sebab itu', 'sehingga', 'jadi', 'akibatnya', 'selain itu', 'di samping itu', 'lagi pula', 'bahkan', 'misalnya', 'contohnya', 'sebagai contoh', 'pertama', 'kedua', 'ketiga', 'terakhir', 'akhirnya', 'selanjutnya', 'kemudian', 'setelah itu', 'sebelum itu', 'sementara itu', 'sedangkan', 'meskipun', 'walaupun', 'padahal', 'dengan demikian', 'singkatnya', 'intinya', 'pada dasarnya', 'tentu saja', 'ternyata', 'apalagi', 'yaitu', 'yakni', 'serta', 'juga', 'selama', 'ketika', 'saat', 'jika', 'apabila', 'agar', 'supaya', 'artinya', 'sebaliknya', 'di sisi lain', 'pertama-tama', 'terutama', 'khususnya',
    'however', 'but', 'because', 'therefore', 'so', 'also', 'moreover', 'for example', 'first', 'second', 'finally', 'then', 'next', 'although', 'while', 'in addition', 'as a result', 'besides', 'instead', 'thus', 'for instance', 'meanwhile', 'otherwise'].map(norm);
  var NOT_PASSIVE = /^(diri|dia|diam|dini|dinas|dinding|dinamis|diagram|diet|digital|dimensi|disiplin|direktur|diskusi|diploma|dialog|diagnosis|disini|dimana|dimanapun|diluar|didalam|diatas|dibawah)$/;
  var QUESTION = /^(apa|apakah|bagaimana|gimana|mengapa|kenapa|kapan|berapa|siapa|siapakah|dimana|di mana|mana|bisakah|haruskah|perlukah|what|how|why|when|where|who|which|is|are|can|should|do|does)\b|\?$/i;

  /** ringkas isi artikel jadi struktur untuk dianalisis */
  function parse(S) {
    var r = { paras: [], heads: [], imgs: [], links: { internal: 0, external: 0 }, lists: 0, quotes: 0, citedQuotes: 0, faq: 0, faqQs: [], sections: [], text: '', sentences: [] };
    var cur = 0, parts = [];
    function addProse(t) { if (!t) return; parts.push(t); cur += words(t).length; }
    function link(href) {
      href = String(href || '');
      if (/^https?:\/\//i.test(href)) { try { if (new URL(href).host === location.host) r.links.internal++; else r.links.external++; } catch (e) { r.links.external++; } }
      else if (/^(\/|#form:)/.test(href)) r.links.internal++;
    }
    function head(text, level) {
      if (cur) r.sections.push(cur); cur = 0;
      if (text) { r.heads.push({ text: text, level: level || 2 }); parts.push(text); }
    }
    function walk(list) {
      (list || []).forEach(function (b) {
        if (b.t === 'text') {
          var d = document.createElement('div'); d.innerHTML = b.html || '';
          Array.prototype.forEach.call(d.querySelectorAll('a[href]'), function (a) { link(a.getAttribute('href')); });
          Array.prototype.forEach.call(d.children, function (c) {
            if (c.tagName === 'P') { var t = plain(c.innerHTML); if (t) { r.paras.push(t); addProse(t); } }
            else if (/^H[2-4]$/.test(c.tagName)) head(c.textContent.trim(), parseInt(c.tagName.slice(1), 10));
            else if (c.tagName === 'UL' || c.tagName === 'OL') {
              r.lists++;
              addProse(Array.prototype.map.call(c.querySelectorAll('li > p'), function (p) { return p.textContent.trim(); }).filter(Boolean).join('. '));
            }
          });
        } else if (b.t === 'columns') { (b.cols || []).forEach(walk); }
        else if (b.t === 'p') { // artikel lama
          var d2 = document.createElement('div'); d2.innerHTML = b.html || '';
          Array.prototype.forEach.call(d2.querySelectorAll('a[href]'), function (a) { link(a.getAttribute('href')); });
          var t2 = plain(b.html); if (t2) { r.paras.push(t2); addProse(t2); }
        } else if (b.t === 'h') head(b.text, b.level)
        else if (b.t === 'img') { r.imgs.push({ alt: b.alt || '' }); if (b.caption) parts.push(b.caption); }
        else if (b.t === 'ul') { r.lists++; addProse((b.items || []).join('. ')); }
        else if (b.t === 'quote') { r.quotes++; if (b.cite) r.citedQuotes++; addProse(b.text || ''); }
        else if (b.t === 'callout') { addProse((b.title ? b.title + '. ' : '') + (b.text || '')); }
        else if (b.t === 'button') { link(b.url); }
        else if (b.t === 'cards') {
          (b.items || []).forEach(function (it) {
            if (it.src) r.imgs.push({ alt: it.alt || it.title || '' });
            addProse([it.title, it.text, it.label].filter(Boolean).join('. '));
            if (it.label && it.url) link(it.url);
          });
        }
        else if (b.t === 'table') {
          if (b.caption) parts.push(b.caption);
          (b.rows || []).forEach(function (row) {
            var dt = document.createElement('div'); dt.innerHTML = (row || []).join(' | ');
            Array.prototype.forEach.call(dt.querySelectorAll('a[href]'), function (a) { link(a.getAttribute('href')); });
            addProse((row || []).map(plain).filter(Boolean).join(' '));
          });
        }
        else if (b.t === 'faq') {
          (b.items || []).forEach(function (it) { if (it.q && it.a) { r.faq++; r.faqQs.push(it.q); parts.push(it.q); addProse(it.a); } });
          if (b.title) r.heads.push({ text: b.title, level: 2 });
        }
      });
    }
    walk(S.blocks);
    if (cur) r.sections.push(cur);
    r.text = parts.join(' ');
    r.words = words(r.text).length;
    r.paras.concat(r.faqQs).forEach(function () {});
    var prose = r.paras.join(' ');
    r.sentences = (prose.replace(/\b(dr|prof|mr|mrs|ms|dll|dsb|dst|yg|dg|no|hal|vs|e\.g|i\.e)\./gi, '$1').match(/[^.!?]+[.!?]*/g) || []).map(function (x) { return x.trim(); }).filter(function (x) { return words(x).length >= 2; });
    return r;
  }

  var G = 'good', O = 'ok', B = 'bad';
  function item(s, t, hint) { return { s: s, t: t, hint: hint || '' }; }

  /** pemeriksaan untuk satu frasa kunci. main = true untuk kata kunci fokus (ikut memeriksa judul, deskripsi, slug) */
  function keyphraseChecks(S, P, kp, main) {
    var seo = S.seo, out = [], wc = words(kp).length;
    var title = seo.title || S.title || '', desc = seo.description || S.excerpt || '';
    var first = P.paras[0] || '', slug = slugOf(S).replace(/-/g, ' ');
    var n = count(P.text, kp), dens = P.words ? n * wc / P.words * 100 : 0;
    out.push(wc <= 4 ? item(G, 'Panjang frasa kunci: ' + wc + ' kata') : (wc <= 8 ? item(O, 'Frasa kunci cukup panjang (' + wc + ' kata)', 'Frasa 2-4 kata lebih mudah dicocokkan dan dicari orang.') : item(B, 'Frasa kunci terlalu panjang (' + wc + ' kata)', 'Persingkat menjadi 2-4 kata.')));
    var mi = match(first, kp);
    out.push(mi === 2 ? item(G, 'Frasa kunci ada di paragraf pertama') : (mi === 1 ? item(O, 'Kata-kata frasa kunci ada di paragraf pertama tetapi terpisah', 'Tulis frasa utuh di paragraf pembuka.') : item(B, 'Frasa kunci belum ada di paragraf pertama', P.paras.length ? 'Sebut topik utama langsung di paragraf pembuka.' : 'Artikel belum punya paragraf.')));
    if (P.words < 100) out.push(item(O, 'Kepadatan frasa kunci belum bisa dinilai', 'Teks masih terlalu pendek (<100 kata).'));
    else out.push(n === 0 ? item(B, 'Frasa kunci tidak muncul di isi artikel', 'Gunakan secara alami, target sekitar 0,5-2,5% dari isi.') : (dens > 3 ? item(B, 'Frasa kunci terlalu sering: ' + n + 'x (' + dens.toFixed(1) + '%)', 'Terkesan dipaksakan. Kurangi, target 0,5-2,5%.') : (dens > 2.5 ? item(O, 'Frasa kunci agak sering: ' + n + 'x (' + dens.toFixed(1) + '%)', 'Sedikit dikurangi akan lebih alami.') : (dens < 0.5 ? item(O, 'Frasa kunci jarang: ' + n + 'x (' + dens.toFixed(1) + '%)', 'Boleh ditambah jika wajar, target 0,5-2,5%.') : item(G, 'Kepadatan frasa kunci baik: ' + n + 'x (' + dens.toFixed(1) + '%)')))));
    if (P.words >= 300) {
      var ws = words(P.text), third = Math.ceil(ws.length / 3), hit = 0;
      for (var i = 0; i < 3; i++) if (match(ws.slice(i * third, (i + 1) * third).join(' '), kp)) hit++;
      out.push(hit === 3 ? item(G, 'Frasa kunci tersebar merata di seluruh artikel') : (hit === 2 ? item(O, 'Frasa kunci kurang merata', 'Ada bagian artikel (awal/tengah/akhir) yang tidak menyinggung topik.') : item(B, 'Frasa kunci terkumpul di satu bagian', 'Sebarkan di awal, tengah, dan akhir artikel.')));
    }
    if (P.heads.length) {
      var hh = P.heads.filter(function (h) { return match(h.text, kp); }).length, pct = Math.round(hh / P.heads.length * 100);
      out.push(hh === 0 ? item(B, 'Frasa kunci belum ada di judul bagian (H2/H3)', 'Pakai di sebagian (30-75%) judul bagian.') : (pct > 75 && P.heads.length > 2 ? item(O, 'Frasa kunci ada di ' + pct + '% judul bagian (terlalu banyak)', 'Idealnya 30-75%.') : item(G, 'Frasa kunci ada di judul bagian (' + hh + ' dari ' + P.heads.length + ')')));
    } else out.push(item(O, 'Belum ada judul bagian (H2/H3)', 'Judul bagian memudahkan pembaca dan mesin pencari.'));
    if (P.imgs.length) {
      var ia = P.imgs.filter(function (g) { return match(g.alt, kp); }).length;
      out.push(ia ? item(G, 'Frasa kunci ada di teks alternatif gambar') : item(O, 'Frasa kunci belum ada di teks alternatif gambar', 'Tulis deskripsi gambar yang menyebut topik bila sesuai.'));
    }
    if (main) {
      var mt = match(title, kp), pos = norm(title).indexOf(norm(kp));
      out.push(mt === 2 ? (pos <= 20 ? item(G, 'Frasa kunci ada di awal judul SEO') : item(O, 'Frasa kunci ada di judul SEO, tetapi tidak di awal', 'Lebih kuat bila dekat awal judul.')) : (mt === 1 ? item(O, 'Kata-kata frasa kunci ada di judul SEO tetapi terpisah', 'Tulis frasa utuh.') : item(B, 'Frasa kunci belum ada di judul SEO', 'Masukkan frasa kunci ke judul artikel atau judul SEO.')));
      var md = match(desc, kp);
      out.push(md === 2 ? item(G, 'Frasa kunci ada di meta deskripsi') : (md === 1 ? item(O, 'Kata-kata frasa kunci ada di meta deskripsi tetapi terpisah', 'Tulis frasa utuh.') : item(B, 'Frasa kunci belum ada di meta deskripsi', 'Tulis frasa kunci secara alami di deskripsi.')));
      var ms = match(slug, kp);
      out.push(ms ? item(G, 'Frasa kunci ada di alamat (slug)') : item(O, 'Frasa kunci belum ada di alamat (slug)', 'Opsional. Jangan ubah slug artikel yang sudah terbit tanpa alasan kuat: tautan lama putus.'));
      var used = (EXTRA.used || []).filter(function (u) { return norm(u.keyword) === norm(kp) && u.id !== S.id; });
      out.push(used.length ? item(B, 'Frasa kunci sudah dipakai artikel lain: ' + used[0].title, 'Dua artikel yang bersaing untuk kata kunci sama saling melemahkan. Pilih frasa lain atau gabungkan.') : item(G, 'Frasa kunci belum dipakai artikel lain'));
    }
    return out;
  }

  function seoChecks(S, P) {
    var seo = S.seo, kp = (seo.keyword || '').trim(), out = [];
    var title = seo.title || S.title || '', desc = seo.description || S.excerpt || '';
    if (!kp) out.push(item(B, 'Belum ada kata kunci fokus', 'Isi satu frasa yang ingin dicari orang. Pemeriksaan frasa kunci aktif setelah diisi.'));
    else out = out.concat(keyphraseChecks(S, P, kp, true));
    var tl = title.length;
    out.push(tl === 0 ? item(B, 'Judul SEO kosong', 'Isi judul artikel.') : (tl >= 30 && tl <= 60 ? item(G, 'Panjang judul SEO baik: ' + tl + ' huruf') : item(O, 'Panjang judul SEO: ' + tl + ' huruf', tl < 30 ? 'Agak pendek, idealnya 30-60.' : 'Lebih dari 60 huruf: ujungnya bisa terpotong di hasil pencarian.')));
    var dl = desc.length;
    out.push(dl === 0 ? item(B, 'Meta deskripsi kosong', 'Tanpa deskripsi, mesin pencari memilih potongan teks sendiri.') : (dl >= 120 && dl <= 160 ? item(G, 'Panjang meta deskripsi baik: ' + dl + ' huruf') : item(O, 'Panjang meta deskripsi: ' + dl + ' huruf', dl < 120 ? 'Agak pendek, idealnya 120-160.' : 'Lebih dari 160 huruf: bisa terpotong.')));
    var sl = slugOf(S);
    out.push(sl.length > 75 || sl.split('-').length > 8 ? item(O, 'Alamat (slug) panjang: ' + sl.split('-').length + ' kata', 'Slug ringkas (3-6 kata) lebih mudah dibaca dan dibagikan.') : item(G, 'Panjang alamat (slug) baik'));
    out.push(P.words >= 300 ? item(G, 'Panjang isi: ' + P.words + ' kata') : (P.words >= 200 ? item(O, 'Panjang isi: ' + P.words + ' kata', 'Sedikit di bawah 300 kata.') : item(B, 'Panjang isi: ' + P.words + ' kata', 'Artikel pendek sulit bersaing. Targetkan 300+ kata bila topiknya memang butuh.')));
    out.push(P.links.internal ? item(G, 'Ada tautan internal (' + P.links.internal + ')') : item(B, 'Belum ada tautan internal', 'Tautkan ke artikel/halaman lain di situs ini (program, formulir, artikel terkait).'));
    out.push(P.links.external ? item(G, 'Ada tautan keluar (' + P.links.external + ')') : item(O, 'Belum ada tautan keluar', 'Menautkan ke sumber tepercaya membantu pembaca dan kredibilitas.'));
    out.push(P.imgs.length || S.hero ? item(G, 'Artikel memiliki gambar') : item(B, 'Artikel belum memiliki gambar', 'Tambahkan gambar utama atau gambar di isi.'));
    out.push(seo.image || S.hero ? item(G, seo.image ? 'Ada gambar khusus untuk berbagi' : 'Memakai gambar utama untuk berbagi') : item(B, 'Belum ada gambar untuk berbagi'));
    if (seo.noindex) out.push(item(B, 'Artikel disembunyikan dari mesin pencari (noindex)', 'Matikan opsi noindex agar artikel bisa ditemukan.'));
    return out;
  }

  function readabilityChecks(S, P) {
    var out = [];
    if (P.words < 50) return [item(O, 'Teks terlalu pendek untuk dinilai keterbacaannya', 'Tulis minimal sekitar 50 kata.')];
    var sents = P.sentences, long = sents.filter(function (x) { return words(x).length > 20; }).length, lp = sents.length ? long / sents.length * 100 : 0;
    out.push(lp <= 25 ? item(G, 'Panjang kalimat baik (' + Math.round(lp) + '% lebih dari 20 kata)') : (lp <= 30 ? item(O, Math.round(lp) + '% kalimat lebih dari 20 kata', 'Idealnya tidak lebih dari 25%. Pecah kalimat panjang.') : item(B, Math.round(lp) + '% kalimat lebih dari 20 kata', 'Terlalu banyak kalimat panjang. Targetkan maksimal 25%.')));
    var longP = P.paras.filter(function (x) { return words(x).length > 150; }).length;
    out.push(longP ? item(B, longP + ' paragraf lebih dari 150 kata', 'Pecah menjadi paragraf yang lebih pendek (idealnya 40-120 kata).') : item(G, 'Panjang paragraf baik'));
    var maxSec = Math.max.apply(null, P.sections.concat([0]));
    if (P.words > 300 && !P.heads.length) out.push(item(B, 'Teks panjang tanpa judul bagian', 'Tambahkan judul H2/H3 setiap ~300 kata.'));
    else out.push(maxSec > 350 ? item(B, 'Ada bagian ' + maxSec + ' kata tanpa judul', 'Sisipkan judul bagian setiap 300 kata.') : (maxSec > 300 ? item(O, 'Ada bagian ' + maxSec + ' kata tanpa judul', 'Idealnya maksimal 300 kata per bagian.') : item(G, 'Distribusi judul bagian baik')));
    var run = 1, maxRun = 1, prev = '';
    sents.forEach(function (x) { var w = norm(words(x)[0] || ''); if (w && w === prev) { run++; maxRun = Math.max(maxRun, run); } else run = 1; prev = w; });
    out.push(maxRun >= 3 ? item(B, maxRun + ' kalimat berturut-turut diawali kata yang sama', 'Variasikan awal kalimat.') : item(G, 'Awal kalimat bervariasi'));
    var tr = sents.filter(function (x) { var n = ' ' + norm(x) + ' '; return TRANSITION.some(function (w) { return n.indexOf(' ' + w + ' ') >= 0; }); }).length, tp = sents.length ? tr / sents.length * 100 : 0;
    out.push(tp >= 30 ? item(G, 'Kata transisi dipakai di ' + Math.round(tp) + '% kalimat') : (tp >= 20 ? item(O, 'Kata transisi hanya di ' + Math.round(tp) + '% kalimat', 'Tambahkan penghubung (namun, karena itu, misalnya, selain itu). Target 30%+.') : item(B, 'Kata transisi hanya di ' + Math.round(tp) + '% kalimat', 'Tambahkan penghubung agar alur lebih mengalir. Target 30%+.')));
    var pas = sents.filter(function (x) { return words(x.toLowerCase()).some(function (w) { w = w.replace(/[^a-z]/g, ''); return /^di[a-z]{4,}$/.test(w) && !NOT_PASSIVE.test(w); }); }).length, pp = sents.length ? pas / sents.length * 100 : 0;
    out.push(pp <= 10 ? item(G, 'Kalimat pasif sedikit (perkiraan ' + Math.round(pp) + '%)') : (pp <= 15 ? item(O, 'Perkiraan ' + Math.round(pp) + '% kalimat pasif', 'Kalimat aktif lebih langsung. Penghitungan ini perkiraan untuk bahasa Indonesia.') : item(B, 'Perkiraan ' + Math.round(pp) + '% kalimat pasif', 'Ubah sebagian ke kalimat aktif. Penghitungan ini perkiraan.')));
    return out;
  }

  function aiChecks(S, P) {
    var seo = S.seo, kp = (seo.keyword || '').trim(), out = [], first = P.paras[0] || '', fw = words(first).length;
    out.push(fw >= 20 && fw <= 90 && (!kp || match(first, kp)) ? item(G, 'Paragraf pembuka menjawab langsung (' + fw + ' kata)') : item(O, 'Paragraf pembuka belum berupa jawaban langsung', 'Asisten AI sering mengutip jawaban ringkas di awal. Buka dengan 2-3 kalimat (20-90 kata) yang menjawab pertanyaan utama' + (kp ? ' dan menyebut "' + kp + '"' : '') + '.'));
    var qh = P.heads.filter(function (h) { return QUESTION.test(String(h.text).trim()); }).length + P.faqQs.length;
    out.push(qh >= 2 ? item(G, 'Ada ' + qh + ' judul/pertanyaan berbentuk tanya') : item(O, qh ? 'Baru 1 judul berbentuk pertanyaan' : 'Belum ada judul berbentuk pertanyaan', 'Orang bertanya ke asisten AI dengan kalimat tanya. Judul seperti "Berapa lama anak bisa lancar?" cocok dengan itu.'));
    out.push(P.faq >= 3 ? item(G, 'Blok tanya jawab: ' + P.faq + ' butir (dikirim sebagai data FAQPage)') : item(O, P.faq ? 'Tanya jawab baru ' + P.faq + ' butir' : 'Belum ada blok tanya jawab (FAQ)', 'Tambahkan 3+ pertanyaan nyata dari orang tua/siswa dengan jawaban singkat dan jelas.'));
    var nums = (P.text.match(/\b\d+([.,]\d+)?\s?(%|persen|menit|jam|hari|minggu|bulan|tahun|siswa|kali|x|juta|ribu|rp)?/gi) || []).length;
    out.push(nums >= 3 ? item(G, 'Ada data/angka konkret (' + nums + ')') : item(nums ? O : B, nums ? 'Angka konkret masih sedikit (' + nums + ')' : 'Belum ada angka atau data konkret', 'Riset awal tentang optimasi mesin generatif (Aggarwal dkk., 2023) menemukan statistik dan kutipan sumber meningkatkan peluang dikutip. Tambahkan angka yang benar dan bisa diverifikasi.'));
    var src = P.links.external + P.citedQuotes;
    out.push(src >= 2 ? item(G, 'Merujuk sumber luar (' + src + ')') : item(src ? O : B, src ? 'Baru 1 sumber dirujuk' : 'Belum merujuk sumber atau kutipan', 'Tautkan ke sumber tepercaya (lembaga resmi, penelitian) dan sertakan nama sumber pada kutipan.'));
    out.push(P.lists || P.heads.length >= 3 ? item(G, 'Struktur mudah dipotong (daftar/judul bagian)') : item(O, 'Struktur belum jelas', 'Pakai judul bagian dan daftar poin/nomor agar AI bisa mengambil bagian yang relevan.'));
    var longP = P.paras.filter(function (x) { return words(x).length > 120; }).length;
    out.push(longP ? item(O, longP + ' paragraf lebih dari 120 kata', 'Paragraf yang berdiri sendiri dan ringkas lebih mudah dikutip.') : item(G, 'Paragraf ringkas dan mandiri'));
    var brand = norm(EXTRA.siteName || '');
    out.push(brand && match(P.text, EXTRA.siteName) ? item(G, 'Nama merek disebut di isi artikel') : item(O, 'Nama merek belum disebut di isi artikel', 'Sebut "' + (EXTRA.siteName || 'nama lembaga') + '" secara wajar (mis. di contoh/ajakan) agar AI mengaitkan konten dengan Anda.'));
    out.push(S.author || S.writer ? item(G, 'Penulis tercantum: ' + (S.author || S.writer)) : item(O, 'Penulis belum tercantum', 'Nama penulis nyata meningkatkan kepercayaan.'));
    out.push(S.status === 'published' ? item(G, 'Artikel terbit (tanggal terbit dan "diperbarui" tampil otomatis)', 'Perbarui isi secara berkala; tanggal pembaruan ikut berubah.') : item(O, 'Artikel masih draf', 'Hanya artikel terbit yang bisa dibaca crawler.'));
    out.push(P.imgs.length && P.imgs.every(function (g) { return g.alt.trim(); }) ? item(G, 'Semua gambar punya teks alternatif') : (P.imgs.length ? item(O, 'Ada gambar tanpa teks alternatif', 'Teks alternatif membantu aksesibilitas dan pemahaman AI multimodal.') : item(O, 'Tidak ada gambar di isi artikel')));
    out.push(EXTRA.aiSearch ? item(G, 'robots.txt mengizinkan crawler pencarian AI') : item(B, 'robots.txt memblokir crawler pencarian AI', 'Ubah di menu SEO & AI jika ingin dikutip asisten AI.'));
    out.push(seo.noindex ? item(B, 'Artikel noindex: tidak akan muncul di pencarian', '') : item(G, 'Data terstruktur otomatis: Article, BreadcrumbList' + (P.faq ? ', FAQPage' : '') + '; ada llms.txt & sitemap'));
    return out;
  }

  var COLOR = { good: '#1a7f4b', ok: '#b7791f', bad: '#c53030' };
  function summarize(list) { var c = { good: 0, ok: 0, bad: 0 }; list.forEach(function (x) { c[x.s]++; }); return c; }
  function overall(c) { return c.bad ? (c.bad >= 3 || c.bad > c.good ? 'bad' : 'ok') : (c.ok ? (c.ok > c.good ? 'ok' : 'good') : 'good'); }

  window.ArtSEO = { build: function (S) {
    S.seo = Object.assign({ related: [], title: '', description: '', keyword: '', image: '', canonical: '', noindex: false }, S.seo || {});
    var seo = S.seo; if (!Array.isArray(seo.related)) seo.related = [];
    var serp = el('div', { class: 'serp' }), share = el('div', { class: 'sharecard' }), report = el('div', { class: 'seoreport' });
    var counters = {};
    function counter(name, key, fallback, min, max) {
      var n = el('small', { class: 'muted' });
      counters[name] = function () {
        var len = (seo[key] || fallback()).length;
        n.textContent = len + ' huruf' + (seo[key] ? '' : ' (otomatis)') + ', ideal ' + min + '-' + max;
        n.style.color = len >= min && len <= max ? COLOR.good : (len ? COLOR.ok : COLOR.bad);
      };
      return n;
    }
    function group(title, list, note) {
      var c = summarize(list), st = overall(c);
      var ul = el('ul', { class: 'seolist' });
      var order = { bad: 0, ok: 1, good: 2 };
      list.slice().sort(function (a, b) { return order[a.s] - order[b.s]; }).forEach(function (r) {
        ul.appendChild(el('li', null, el('span', { class: 'dot', 'data-s': r.s, 'aria-hidden': 'true' }), el('span', null, el('strong', { text: r.t }), r.hint ? el('small', { class: 'muted', text: ' ' + r.hint }) : null)));
      });
      return el('details', { class: 'seogrp', open: st !== 'good' ? 'open' : null },
        el('summary', null, el('span', { class: 'dot', 'data-s': st }), el('strong', { text: ' ' + title }), el('span', { class: 'muted', text: ' · ' + c.bad + ' perlu diperbaiki, ' + c.ok + ' bisa ditingkatkan, ' + c.good + ' baik' })),
        note ? el('p', { class: 'muted', text: note }) : null, ul);
    }
    function refresh() {
      var P = parse(S);
      var title = seo.title || S.title || 'Judul artikel';
      var desc = seo.description || S.excerpt || (P.paras[0] || '');
      E.clear(serp);
      serp.appendChild(el('div', { class: 'serp-url', text: location.host + ' › articles › ' + (slugOf(S) || '…') }));
      serp.appendChild(el('div', { class: 'serp-title', text: clip(title, 60) }));
      serp.appendChild(el('div', { class: 'serp-desc', text: clip(desc, 160) || 'Belum ada deskripsi.' }));
      E.clear(share);
      var img = seo.image || S.hero;
      share.appendChild(img ? el('img', { src: img, alt: '' }) : el('div', { class: 'noimg', text: 'Belum ada gambar' }));
      share.appendChild(el('div', { class: 'sharebody' }, el('small', { class: 'muted', text: location.host }), el('strong', { text: clip(title, 70) }), el('span', { text: clip(desc, 110) })));
      E.clear(report);
      report.appendChild(group('SEO', seoChecks(S, P)));
      var rel = seo.related.filter(Boolean);
      if (rel.length) {
        var box = el('div', { class: 'seorel' });
        rel.forEach(function (kp) {
          if (norm(kp) === norm(seo.keyword)) { box.appendChild(el('p', { class: 'muted', text: '"' + kp + '" sama dengan kata kunci fokus, hapus dari daftar terkait.' })); return; }
          box.appendChild(group('Terkait: ' + kp, keyphraseChecks(S, P, kp, false)));
        });
        report.appendChild(el('div', null, el('h4', { text: 'Kata kunci terkait' }), box));
      }
      report.appendChild(group('Keterbacaan', readabilityChecks(S, P), 'Dinilai dari paragraf. Penilaian bahasa Indonesia bersifat perkiraan (kata transisi dan kalimat pasif dideteksi dari daftar kata).'));
      report.appendChild(group('Visibilitas AI (mesin jawab seperti ChatGPT, Gemini, Claude, Perplexity)', aiChecks(S, P), 'Tidak ada yang bisa menjamin sebuah halaman dikutip AI. Ini praktik terbaik dari panduan vendor dan riset awal, bukan skor resmi.'));
      Object.keys(counters).forEach(function (k) { counters[k](); });
    }
    var t = null;
    function later() { clearTimeout(t); t = setTimeout(refresh, 200); }
    var relBox = el('textarea', { rows: '3', maxlength: '400', placeholder: 'satu per baris, maksimal 5', value: seo.related.join('\n'), oninput: function (e) {
      seo.related = e.target.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 5); E.markDirty(); later();
    } });
    var card = el('section', { class: 'card seo' },
      el('h2', { text: 'SEO & visibilitas AI' }),
      el('p', { class: 'muted', text: 'Mengatur bagaimana artikel tampil di Google dan asisten AI, serta saat dibagikan. Kolom yang dikosongkan memakai judul, ringkasan, dan gambar utama artikel.' }),
      E.field('Kata kunci fokus', 'Satu frasa 2-4 kata yang ingin ditemukan orang, mis. "tips belajar speaking anak". Satu frasa per artikel; jangan sama dengan artikel lain.', E.text(seo, 'keyword', 60, 'mis. belajar speaking anak', later)),
      E.field('Kata kunci terkait (opsional, maks 5)', 'Variasi atau subtopik yang juga ingin Anda tembus, mis. "percaya diri berbicara", "latihan di rumah". Masing-masing diperiksa seperti kata kunci fokus.', relBox),
      el('label', { class: 'f' }, el('span', { class: 'fl', text: 'Judul SEO' }), el('small', { text: 'Judul di hasil pencarian. Kosong = judul artikel + nama situs.' }), E.text(seo, 'title', 120, 'otomatis dari judul', later), counter('t', 'title', function () { return S.title || ''; }, 30, 60)),
      el('label', { class: 'f' }, el('span', { class: 'fl', text: 'Meta deskripsi' }), el('small', { text: 'Cuplikan di bawah judul pada hasil pencarian. Kosong = ringkasan artikel.' }), E.area(seo, 'description', 300, 3, 'otomatis dari ringkasan'), counter('d', 'description', function () { return S.excerpt || ''; }, 120, 160)),
      el('div', { class: 'f' }, el('span', { class: 'fl', text: 'Gambar untuk berbagi (media sosial, WhatsApp)' }), el('small', { text: 'Ideal 1200x630 (1,91:1). Kosong = gambar utama artikel.' }),
        E.picker(seo, 'image', { ratio: 1200 / 630, ratioLabel: '1,91:1', outWidth: 1200, title: 'Gambar untuk berbagi' }, 'wide')),
      E.field('Canonical URL (opsional)', 'Isi hanya bila artikel ini salinan dari halaman lain, mis. https://situs-lain.com/artikel-asli. Kosong = alamat artikel ini.', E.text(seo, 'canonical', 300, 'https://')),
      el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: seo.noindex ? 'checked' : null, onchange: function (e) { seo.noindex = e.target.checked; E.markDirty(); later(); } }), ' Sembunyikan dari mesin pencari (noindex)'),
      el('h3', { text: 'Pratinjau hasil pencarian' }), serp,
      el('h3', { text: 'Pratinjau saat dibagikan' }), share,
      el('h3', { text: 'Analisis' }), report);
    refresh();
    var root = document.getElementById('editor');
    ['input', 'change', 'click'].forEach(function (ev) { root.addEventListener(ev, later, true); });
    return card;
  } };
})();
