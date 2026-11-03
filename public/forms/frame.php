<?php
/**
 * Bingkai untuk blok HTML di pop-up yang sudah terbit. Dipanggil dari <iframe sandbox> yang dibuat popups.js:
 *   /forms/frame.php?p=<alamat pop-up>&b=<id blok>
 * Hanya pop-up berstatus Terbit yang dilayani; selain itu 404. Kodenya TIDAK ada di data/popups.json (supaya setiap halaman tidak ikut mengunduhnya)
 * dan disajikan dengan kebijakan keamanan sendiri (lihat art_frame_csp di edizon/lib/articles.php): tanpa allow-same-origin.
 */
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require_once dirname(__DIR__) . '/edizon/lib/popups.php';

$slug = strtolower((string) ($_GET['p'] ?? ''));
$bid = (string) ($_GET['b'] ?? '');
$b = null;
if (preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $slug) === 1 && preg_match('/^[a-z0-9]{4,12}$/', $bid) === 1) {
    try {
        $p = popup_get_by_slug($slug);
    } catch (Throwable $e) {
        error_log('popup frame: ' . $e->getMessage());
        $p = null;
    }
    $b = $p && $p['status'] === 'published' ? popup_find_html_block((array) $p['cfg']['blocks'], $bid) : null;
}
if ($b === null) {
    art_frame_missing();
}
art_frame_send((string) $b['code'], !empty($b['scripts']), 'public, max-age=60');
