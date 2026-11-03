<?php
/** Struktur database + data awal. Aman dijalankan berulang (tidak menimpa data yang sudah ada). */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

// definisi tabel pendaftar dipakai bersama oleh relay formulir (api/trial.php) dan panel
require_once __DIR__ . '/../../api/leads-schema.php';

function create_tables(PDO $pdo): void
{
    $opt = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('admin','editor','customer_service') NOT NULL DEFAULT 'editor',
        password_hash VARCHAR(255) NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        last_login_at DATETIME NULL,
        UNIQUE KEY uq_users_email (email)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        email VARCHAR(190) NOT NULL,
        attempted_at DATETIME NOT NULL,
        KEY ix_attempt_ip (ip, attempted_at),
        KEY ix_attempt_email (email, attempted_at)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS content_docs (
        doc_key VARCHAR(60) NOT NULL PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by INT UNSIGNED NULL
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS content_revisions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        doc_key VARCHAR(60) NOT NULL,
        data LONGTEXT NOT NULL,
        saved_at DATETIME NOT NULL,
        saved_by INT UNSIGNED NULL,
        note VARCHAR(120) NOT NULL DEFAULT '',
        KEY ix_rev_doc (doc_key, saved_at)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS media (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(255) NOT NULL,
        original_name VARCHAR(190) NOT NULL,
        mime VARCHAR(40) NOT NULL,
        width INT UNSIGNED NOT NULL,
        height INT UNSIGNED NOT NULL,
        bytes INT UNSIGNED NOT NULL,
        uploaded_by INT UNSIGNED NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_media_path (path)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS audit_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        action VARCHAR(40) NOT NULL,
        detail VARCHAR(255) NOT NULL DEFAULT '',
        ip VARCHAR(45) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        KEY ix_audit_time (created_at)
    ) $opt");
    en_create_leads_table($pdo);
    en_create_articles_tables($pdo);
    en_create_settings_tables($pdo);
    en_create_forms_tables($pdo);
    en_create_popups_table($pdo);
    en_create_quizzes_tables($pdo);
    en_create_seo_tables($pdo);
}

/**
 * Menyesuaikan database yang sudah ada dengan versi terbaru (aman dijalankan berulang):
 *  - peran "customer_service" pada tabel users
 *  - tabel trial_leads (pendaftar free trial)
 * Dipanggil di setiap permintaan panel; gagal diam-diam (dicatat di log) kalau hak akses database kurang.
 */
function migrate_schema(PDO $pdo): void
{
    try {
        if (!$pdo->query("SHOW TABLES LIKE 'users'")->fetchColumn()) {
            return; // pengaturan awal belum dijalankan; setup.php membuat semuanya
        }
        $st = $pdo->query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'");
        $type = (string) $st->fetchColumn();
        if ($type !== '' && stripos($type, 'customer_service') === false) {
            $pdo->exec("ALTER TABLE users MODIFY role ENUM('admin','editor','customer_service') NOT NULL DEFAULT 'editor'");
        }
        en_create_leads_table($pdo);
        en_create_articles_tables($pdo);
        en_create_settings_tables($pdo);
        en_create_forms_tables($pdo);
        en_create_popups_table($pdo);
        en_create_quizzes_tables($pdo);
        en_create_seo_tables($pdo);
        // dokumen yang belum ada di database: isi dengan data bawaan website (tidak menimpa yang sudah ada)
        $keys = array_keys(doc_titles_all());
        $in = implode(',', array_fill(0, count($keys), '?'));
        $st = $pdo->prepare("SELECT COUNT(*) FROM content_docs WHERE doc_key IN ($in)");
        $st->execute($keys);
        if ((int) $st->fetchColumn() < count($keys)) {
            seed_defaults($pdo);
        }
    } catch (Throwable $e) {
        error_log('panel migrate: ' . $e->getMessage());
    }
}

/** isi dokumen yang belum ada dengan isi awal (diambil dari website saat ini) */
function seed_defaults(PDO $pdo): int
{
    $file = __DIR__ . '/seed/content.json';
    if (!is_file($file)) {
        return 0;
    }
    $seed = json_decode((string) file_get_contents($file), true);
    if (!is_array($seed)) {
        return 0;
    }
    $added = 0;
    $has = $pdo->prepare('SELECT 1 FROM content_docs WHERE doc_key = ?');
    $ins = $pdo->prepare('INSERT INTO content_docs (doc_key, data, updated_at, updated_by) VALUES (?, ?, ?, NULL)');
    foreach ($seed as $key => $data) {
        if (!is_string($key) || !is_array($data)) {
            continue;
        }
        $has->execute([$key]);
        if (!$has->fetchColumn()) {
            $ins->execute([$key, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now_utc()]);
            $added++;
        }
    }
    return $added;
}
