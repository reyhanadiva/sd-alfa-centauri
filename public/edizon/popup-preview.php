<?php
/**
 * Pratinjau pop-up (termasuk draf) untuk pengguna panel. Memakai data yang SUDAH DISIMPAN. Pemicu otomatis tidak dijalankan.
 * ?rev=R : pratinjau satu versi lama dari riwayat (tidak mengubah apa pun).
 */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
popups_ensure();
$p = popup_get((int) ($_GET['id'] ?? 0));
if (!$p) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Pop-up tidak ditemukan.';
    exit;
}
$rev = (int) ($_GET['rev'] ?? 0);
if ($rev > 0) {
    $state = rev_get('popup', (int) $p['id'], $rev);
    [$row, $rerr] = $state ? rev_popup_row($state, $u, (int) $p['id']) : [null, ['Versi tidak ditemukan.']];
    if (!$row) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Versi ini tidak bisa ditampilkan: ' . implode(' ', $rerr);
        exit;
    }
    $p = $row;
}
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self'; script-src 'self'; frame-src 'self' https:; frame-ancestors 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'");
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
$json = json_for_html(popup_public_def($p, popup_frame_panel((int) $p['id'], $rev)));
$bare = isset($_GET['bare']);
$back = '<a href="/edizon/popup.php?id=' . (int) $p['id'] . '">Kembali ke editor</a>';
$label = ($rev > 0 ? 'Pratinjau VERSI LAMA #' . $rev . ' (belum dikembalikan)' : 'Pratinjau' . ($p['status'] === 'draft' ? ' (draf, belum terlihat publik)' : '')) . ' · pemicu otomatis tidak dijalankan';
?>
<!doctype html>
<html lang="id" data-audience="kids">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pratinjau: <?= h($p['name']) ?></title>
<link rel="stylesheet" href="/forms/forms.css">
<link rel="stylesheet" href="/forms/popups.css?v=3">
<?php if (!$bare): ?>
<link rel="stylesheet" href="/forms/popup-preview.css">
<?php endif; ?>
<?php if ($bare): ?>
<script src="/forms/popup.js" defer></script>
<script src="/forms/popups.js?v=12" defer></script>
<?php endif; ?>
<script src="/forms/popup-preview.js" defer></script>
</head>
<?php if ($bare): ?>
<body class="enf-blankpage enp-previewbody" data-bare="1">
<script type="application/json" id="enp-def"><?= $json ?></script>
</body>
<?php else: ?>
<body class="enp-previewshell">
<div class="enf-previewbar"><?= h($label) ?> · <?= $back ?> ·
  <button type="button" data-aud="kids" class="on">Anak &amp; Remaja</button><button type="button" data-aud="adult">Dewasa &amp; Bisnis</button> ·
  <button type="button" data-dev="desktop" class="on">Desktop</button><button type="button" data-dev="mobile">HP (390 px)</button> ·
  <button type="button" id="enp-reopen">Buka pop-up lagi</button></div>
<div class="enp-stage"><iframe id="enp-frame" title="Pratinjau pop-up" src="popup-preview.php?id=<?= (int) $p['id'] ?>&amp;bare=1<?= $rev > 0 ? '&amp;rev=' . $rev : '' ?>"></iframe></div>
</body>
<?php endif; ?>
</html>
