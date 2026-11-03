<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $in = [
        'allowIndexing' => isset($_POST['allowIndexing']),
        'smHome' => isset($_POST['smHome']), 'smList' => isset($_POST['smList']), 'smArticles' => isset($_POST['smArticles']),
        'sitemapForms' => (array) ($_POST['smForms'] ?? []),
        'home' => ['title' => (string) ($_POST['h_title'] ?? ''), 'description' => (string) ($_POST['h_description'] ?? ''), 'keyword' => (string) ($_POST['h_keyword'] ?? ''),
            'image' => (string) ($_POST['h_image'] ?? ''), 'canonical' => (string) ($_POST['h_canonical'] ?? '')],
        'aiSearch' => isset($_POST['aiSearch']), 'aiUser' => isset($_POST['aiUser']), 'aiTraining' => isset($_POST['aiTraining']),
        'summary' => (string) ($_POST['summary'] ?? ''), 'links' => [], 'authorGuide' => (string) ($_POST['authorGuide'] ?? ''),
    ];
    foreach ((array) ($_POST['l_label'] ?? []) as $i => $label) {
        $in['links'][] = ['label' => (string) $label, 'url' => (string) ($_POST['l_url'][$i] ?? ''), 'desc' => (string) ($_POST['l_desc'][$i] ?? '')];
    }
    [$clean, $errs] = validate_seo_settings($in);
    if ($errs) {
        flash_set('err', implode(' ', $errs));
    } else {
        try {
            seo_save($clean);
            seo_cache_clear();
            $pub = seo_publish_home($clean);
            audit((int) $u['id'], 'seo_save', 'seo');
            if ($pub) {
                flash_set('ok', 'Pengaturan SEO & AI disimpan. Berlaku dalam beberapa menit (robots.txt, sitemap, dan llms.txt disimpan sementara hingga 5 menit).');
            } else {
                flash_set('err', 'Tersimpan, tetapi berkas SEO beranda (data/home-seo.json) tidak bisa ditulis. Periksa izin folder data.');
            }
        } catch (Throwable $e) {
            error_log('seo save: ' . $e->getMessage());
            flash_set('err', 'Gagal menyimpan. Periksa koneksi database.');
        }
    }
    redirect('seo.php');
}

$s = seo_settings();
$links = $s['links'];
while (count($links) < 3) {
    $links[] = ['label' => '', 'url' => '', 'desc' => ''];
}
$bots = seo_ai_bots();
$pageForms = [];
try {
    $pageForms = array_values(array_filter(forms_all(), static fn($f) => $f['layout'] === 'page' && $f['status'] === 'published'));
} catch (Throwable) {
}
$boot = ['csrf' => csrf_token(), 'image' => $s['home']['image'], 'keyword' => $s['home']['keyword'], 'host' => (string) ($_SERVER['HTTP_HOST'] ?? '')];
page_head('SEO & AI', $u, 'wide');
?>
<div class="bar"><h1>SEO &amp; visibilitas AI (seluruh situs)</h1></div>
<div id="errors" class="errors" hidden></div>
<p class="muted">Tiga berkas dibuat otomatis dari data situs dan selalu mutakhir: <code>/robots.txt</code>, <code>/sitemap.xml</code>, dan <code>/llms.txt</code> (+ <code>/llms-full.txt</code> berisi seluruh artikel). SEO per artikel diatur di editor artikel.</p>
<form method="post" action="seo.php">
  <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
  <div class="card">
    <h2>Izinkan mesin pencari mengindeks situs ini</h2>
    <label class="chk"><input type="checkbox" name="allowIndexing"<?= $s['allowIndexing'] ? ' checked' : '' ?>> <span><strong>Situs ini terbuka untuk Google dan mesin pencari lain</strong>. <?= $s['allowIndexing'] ? 'Saat ini: <strong>DIBUKA</strong>.' : 'Saat ini: <strong>TERTUTUP</strong>: beranda, artikel, dan formulir diberi <code>noindex</code>, robots.txt menolak semua crawler, sitemap dan llms.txt kosong.' ?></span></label>
    <p class="muted">Biarkan tertutup selama situs masih beta. Centang saat situs sudah resmi (produksi). Catatan: <code>noindex</code> mencegah halaman muncul di hasil pencarian; ini bukan perlindungan keamanan, halaman tetap bisa dibuka oleh yang tahu alamatnya.</p>
  </div>
  <div class="card seo">
    <h2>Beranda</h2>
    <p class="muted">Judul, deskripsi, dan gambar berbagi untuk halaman utama. Kosong = memakai teks bawaan dari build. Data terstruktur Organisasi dan Situs ditambahkan otomatis (nama, logo, dan tautan media sosial dari menu Footer).</p>
    <label class="f"><span class="fl">Kata kunci fokus (opsional)</span><small>Hanya untuk pemeriksaan di bawah. Mis. "kursus bahasa inggris jakarta".</small><input type="text" id="h_keyword" name="h_keyword" maxlength="60" value="<?= h($s['home']['keyword']) ?>"></label>
    <label class="f"><span class="fl">Judul SEO</span><small>Ideal 30-60 huruf.</small><input type="text" id="h_title" name="h_title" maxlength="120" value="<?= h($s['home']['title']) ?>" placeholder="bawaan: SD Alfa Centauri | Sekolah Dasar di Bandung"><small class="muted" id="h_title_n"></small></label>
    <label class="f"><span class="fl">Meta deskripsi</span><small>Ideal 120-160 huruf.</small><textarea id="h_description" name="h_description" rows="3" maxlength="300" placeholder="bawaan dari build"><?= h($s['home']['description']) ?></textarea><small class="muted" id="h_desc_n"></small></label>
    <div class="f"><span class="fl">Gambar untuk berbagi (1200x630)</span><small>Tampil saat tautan beranda dibagikan di WhatsApp/media sosial.</small><div id="h_image_mount"></div><input type="hidden" id="h_image" name="h_image" value="<?= h($s['home']['image']) ?>"></div>
    <label class="f"><span class="fl">Canonical (opsional)</span><small>Kosong = alamat beranda ini. Isi hanya bila beranda sebenarnya ada di alamat lain.</small><input type="text" name="h_canonical" maxlength="300" value="<?= h($s['home']['canonical']) ?>" placeholder="https://"></label>
    <h3>Pratinjau pencarian</h3><div class="serp" id="h_serp"></div>
    <ul class="seolist" id="h_checks"></ul>
  </div>
  <div class="card">
    <h2>Sitemap: halaman mana yang ditawarkan ke mesin pencari</h2>
    <p class="muted">Sitemap adalah daftar halaman yang ANDA ingin diindeks. Ia tidak melarang crawler membuka halaman lain, dan halaman yang tidak ada di sana tetap bisa muncul bila ditautkan. Untuk mencegah muncul di hasil pencarian, pakai <code>noindex</code> (artikel: kotak noindex di editor SEO; formulir: diatur di bawah).</p>
    <label class="chk"><input type="checkbox" name="smHome"<?= $s['sitemap']['home'] ? ' checked' : '' ?>> <span>Beranda</span></label>
    <label class="chk"><input type="checkbox" name="smList"<?= $s['sitemap']['list'] ? ' checked' : '' ?>> <span>Daftar artikel (<code>/articles/</code>)</span></label>
    <label class="chk"><input type="checkbox" name="smArticles"<?= $s['sitemap']['articles'] ? ' checked' : '' ?>> <span>Semua artikel terbit yang tidak ditandai noindex</span></label>
    <h3>Formulir berbentuk halaman</h3>
    <p class="muted">Bawaan: formulir TIDAK muncul di hasil pencarian dan TIDAK ada di sitemap (halaman diberi <code>noindex</code>). Pengunjung tetap datang lewat tautan, iklan, atau WhatsApp. Centang hanya formulir yang memang ingin ditemukan lewat Google. Formulir pop-up tidak pernah diindeks.</p>
    <?php if (!$pageForms): ?><p class="muted">Belum ada formulir halaman yang diterbitkan.</p><?php endif; ?>
    <?php foreach ($pageForms as $pf): ?>
    <label class="chk"><input type="checkbox" name="smForms[]" value="<?= h($pf['slug']) ?>"<?= in_array($pf['slug'], $s['sitemap']['forms'], true) ? ' checked' : '' ?>> <span><?= h($pf['name']) ?> <code>/form/<?= h($pf['slug']) ?></code></span></label>
    <?php endforeach; ?>
  </div>
  <div class="card">
    <h2>Izin crawler AI (robots.txt)</h2>
    <p class="muted">Mengizinkan = konten Anda bisa dibaca dan dikutip asisten AI. Memblokir = tidak. Mesin pencari biasa (Google, Bing) tidak terpengaruh. Daftar nama bot dari sumber publik dan bisa berubah; periksa dokumentasi tiap vendor untuk keputusan penting.</p>
    <label class="chk"><input type="checkbox" name="aiSearch"<?= $s['aiSearch'] ? ' checked' : '' ?>> <span><strong>Pencarian AI</strong>: mengindeks untuk jawaban/pencarian AI (<?= h(implode(', ', $bots['search'])) ?>). Sangat memengaruhi apakah Anda bisa muncul sebagai sumber.</span></label>
    <label class="chk"><input type="checkbox" name="aiUser"<?= $s['aiUser'] ? ' checked' : '' ?>> <span><strong>Akses atas permintaan pengguna</strong>: saat seseorang meminta asisten membuka halaman Anda (<?= h(implode(', ', $bots['user'])) ?>).</span></label>
    <label class="chk"><input type="checkbox" name="aiTraining"<?= $s['aiTraining'] ? ' checked' : '' ?>> <span><strong>Pelatihan model AI</strong>: pengumpulan data untuk melatih model (<?= h(implode(', ', $bots['training'])) ?>). Tidak langsung menentukan kutipan, tetapi memengaruhi seberapa "kenal" model dengan merek Anda. Silakan blokir jika tidak berkenan.</span></label>
  </div>
  <div class="card">
    <h2>Panduan SEO &amp; kepatuhan untuk penulis artikel</h2>
    <p class="muted">Teks ini tampil di atas editor artikel untuk Super Admin dan Admin (Humas). Tulis aturan yang harus dipatuhi penulis. Kosong = memakai panduan bawaan di bawah.</p>
    <label class="f"><span class="fl">Panduan</span><textarea name="authorGuide" rows="12" maxlength="4000" placeholder="<?= h(seo_author_guide_default()) ?>"><?= h($s['authorGuide']) ?></textarea></label>
  </div>
  <div class="card">
    <h2>Ringkasan untuk AI (llms.txt)</h2>
    <label class="f"><span class="fl">Siapa Anda dalam 1-2 kalimat</span><small>Kosong = memakai tagline situs. Tulis fakta: apa layanannya, untuk siapa, di kota mana. Maks 400 huruf.</small>
      <textarea name="summary" rows="3" maxlength="400"><?= h($s['summary']) ?></textarea></label>
    <h3>Halaman penting tambahan</h3>
    <p class="muted">Muncul di llms.txt di bawah "Halaman utama" (mis. harga, lokasi, kebijakan). Artikel dan formulir halaman ditambahkan otomatis.</p>
    <?php foreach ($links as $l): ?>
    <div class="row">
      <label class="f"><span class="fl">Nama</span><input type="text" name="l_label[]" maxlength="80" value="<?= h($l['label']) ?>"></label>
      <label class="f"><span class="fl">Alamat</span><input type="text" name="l_url[]" maxlength="300" value="<?= h($l['url']) ?>" placeholder="/#biaya atau https://…"></label>
      <label class="f"><span class="fl">Keterangan singkat</span><input type="text" name="l_desc[]" maxlength="160" value="<?= h($l['desc']) ?>"></label>
    </div>
    <?php endforeach; ?>
    <small class="muted">Butuh lebih dari 3? Simpan dulu, tiga baris kosong baru muncul lagi. Nama kosong = baris diabaikan.</small>
  </div>
  <div class="savebar"><button class="btn" type="submit">Simpan</button></div>
</form>
<div class="card">
  <h2>Pasang di hosting (nanti, saat produksi)</h2>
  <p class="muted">Selama beta ini <strong>tidak perlu</strong>: situs tertutup untuk mesin pencari. Saat produksi, ada dua hal yang dikerjakan sekali:</p>
  <ol class="muted">
    <li><strong>Beranda</strong>: file <code>index.php</code> di folder utama menyajikan beranda dengan SEO dari panel. Biasanya cPanel memilih <code>index.php</code> sebelum <code>index.html</code>, jadi tidak perlu apa-apa. Periksa dengan tombol di bawah. Bila hasilnya "belum aktif", tambahkan <code>DirectoryIndex index.php index.html</code> ke <code>.htaccess</code> di folder utama.</li>
    <li><strong>robots.txt, sitemap.xml, llms.txt</strong>: tambahkan baris ini ke <code>.htaccess</code> di folder utama (jangan hapus isi lama, tempel di paling atas setelah <code>RewriteEngine On</code> bila sudah ada):</li>
  </ol>
  <pre class="code">RewriteEngine On
RewriteRule ^robots\.txt$ seo/robots.php [L]
RewriteRule ^sitemap\.xml$ seo/sitemap.php [L]
RewriteRule ^llms\.txt$ seo/llms.php [L]
RewriteRule ^llms-full\.txt$ seo/llms.php?full=1 [L,QSA]</pre>
  <p class="muted">Lalu buka ketiga alamat itu di browser, daftarkan sitemap di Google Search Console dan Bing Webmaster Tools, dan centang "Izinkan mesin pencari" di atas.</p>
  <button type="button" class="btn ghost sm" id="home-check">Periksa apakah beranda sudah memakai SEO ini</button> <span class="muted" id="home-check-r"></span>
</div>
<script type="application/json" id="boot"><?= json_for_html($boot) ?></script>
<?php page_foot(['picker.js', 'ed.js', 'seo-page.js']);
