<?php
/**
 * Inti panel: konfigurasi, database, sesi, header keamanan, fungsi bantu.
 * File ini hanya berisi fungsi (tidak mencetak apa pun) dan tidak bisa dijalankan langsung.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

mb_internal_encoding('UTF-8');
date_default_timezone_set('UTC'); // semua waktu disimpan UTC, ditampilkan sebagai WIB

const PANEL_VERSION = '2.5';

/**
 * Konfigurasi. Dicari di:
 *  - api/config.php (di server, satu file dengan URL webhook Zapier), atau
 *  - en-config.php di folder proyek (saat uji di komputer sendiri).
 */
function cfg(?string $key = null, mixed $default = null): mixed
{
    static $config = null;
    if ($config === null) {
        $config = [];
        foreach ([dirname(__DIR__, 2) . '/api/config.php', dirname(__DIR__, 3) . '/en-config.php'] as $file) {
            if (is_file($file)) {
                $loaded = require $file;
                if (is_array($loaded)) {
                    $config = $loaded;
                    break;
                }
            }
        }
    }
    return $key === null ? $config : ($config[$key] ?? $default);
}

/** folder yang diakses pengunjung sebagai "/" (berisi index.html, panel/, api/) */
function docroot(): string
{
    return dirname(__DIR__, 2);
}

/** tempat data yang dibuat panel (gambar unggahan & content.json). Default: di dalam docroot. */
function storage_dir(): string
{
    $dir = (string) cfg('storage_dir', '');
    return $dir !== '' ? rtrim(str_replace('\\', '/', $dir), '/') : docroot();
}
function uploads_dir(): string
{
    return storage_dir() . '/uploads';
}
function data_dir(): string
{
    return storage_dir() . '/data';
}

/** buat folder + kunci agar file PHP di dalamnya tidak pernah dijalankan dan isi folder tidak bisa didaftar */
function ensure_dir(string $dir): void
{
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $ht = $dir . '/.htaccess';
    if (is_dir($dir) && !is_file($ht)) {
        @file_put_contents(
            $ht,
            "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|php[0-9])$\">\n  <IfModule mod_authz_core.c>\n    Require all denied\n  </IfModule>\n  <IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n  </IfModule>\n</FilesMatch>\n"
        );
    }
}

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
}

function now_utc(): string
{
    return gmdate('Y-m-d H:i:s');
}

/** tampilkan waktu UTC sebagai waktu Indonesia Barat */
function fmt_time(?string $utc): string
{
    if (!$utc) {
        return '-';
    }
    try {
        $d = new DateTimeImmutable($utc, new DateTimeZone('UTC'));
        return $d->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('d/m/Y H:i') . ' WIB';
    } catch (Throwable) {
        return '-';
    }
}

function new_id(): string
{
    return bin2hex(random_bytes(4));
}

/** koneksi database (PDO). Gagal koneksi dilempar sebagai PDOException. */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $host = (string) cfg('db_host', '127.0.0.1');
    $port = (int) cfg('db_port', 3306);
    $name = (string) cfg('db_name', '');
    $user = (string) cfg('db_user', '');
    $pass = (string) cfg('db_pass', '');
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $user, $pass, $opts);
    } catch (PDOException $e) {
        // khusus uji lokal: buat database otomatis kalau belum ada
        if ((int) $e->getCode() === 1049 && cfg('db_autocreate') === true && $name !== '') {
            $root = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, $opts);
            $root->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '', $name) . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            $pdo = new PDO($dsn, $user, $pass, $opts);
        } else {
            throw $e;
        }
    }
    return $pdo;
}

/** header keamanan untuk semua halaman panel */
function panel_headers(): void
{
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: https://images.unsplash.com; style-src 'self'; script-src 'self'; frame-src 'self' https://maps.google.com https://www.google.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    header('X-Robots-Tag: noindex, nofollow');
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('enpanel');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/edizon/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();
}

function redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

function json_out(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function flash_set(string $type, string $msg): void
{
    $_SESSION['flash'] = ['type' => $type, 'msg' => $msg];
}

function flash_get(): ?array
{
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return is_array($f) ? $f : null;
}

/** JSON aman untuk ditaruh di dalam <script type="application/json"> */
function json_for_html(mixed $data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_PARTIAL_OUTPUT_ON_ERROR) ?: '{}';
}
