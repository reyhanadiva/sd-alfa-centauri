<?php
/** Dipakai di awal setiap halaman panel. */
declare(strict_types=1);

define('EN_PANEL', true);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';
require_once __DIR__ . '/media.php';
require_once __DIR__ . '/sanitize.php';
require_once __DIR__ . '/articles.php';
require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/forms.php';
require_once __DIR__ . '/popups.php';
require_once __DIR__ . '/quizzes.php';
require_once __DIR__ . '/revisions.php';
require_once __DIR__ . '/templates.php';
require_once __DIR__ . '/seo.php';
require_once __DIR__ . '/view.php';

panel_headers();

if (cfg('db_name', '') === '' || cfg('db_user', '') === '') {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Panel belum dikonfigurasi.\nIsi db_host, db_name, db_user, db_pass dan setup_token di en-config.php (komputer sendiri) atau api/config.php (server).";
    exit;
}

try {
    db();
} catch (Throwable $e) {
    error_log('panel db: ' . $e->getMessage());
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Tidak bisa terhubung ke database.\nPastikan MySQL menyala dan db_host/db_name/db_user/db_pass benar.";
    exit;
}
migrate_schema(db());
start_session();
