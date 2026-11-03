<?php
/**
 * Riwayat versi untuk artikel, pop-up, dan kuis: setiap kali disimpan, isi editor SAAT ITU disimpan sebagai satu versi
 * (30 terakhir per item). Panel menampilkan daftarnya, pratinjau, dan mengembalikan versi lama ke editor.
 * Yang disimpan adalah bentuk data editor (persis yang dikirim ke browser), bukan kolom basis data, supaya mengembalikan cukup memuatnya lagi.
 * Dipakai panel (edizon/). Website publik tidak menyentuhnya.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const REV_KEEP = 30;
const REV_KINDS = ['article' => 'artikel', 'popup' => 'pop-up', 'quiz' => 'kuis'];

function en_create_revisions_table(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS item_revisions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        kind VARCHAR(12) NOT NULL,
        item_id INT UNSIGNED NOT NULL,
        data MEDIUMTEXT NOT NULL,
        hash CHAR(40) NOT NULL,
        title VARCHAR(160) NOT NULL DEFAULT '',
        summary VARCHAR(200) NOT NULL DEFAULT '',
        saved_at DATETIME NOT NULL,
        saved_by INT UNSIGNED NULL,
        KEY ix_rev_item (kind, item_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function revisions_ensure(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->query('SELECT 1 FROM item_revisions LIMIT 1');
    } catch (Throwable) {
        en_create_revisions_table(db());
    }
}

/** isi versi: JSON, dimampatkan bila zlib ada (blok HTML dan artikel panjang cepat membesar) */
function rev_pack(array $state): string
{
    $json = (string) json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if (function_exists('gzcompress')) {
        $z = gzcompress($json, 6);
        if ($z !== false) {
            return 'z:' . base64_encode($z);
        }
    }
    return 'j:' . $json;
}

function rev_unpack(string $data): ?array
{
    $json = null;
    if (str_starts_with($data, 'z:') && function_exists('gzuncompress')) {
        $raw = base64_decode(substr($data, 2), true);
        $json = $raw === false ? false : @gzuncompress($raw, 20000000);
    } elseif (str_starts_with($data, 'j:')) {
        $json = substr($data, 2);
    }
    if (!is_string($json)) {
        return null;
    }
    $d = json_decode($json, true);
    return is_array($d) ? $d : null;
}

/** jumlah blok, termasuk yang di dalam kolom */
function rev_count_blocks(mixed $blocks): int
{
    $n = 0;
    foreach (is_array($blocks) ? $blocks : [] as $b) {
        if (!is_array($b)) {
            continue;
        }
        $n++;
        foreach (is_array($b['cols'] ?? null) ? $b['cols'] : [] as $col) {
            $n += rev_count_blocks($col);
        }
    }
    return $n;
}

/** satu baris ringkasan untuk daftar versi */
function rev_summary(string $kind, array $s): string
{
    $parts = [];
    if ($kind === 'quiz') {
        $q = 0;
        foreach (is_array($s['sets'] ?? null) ? $s['sets'] : [] as $set) {
            $q += count(is_array($set['questions'] ?? null) ? $set['questions'] : []);
        }
        $r = is_array($s['results'] ?? null) ? $s['results'] : [];
        $b = 0;
        foreach ($r as $x) {
            $b += rev_count_blocks($x['blocks'] ?? []);
        }
        $parts[] = $q . ' soal';
        $parts[] = count($r) . ' halaman hasil (' . $b . ' blok)';
    } else {
        $parts[] = rev_count_blocks($s['blocks'] ?? []) . ' blok';
    }
    $parts[] = ($s['status'] ?? '') === 'published' ? 'terbit' : 'draf';
    return implode(' · ', $parts);
}

function rev_title(string $kind, array $s): string
{
    $t = (string) ($kind === 'article' ? ($s['title'] ?? '') : ($s['name'] ?? ''));
    return function_exists('mb_substr') ? mb_substr($t, 0, 160) : substr($t, 0, 160);
}

/**
 * Simpan isi editor sebagai versi baru. Tidak pernah melempar galat: gagal mencatat riwayat tidak boleh menggagalkan penyimpanan.
 * Isi yang sama persis dengan versi terbaru tidak dicatat dua kali.
 * @param array $state bentuk data editor (art_to_editor / popup_to_editor / quiz_to_editor)
 */
function rev_snapshot(string $kind, int $itemId, array $state, ?int $userId): void
{
    if (!isset(REV_KINDS[$kind]) || $itemId < 1) {
        return;
    }
    try {
        revisions_ensure();
        $pdo = db();
        $packed = rev_pack($state);
        $hash = sha1($packed);
        $st = $pdo->prepare('SELECT hash FROM item_revisions WHERE kind = ? AND item_id = ? ORDER BY id DESC LIMIT 1');
        $st->execute([$kind, $itemId]);
        if ($st->fetchColumn() === $hash) {
            return;
        }
        $pdo->prepare('INSERT INTO item_revisions (kind, item_id, data, hash, title, summary, saved_at, saved_by) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$kind, $itemId, $packed, $hash, rev_title($kind, $state), rev_summary($kind, $state), now_utc(), $userId]);
        // simpan REV_KEEP terakhir saja
        $st = $pdo->prepare('SELECT id FROM item_revisions WHERE kind = ? AND item_id = ? ORDER BY id DESC LIMIT 1 OFFSET ' . (REV_KEEP - 1));
        $st->execute([$kind, $itemId]);
        $edge = $st->fetchColumn();
        if ($edge !== false) {
            $pdo->prepare('DELETE FROM item_revisions WHERE kind = ? AND item_id = ? AND id < ?')->execute([$kind, $itemId, (int) $edge]);
        }
    } catch (Throwable $e) {
        error_log('revision snapshot: ' . $e->getMessage());
    }
}

/** @return list<array{id:int,saved_at:string,saved_by_name:?string,title:string,summary:string}> terbaru dulu, tanpa isi */
function rev_list(string $kind, int $itemId): array
{
    if (!isset(REV_KINDS[$kind]) || $itemId < 1) {
        return [];
    }
    revisions_ensure();
    $st = db()->prepare('SELECT r.id, r.saved_at, r.title, r.summary, u.name AS saved_by_name FROM item_revisions r LEFT JOIN users u ON u.id = r.saved_by WHERE r.kind = ? AND r.item_id = ? ORDER BY r.id DESC LIMIT ' . REV_KEEP);
    $st->execute([$kind, $itemId]);
    $out = [];
    foreach ($st->fetchAll() as $r) {
        $out[] = ['id' => (int) $r['id'], 'saved_at' => (string) $r['saved_at'], 'saved_by_name' => $r['saved_by_name'] !== null ? (string) $r['saved_by_name'] : null,
            'title' => (string) $r['title'], 'summary' => (string) $r['summary']];
    }
    return $out;
}

/** isi satu versi (bentuk data editor), atau null */
function rev_get(string $kind, int $itemId, int $revId): ?array
{
    if (!isset(REV_KINDS[$kind]) || $itemId < 1 || $revId < 1) {
        return null;
    }
    revisions_ensure();
    $st = db()->prepare('SELECT data FROM item_revisions WHERE id = ? AND kind = ? AND item_id = ?');
    $st->execute([$revId, $kind, $itemId]);
    $d = $st->fetchColumn();
    return is_string($d) ? rev_unpack($d) : null;
}

/** item dihapus: riwayatnya ikut dihapus (tanpa $itemId: semua riwayat jenis itu) */
function rev_purge(string $kind, ?int $itemId = null): void
{
    try {
        revisions_ensure();
        if ($itemId === null) {
            db()->prepare('DELETE FROM item_revisions WHERE kind = ?')->execute([$kind]);
        } else {
            db()->prepare('DELETE FROM item_revisions WHERE kind = ? AND item_id = ?')->execute([$kind, $itemId]);
        }
    } catch (Throwable $e) {
        error_log('revision purge: ' . $e->getMessage());
    }
}

/**
 * Isi versi pop-up / kuis diubah ke bentuk "baris tersimpan" yang dibaca pratinjau, lewat validasi yang sama dengan penyimpanan.
 * @return array{0: ?array, 1: string[]} [baris, galat]
 */
function rev_popup_row(array $state, array $user, int $id): array
{
    [$clean, $errs] = validate_popup($state, $user, $id);
    if ($errs) {
        return [null, $errs];
    }
    return [['id' => $id, 'slug' => $clean['slug'], 'name' => $clean['name'], 'status' => $clean['status'], 'cfg' => popup_cfg_merge($clean['cfg'])], []];
}

function rev_quiz_row(array $state, array $user, int $id): array
{
    [$clean, $errs] = validate_quiz($state, $user, $id);
    if ($errs) {
        return [null, $errs];
    }
    return [['id' => $id, 'slug' => $clean['slug'], 'name' => $clean['name'], 'status' => $clean['status'], 'zapier_form_id' => $clean['zapier_form_id'],
        'zapier_form_name' => $clean['zapier_form_name'], 'cfg' => quiz_cfg_merge($clean['cfg'])], []];
}
