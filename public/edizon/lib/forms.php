<?php
/**
 * Pembuat formulir: tabel, validasi definisi, pemrosesan kiriman, penyimpanan, penerusan ke Zapier, saran isian.
 * Dipakai panel (edizon/), endpoint publik (forms/) dan halaman /form/<slug>.
 * Setiap kiriman SELALU disimpan di database dulu, lalu semua isian diteruskan ke webhook Zapier (bila ada).
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const FORM_TYPES = [
    'text' => 'Teks pendek', 'email' => 'Email', 'phone' => 'Nomor telepon / WhatsApp', 'textarea' => 'Teks panjang',
    'select' => 'Pilihan dropdown', 'radio' => 'Pilihan tunggal (radio)', 'checkbox' => 'Pilihan ganda (kotak centang)',
    'date' => 'Tanggal', 'file' => 'Unggah berkas', 'consent' => 'Persetujuan (kotak centang wajib)',
];
const FORM_MAX_FIELDS = 30;
const FORM_MAX_OPTIONS = 40;
const FORM_FILE_MAX = 5242880; // 5 MB
const FORM_TEXT_KEYS = ['eyebrow', 'title', 'intro', 'submit', 'note', 'successTitle', 'successMsg'];
const FORM_MAX_STEPS = 8;           // langkah per formulir
const FORM_MAX_ITEMS = 60;          // butir (isian, baris, judul, teks, garis) per langkah
const FORM_MAX_LAYOUT = 40;         // judul + teks + garis pemisah di seluruh formulir
const FORM_ROW_MAX = 3;             // isian yang boleh sebaris
const FORM_ROW_TYPES = ['text', 'email', 'phone', 'date', 'select']; // jenis isian pendek yang boleh sebaris
const FORM_DRAFT_DAYS = 3;          // draf pengunjung disimpan di browser selama ini

/* ------------------------------------------------------------------ */
/* Tabel                                                               */
/* ------------------------------------------------------------------ */

function en_create_forms_tables(PDO $pdo): void
{
    $opt = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo->exec("CREATE TABLE IF NOT EXISTS forms (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(80) NOT NULL,
        name VARCHAR(100) NOT NULL,
        layout ENUM('popup','page') NOT NULL DEFAULT 'popup',
        zapier_form_id VARCHAR(60) NOT NULL DEFAULT '',
        zapier_form_name VARCHAR(100) NOT NULL DEFAULT '',
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        config MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by INT UNSIGNED NULL,
        UNIQUE KEY uq_form_slug (slug)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS form_submissions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        form_id INT UNSIGNED NOT NULL,
        data MEDIUMTEXT NOT NULL,
        audience VARCHAR(10) NOT NULL DEFAULT '',
        query_string VARCHAR(300) NOT NULL DEFAULT '',
        page VARCHAR(300) NOT NULL DEFAULT '',
        zapier_ok TINYINT(1) NULL,
        zapier_status SMALLINT NULL,
        imported TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        KEY ix_fs_form (form_id, created_at)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS form_files (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        submission_id INT UNSIGNED NOT NULL,
        field_key VARCHAR(40) NOT NULL,
        original VARCHAR(160) NOT NULL,
        stored VARCHAR(80) NOT NULL,
        mime VARCHAR(60) NOT NULL,
        bytes INT UNSIGNED NOT NULL,
        KEY ix_ff_sub (submission_id)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS suggest_lists (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(60) NOT NULL,
        name VARCHAR(100) NOT NULL,
        items MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_sl_slug (slug)
    ) $opt");
    try {
        if ((int) $pdo->query("SELECT COUNT(*) FROM forms WHERE slug = 'free-trial'")->fetchColumn() === 0 && !forms_seed_done($pdo)) {
            forms_seed_trial($pdo);
        }
    } catch (Throwable $e) {
        error_log('forms seed: ' . $e->getMessage());
    }
}

/** "free-trial" yang sengaja dihapus Admin tidak dibuat lagi: tandai lewat satu baris khusus di audit_log */
function forms_seed_done(PDO $pdo): bool
{
    try {
        return (int) $pdo->query("SELECT COUNT(*) FROM audit_log WHERE action = 'form_seed'")->fetchColumn() > 0;
    } catch (Throwable) {
        return false;
    }
}

function forms_default_trial_config(): array
{
    $f = static fn(string $k, string $type, string $label, string $labelAdult, string $z, bool $req, array $extra = []) => array_merge(
        ['key' => $k, 'type' => $type, 'label' => $label, 'labelAdult' => $labelAdult, 'hint' => '', 'required' => $req, 'options' => [], 'zkey' => $z,
            'suggest' => ['list' => [], 'learn' => false], 'showIf' => null, 'consent' => ['text' => '', 'url' => '']],
        $extra
    );
    return [
        'texts' => [
            'kids' => ['eyebrow' => 'Gratis, tanpa komitmen', 'title' => 'Daftar Free Trial sekarang', 'intro' => '', 'submit' => 'Daftar →', 'note' => 'Data dikirim ke tim kami, lalu admin menghubungi lewat WhatsApp.',
                'successTitle' => 'Terima kasih!', 'successMsg' => 'Data sudah kami terima. Admin kami akan segera menghubungi lewat WhatsApp untuk menjadwalkan trial class-nya.'],
            'adult' => ['eyebrow' => 'Free trial pass', 'title' => '', 'intro' => '', 'submit' => '', 'note' => '', 'successTitle' => '', 'successMsg' => ''],
        ],
        'photo' => '',
        'waFallback' => true,
        'fields' => [
            $f('nama', 'text', 'Nama lengkap calon siswa', 'Nama lengkap', 'Full Name', true),
            $f('wa', 'phone', 'Nomor WhatsApp orang tua', 'Nomor WhatsApp aktif', 'Phone', true),
            $f('kelas', 'text', 'Kelas siswa / usia saat ini', 'Pekerjaan / instansi', 'Class Choice', true),
            $f('cerita', 'textarea', 'Program/kelas yang ingin diikuti', 'Program yang diminati atau kebutuhan Anda', 'Kebutuhan Program', false),
        ],
    ];
}

function forms_seed_trial(PDO $pdo): void
{
    $now = now_utc();
    $pdo->prepare('INSERT INTO forms (slug, name, layout, zapier_form_id, zapier_form_name, status, config, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute(['free-trial', 'Free Trial', 'popup', preg_replace('/[^A-Za-z0-9_-]/', '', (string) cfg('form_id', '5ac3e5e2')) ?: '5ac3e5e2', (string) cfg('form_name', 'New Form'), 'published',
            json_encode(forms_default_trial_config(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $now]);
    $fid = (int) $pdo->lastInsertId();
    // bawa pendaftar lama (tabel trial_leads) ke daftar kiriman formulir ini, sekali saja
    try {
        if ($pdo->query("SHOW TABLES LIKE 'trial_leads'")->fetchColumn()) {
            $rows = $pdo->query('SELECT name, phone, class_choice, needs, audience, query_string, zapier_ok, zapier_status, created_at FROM trial_leads ORDER BY id')->fetchAll();
            $ins = $pdo->prepare('INSERT INTO form_submissions (form_id, data, audience, query_string, zapier_ok, zapier_status, imported, created_at) VALUES (?,?,?,?,?,?,1,?)');
            foreach ($rows as $r) {
                $ins->execute([$fid, json_encode(['nama' => $r['name'], 'wa' => $r['phone'], 'kelas' => $r['class_choice'], 'cerita' => $r['needs']], JSON_UNESCAPED_UNICODE),
                    (string) $r['audience'], (string) $r['query_string'], $r['zapier_ok'], $r['zapier_status'], $r['created_at']]);
            }
        }
    } catch (Throwable $e) {
        error_log('forms import leads: ' . $e->getMessage());
    }
    $pdo->prepare("INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (NULL, 'form_seed', 'free-trial', '', ?)")->execute([$now]);
}

/* ------------------------------------------------------------------ */
/* Baca                                                                */
/* ------------------------------------------------------------------ */

function form_row_decode(array $r): array
{
    $cfg = json_decode((string) $r['config'], true);
    $r['cfg'] = is_array($cfg) ? $cfg : forms_default_trial_config();
    $r['id'] = (int) $r['id'];
    return $r;
}

function form_get(int $id): ?array
{
    $st = db()->prepare('SELECT * FROM forms WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ? form_row_decode($r) : null;
}

function form_get_by_slug(string $slug, bool $publishedOnly = true): ?array
{
    $st = db()->prepare('SELECT * FROM forms WHERE slug = ?' . ($publishedOnly ? " AND status = 'published'" : ''));
    $st->execute([$slug]);
    $r = $st->fetch();
    return $r ? form_row_decode($r) : null;
}

function forms_all(): array
{
    return db()->query('SELECT f.id, f.slug, f.name, f.layout, f.status, f.zapier_form_id, f.updated_at, (SELECT COUNT(*) FROM form_submissions s WHERE s.form_id = f.id) AS n FROM forms f ORDER BY f.id')->fetchAll();
}

/** teks tampilan: set Dewasa memakai set Anak untuk kolom yang kosong */
function form_text(array $cfg, string $aud, string $k): string
{
    $v = trim((string) ($cfg['texts'][$aud][$k] ?? ''));
    return $v !== '' ? $v : trim((string) ($cfg['texts']['kids'][$k] ?? ''));
}

/* ------------------------------------------------------------------ */
/* Langkah (steps) dan tata letak                                      */
/* ------------------------------------------------------------------ */

/** formulir lama (tanpa langkah): satu langkah tanpa nama yang berisi semua isian berurutan */
function form_steps_default(array $fields): array
{
    $items = [];
    foreach ($fields as $fl) {
        $items[] = ['t' => 'field', 'key' => (string) $fl['key']];
    }
    return [['id' => 's1', 'name' => '', 'items' => $items]];
}

/** pastikan tiap isian muncul tepat sekali (yang belum ditempatkan masuk ke langkah terakhir) dan kunci yang tidak dikenal dibuang */
function form_steps_sync(array $steps, array $fields): array
{
    $known = [];
    foreach ($fields as $fl) {
        $known[(string) $fl['key']] = true;
    }
    $placed = [];
    $out = [];
    foreach ($steps as $st) {
        $items = [];
        foreach (is_array($st['items'] ?? null) ? $st['items'] : [] as $it) {
            $t = (string) ($it['t'] ?? '');
            if ($t === 'field') {
                $k = (string) ($it['key'] ?? '');
                if (isset($known[$k]) && !isset($placed[$k])) {
                    $placed[$k] = true;
                    $items[] = ['t' => 'field', 'key' => $k];
                }
            } elseif ($t === 'row') {
                $ks = [];
                foreach (is_array($it['keys'] ?? null) ? $it['keys'] : [] as $k) {
                    $k = (string) $k;
                    if (isset($known[$k]) && !isset($placed[$k])) {
                        $placed[$k] = true;
                        $ks[] = $k;
                    }
                }
                if (count($ks) >= 2) {
                    $items[] = ['t' => 'row', 'id' => (string) ($it['id'] ?? ''), 'keys' => $ks];
                } elseif ($ks) {
                    $items[] = ['t' => 'field', 'key' => $ks[0]];
                }
            } elseif (in_array($t, ['h', 'text', 'hr'], true)) {
                $items[] = $it;
            }
        }
        $out[] = ['id' => (string) ($st['id'] ?? ''), 'name' => (string) ($st['name'] ?? ''), 'items' => $items];
    }
    if (!$out) {
        $out = [['id' => 's1', 'name' => '', 'items' => []]];
    }
    $last = count($out) - 1;
    foreach ($fields as $fl) {
        if (!isset($placed[(string) $fl['key']])) {
            $out[$last]['items'][] = ['t' => 'field', 'key' => (string) $fl['key']];
        }
    }
    return $out;
}

/** langkah sebuah formulir (formulir lama otomatis menjadi satu langkah) */
function form_cfg_steps(array $cfg): array
{
    $fields = is_array($cfg['fields'] ?? null) ? $cfg['fields'] : [];
    $steps = is_array($cfg['steps'] ?? null) && $cfg['steps'] ? $cfg['steps'] : form_steps_default($fields);
    return form_steps_sync($steps, $fields);
}

/** sidik jari susunan formulir: draf pengunjung yang dibuat untuk susunan lain dibuang */
function form_rev(array $cfg): string
{
    $sig = [];
    foreach ($cfg['fields'] ?? [] as $fl) {
        $sig['f'][] = [$fl['key'], $fl['type'], $fl['options'] ?? []];
    }
    foreach (form_cfg_steps($cfg) as $st) {
        $row = [$st['id']];
        foreach ($st['items'] as $it) {
            $row[] = ($it['t'] === 'field') ? $it['key'] : (($it['t'] === 'row') ? $it['keys'] : $it['t']);
        }
        $sig['s'][] = $row;
    }
    return substr(sha1((string) json_encode($sig, JSON_UNESCAPED_UNICODE)), 0, 8);
}

/**
 * Periksa langkah kiriman editor. $rows = daftar isian mentah (sudah punya kunci). Mengembalikan [langkah, urutan]:
 * langkah memakai kunci ASLI isian; urutan = indeks $rows menurut urutan tampil (langkah demi langkah, kiri ke kanan).
 * @return array{0: array, 1: int[]}
 */
function form_check_steps(mixed $in, array $rows, array &$errors): array
{
    $byKey = [];
    foreach ($rows as $i => $r) {
        $k = (string) ($r['key'] ?? '');
        if ($k !== '' && !isset($byKey[$k])) {
            $byKey[$k] = $i;
        }
    }
    $lab = static fn(string $k): string => clean_text($rows[$byKey[$k]]['label'] ?? '', 100) ?: '(tanpa label)';
    $list = is_array($in) ? array_values($in) : [];
    if (!$list) {
        $items = [];
        foreach ($rows as $r) {
            $items[] = ['t' => 'field', 'key' => (string) $r['key']];
        }
        return [[['id' => 's1', 'name' => '', 'items' => $items]], array_keys($rows)];
    }
    if (count($list) > FORM_MAX_STEPS) {
        $errors[] = 'Maksimal ' . FORM_MAX_STEPS . ' langkah.';
    }
    $steps = [];
    $placed = [];
    $stepIds = [];
    $itemIds = [];
    $layoutN = 0;
    foreach (array_slice($list, 0, FORM_MAX_STEPS) as $si => $st) {
        $n = $si + 1;
        $st = is_array($st) ? $st : [];
        $id = strtolower((string) ($st['id'] ?? ''));
        while (!preg_match('/^[a-z0-9]{2,12}$/', $id) || isset($stepIds[$id])) {
            $id = 's' . substr(bin2hex(random_bytes(4)), 0, 5);
        }
        $stepIds[$id] = true;
        $items = [];
        $raw = is_array($st['items'] ?? null) ? array_values($st['items']) : [];
        if (count($raw) > FORM_MAX_ITEMS) {
            $errors[] = "Langkah $n: maksimal " . FORM_MAX_ITEMS . ' butir.';
            $raw = array_slice($raw, 0, FORM_MAX_ITEMS);
        }
        foreach ($raw as $it) {
            $it = is_array($it) ? $it : [];
            $t = (string) ($it['t'] ?? '');
            if ($t === 'field') {
                $k = (string) ($it['key'] ?? '');
                if (!isset($byKey[$k])) {
                    continue;   // isiannya sudah dihapus
                }
                if (isset($placed[$k])) {
                    $errors[] = 'Isian "' . $lab($k) . '" muncul lebih dari sekali.';
                    continue;
                }
                $placed[$k] = true;
                $items[] = ['t' => 'field', 'key' => $k];
            } elseif ($t === 'row') {
                $keys = is_array($it['keys'] ?? null) ? array_values($it['keys']) : [];
                if (count($keys) > FORM_ROW_MAX) {
                    $errors[] = "Langkah $n: satu baris maksimal " . FORM_ROW_MAX . ' isian.';
                    $keys = array_slice($keys, 0, FORM_ROW_MAX);
                }
                $ks = [];
                foreach ($keys as $k) {
                    $k = (string) $k;
                    if (!isset($byKey[$k])) {
                        continue;
                    }
                    if (isset($placed[$k])) {
                        $errors[] = 'Isian "' . $lab($k) . '" muncul lebih dari sekali.';
                        continue;
                    }
                    if (!in_array((string) ($rows[$byKey[$k]]['type'] ?? ''), FORM_ROW_TYPES, true)) {
                        $errors[] = 'Isian "' . $lab($k) . '": jenis ini tidak bisa diletakkan sebaris (hanya teks pendek, email, telepon, tanggal, dan dropdown).';
                    }
                    $placed[$k] = true;
                    $ks[] = $k;
                }
                if (count($ks) >= 2) {
                    $rid = strtolower((string) ($it['id'] ?? ''));
                    while (!preg_match('/^[a-z0-9]{4,12}$/', $rid) || isset($itemIds[$rid])) {
                        $rid = substr(bin2hex(random_bytes(4)), 0, 6);
                    }
                    $itemIds[$rid] = true;
                    $items[] = ['t' => 'row', 'id' => $rid, 'keys' => $ks];
                } elseif ($ks) {
                    $items[] = ['t' => 'field', 'key' => $ks[0]];
                }
            } elseif (in_array($t, ['h', 'text', 'hr'], true)) {
                $lid = strtolower((string) ($it['id'] ?? ''));
                while (!preg_match('/^[a-z0-9]{4,12}$/', $lid) || isset($itemIds[$lid])) {
                    $lid = substr(bin2hex(random_bytes(4)), 0, 6);
                }
                if ($t === 'hr') {
                    $itemIds[$lid] = true;
                    $items[] = ['t' => 'hr', 'id' => $lid];
                    $layoutN++;
                } else {
                    $max = $t === 'h' ? 120 : 400;
                    $tx = $t === 'h' ? clean_text($it['text'] ?? '', $max) : clean_multiline($it['text'] ?? '', $max);
                    $ta = $t === 'h' ? clean_text($it['textAdult'] ?? '', $max) : clean_multiline($it['textAdult'] ?? '', $max);
                    if ($tx === '' && $ta === '') {
                        continue;   // judul/teks kosong dibuang
                    }
                    $itemIds[$lid] = true;
                    $one = ['t' => $t, 'id' => $lid, 'text' => $tx, 'textAdult' => $ta];
                    if ($t === 'h') {
                        $one['level'] = (int) ($it['level'] ?? 2) === 3 ? 3 : 2;
                    }
                    $items[] = $one;
                    $layoutN++;
                }
            }
        }
        $steps[] = ['id' => $id, 'name' => clean_text($st['name'] ?? '', 40), 'items' => $items];
    }
    if ($layoutN > FORM_MAX_LAYOUT) {
        $errors[] = 'Maksimal ' . FORM_MAX_LAYOUT . ' judul, teks, dan garis pemisah.';
    }
    foreach ($steps as $si => $st) {
        if (count($steps) > 1 && $st['name'] === '') {
            $errors[] = 'Langkah ' . ($si + 1) . ': nama wajib diisi.';
        }
        if (!$st['items']) {
            $errors[] = 'Langkah ' . ($si + 1) . ($st['name'] !== '' ? ' ("' . $st['name'] . '")' : '') . ' belum berisi apa pun. Isi atau hapus langkah ini.';
        }
    }
    // isian yang belum ditempatkan masuk ke langkah terakhir
    $last = count($steps) - 1;
    foreach ($rows as $i => $r) {
        $k = (string) ($r['key'] ?? '');
        if ($k !== '' && ($byKey[$k] ?? -1) === $i && !isset($placed[$k])) {
            $placed[$k] = true;
            $steps[$last]['items'][] = ['t' => 'field', 'key' => $k];
        }
    }
    $order = [];
    foreach ($steps as $st) {
        foreach ($st['items'] as $it) {
            if ($it['t'] === 'field') {
                $order[] = $byKey[$it['key']];
            } elseif ($it['t'] === 'row') {
                foreach ($it['keys'] as $k) {
                    $order[] = $byKey[$k];
                }
            }
        }
    }
    // baris yang kuncinya sama dengan baris lain (kunci ganda) tetap ikut, di akhir
    foreach (array_keys($rows) as $i) {
        if (!in_array($i, $order, true)) {
            $order[] = $i;
        }
    }
    return [$steps, $order];
}

/** definisi untuk pengunjung: tanpa daftar saran, webhook, atau apa pun yang rahasia */
function form_public_def(array $f): array
{
    $cfg = $f['cfg'];
    $texts = [];
    foreach (['kids', 'adult'] as $a) {
        foreach (FORM_TEXT_KEYS as $k) {
            $texts[$a][$k] = form_text($cfg, $a, $k);
        }
    }
    $fields = [];
    foreach ($cfg['fields'] ?? [] as $fl) {
        $fields[] = [
            'key' => $fl['key'], 'type' => $fl['type'], 'label' => $fl['label'], 'labelAdult' => $fl['labelAdult'] !== '' ? $fl['labelAdult'] : $fl['label'],
            'hint' => $fl['hint'], 'required' => (bool) $fl['required'], 'options' => $fl['options'], 'showIf' => $fl['showIf'],
            'suggest' => !empty($fl['suggest']['list']) || !empty($fl['suggest']['learn']) || !empty($fl['suggest']['shared']), 'consent' => $fl['consent'],
        ];
    }
    $steps = [];
    foreach (form_cfg_steps($cfg) as $st) {
        $items = [];
        foreach ($st['items'] as $it) {
            if ($it['t'] === 'field') {
                $items[] = ['t' => 'field', 'key' => $it['key']];
            } elseif ($it['t'] === 'row') {
                $items[] = ['t' => 'row', 'keys' => $it['keys']];
            } elseif ($it['t'] === 'hr') {
                $items[] = ['t' => 'hr'];
            } else {
                $tx = (string) ($it['text'] ?? '');
                $ta = (string) ($it['textAdult'] ?? '');
                $one = ['t' => $it['t'], 'text' => $tx !== '' ? $tx : $ta, 'textAdult' => $ta !== '' ? $ta : $tx];
                if ($it['t'] === 'h') {
                    $one['level'] = (int) ($it['level'] ?? 2) === 3 ? 3 : 2;
                }
                $items[] = $one;
            }
        }
        $steps[] = ['id' => $st['id'], 'name' => $st['name'], 'items' => $items];
    }
    return ['slug' => $f['slug'], 'name' => $f['name'], 'layout' => $f['layout'], 'texts' => $texts, 'photo' => (string) ($cfg['photo'] ?? ''), 'waFallback' => !empty($cfg['waFallback']), 'fields' => $fields,
        'steps' => $steps, 'drafts' => (bool) ($cfg['drafts'] ?? true), 'draftDays' => FORM_DRAFT_DAYS, 'rev' => form_rev($cfg)];
}

/* ------------------------------------------------------------------ */
/* Validasi definisi (panel)                                           */
/* ------------------------------------------------------------------ */

/** @return array{0: array, 1: string[]} */
function validate_form_def(array $in, array $user, int $ignoreId = 0): array
{
    $errors = [];
    $name = clean_text($in['name'] ?? '', 100);
    if ($name === '') {
        $errors[] = 'Nama formulir wajib diisi.';
    }
    $layout = ($in['layout'] ?? '') === 'page' ? 'page' : 'popup';
    $status = ($in['status'] ?? '') === 'published' ? 'published' : 'draft';
    $slug = art_slugify(trim((string) ($in['slug'] ?? '')) !== '' ? (string) $in['slug'] : $name, 60);
    if ($slug === '' || !preg_match('/^[a-z0-9][a-z0-9-]*$/', $slug)) {
        $errors[] = 'Alamat (slug) formulir tidak valid.';
        $slug = 'formulir';
    }
    if (in_array($slug, ['index', 'view', 'preview', 'assets'], true)) {
        $errors[] = "Alamat \"$slug\" dicadangkan sistem. Pilih alamat lain.";
    }
    $zfid = trim((string) ($in['zapierFormId'] ?? ''));
    if ($zfid !== '' && !preg_match('/^[A-Za-z0-9_-]{2,60}$/', $zfid)) {
        $errors[] = 'Form ID Zapier tidak valid.';
        $zfid = '';
    }
    $zname = clean_text($in['zapierFormName'] ?? '', 100);

    $texts = [];
    foreach (['kids', 'adult'] as $a) {
        foreach (FORM_TEXT_KEYS as $k) {
            $max = in_array($k, ['intro', 'note', 'successMsg'], true) ? 400 : 120;
            $texts[$a][$k] = $k === 'intro' || $k === 'note' || $k === 'successMsg' ? clean_multiline($in['texts'][$a][$k] ?? '', $max) : clean_text($in['texts'][$a][$k] ?? '', $max);
        }
    }
    if ($texts['kids']['title'] === '') {
        $errors[] = 'Judul formulir (tampilan Anak & Remaja) wajib diisi.';
    }
    if ($texts['kids']['submit'] === '') {
        $errors[] = 'Tulisan tombol kirim (tampilan Anak & Remaja) wajib diisi.';
    }
    if ($texts['kids']['successTitle'] === '' || $texts['kids']['successMsg'] === '') {
        $errors[] = 'Judul dan pesan sukses (tampilan Anak & Remaja) wajib diisi.';
    }
    $photo = teacher_photo($in['photo'] ?? '');
    if ($photo === null) {
        $errors[] = 'Gambar formulir tidak valid. Pilih atau unggah lewat panel.';
        $photo = '';
    }

    $rows = is_array($in['fields'] ?? null) ? array_values($in['fields']) : [];
    if (count($rows) > FORM_MAX_FIELDS) {
        $errors[] = 'Maksimal ' . FORM_MAX_FIELDS . ' isian.';
        $rows = array_slice($rows, 0, FORM_MAX_FIELDS);
    }
    if (!$rows) {
        $errors[] = 'Tambahkan minimal satu isian.';
    }
    // setiap isian mentah wajib punya kunci (isian baru dari editor memakai kunci sementara "f" + 8 heksa)
    foreach ($rows as $i => $r) {
        $r = is_array($r) ? $r : [];
        if ((string) ($r['key'] ?? '') === '') {
            $r['key'] = 'f' . bin2hex(random_bytes(4));
        }
        $rows[$i] = $r;
    }
    // langkah dan tata letak: urutan isian mengikuti urutan tampil (langkah demi langkah, kiri ke kanan)
    [$stepsIn, $order] = form_check_steps($in['steps'] ?? null, $rows, $errors);
    $byOrder = [];
    foreach ($order as $oi) {
        $byOrder[] = $rows[$oi];
    }
    $rows = $byOrder;
    // pass 1: kunci akhir (kunci sementara "f" + 8 heksa dibuat dari label), dijaga unik
    $keyMap = [];
    $used = [];
    foreach ($rows as $i => $r) {
        $r = is_array($r) ? $r : [];
        $k = (string) ($r['key'] ?? '');
        $label = clean_text($r['label'] ?? '', 100);
        if (!preg_match('/^[a-z][a-z0-9_]{1,30}$/', $k) || preg_match('/^f[0-9a-f]{8}$/', $k)) {
            $base = str_replace('-', '_', art_slugify($label, 24));
            $nk = preg_match('/^[a-z]/', $base) ? $base : 'isian_' . ($base !== '' ? $base : (string) ($i + 1));
            $nk = substr($nk, 0, 28);
            $final = $nk;
            $n = 2;
            while (isset($used[$final])) {
                $final = substr($nk, 0, 26) . '_' . $n++;
            }
        } else {
            $final = $k;
            $n = 2;
            while (isset($used[$final])) {
                $final = substr($k, 0, 26) . '_' . $n++;
            }
        }
        $used[$final] = true;
        $keyMap[$k !== '' ? $k : '#' . $i] = $final;
        $rows[$i]['_final'] = $final;
    }
    $fields = [];
    $seenKeys = [];
    foreach ($rows as $i => $r) {
        $n = $i + 1;
        $r = is_array($r) ? $r : [];
        $type = (string) ($r['type'] ?? '');
        $label = clean_text($r['label'] ?? '', 100);
        if (!isset(FORM_TYPES[$type])) {
            $errors[] = "Isian $n: jenis tidak valid.";
            continue;
        }
        if ($label === '') {
            $errors[] = "Isian $n: label wajib diisi.";
            continue;
        }
        $key = (string) $r['_final'];
        $opts = [];
        if (in_array($type, ['select', 'radio', 'checkbox'], true)) {
            foreach (is_array($r['options'] ?? null) ? $r['options'] : [] as $o) {
                $o = clean_text($o, 80);
                if ($o !== '' && !in_array($o, $opts, true)) {
                    $opts[] = $o;
                }
            }
            $opts = array_slice($opts, 0, FORM_MAX_OPTIONS);
            if (count($opts) < 1) {
                $errors[] = "Isian $n (\"$label\"): tambahkan minimal satu pilihan.";
            }
        }
        $sug = ['list' => [], 'learn' => false, 'shared' => ''];
        if ($type === 'text') {
            $sh = strtolower(trim((string) ($r['suggest']['shared'] ?? '')));
            if ($sh !== '') {
                if (!suggest_list_get($sh)) {
                    $errors[] = "Isian $n (\"$label\"): daftar saran bersama tidak ditemukan.";
                } else {
                    $sug['shared'] = $sh;
                }
            }
            foreach (is_array($r['suggest']['list'] ?? null) ? $r['suggest']['list'] : [] as $o) {
                $o = clean_text($o, 120);
                if ($o !== '' && !in_array($o, $sug['list'], true)) {
                    $sug['list'][] = $o;
                }
            }
            $sug['list'] = array_slice($sug['list'], 0, 500);
            $sug['learn'] = !empty($r['suggest']['learn']);
        }
        $showIf = null;
        $si = $r['showIf'] ?? null;
        if (is_array($si) && trim((string) ($si['key'] ?? '')) !== '') {
            $ref = $keyMap[(string) $si['key']] ?? '';
            if ($ref === '' || !isset($seenKeys[$ref])) {
                $errors[] = "Isian $n (\"$label\"): kondisi \"tampil jika\" harus merujuk isian yang ada DI ATASNYA (atau di langkah sebelumnya).";
            } else {
                $showIf = ['key' => $ref, 'equals' => clean_text($si['equals'] ?? '', 80)];
            }
        }
        $consent = ['text' => '', 'url' => ''];
        if ($type === 'consent') {
            $consent['text'] = clean_text($r['consent']['text'] ?? '', 60);
            $u = trim((string) ($r['consent']['url'] ?? ''));
            if ($u !== '') {
                $safe = safe_url($u);
                if ($safe === null || !preg_match('#^(https?://|/)#i', $safe)) {
                    $errors[] = "Isian $n (\"$label\"): tautan persetujuan harus https://… atau jalur seperti /kebijakan.";
                } else {
                    $consent['url'] = $safe;
                }
            }
        }
        $seenKeys[$key] = true;
        $fields[] = [
            'key' => $key, 'type' => $type, 'label' => $label, 'labelAdult' => clean_text($r['labelAdult'] ?? '', 100),
            'hint' => clean_text($r['hint'] ?? '', 160), 'required' => $type === 'consent' ? true : !empty($r['required']), 'options' => $opts,
            'zkey' => clean_text($r['zkey'] ?? '', 60), 'suggest' => $sug, 'showIf' => $showIf, 'consent' => $consent,
        ];
    }
    if ($status === 'published' && !$fields) {
        $errors[] = 'Formulir tanpa isian tidak bisa diterbitkan.';
    }
    $steps = [];
    foreach ($stepsIn as $st) {
        $items = [];
        foreach ($st['items'] as $it) {
            if ($it['t'] === 'field') {
                $fk = (string) ($keyMap[$it['key']] ?? '');
                if (isset($seenKeys[$fk])) {
                    $items[] = ['t' => 'field', 'key' => $fk];
                }
            } elseif ($it['t'] === 'row') {
                $ks = [];
                foreach ($it['keys'] as $k) {
                    $fk = (string) ($keyMap[$k] ?? '');
                    if (isset($seenKeys[$fk])) {
                        $ks[] = $fk;
                    }
                }
                if (count($ks) >= 2) {
                    $items[] = ['t' => 'row', 'id' => $it['id'], 'keys' => $ks];
                } elseif ($ks) {
                    $items[] = ['t' => 'field', 'key' => $ks[0]];
                }
            } else {
                $items[] = $it;
            }
        }
        $steps[] = ['id' => $st['id'], 'name' => $st['name'], 'items' => $items];
    }
    return [[
        'name' => $name, 'slug' => $slug, 'layout' => $layout, 'status' => $status, 'zapier_form_id' => $zfid, 'zapier_form_name' => $zname,
        'cfg' => ['texts' => $texts, 'photo' => $photo, 'waFallback' => !empty($in['waFallback']), 'drafts' => !array_key_exists('drafts', $in) || !empty($in['drafts']), 'steps' => $steps, 'fields' => $fields],
    ], $errors];
}

function form_save(array $d, int $id, int $userId): int
{
    $pdo = db();
    $slug = $d['slug'];
    $n = 1;
    $base = $slug;
    while (true) {
        $st = $pdo->prepare('SELECT id FROM forms WHERE slug = ?' . ($id ? ' AND id <> ' . (int) $id : ''));
        $st->execute([$slug]);
        if (!$st->fetchColumn()) {
            break;
        }
        $slug = substr($base, 0, 70) . '-' . (++$n);
    }
    $cfg = json_encode($d['cfg'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $now = now_utc();
    if ($id > 0) {
        $pdo->prepare('UPDATE forms SET slug=?, name=?, layout=?, zapier_form_id=?, zapier_form_name=?, status=?, config=?, updated_at=?, updated_by=? WHERE id=?')
            ->execute([$slug, $d['name'], $d['layout'], $d['zapier_form_id'], $d['zapier_form_name'], $d['status'], $cfg, $now, $userId, $id]);
        return $id;
    }
    $pdo->prepare('INSERT INTO forms (slug, name, layout, zapier_form_id, zapier_form_name, status, config, created_at, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([$slug, $d['name'], $d['layout'], $d['zapier_form_id'], $d['zapier_form_name'], $d['status'], $cfg, $now, $now, $userId]);
    return (int) $pdo->lastInsertId();
}

function form_delete(int $id): void
{
    $pdo = db();
    $files = $pdo->prepare('SELECT f.stored FROM form_files f JOIN form_submissions s ON s.id = f.submission_id WHERE s.form_id = ?');
    $files->execute([$id]);
    foreach ($files->fetchAll(PDO::FETCH_COLUMN) as $stored) {
        @unlink(form_files_dir() . '/' . basename((string) $stored));
    }
    $pdo->prepare('DELETE FROM form_files WHERE submission_id IN (SELECT id FROM form_submissions WHERE form_id = ?)')->execute([$id]);
    $pdo->prepare('DELETE FROM form_submissions WHERE form_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM forms WHERE id = ?')->execute([$id]);
}

function form_files_dir(): string
{
    $dir = storage_dir() . '/form-files';
    ensure_dir($dir);
    if (!is_file($dir . '/.htaccess')) {
        @file_put_contents($dir . '/.htaccess', "Require all denied\n");   // berkas pendaftar tidak boleh dibuka lewat alamat web
    }
    return $dir;
}

/* ------------------------------------------------------------------ */
/* Kiriman pengunjung                                                  */
/* ------------------------------------------------------------------ */

function form_field_visible(array $fl, array $fieldsByKey, array $post): bool
{
    $si = $fl['showIf'] ?? null;
    if (!is_array($si) || empty($si['key'])) {
        return true;
    }
    $ref = $fieldsByKey[$si['key']] ?? null;
    if (!$ref || !form_field_visible($ref, $fieldsByKey, $post)) {
        return false;
    }
    $v = $post[$si['key']] ?? '';
    $eq = (string) ($si['equals'] ?? '');
    if (is_array($v)) {
        return $eq === '' ? count($v) > 0 : in_array($eq, $v, true);
    }
    return $eq === '' ? trim((string) $v) !== '' : trim((string) $v) === $eq;
}

/**
 * @return array{values: array, errors: string[], files: array}
 *  values: key => string|array (hanya isian yang tampil); files: key => ['tmp','name','mime','size','ext']
 */
function form_collect(array $form, array $post, array $files, string $aud): array
{
    $fields = $form['cfg']['fields'] ?? [];
    $by = [];
    foreach ($fields as $fl) {
        $by[$fl['key']] = $fl;
    }
    $values = [];
    $errors = [];
    $fileOut = [];
    foreach ($fields as $fl) {
        if (!form_field_visible($fl, $by, $post)) {
            continue;
        }
        $k = $fl['key'];
        $label = ($aud === 'adult' && $fl['labelAdult'] !== '') ? $fl['labelAdult'] : $fl['label'];
        $raw = $post[$k] ?? '';
        $req = !empty($fl['required']);
        switch ($fl['type']) {
            case 'text':
                $v = clean_text(is_string($raw) ? $raw : '', 200);
                if ($v === '' && $req) { $errors[] = "$label wajib diisi."; }
                if ($v !== '') { $values[$k] = $v; }
                break;
            case 'textarea':
                $v = clean_multiline(is_string($raw) ? $raw : '', 2000);
                if ($v === '' && $req) { $errors[] = "$label wajib diisi."; }
                if ($v !== '') { $values[$k] = $v; }
                break;
            case 'email':
                $v = clean_text(is_string($raw) ? $raw : '', 120);
                if ($v === '') { if ($req) { $errors[] = "$label wajib diisi."; } break; }
                if (!filter_var($v, FILTER_VALIDATE_EMAIL)) { $errors[] = "$label: alamat email tidak valid."; break; }
                $values[$k] = $v;
                break;
            case 'phone':
                $v = preg_replace('/[^\d+]/', '', clean_text(is_string($raw) ? $raw : '', 30)) ?? '';
                if ($v === '') { if ($req) { $errors[] = "$label wajib diisi."; } break; }
                if (strlen(preg_replace('/\D/', '', $v) ?? '') < 9 || strlen($v) > 18) { $errors[] = "$label sepertinya belum lengkap."; break; }
                $values[$k] = $v;
                break;
            case 'date':
                $v = trim(is_string($raw) ? $raw : '');
                if ($v === '') { if ($req) { $errors[] = "$label wajib diisi."; } break; }
                $d = DateTimeImmutable::createFromFormat('!Y-m-d', $v);
                if (!$d || $d->format('Y-m-d') !== $v) { $errors[] = "$label: tanggal tidak valid."; break; }
                $values[$k] = $v;
                break;
            case 'select':
            case 'radio':
                $v = trim(is_string($raw) ? $raw : '');
                if ($v === '') { if ($req) { $errors[] = "$label wajib dipilih."; } break; }
                if (!in_array($v, $fl['options'], true)) { $errors[] = "$label: pilihan tidak valid."; break; }
                $values[$k] = $v;
                break;
            case 'checkbox':
                $arr = is_array($raw) ? $raw : ($raw !== '' ? [$raw] : []);
                $pick = [];
                foreach ($arr as $o) {
                    if (is_string($o) && in_array($o, $fl['options'], true) && !in_array($o, $pick, true)) { $pick[] = $o; }
                }
                if (!$pick) { if ($req) { $errors[] = "$label: pilih minimal satu."; } break; }
                $values[$k] = $pick;
                break;
            case 'consent':
                if (!in_array((string) (is_string($raw) ? $raw : ''), ['1', 'on', 'true'], true)) { $errors[] = "$label harus disetujui."; break; }
                $values[$k] = 'Setuju';
                break;
            case 'file':
                $f = $files[$k] ?? null;
                if (!is_array($f) || (int) ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
                    if ($req) { $errors[] = "$label wajib diunggah."; }
                    break;
                }
                if ((int) $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file((string) $f['tmp_name']) || (int) $f['size'] > FORM_FILE_MAX) {
                    $errors[] = "$label: berkas gagal diunggah atau lebih dari 5 MB.";
                    break;
                }
                $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file((string) $f['tmp_name']);
                $ext = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? '';
                if ($ext === '') { $errors[] = "$label: hanya PDF, JPG, PNG, atau WebP."; break; }
                $safe = form_file_sanitize((string) $f['tmp_name'], $mime);
                if (!$safe) { $errors[] = "$label: berkas ditolak karena tidak aman atau rusak."; break; }
                $orig = clean_text(preg_replace('/[^\p{L}\p{N}._ -]+/u', '', (string) $f['name']) ?? '', 120) ?: ('berkas.' . $ext);
                $fileOut[$k] = ['tmp' => (string) $f['tmp_name'], 'name' => $orig, 'mime' => $mime, 'size' => (int) $f['size'], 'ext' => $ext];
                $values[$k] = $orig . ' (berkas tersimpan di panel)';
                break;
        }
    }
    return ['values' => $values, 'errors' => $errors, 'files' => $fileOut];
}

/** @return array{id:int} */
function form_store(array $form, array $values, array $files, string $aud, string $qs, string $page): int
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO form_submissions (form_id, data, audience, query_string, page, created_at) VALUES (?,?,?,?,?,?)')
            ->execute([$form['id'], json_encode($values, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $aud, mb_substr($qs, 0, 300), mb_substr($page, 0, 300), now_utc()]);
        $sid = (int) $pdo->lastInsertId();
        foreach ($files as $k => $f) {
            $stored = bin2hex(random_bytes(12)) . '.' . $f['ext'];
            if (!@move_uploaded_file($f['tmp'], form_files_dir() . '/' . $stored)) {
                throw new RuntimeException('file move failed');
            }
            $pdo->prepare('INSERT INTO form_files (submission_id, field_key, original, stored, mime, bytes) VALUES (?,?,?,?,?,?)')
                ->execute([$sid, $k, $f['name'], $stored, $f['mime'], $f['size']]);
        }
        $pdo->commit();
        return $sid;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/** webhook formulir ini: dari daftar Zapier di panel; khusus "free-trial" boleh jatuh ke api/config.php */
function form_webhook(array $form): ?string
{
    $fid = (string) $form['zapier_form_id'];
    if ($fid !== '') {
        $w = zapier_hook_for($fid);
        if ($w !== null) {
            return $w;
        }
    }
    if ($form['slug'] === 'free-trial') {
        $w = (string) cfg('zapier_webhook', '');
        if (preg_match(ZAPIER_URL_RE, $w)) {
            return $w;
        }
    }
    return null;
}

/** teruskan SEMUA isian ke Zapier. Mengembalikan [ok|null (tidak ada webhook), status] */
function form_forward(array $form, int $sid, array $values, string $aud, string $qs, string $page): array
{
    $hook = form_webhook($form);
    if ($hook === null) {
        return [null, 0];
    }
    $payload = [];
    foreach ($form['cfg']['fields'] as $fl) {
        if (!array_key_exists($fl['key'], $values)) {
            continue;
        }
        $v = $values[$fl['key']];
        $zk = $fl['zkey'] !== '' ? $fl['zkey'] : (($aud === 'adult' && $fl['labelAdult'] !== '') ? $fl['labelAdult'] : $fl['label']);
        $payload[$zk] = is_array($v) ? implode(', ', $v) : (string) $v;
    }
    $payload['form_id'] = $form['zapier_form_id'];
    $payload['form_name'] = $form['zapier_form_name'] !== '' ? $form['zapier_form_name'] : $form['name'];
    $payload['form_slug'] = $form['slug'];
    $payload['submission_id'] = (string) $sid;
    $payload['querystring'] = $qs;
    $payload['Audience'] = $aud === 'adult' ? 'Dewasa & Bisnis' : 'Anak & Remaja';
    $payload['Page'] = $page;
    $payload['Source'] = 'website-baru';
    $ch = curl_init($hook);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($payload), CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false,
    ]);
    $out = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $ok = $out !== false && $status >= 200 && $status < 300;
    try {
        db()->prepare('UPDATE form_submissions SET zapier_ok = ?, zapier_status = ? WHERE id = ?')->execute([$ok ? 1 : 0, max(0, min(32000, $status)), $sid]);
    } catch (Throwable $e) {
        error_log('form zapier flag: ' . $e->getMessage());
    }
    if (!$ok) {
        @file_put_contents(storage_dir() . '/failed-forms.log', json_encode(['time' => date('c'), 'status' => $status, 'form' => $form['slug'], 'submission' => $sid], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    }
    return [$ok, $status];
}

/**
 * Pemeriksaan berlapis untuk berkas unggahan: jenis ditentukan dari ISI berkas (bukan nama/ekstensi dari pengunjung),
 * PDF yang memuat skrip/aksi otomatis ditolak, gambar dibuat ulang lewat GD sehingga muatan tersembunyi
 * (mis. PHP/JS di metadata atau berkas "polyglot") hilang. Berkas disimpan dengan nama acak di folder yang tidak bisa dibuka lewat web.
 */
function form_file_sanitize(string $tmp, string $mime): bool
{
    if ($mime === 'application/pdf') {
        $head = (string) file_get_contents($tmp, false, null, 0, FORM_FILE_MAX);
        if (!str_starts_with($head, '%PDF-') || preg_match('#/(JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|RichMedia|SubmitForm|ImportData)\b#i', $head)) {
            return false;
        }
        return true;
    }
    $info = @getimagesize($tmp);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true) || $info[0] * $info[1] > 40000000) {
        return false;
    }
    if (!function_exists('imagecreatefromstring')) {
        return true;
    }
    $im = @imagecreatefromstring((string) file_get_contents($tmp));
    if (!$im) {
        return false;
    }
    $ok = match ($info[2]) {
        IMAGETYPE_JPEG => @imagejpeg($im, $tmp, 90),
        IMAGETYPE_PNG => @imagepng($im, $tmp, 6),
        default => function_exists('imagewebp') ? @imagewebp($im, $tmp, 90) : true,
    };
    imagedestroy($im);
    return (bool) $ok;
}

/** saran isian: daftar buatan Admin + (opsional) isian yang pernah diisi oleh kiriman lain */
function form_suggest(array $form, string $key, string $q): array
{
    $fl = null;
    foreach ($form['cfg']['fields'] as $x) {
        if ($x['key'] === $key) { $fl = $x; }
    }
    if (!$fl || $fl['type'] !== 'text') {
        return [];
    }
    $q = trim($q);
    $out = [];
    $lists = [$fl['suggest']['list'] ?? []];
    $shared = (string) ($fl['suggest']['shared'] ?? '');
    if ($shared !== '' && ($sl = suggest_list_get($shared))) {
        $lists[] = $sl['items'];
    }
    foreach ($lists as $items) {
        foreach ($items as $s) {
            if ($q === '' || mb_stripos($s, $q) !== false) {
                $out[mb_strtolower($s)] = $s;
            }
        }
    }
    if (!empty($fl['suggest']['learn']) && mb_strlen($q) >= 2) {
        // sumber belajar: isian ini; bila memakai daftar bersama, semua isian di SEMUA formulir yang memakai daftar yang sama
        $pairs = [[(int) $form['id'], $key]];
        if ($shared !== '') {
            foreach (forms_all() as $row) {
                $ff = form_get((int) $row['id']);
                foreach ($ff['cfg']['fields'] ?? [] as $x) {
                    if (($x['suggest']['shared'] ?? '') === $shared && $x['type'] === 'text') {
                        $pairs[] = [(int) $ff['id'], (string) $x['key']];
                    }
                }
            }
        }
        $like = '%' . addcslashes($q, '\\%_') . '%';
        $seen = [];
        foreach ($pairs as [$fid, $k]) {
            if (isset($seen[$fid . ':' . $k])) { continue; }
            $seen[$fid . ':' . $k] = true;
            $st = db()->prepare('SELECT v, COUNT(*) AS n FROM (SELECT JSON_UNQUOTE(JSON_EXTRACT(data, ?)) AS v FROM form_submissions WHERE form_id = ? ORDER BY id DESC LIMIT 5000) t
                WHERE v IS NOT NULL AND v LIKE ? GROUP BY v ORDER BY n DESC LIMIT 8');
            $st->execute(['$."' . $k . '"', $fid, $like]);
            foreach ($st->fetchAll() as $r) {
                $out[mb_strtolower((string) $r['v'])] ??= (string) $r['v'];
            }
        }
    }
    $list = array_values($out);
    usort($list, static function ($a, $b) use ($q) {
        $pa = mb_stripos($a, $q) === 0 ? 0 : 1;
        $pb = mb_stripos($b, $q) === 0 ? 0 : 1;
        return [$pa, mb_strlen($a)] <=> [$pb, mb_strlen($b)];
    });
    return array_slice($list, 0, 8);
}

/* ------------------------------------------------------------------ */
/* Tombol Free Trial seluruh situs (disimpan di dokumen "site")        */
/* ------------------------------------------------------------------ */
const TRIAL_LINK_MODES = ['form', 'whatsapp', 'url'];

function trial_link_default(): array
{
    return ['mode' => 'form', 'form' => 'free-trial', 'waMessage' => 'Halo English Now, saya ingin ikut free trial class.', 'url' => ''];
}

/** @return array{0: array, 1: string[]} */
function validate_trial_link(array $in): array
{
    $errors = [];
    $d = trial_link_default();
    $mode = in_array($in['mode'] ?? '', TRIAL_LINK_MODES, true) ? (string) $in['mode'] : 'form';
    $out = ['mode' => $mode, 'form' => $d['form'], 'waMessage' => clean_text($in['waMessage'] ?? '', 200), 'url' => ''];
    if ($mode === 'form') {
        $slug = strtolower(trim((string) ($in['form'] ?? '')));
        $f = preg_match('/^[a-z0-9][a-z0-9-]{0,60}$/', $slug) ? form_get_by_slug($slug) : null;
        if (!$f) {
            $errors[] = 'Pilih formulir yang sudah berstatus Terbit.';
        } else {
            $out['form'] = $slug;
        }
    } elseif ($mode === 'url') {
        $u = safe_url(trim((string) ($in['url'] ?? '')));
        if ($u === null || !preg_match('#^(https?://|/|\#form:|\#popup:|\#quiz:)#i', $u)) {
            $errors[] = 'Alamat tujuan harus berupa https://… atau jalur seperti /halaman.';
        } else {
            $out['url'] = $u;
        }
    } elseif ($out['waMessage'] === '') {
        $out['waMessage'] = $d['waMessage'];
    }
    return [$out, $errors];
}

function site_trial_link(): array
{
    $l = [];
    try {
        $s = doc_get('site');
        $l = is_array($s) && is_array($s['trialLink'] ?? null) ? $s['trialLink'] : [];
    } catch (Throwable) {
    }
    return array_merge(trial_link_default(), array_intersect_key($l, trial_link_default()));
}

/** alamat tombol Free Trial untuk halaman PHP (artikel, formulir) */
function trial_link_href(string $waNumber): string
{
    $l = site_trial_link();
    if ($l['mode'] === 'whatsapp') {
        return 'https://wa.me/' . $waNumber . '?text=' . rawurlencode((string) $l['waMessage']);
    }
    if ($l['mode'] === 'url' && $l['url'] !== '') {
        return $l['url'];
    }
    $f = null;
    try {
        $f = form_get_by_slug((string) $l['form']);
    } catch (Throwable) {
    }
    return $f && $f['layout'] === 'page' ? '/form/' . $f['slug'] : '#form:' . ($f['slug'] ?? 'free-trial');
}


/* ------------------------------------------------------------------ */
/* Daftar saran bersama (dipakai banyak isian / formulir)              */
/* ------------------------------------------------------------------ */
const SUGGEST_LIST_MAX = 2000;

function suggest_lists_all(): array
{
    $rows = db()->query('SELECT id, slug, name, items, updated_at FROM suggest_lists ORDER BY name')->fetchAll();
    foreach ($rows as &$r) {
        $it = json_decode((string) $r['items'], true);
        $r['items'] = is_array($it) ? array_values(array_filter($it, 'is_string')) : [];
        $r['id'] = (int) $r['id'];
    }
    return $rows;
}

function suggest_list_get(string $slug): ?array
{
    try {
        foreach (suggest_lists_all() as $r) {
            if ($r['slug'] === $slug) {
                return $r;
            }
        }
    } catch (Throwable) {
    }
    return null;
}

/** nama + isi (satu per baris) -> [slug, items, error] */
function validate_suggest_list(string $name, string $text): array
{
    $name = clean_text($name, 100);
    $items = [];
    foreach (preg_split('/\R/u', $text) ?: [] as $line) {
        $v = clean_text($line, 120);
        if ($v !== '' && !isset($items[mb_strtolower($v)])) {
            $items[mb_strtolower($v)] = $v;
        }
    }
    $items = array_values($items);
    $err = '';
    if ($name === '') {
        $err = 'Nama daftar wajib diisi.';
    } elseif (count($items) > SUGGEST_LIST_MAX) {
        $err = 'Maksimal ' . SUGGEST_LIST_MAX . ' entri per daftar.';
    }
    return [$name, $items, $err];
}

/** isian di formulir mana saja yang memakai daftar ini */
function suggest_list_usage(string $slug): array
{
    $used = [];
    foreach (forms_all() as $row) {
        $ff = form_get((int) $row['id']);
        foreach ($ff['cfg']['fields'] ?? [] as $x) {
            if (($x['suggest']['shared'] ?? '') === $slug) {
                $used[] = $ff['name'] . ': ' . $x['label'];
            }
        }
    }
    return $used;
}
