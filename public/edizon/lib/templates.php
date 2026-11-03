<?php
/**
 * Templat blok: kumpulan blok (satu blok, atau seluruh halaman) yang disimpan untuk dipakai lagi di artikel, pop-up, dan halaman hasil kuis.
 * Satu daftar dipakai bersama oleh ketiga editor. Isi templat dicuci oleh validator yang SAMA dengan penyimpanan artikel / pop-up / hasil kuis,
 * jadi templat tidak bisa menyimpan sesuatu yang tidak boleh ada di halaman. Blok yang belum lengkap (gambar belum dipilih, tombol tanpa tujuan, teks kosong)
 * tidak ikut disimpan dan dilaporkan. Blok HTML hanya bisa disimpan Admin, dan hanya Admin yang menerimanya saat menyisipkan.
 * Dipakai panel (edizon/). Website publik tidak menyentuhnya.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const TPL_MAX = 200;                 // jumlah templat
const TPL_MAX_BYTES = 400000;        // isi satu templat (JSON)
const TPL_MODES = ['article' => 'artikel', 'popup' => 'pop-up', 'result' => 'halaman hasil'];

function en_create_templates_table(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS block_templates (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        mode VARCHAR(10) NOT NULL,
        data MEDIUMTEXT NOT NULL,
        block_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        has_html TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        created_by INT UNSIGNED NULL,
        KEY ix_tpl_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function templates_ensure(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->query('SELECT 1 FROM block_templates LIMIT 1');
    } catch (Throwable) {
        en_create_templates_table(db());
    }
}

function tpl_clean_name(mixed $v): string
{
    return clean_text($v, 80);
}

/** hapus id blok (templat dipakai berkali-kali: setiap penyisipan memberi id baru), sampai ke dalam kolom */
function tpl_strip_ids(array $blocks): array
{
    $out = [];
    foreach ($blocks as $b) {
        if (!is_array($b)) {
            continue;
        }
        unset($b['id']);
        if (is_array($b['cols'] ?? null)) {
            $b['cols'] = array_map(static fn($c) => tpl_strip_ids(is_array($c) ? $c : []), array_values($b['cols']));
        }
        $out[] = $b;
    }
    return $out;
}

function tpl_has_html(array $blocks): bool
{
    foreach ($blocks as $b) {
        if (is_array($b) && ($b['t'] ?? '') === 'html') {
            return true;
        }
    }
    return false;
}

/** buang blok HTML (bukan Admin tidak boleh menerimanya); mengembalikan [blok, jumlah yang dibuang]. HTML tidak bisa berada di dalam kolom. */
function tpl_without_html(array $blocks): array
{
    $out = [];
    $n = 0;
    foreach ($blocks as $b) {
        if (is_array($b) && ($b['t'] ?? '') === 'html') {
            $n++;
            continue;
        }
        $out[] = $b;
    }
    return [$out, $n];
}

/**
 * Cuci blok untuk disimpan sebagai templat, dengan aturan editor asalnya ($mode). Hanya yang lolos yang dikembalikan.
 * @return array{0: array, 1: int, 2: string[]} [blok, jumlah yang tidak ikut, alasan]
 */
function tpl_validate_blocks(mixed $raw, string $mode, bool $admin): array
{
    $raw = is_array($raw) ? array_values($raw) : [];
    if ($mode === 'article') {
        [$blocks, $errors] = art_validate_blocks($raw, $admin);
    } else {
        $o = $mode === 'result' ? ['extra' => ['score', 'sections'], 'vars' => true, 'what' => 'halaman hasil'] : [];
        [$blocks, $errors] = popup_validate_blocks($raw, $admin, $o);
    }
    $blocks = tpl_strip_ids($blocks);
    $dropped = max(0, rev_count_blocks($raw) - rev_count_blocks($blocks));
    return [$blocks, $dropped, array_values(array_unique($errors))];
}

function tpl_row_out(array $r, array $u): array
{
    $mine = $r['created_by'] !== null && (int) $r['created_by'] === (int) $u['id'];
    return [
        'id' => (int) $r['id'], 'name' => (string) $r['name'], 'mode' => (string) $r['mode'], 'count' => (int) $r['block_count'], 'html' => (int) $r['has_html'] === 1,
        'by' => ($r['by_name'] ?? null) !== null ? (string) $r['by_name'] : 'Sistem', 'at' => fmt_time((string) $r['created_at']),
        'can' => $mine || is_admin($u),
    ];
}

/** @return list<array> tanpa isi, urut nama */
function tpl_list(array $u): array
{
    templates_ensure();
    $rows = db()->query('SELECT t.id, t.name, t.mode, t.block_count, t.has_html, t.created_at, t.created_by, u.name AS by_name FROM block_templates t LEFT JOIN users u ON u.id = t.created_by ORDER BY LOWER(t.name) ASC, t.id ASC LIMIT ' . TPL_MAX)->fetchAll();
    return array_map(static fn($r) => tpl_row_out($r, $u), $rows);
}

function tpl_find(int $id): ?array
{
    templates_ensure();
    $st = db()->prepare('SELECT t.*, u.name AS by_name FROM block_templates t LEFT JOIN users u ON u.id = t.created_by WHERE t.id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ?: null;
}

/**
 * Templat siap disisipkan ke editor milik $u: blok HTML dibuang bila bukan Admin.
 * @return array{id:int,name:string,mode:string,blocks:array,htmlSkipped:int}|null
 */
function tpl_get(int $id, array $u): ?array
{
    $r = tpl_find($id);
    if (!$r) {
        return null;
    }
    $d = json_decode((string) $r['data'], true);
    $blocks = is_array($d) ? array_values($d) : [];
    $skipped = 0;
    if (!is_admin($u)) {
        [$blocks, $skipped] = tpl_without_html($blocks);
    }
    return ['id' => (int) $r['id'], 'name' => (string) $r['name'], 'mode' => (string) $r['mode'], 'blocks' => $blocks, 'htmlSkipped' => $skipped];
}

function tpl_name_taken(string $name, int $exceptId = 0): bool
{
    $st = db()->prepare('SELECT id FROM block_templates WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1');
    $st->execute([$name, $exceptId]);
    return $st->fetchColumn() !== false;
}

/**
 * Simpan templat baru dari blok editor.
 * @return array{0: ?array, 1: string[], 2: array} [baris untuk daftar, galat, info {kept, dropped, notes}]
 */
function tpl_save(array $in, array $u): array
{
    templates_ensure();
    $name = tpl_clean_name($in['name'] ?? '');
    $mode = (string) ($in['mode'] ?? '');
    $errs = [];
    if ($name === '') {
        $errs[] = 'Beri nama templat.';
    }
    if (!isset(TPL_MODES[$mode])) {
        $errs[] = 'Jenis editor tidak dikenal.';
    }
    if ($errs) {
        return [null, $errs, []];
    }
    [$blocks, $dropped, $notes] = tpl_validate_blocks($in['blocks'] ?? [], $mode, is_admin($u));
    $kept = rev_count_blocks($blocks);
    if ($kept < 1) {
        return [null, array_merge(['Tidak ada blok yang bisa disimpan. Blok yang kosong atau belum lengkap tidak ikut.'], array_slice($notes, 0, 3)), []];
    }
    $json = (string) json_encode($blocks, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if (strlen($json) > TPL_MAX_BYTES) {
        return [null, ['Templat terlalu besar (maksimal ' . (int) (TPL_MAX_BYTES / 1000) . ' KB). Simpan sebagian halaman saja.'], []];
    }
    if (tpl_name_taken($name)) {
        return [null, ['Sudah ada templat bernama "' . $name . '". Pakai nama lain, atau hapus yang lama dulu.'], []];
    }
    if ((int) db()->query('SELECT COUNT(*) FROM block_templates')->fetchColumn() >= TPL_MAX) {
        return [null, ['Daftar templat penuh (' . TPL_MAX . '). Hapus templat yang tidak dipakai.'], []];
    }
    db()->prepare('INSERT INTO block_templates (name, mode, data, block_count, has_html, created_at, created_by) VALUES (?,?,?,?,?,?,?)')
        ->execute([$name, $mode, $json, $kept, tpl_has_html($blocks) ? 1 : 0, now_utc(), (int) $u['id']]);
    $id = (int) db()->lastInsertId();
    $row = tpl_find($id);
    return [tpl_row_out($row, $u), [], ['kept' => $kept, 'dropped' => $dropped, 'notes' => array_slice($notes, 0, 3)]];
}

/** hanya pembuatnya atau Admin */
function tpl_can_change(array $row, array $u): bool
{
    return is_admin($u) || ($row['created_by'] !== null && (int) $row['created_by'] === (int) $u['id']);
}

/** @return array{0: ?array, 1: string[]} [baris, galat] */
function tpl_rename(int $id, string $newName, array $u): array
{
    $row = tpl_find($id);
    if (!$row) {
        return [null, ['Templat tidak ditemukan. Mungkin sudah dihapus.']];
    }
    if (!tpl_can_change($row, $u)) {
        return [null, ['Hanya pembuat templat atau Admin yang bisa mengubahnya.']];
    }
    $name = tpl_clean_name($newName);
    if ($name === '') {
        return [null, ['Beri nama templat.']];
    }
    if (tpl_name_taken($name, $id)) {
        return [null, ['Sudah ada templat bernama "' . $name . '".']];
    }
    db()->prepare('UPDATE block_templates SET name = ? WHERE id = ?')->execute([$name, $id]);
    return [tpl_row_out(tpl_find($id) ?? $row, $u), []];
}

/** @return string[] galat (kosong bila berhasil) */
function tpl_delete(int $id, array $u): array
{
    $row = tpl_find($id);
    if (!$row) {
        return ['Templat tidak ditemukan. Mungkin sudah dihapus.'];
    }
    if (!tpl_can_change($row, $u)) {
        return ['Hanya pembuat templat atau Admin yang bisa menghapusnya.'];
    }
    db()->prepare('DELETE FROM block_templates WHERE id = ?')->execute([$id]);
    return [];
}
