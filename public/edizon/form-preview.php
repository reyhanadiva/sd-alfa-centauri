<?php
/** Pratinjau formulir (termasuk draf) untuk pengguna panel yang sudah masuk. Memakai data yang SUDAH DISIMPAN. */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
define('ART_PREVIEW', true);
require dirname(__DIR__) . '/articles/_boot.php';
$f = form_get((int) ($_GET['id'] ?? 0));
if (!$f) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Formulir tidak ditemukan.';
    exit;
}
header('Cache-Control: no-store');
$def = form_public_def($f);
$json = json_for_html($def);
$label = 'Pratinjau' . ($f['status'] === 'draft' ? ' (draf, belum terlihat publik)' : '') . ' · data tidak dikirim';
$back = '<a href="/edizon/form.php?id=' . (int) $f['id'] . '">Kembali ke editor</a>';

if ($f['layout'] === 'page') {
    art_open($f['name'] . ' · ' . art_site()['name'], $def['texts']['kids']['intro'] ?: $f['name'], '', null, 'page-article');
    ?>
<div class="previewbar"><?= h($label) ?> · <?= $back ?></div>
<article class="art">
  <div class="enf-page" data-enf-preview="1"></div>
</article>
<script type="application/json" id="enf-def"><?= $json ?></script>
<script src="/forms/preview.js"></script>
<?php
    art_close();
    exit;
}
// pop-up: halaman kosong dengan pop-up langsung terbuka
header('Content-Type: text/html; charset=utf-8');
header('Content-Security-Policy: ' . art_csp());
header('X-Content-Type-Options: nosniff');
?>
<!doctype html>
<html lang="id" data-audience="kids">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pratinjau: <?= h($f['name']) ?></title>
<link rel="stylesheet" href="/forms/forms.css">
<script src="/forms/popup.js" defer></script>
</head>
<body class="enf-blankpage">
<div class="enf-previewbar"><?= h($label) ?> · <?= $back ?> · <button type="button" data-set="kids" class="on">Anak &amp; Remaja</button><button type="button" data-set="adult">Dewasa &amp; Bisnis</button><button type="button" id="enf-reopen">Buka pop-up lagi</button></div>
<script type="application/json" id="enf-def"><?= $json ?></script>
<script src="/forms/preview.js" defer></script>
</body>
</html>
