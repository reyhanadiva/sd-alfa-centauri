<?php
/**
 * Dokumen konten situs SD Alfa Centauri: simpan, riwayat, validasi, dan terbitkan ke content.json.
 * (Bagian yang khusus per situs: kunci dokumen, validator per section, publish_content().)
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/sanitize.php';

/** dokumen konten yang punya halaman editor: kunci => judul di panel (urutan = urutan di beranda). Diisi per section di Fase B. */
const SECTION_TITLES = [];
/** menu "Homepage content" di panel: berkas halaman => label (urutan = urutan di beranda). Diisi per section di Fase B. */
const SECTION_PAGES = [];
/** berkas halaman editor => kunci dokumen utamanya (untuk kartu "terakhir diubah" di Beranda) */
const SECTION_KEYS = [];
const SITE_TITLES = ['site' => 'Pengaturan situs'];

/** ikon media sosial populer (dipakai editor Footer di Fase B). "custom" = ikon unggahan sendiri. */
const SOCIAL_KEYS = [
    'instagram' => 'Instagram', 'tiktok' => 'TikTok', 'youtube' => 'YouTube', 'facebook' => 'Facebook', 'x' => 'X (Twitter)',
    'linkedin' => 'LinkedIn', 'whatsapp' => 'WhatsApp', 'telegram' => 'Telegram', 'threads' => 'Threads', 'pinterest' => 'Pinterest',
    'spotify' => 'Spotify', 'line' => 'LINE', 'snapchat' => 'Snapchat', 'discord' => 'Discord',
];

/** validator per dokumen (untuk memulihkan versi lama di Riwayat): fn(array): array{0: array, 1: string[]} */
function doc_validator(string $key): ?callable
{
    if ($key === 'site') {
        return 'validate_site';
    }
    return null; // validator per section ditambahkan di Fase B
}

/** semua dokumen konten (untuk riwayat), urutan = urutan di website */
function doc_titles_all(): array
{
    return SECTION_TITLES + SITE_TITLES;
}

/* ------------------------------------------------------------------ */
/* Penyimpanan                                                         */
/* ------------------------------------------------------------------ */

function doc_get(string $key): ?array
{
    $st = db()->prepare('SELECT data FROM content_docs WHERE doc_key = ?');
    $st->execute([$key]);
    $raw = $st->fetchColumn();
    if ($raw === false) {
        return null;
    }
    $d = json_decode((string) $raw, true);
    return is_array($d) ? $d : null;
}

function doc_meta(string $key): ?array
{
    $st = db()->prepare('SELECT d.updated_at, u.name AS updated_by_name FROM content_docs d LEFT JOIN users u ON u.id = d.updated_by WHERE d.doc_key = ?');
    $st->execute([$key]);
    $r = $st->fetch();
    return $r ?: null;
}

function doc_save(string $key, array $data, ?int $userId, string $note = ''): void
{
    $pdo = db();
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $now = now_utc();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO content_docs (doc_key, data, updated_at, updated_by) VALUES (?, ?, ?, ?)
                       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)')
            ->execute([$key, $json, $now, $userId]);
        $pdo->prepare('INSERT INTO content_revisions (doc_key, data, saved_at, saved_by, note) VALUES (?, ?, ?, ?, ?)')
            ->execute([$key, $json, $now, $userId, mb_substr($note, 0, 120)]);
        // simpan maksimal 50 riwayat terakhir per dokumen
        $old = $pdo->prepare('SELECT id FROM content_revisions WHERE doc_key = ? ORDER BY id DESC LIMIT 1 OFFSET 50');
        $old->execute([$key]);
        $cut = $old->fetchColumn();
        if ($cut !== false) {
            $pdo->prepare('DELETE FROM content_revisions WHERE doc_key = ? AND id <= ?')->execute([$key, $cut]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function doc_revisions(string $key, int $limit = 20): array
{
    $st = db()->prepare('SELECT r.id, r.saved_at, r.note, u.name AS saved_by_name FROM content_revisions r
                         LEFT JOIN users u ON u.id = r.saved_by WHERE r.doc_key = ? ORDER BY r.id DESC LIMIT ' . (int) $limit);
    $st->execute([$key]);
    return $st->fetchAll();
}

function doc_revision_data(int $id, string $key): ?array
{
    $st = db()->prepare('SELECT data FROM content_revisions WHERE id = ? AND doc_key = ?');
    $st->execute([$id, $key]);
    $raw = $st->fetchColumn();
    if ($raw === false) {
        return null;
    }
    $d = json_decode((string) $raw, true);
    return is_array($d) ? $d : null;
}

/** tulis content.json (dibaca website). Ditulis atomik supaya pengunjung tidak pernah melihat file setengah jadi. */
function publish_content(): string
{
    $out = ['version' => 1, 'updated' => gmdate('c')];
    foreach (doc_titles_all() as $key => $_title) {
        $d = doc_get($key);
        $out[$key] = $d !== null ? $d : new stdClass();
    }

    $dir = data_dir();
    ensure_dir($dir);
    $final = $dir . '/content.json';
    $tmp = $dir . '/content.json.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false || @file_put_contents($tmp, $json, LOCK_EX) === false) {
        throw new RuntimeException('Tidak bisa menulis content.json');
    }
    if (!@rename($tmp, $final)) {
        if (!@copy($tmp, $final)) {
            @unlink($tmp);
            throw new RuntimeException('Tidak bisa memperbarui content.json');
        }
        @unlink($tmp);
    }
    return $final;
}

/* ------------------------------------------------------------------ */
/* Pembersihan & validasi                                              */
/* ------------------------------------------------------------------ */

function clean_text(mixed $v, int $max): string
{
    $s = is_string($v) ? $v : '';
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}

function clean_multiline(mixed $v, int $max): string
{
    $s = is_string($v) ? $v : '';
    $s = str_replace(["\r\n", "\r"], "\n", $s);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}

function clean_id(mixed $v): string
{
    $s = is_string($v) ? $v : '';
    return preg_match('/^[A-Za-z0-9_-]{1,24}$/', $s) ? $s : '';
}

/** @return string[] */
function clean_tags(mixed $v, int $maxCount, int $maxLen): array
{
    $list = is_array($v) ? $v : [];
    $out = [];
    foreach ($list as $t) {
        $t = clean_text($t, $maxLen);
        $t = ltrim($t, "# \t");
        if ($t !== '' && !in_array($t, $out, true)) {
            $out[] = $t;
        }
        if (count($out) >= $maxCount) {
            break;
        }
    }
    return $out;
}

/** jalur gambar yang boleh dipakai: file bawaan website atau hasil unggahan panel */
function valid_image_path(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    if ($s === '') {
        return '';
    }
    if (preg_match('#^/(?:uploads|images|brand)/[A-Za-z0-9_./-]{1,200}$#', $s) && strpos($s, '..') === false && strpos($s, '//') === false) {
        return $s;
    }
    return null;
}

/** gambar yang boleh dipakai di artikel/formulir/pop-up/foto: berkas situs, unggahan panel, atau foto contoh Unsplash/Pexels */
function teacher_photo(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    if ($s !== '' && preg_match('#^https://(?:images\.unsplash\.com|images\.pexels\.com)/[A-Za-z0-9_./?&=%-]{1,300}$#', $s)) {
        return $s;
    }
    return valid_image_path($s);
}

/** isi bawaan sebuah dokumen (dari seed yang dibuat otomatis dari src/content/id.ts + en.ts oleh scripts/export-seed.mjs) */
function seed_doc(string $key): array
{
    $seed = json_decode((string) @file_get_contents(__DIR__ . '/seed/content.json'), true);
    return is_array($seed) && is_array($seed[$key] ?? null) ? $seed[$key] : [];
}

function clean_link(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    if (preg_match('/^(?:\[form:([A-Za-z0-9-]{1,60})\]|#form:([A-Za-z0-9-]{1,60}))$/', $s, $fm)) {
        return '#form:' . strtolower($fm[1] !== '' ? $fm[1] : $fm[2]); // tautan ke formulir pop-up
    }
    if (preg_match('/^(?:\[popup:([A-Za-z0-9-]{1,60})\]|#popup:([A-Za-z0-9-]{1,60}))$/', $s, $pm)) {
        return '#popup:' . strtolower($pm[1] !== '' ? $pm[1] : $pm[2]); // tautan ke pop-up
    }
    if (preg_match('/^(?:\[quiz:([A-Za-z0-9-]{1,60})\]|#quiz:([A-Za-z0-9-]{1,60}))$/', $s, $qm)) {
        return '#quiz:' . strtolower($qm[1] !== '' ? $qm[1] : $qm[2]); // tautan ke kuis
    }
    if ($s === '' || mb_strlen($s) > 300 || preg_match('/\s/u', $s) || !preg_match('#^https?://[^/\s]+#i', $s)) {
        return null;
    }
    $p = parse_url($s);
    return ($p !== false && !empty($p['host'])) ? $s : null;
}

function normalize_wa(mixed $v): ?string
{
    $d = preg_replace('/\D/', '', is_string($v) ? $v : '') ?? '';
    if ($d === '') {
        return null;
    }
    if (str_starts_with($d, '0')) {
        $d = '62' . substr($d, 1);
    } elseif (str_starts_with($d, '8')) {
        $d = '62' . $d;
    }
    return strlen($d) >= 9 && strlen($d) <= 15 ? $d : null;
}

/** @return array{0: array, 1: string[]} pengaturan situs */
function validate_site(array $in): array
{
    $errors = [];
    $name = clean_text($in['name'] ?? '', 40);
    if ($name === '') {
        $errors[] = 'Nama situs wajib diisi.';
        $name = 'SD Alfa Centauri';
    }
    $tag = clean_text($in['tagline'] ?? '', 100);
    if ($tag === '') {
        $errors[] = 'Tagline wajib diisi.';
    }
    $wa = normalize_wa($in['waNumber'] ?? '');
    if ($wa === null) {
        $errors[] = 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890 atau +62 812 3456 7890 (9 sampai 15 angka).';
        $wa = '';
    }
    $out = ['name' => $name, 'tagline' => $tag, 'waNumber' => $wa];
    foreach (['logoFull' => 'Logo lengkap', 'logoWhite' => 'Logo lengkap (putih)', 'logoMark' => 'Logo simbol', 'favicon' => 'Ikon tab'] as $k => $label) {
        $p = valid_image_path($in[$k] ?? '');
        if ($p === null) {
            $errors[] = "$label: gambar tidak valid. Pilih atau unggah lewat panel.";
            $p = '';
        }
        $out[$k] = $p;
    }
    return [$out, $errors];
}
