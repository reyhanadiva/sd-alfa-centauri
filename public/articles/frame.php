<?php
/**
 * Bingkai untuk blok HTML (artikel yang sudah terbit). Dipanggil dari <iframe sandbox> di halaman artikel:
 *   /articles/frame.php?id=<id artikel>&b=<id blok>
 * Hanya artikel yang sudah terbit yang dilayani; selain itu 404. Kodenya disajikan dengan kebijakan keamanan sendiri
 * (lihat art_frame_csp di edizon/lib/articles.php): tanpa allow-same-origin, jadi tidak bisa membaca halaman induk atau data situs.
 */
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$id = (int) ($_GET['id'] ?? 0);
$bid = (string) ($_GET['b'] ?? '');
$b = null;
if ($id > 0 && preg_match('/^[a-z0-9]{4,12}$/', $bid) === 1) {
    try {
        $a = art_get_published($id);
    } catch (Throwable $e) {
        error_log('article frame: ' . $e->getMessage());
        $a = null;
    }
    $b = $a ? art_find_html_block($a, $bid) : null;
}
if ($b === null) {
    art_frame_missing();
}
art_frame_send((string) $b['code'], !empty($b['scripts']), 'public, max-age=60');
