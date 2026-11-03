<?php
/** Login, sesi, token CSRF, batas percobaan login, catatan aktivitas. */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const SESSION_IDLE_SECONDS = 7200;      // keluar otomatis setelah 2 jam tidak aktif
const SESSION_MAX_SECONDS = 43200;      // dan paling lama 12 jam sejak login
const LOGIN_MAX_PER_EMAIL = 5;          // percobaan gagal per email dalam 15 menit
const LOGIN_MAX_PER_IP = 20;            // percobaan gagal per alamat IP dalam 15 menit
const MIN_PASSWORD_LENGTH = 10;

function audit(?int $userId, string $action, string $detail = ''): void
{
    try {
        $st = db()->prepare('INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)');
        $st->execute([$userId, substr($action, 0, 40), mb_substr($detail, 0, 255), client_ip(), now_utc()]);
    } catch (Throwable) {
        // catatan aktivitas tidak boleh menggagalkan pekerjaan utama
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf'];
}

/** pastikan permintaan POST membawa token yang benar (form: _csrf, AJAX: header X-CSRF-Token) */
function csrf_require(): void
{
    $sent = (string) ($_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Sesi formulir kedaluwarsa. Muat ulang halaman lalu coba lagi.';
        exit;
    }
}

function current_user(): ?array
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    $cache = null;
    $uid = (int) ($_SESSION['uid'] ?? 0);
    if ($uid <= 0) {
        return null;
    }
    $now = time();
    if ($now - (int) ($_SESSION['last_seen'] ?? 0) > SESSION_IDLE_SECONDS || $now - (int) ($_SESSION['login_at'] ?? 0) > SESSION_MAX_SECONDS) {
        logout_session();
        return null;
    }
    $st = db()->prepare('SELECT id, email, name, role, active FROM users WHERE id = ?');
    $st->execute([$uid]);
    $u = $st->fetch();
    if (!$u || (int) $u['active'] !== 1) {
        logout_session();
        return null;
    }
    $_SESSION['last_seen'] = $now;
    $cache = $u;
    return $u;
}

function logout_session(): void
{
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}

function require_login(): array
{
    $u = current_user();
    if (!$u) {
        redirect('login.php');
    }
    return $u;
}

function deny_access(string $message): never
{
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

function require_admin(): array
{
    $u = require_login();
    if (!is_admin($u)) {
        deny_access('Halaman ini hanya untuk Super Admin.');
    }
    return $u;
}

/** halaman pengubah konten website: Super Admin dan Admin (Humas) */
function require_content_editor(): array
{
    $u = require_login();
    if (!can_edit_content($u)) {
        deny_access('Halaman ini hanya untuk Super Admin dan Admin.');
    }
    return $u;
}

/** data kiriman formulir: hanya Super Admin (data pribadi pendaftar) */
function require_leads_access(): array
{
    $u = require_login();
    if (!can_view_leads($u)) {
        deny_access('Halaman ini hanya untuk Super Admin.');
    }
    return $u;
}

/** peran yang dikenal: nilai di database => nama tampilan */
/* nilai database dipertahankan dari baseline (admin/editor) supaya skema tidak berubah:
   admin = Super Admin (semua akses), editor = Admin (Humas: konten, artikel, pop-up; tanpa pengguna, pengaturan, SEO & AI) */
const ROLES = [
    'admin' => 'Super Admin',
    'editor' => 'Admin (Humas)',
];

function role_label(string $role): string
{
    return ROLES[$role] ?? $role;
}

function is_admin(array $u): bool
{
    return ($u['role'] ?? '') === 'admin';
}

function can_edit_content(array $u): bool
{
    return in_array($u['role'] ?? '', ['admin', 'editor'], true);
}

function can_view_leads(array $u): bool
{
    return ($u['role'] ?? '') === 'admin';
}

/** @return array{ok:bool, error?:string} */
function attempt_login(string $email, string $password): array
{
    $email = mb_strtolower(trim($email));
    $ip = client_ip();
    $pdo = db();
    $since = gmdate('Y-m-d H:i:s', time() - 900);

    $c1 = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND attempted_at > ?');
    $c1->execute([$email, $since]);
    $c2 = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > ?');
    $c2->execute([$ip, $since]);
    if ((int) $c1->fetchColumn() >= LOGIN_MAX_PER_EMAIL || (int) $c2->fetchColumn() >= LOGIN_MAX_PER_IP) {
        audit(null, 'login_blocked', $email);
        return ['ok' => false, 'error' => 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'];
    }

    $st = $pdo->prepare('SELECT id, password_hash, active FROM users WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();
    // selalu menjalankan verifikasi supaya waktu respons tidak membocorkan apakah email terdaftar
    $hash = $u ? (string) $u['password_hash'] : '$2y$10$VxK4gtIrVlTq5iq5at4pRunOeWa836T4zYVJbGcc4v6gsm6HrgLJ6';
    $valid = password_verify($password, $hash);

    if (!$u || !$valid || (int) $u['active'] !== 1) {
        $pdo->prepare('INSERT INTO login_attempts (ip, email, attempted_at) VALUES (?, ?, ?)')->execute([$ip, $email, now_utc()]);
        audit($u ? (int) $u['id'] : null, 'login_failed', $email);
        return ['ok' => false, 'error' => 'Email atau kata sandi salah.'];
    }

    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
    }
    $pdo->prepare('DELETE FROM login_attempts WHERE email = ?')->execute([$email]);
    $pdo->prepare('UPDATE users SET last_login_at = ? WHERE id = ?')->execute([now_utc(), $u['id']]);

    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    $_SESSION['login_at'] = time();
    $_SESSION['last_seen'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    audit((int) $u['id'], 'login', '');

    // bersihkan catatan percobaan lama
    $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < ?')->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
    return ['ok' => true];
}

/** @return string|null pesan kesalahan, atau null kalau kata sandi layak */
function password_problem(string $pw): ?string
{
    if (mb_strlen($pw) < MIN_PASSWORD_LENGTH) {
        return 'Kata sandi minimal ' . MIN_PASSWORD_LENGTH . ' karakter.';
    }
    if (!preg_match('/\pL/u', $pw) || !preg_match('/\d/', $pw)) {
        return 'Kata sandi harus mengandung huruf dan angka.';
    }
    return null;
}

function valid_email(string $e): bool
{
    return strlen($e) <= 190 && (bool) filter_var($e, FILTER_VALIDATE_EMAIL);
}
