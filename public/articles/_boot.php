<?php
/** Dipakai halaman publik artikel: memuat pustaka panel (hanya baca) tanpa sesi login. */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    define('EN_PANEL', true);
}
$lib = dirname(__DIR__) . '/edizon/lib';
require_once $lib . '/bootstrap.php';
require_once $lib . '/sanitize.php';
require_once $lib . '/content.php';
require_once $lib . '/articles.php';
require_once $lib . '/settings.php';
require_once $lib . '/forms.php';
require_once $lib . '/popups.php';
require_once $lib . '/quizzes.php';
require_once $lib . '/seo.php';
require_once __DIR__ . '/_render.php';

if (!defined('ART_PREVIEW')) {
    try {
        db();
        try {
            db()->query('SELECT 1 FROM articles LIMIT 1');
        } catch (Throwable) {
            en_create_articles_tables(db()); // pertama kali: tabel dibuat otomatis (panel juga melakukannya)
        }
    } catch (Throwable $e) {
        error_log('articles db: ' . $e->getMessage());
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Artikel sedang tidak bisa dimuat. Coba lagi sebentar lagi.';
        exit;
    }
}
