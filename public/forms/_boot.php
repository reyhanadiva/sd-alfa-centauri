<?php
/** Dipakai endpoint formulir publik: memuat pustaka panel (tanpa sesi login kecuali untuk pratinjau). */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    define('EN_PANEL', true);
}
$lib = dirname(__DIR__) . '/edizon/lib';
require_once $lib . '/bootstrap.php';
require_once $lib . '/sanitize.php';
require_once $lib . '/content.php';
require_once $lib . '/settings.php';
require_once $lib . '/articles.php';
require_once $lib . '/forms.php';

function forms_json(array $body, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    db();
    try {
        db()->query('SELECT 1 FROM forms LIMIT 1');
    } catch (Throwable) {
        en_create_settings_tables(db());
        en_create_forms_tables(db());
    }
} catch (Throwable $e) {
    error_log('forms db: ' . $e->getMessage());
    forms_json(['ok' => false, 'error' => 'db'], 503);
}

function forms_site_wa(): string
{
    try {
        $s = doc_get('site');
        if (is_array($s) && !empty($s['waNumber'])) {
            return preg_replace('/\D/', '', (string) $s['waNumber']) ?? '';
        }
    } catch (Throwable) {
    }
    $f = dirname(__DIR__) . '/edizon/lib/seed/social.json';
    $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : [];
    return is_array($d) ? (string) ($d['wa'] ?? '') : '';
}
