<?php
/** Halaman formulir (layout "Halaman"): memakai tampilan yang sama dengan artikel untuk saat ini. */
declare(strict_types=1);
require dirname(__DIR__) . '/articles/_boot.php';

try {
    db()->query('SELECT 1 FROM forms LIMIT 1');
} catch (Throwable) {
    try {
        en_create_forms_tables(db());
    } catch (Throwable $e) {
        error_log('form page: ' . $e->getMessage());
    }
}
$slug = strtolower((string) ($_GET['slug'] ?? ''));
$f = preg_match('/^[a-z0-9][a-z0-9-]{0,80}$/', $slug) ? form_get_by_slug($slug) : null;
if (!$f || $f['layout'] !== 'page') {
    http_response_code(404);
    art_open('Formulir tidak ditemukan · ' . art_site()['name'], 'Formulir tidak ditemukan.', '', null, '', ['robots' => 'noindex,follow']);
    ?>
<section class="empty">
  <h1>Formulir tidak ditemukan</h1>
  <p>Alamatnya mungkin salah atau formulir belum diterbitkan.</p>
  <p><a class="btn" href="/">Kembali ke beranda</a></p>
</section>
<?php
    art_close();
    exit;
}
$def = form_public_def($f);
$title = $def['texts']['kids']['title'] ?: $f['name'];
art_open($f['name'] . ' · ' . art_site()['name'], $def['texts']['kids']['intro'] ?: $title, (string) $def['photo'], null, 'page-article', ['type' => 'website', 'robots' => seo_form_indexable($f['slug']) ? 'index,follow,max-image-preview:large' : 'noindex,follow', 'canonical' => art_base_url() !== '' ? art_base_url() . '/form/' . $f['slug'] : '']);
?>
<article class="art">
  <div class="enf-page" data-enf-mount="<?= h($f['slug']) ?>"><noscript>Aktifkan JavaScript untuk mengisi formulir ini.</noscript></div>
</article>
<?php art_close();
