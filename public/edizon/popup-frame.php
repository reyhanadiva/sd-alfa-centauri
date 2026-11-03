<?php
/**
 * Bingkai blok HTML dari pop-up yang sudah disimpan, untuk pengguna panel yang sudah masuk (halaman Pratinjau pop-up).
 *   GET ?id=<id pop-up>&b=<id blok>
 * (Kode yang sedang diketik di editor dan belum disimpan dikirim ke article-frame.php, sama seperti blok HTML artikel.)
 * Disajikan dengan kebijakan keamanan sendiri (art_frame_csp), jadi bukan bagian dari halaman panel.
 */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
popups_ensure();

$bid = (string) ($_GET['b'] ?? '');
$p = preg_match('/^[a-z0-9]{4,12}$/', $bid) === 1 ? popup_get((int) ($_GET['id'] ?? 0)) : null;
if ($p && (int) ($_GET['rev'] ?? 0) > 0) { // a block of an older version (revision preview)
    $state = rev_get('popup', (int) $p['id'], (int) $_GET['rev']);
    $p = $state ? rev_popup_row($state, $u, (int) $p['id'])[0] : null;
}
$b = $p ? popup_find_html_block((array) $p['cfg']['blocks'], $bid) : null;
if ($b === null) {
    art_frame_missing();
}
art_frame_send((string) $b['code'], !empty($b['scripts']));
