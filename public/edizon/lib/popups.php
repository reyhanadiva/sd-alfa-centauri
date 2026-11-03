<?php
/**
 * Pembuat pop-up: tabel, validasi, simpan, dan terbitkan ke data/popups.json (dibaca popups.js di website).
 * Dipakai panel (edizon/). Website publik TIDAK menyentuh database: ia hanya membaca popups.json.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const POPUP_MAX_BLOCKS = 80; // termasuk blok di dalam kolom
/** satuan lebar yang boleh ditulis di kolom "Lebar" => [terkecil, terbesar] */
const POPUP_WIDTH_UNITS = ['px' => [200, 2400], '%' => [20, 100], 'vw' => [20, 100], 'vh' => [20, 200], 'vmin' => [20, 100], 'vmax' => [20, 100], 'rem' => [12, 150], 'em' => [12, 150], 'ch' => [20, 200]];
const POPUP_DEFAULT_WIDTH = '520px';

function en_create_popups_table(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS popups (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(80) NOT NULL,
        name VARCHAR(100) NOT NULL,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        config MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by INT UNSIGNED NULL,
        UNIQUE KEY uq_popup_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function popups_ensure(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->query('SELECT 1 FROM popups LIMIT 1');
    } catch (Throwable) {
        en_create_popups_table(db());
    }
}

function popup_default_cfg(): array
{
    return [
        'size' => ['width' => '', 'heightMode' => 'auto', 'height' => 480], // width kosong = 520px
        'position' => 'center', 'overlay' => true, 'closeOnOverlay' => true, 'showClose' => true,
        'style' => [
            'theme' => 'website', 'bgType' => 'solid', 'bg' => '#FFFFFF',
            'grad' => ['kind' => 'linear', 'c1' => '#FFFFFF', 'c2' => '#DDE6FF', 'angle' => 160],
            'image' => ['src' => '', 'overlay' => 35, 'pos' => 'center'],
            'color' => '#1B2559', 'accent' => '', 'radius' => 24, 'padding' => 24,
        ],
        'blocks' => [],
        'triggers' => ['load' => ['on' => false, 'delay' => 5], 'scroll' => ['on' => false, 'percent' => 50], 'exit' => ['on' => false]],
        'pages' => ['mode' => 'all', 'list' => []],
        'audience' => 'all', 'devices' => 'all',
        'frequency' => ['mode' => 'session', 'days' => 7],
        'schedule' => ['start' => '', 'end' => ''],
    ];
}

function popup_row_decode(array $r): array
{
    $cfg = json_decode((string) $r['config'], true);
    $r['cfg'] = array_replace_recursive(popup_default_cfg(), is_array($cfg) ? $cfg : []);
    if (is_array($cfg) && isset($cfg['blocks'])) {
        $r['cfg']['blocks'] = is_array($cfg['blocks']) ? popup_blocks_upgrade($cfg['blocks']) : [];
    }
    $w = popup_width_parse($r['cfg']['size']['width'] ?? '')[0];
    $r['cfg']['size']['width'] = $w ?? '';
    if (is_array($cfg) && isset($cfg['pages']['list'])) {
        $r['cfg']['pages']['list'] = is_array($cfg['pages']['list']) ? $cfg['pages']['list'] : [];
    }
    $r['id'] = (int) $r['id'];
    return $r;
}

function popup_get(int $id): ?array
{
    popups_ensure();
    $st = db()->prepare('SELECT * FROM popups WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ? popup_row_decode($r) : null;
}

function popup_get_by_slug(string $slug): ?array
{
    popups_ensure();
    $st = db()->prepare('SELECT * FROM popups WHERE slug = ?');
    $st->execute([$slug]);
    $r = $st->fetch();
    return $r ? popup_row_decode($r) : null;
}

function popups_all(): array
{
    popups_ensure();
    return db()->query('SELECT id, slug, name, status, config, updated_at FROM popups ORDER BY id')->fetchAll();
}

/** ringkasan pemicu untuk daftar di panel */
function popup_trigger_summary(array $cfg): string
{
    $t = $cfg['triggers'] ?? [];
    $out = ['klik tombol/tautan'];
    if (!empty($t['load']['on'])) {
        $out[] = 'saat dibuka (' . (int) ($t['load']['delay'] ?? 0) . ' dtk)';
    }
    if (!empty($t['scroll']['on'])) {
        $out[] = 'menggulir ' . (int) ($t['scroll']['percent'] ?? 50) . '%';
    }
    if (!empty($t['exit']['on'])) {
        $out[] = 'mau keluar (desktop)';
    }
    return implode(', ', $out);
}

function popup_color(mixed $v, string $def, bool $allowEmpty = false): string
{
    $s = is_string($v) ? trim($v) : '';
    if ($s === '' && $allowEmpty) {
        return '';
    }
    return preg_match('/^#[0-9a-fA-F]{6}$/', $s) ? strtoupper($s) : $def;
}

function popup_int(mixed $v, int $min, int $max, int $def): int
{
    if (!is_numeric($v)) {
        return $def;
    }
    return max($min, min($max, (int) $v));
}

/** tujuan tombol: alamat web, jalur situs, #bagian, #form:slug, #popup:slug, #close, mailto:/tel: */
function popup_link(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    if (preg_match('/^\[(form|popup|quiz):([A-Za-z0-9-]{1,60})\]$/', $s, $m)) {
        return '#' . $m[1] . ':' . strtolower($m[2]);
    }
    if (preg_match('/^#(form|popup|quiz):([A-Za-z0-9-]{1,60})$/', $s, $m)) {
        return '#' . $m[1] . ':' . strtolower($m[2]);
    }
    if ($s === '#close') {
        return '#close';
    }
    return safe_url($s);
}

/**
 * Lebar pop-up / halaman hasil: angka + satuan (px, %, vw, vh, vmin, vmax, rem, em, ch). Tanpa satuan = px. Kosong = bawaan (520px).
 * @return array{0: ?string, 1: ?string}  [nilai baku ('' = kosong) atau null bila salah, pesan galat atau null]
 */
function popup_width_parse(mixed $v): array
{
    if (is_int($v) || is_float($v)) {
        $s = (string) $v;
    } else {
        $s = is_string($v) ? $v : '';
    }
    $s = strtolower(trim(str_replace(',', '.', $s)));
    if ($s === '') {
        return ['', null];
    }
    $hint = 'Tulis angka dengan satuan, mis. 520px, 80vw, 70vh, 40rem, atau 90% (satuan: ' . implode(', ', array_keys(POPUP_WIDTH_UNITS)) . '). Tanpa satuan dianggap px. Kosongkan untuk ' . POPUP_DEFAULT_WIDTH . '.';
    if (!preg_match('/^(\d{1,4}(?:\.\d{1,2})?)\s*(px|%|vw|vh|vmin|vmax|rem|em|ch)?$/', $s, $m)) {
        return [null, 'Lebar tidak dikenali. ' . $hint];
    }
    $unit = ($m[2] ?? '') !== '' ? $m[2] : 'px';
    $n = (float) $m[1];
    [$lo, $hi] = POPUP_WIDTH_UNITS[$unit];
    if ($n < $lo || $n > $hi) {
        return [null, "Lebar dalam $unit harus antara $lo dan $hi. $hint"];
    }
    return [rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.') . $unit, null];
}

/** nilai lebar siap pakai di CSS (kosong -> 520px) */
function popup_width_css(mixed $v): string
{
    $w = popup_width_parse($v)[0];
    return $w === null || $w === '' ? POPUP_DEFAULT_WIDTH : $w;
}

/**
 * Isi lama (sebelum pop-up memakai himpunan blok artikel) diubah ke bentuk baru: Judul -> judul (h), Sub judul dan Paragraf -> teks kaya,
 * gambar "full" -> "wide". Aman dipanggil berulang kali pada isi yang sudah baru.
 */
function popup_blocks_upgrade(mixed $raw): array
{
    $esc = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $out = [];
    foreach (is_array($raw) ? array_values($raw) : [] as $b) {
        if (!is_array($b)) {
            continue;
        }
        $id = isset($b['id']) ? ['id' => $b['id']] : [];
        $al = in_array($b['align'] ?? '', ['center', 'right'], true) ? (string) $b['align'] : '';
        $cls = $al !== '' ? ' class="ta-' . $al . '"' : '';
        switch ($b['t'] ?? '') {
            case 'title':
                $b = $id + ['t' => 'h', 'level' => 2, 'text' => (string) ($b['text'] ?? ''), 'align' => $al !== '' ? $al : 'left'];
                break;
            case 'subtitle':
                $b = $id + ['t' => 'text', 'html' => '<p' . $cls . '><span class="fs-lg">' . $esc((string) ($b['text'] ?? '')) . '</span></p>'];
                break;
            case 'p':
                $b = $id + ['t' => 'text', 'html' => '<p' . $cls . '>' . (string) ($b['html'] ?? '') . '</p>'];
                break;
            case 'img':
                if (($b['size'] ?? '') === 'full') {
                    $b['size'] = 'wide';
                }
                break;
            case 'columns':
                $b['cols'] = array_map(static fn($c) => popup_blocks_upgrade($c), is_array($b['cols'] ?? null) ? array_values($b['cols']) : []);
                break;
        }
        $out[] = $b;
    }
    return $out;
}

/**
 * Blok pop-up dan halaman hasil kuis = blok artikel (art_validate_blocks) + beberapa blok khusus lewat "hook".
 * Opsi: extra ['score','sections'] (khusus hasil kuis), vars (tujuan boleh memuat {variabel}), prior (sidik jari blok HTML yang sudah tersimpan), what.
 * @return array{0: array, 1: string[]}
 */
function popup_validate_blocks(mixed $raw, bool $admin, array $opts = []): array
{
    $extra = is_array($opts['extra'] ?? null) ? $opts['extra'] : [];
    $hook = static function (string $t, array $b, string $id, string $lab, int $depth, array &$errors) use ($extra): ?array {
        $align = in_array($b['align'] ?? '', ['left', 'center', 'right'], true) ? (string) $b['align'] : 'left';
        switch ($t) {
            case 'form':
                $slug = strtolower(trim((string) ($b['slug'] ?? '')));
                if ($slug === '' || !preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $slug)) {
                    $errors[] = "$lab (formulir): pilih formulirnya.";
                } elseif (!function_exists('form_get_by_slug') || !form_get_by_slug($slug, false)) {
                    $errors[] = "$lab (formulir): formulir \"$slug\" tidak ditemukan.";
                } else {
                    return [['id' => $id, 't' => 'form', 'slug' => $slug]];
                }
                return [];
            case 'spacer':
                return [['id' => $id, 't' => 'spacer', 'h' => popup_int($b['h'] ?? 24, 8, 120, 24)]];
            case 'score':
                return in_array('score', $extra, true) ? [['id' => $id, 't' => 'score', 'style' => in_array($b['style'] ?? '', ['card', 'plain'], true) ? $b['style'] : 'card', 'align' => $align]] : [];
            case 'sections':
                return in_array('sections', $extra, true) ? [['id' => $id, 't' => 'sections', 'title' => clean_text($b['title'] ?? '', 100)]] : [];
        }
        return null;
    };
    $o = [
        'max' => POPUP_MAX_BLOCKS, 'what' => (string) ($opts['what'] ?? 'pop-up'), 'popup' => true, 'vars' => !empty($opts['vars']),
        'link' => static fn(string $u): ?string => popup_link($u), 'hook' => $hook,
    ];
    [$blocks, $errors] = art_validate_blocks(popup_blocks_upgrade($raw), $admin, is_array($opts['prior'] ?? null) ? $opts['prior'] : [], $o);
    popup_check_links($blocks, $errors);
    return [$blocks, $errors];
}

/** tombol (dan tombol kartu) yang membuka formulir / pop-up / kuis: tujuannya harus ada */
function popup_check_links(array $blocks, array &$errors): void
{
    $seen = [];
    $check = static function (string $url, string $label) use (&$errors, &$seen): void {
        if ($url === '' || str_contains($url, '{') || !preg_match('/^#(form|popup|quiz):([a-z0-9-]+)$/', $url, $m)) {
            return;
        }
        $kind = $m[1];
        $slug = $m[2];
        if (isset($seen[$url])) {
            return;
        }
        $seen[$url] = true;
        try {
            $exists = $kind === 'form' ? (function_exists('form_get_by_slug') && form_get_by_slug($slug, false))
                : ($kind === 'quiz' ? (function_exists('quiz_get_by_slug') && quiz_get_by_slug($slug, false)) : popup_get_by_slug($slug));
        } catch (Throwable) {
            $exists = true; // tabel belum ada di lingkungan uji: jangan menolak
        }
        if (!$exists) {
            $errors[] = 'Tombol "' . $label . '": ' . ['form' => 'formulir', 'quiz' => 'kuis', 'popup' => 'pop-up'][$kind] . " \"$slug\" tidak ditemukan.";
        }
    };
    art_walk_blocks($blocks, static function (array $b) use ($check): void {
        if (($b['t'] ?? '') === 'button') {
            $check((string) ($b['url'] ?? ''), (string) ($b['label'] ?? ''));
        } elseif (($b['t'] ?? '') === 'cards') {
            foreach ((array) ($b['items'] ?? []) as $it) {
                $check((string) ($it['url'] ?? ''), (string) ($it['label'] ?? ''));
            }
        }
    });
}

/** id blok HTML tingkat atas => sidik jari kodenya, dari daftar blok yang sudah tersimpan (Editor hanya boleh membiarkan blok HTML apa adanya) */
function popup_html_prior(array $blocks): array
{
    $prior = [];
    foreach ($blocks as $b) {
        if (is_array($b) && ($b['t'] ?? '') === 'html' && is_string($b['id'] ?? null) && is_string($b['code'] ?? null)) {
            $prior[$b['id']] = art_html_fp($b['code'], !empty($b['scripts']));
        }
    }
    return $prior;
}

/** blok HTML tingkat atas dengan id tertentu dari daftar blok */
function popup_find_html_block(array $blocks, string $bid): ?array
{
    foreach ($blocks as $b) {
        if (is_array($b) && ($b['t'] ?? '') === 'html' && ($b['id'] ?? null) === $bid && is_string($b['code'] ?? null)) {
            return $b;
        }
    }
    return null;
}

/**
 * Blok siap kirim ke pengunjung: kode blok HTML TIDAK ikut (hanya alamat bingkainya), dan alamat video diurai.
 * @param ?callable $frame fn(string $blockId, string $hash): string  alamat bingkai; kosong/null = blok HTML dibuang
 */
function popup_public_blocks(array $blocks, ?callable $frame): array
{
    $out = [];
    foreach ($blocks as $b) {
        if (!is_array($b)) {
            continue;
        }
        switch ($b['t'] ?? '') {
            case 'html':
                $v = substr(art_html_fp((string) ($b['code'] ?? ''), !empty($b['scripts'])), 0, 8);
                $src = $frame !== null ? $frame((string) $b['id'], $v) : '';
                if ($src === '') {
                    continue 2;
                }
                $out[] = ['id' => $b['id'], 't' => 'html', 'src' => $src, 'scripts' => !empty($b['scripts']), 'h' => $b['h'] ?? 'auto', 'size' => $b['size'] ?? 'normal', 'caption' => $b['caption'] ?? '', 'v' => $v];
                continue 2;
            case 'video':
                $vi = art_video_info((string) ($b['url'] ?? ''));
                if (!$vi) {
                    continue 2;
                }
                $b['kind'] = $vi['kind'];
                $b['src'] = $vi['src'];
                break;
            case 'columns':
                $b['cols'] = array_map(static fn($c) => popup_public_blocks((array) $c, $frame), (array) ($b['cols'] ?? []));
                break;
        }
        $out[] = $b;
    }
    return $out;
}

/** alamat bingkai untuk blok HTML pop-up: situs publik (hanya pop-up Terbit) */
function popup_frame_public(string $slug): callable
{
    return static fn(string $bid, string $v): string => '/forms/frame.php?p=' . rawurlencode($slug) . '&b=' . rawurlencode($bid) . '&v=' . $v;
}

/** alamat bingkai untuk blok HTML pop-up: pratinjau di panel (butuh login, pop-up yang sudah disimpan) */
function popup_frame_panel(int $id, int $rev = 0): callable
{
    $panel = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/edizon/x.php'))), '/');
    return static fn(string $bid, string $v): string => $panel . '/popup-frame.php?id=' . $id . '&b=' . rawurlencode($bid) . '&v=' . $v . ($rev > 0 ? '&rev=' . $rev : '');
}

/** @return array{0: array, 1: string[]} [baris untuk disimpan, galat] */
function validate_popup(array $in, array $user, int $ignoreId = 0): array
{
    $errors = [];
    $name = clean_text($in['name'] ?? '', 100);
    if ($name === '') {
        $errors[] = 'Nama pop-up wajib diisi.';
    }
    $status = ($in['status'] ?? '') === 'published' ? 'published' : 'draft';
    $slug = art_slugify(trim((string) ($in['slug'] ?? '')) !== '' ? (string) $in['slug'] : $name, 60);
    if ($slug === '' || !preg_match('/^[a-z0-9][a-z0-9-]*$/', $slug)) {
        $errors[] = 'Alamat (slug) pop-up tidak valid.';
        $slug = 'popup';
    }
    $d = popup_default_cfg();
    $sz = is_array($in['size'] ?? null) ? $in['size'] : [];
    [$wCss, $wErr] = popup_width_parse($sz['width'] ?? '');
    if ($wErr !== null) {
        $errors[] = $wErr;
    }
    $d['size'] = [
        'width' => $wCss ?? '',
        'heightMode' => ($sz['heightMode'] ?? '') === 'fixed' ? 'fixed' : 'auto',
        'height' => popup_int($sz['height'] ?? null, 160, 900, 480),
    ];
    $d['position'] = in_array($in['position'] ?? '', ['center', 'bottom-right', 'bottom-left'], true) ? $in['position'] : 'center';
    $d['overlay'] = !empty($in['overlay']);
    $d['closeOnOverlay'] = !empty($in['closeOnOverlay']);
    $d['showClose'] = !empty($in['showClose']);
    if (!$d['showClose'] && !$d['closeOnOverlay']) {
        // supaya pengunjung tidak terkunci
        $errors[] = 'Aktifkan tombol tutup (X) atau "tutup saat klik di luar", supaya pengunjung bisa menutup pop-up. Tombol dengan tujuan #close juga bisa dipakai, tetapi tombol X lebih aman.';
    }
    $st = is_array($in['style'] ?? null) ? $in['style'] : [];
    $theme = ($st['theme'] ?? '') === 'custom' ? 'custom' : 'website';
    $bgType = in_array($st['bgType'] ?? '', ['solid', 'gradient', 'image'], true) ? $st['bgType'] : 'solid';
    $gr = is_array($st['grad'] ?? null) ? $st['grad'] : [];
    $im = is_array($st['image'] ?? null) ? $st['image'] : [];
    $src = teacher_photo($im['src'] ?? '');
    if ($src === null) {
        $errors[] = 'Gambar latar tidak valid. Pilih atau unggah lewat panel.';
        $src = '';
    }
    if ($theme === 'custom' && $bgType === 'image' && $src === '') {
        $errors[] = 'Latar bergambar dipilih, tetapi gambarnya belum dipilih.';
    }
    $d['style'] = [
        'theme' => $theme,
        'bgType' => $bgType,
        'bg' => popup_color($st['bg'] ?? '', '#FFFFFF'),
        'grad' => [
            'kind' => ($gr['kind'] ?? '') === 'radial' ? 'radial' : 'linear',
            'c1' => popup_color($gr['c1'] ?? '', '#FFFFFF'),
            'c2' => popup_color($gr['c2'] ?? '', '#DDE6FF'),
            'angle' => popup_int($gr['angle'] ?? null, 0, 360, 160),
        ],
        'image' => [
            'src' => $src,
            'overlay' => popup_int($im['overlay'] ?? null, 0, 80, 35),
            'pos' => in_array($im['pos'] ?? '', ['center', 'top', 'bottom'], true) ? $im['pos'] : 'center',
        ],
        'color' => popup_color($st['color'] ?? '', '#1B2559'),
        'accent' => popup_color($st['accent'] ?? '', '', true),
        'radius' => popup_int($st['radius'] ?? null, 0, 48, 24),
        'padding' => popup_int($st['padding'] ?? null, 0, 56, 24),
    ];
    $prior = [];
    if ($ignoreId > 0 && ($old = popup_get($ignoreId))) {
        $prior = popup_html_prior((array) $old['cfg']['blocks']);
    }
    [$d['blocks'], $be] = popup_validate_blocks($in['blocks'] ?? [], is_admin($user), ['prior' => $prior]);
    $errors = array_merge($errors, $be);
    if (!$d['blocks']) {
        $errors[] = 'Isi pop-up masih kosong. Tambahkan minimal satu blok (mis. Judul).';
    }

    $tr = is_array($in['triggers'] ?? null) ? $in['triggers'] : [];
    $d['triggers'] = [
        'load' => ['on' => !empty($tr['load']['on']), 'delay' => popup_int($tr['load']['delay'] ?? null, 0, 300, 5)],
        'scroll' => ['on' => !empty($tr['scroll']['on']), 'percent' => popup_int($tr['scroll']['percent'] ?? null, 5, 95, 50)],
        'exit' => ['on' => !empty($tr['exit']['on'])],
    ];
    $pg = is_array($in['pages'] ?? null) ? $in['pages'] : [];
    $mode = in_array($pg['mode'] ?? '', ['all', 'include', 'exclude'], true) ? $pg['mode'] : 'all';
    $list = [];
    foreach (is_array($pg['list'] ?? null) ? $pg['list'] : [] as $p) {
        $p = trim((string) $p);
        if ($p === '') {
            continue;
        }
        if (!preg_match('#^/[A-Za-z0-9/_\-.*]{0,120}$#', $p)) {
            $errors[] = "Halaman \"$p\" tidak valid. Tulis jalur yang diawali /, mis. / atau /articles/* (tanda * di akhir = semua halaman di bawahnya).";
            continue;
        }
        $list[] = $p;
    }
    $list = array_slice(array_values(array_unique($list)), 0, 40);
    if ($mode !== 'all' && !$list) {
        $errors[] = 'Daftar halaman masih kosong. Isi minimal satu jalur, atau pilih "Semua halaman".';
    }
    $d['pages'] = ['mode' => $mode, 'list' => $list];
    $d['audience'] = in_array($in['audience'] ?? '', ['all', 'kids', 'adult'], true) ? $in['audience'] : 'all';
    $d['devices'] = in_array($in['devices'] ?? '', ['all', 'desktop', 'mobile'], true) ? $in['devices'] : 'all';
    $fq = is_array($in['frequency'] ?? null) ? $in['frequency'] : [];
    $d['frequency'] = [
        'mode' => in_array($fq['mode'] ?? '', ['always', 'session', 'days'], true) ? $fq['mode'] : 'session',
        'days' => popup_int($fq['days'] ?? null, 1, 365, 7),
    ];
    $sc = is_array($in['schedule'] ?? null) ? $in['schedule'] : [];
    $dt = static function (mixed $v): string {
        $s = is_string($v) ? trim($v) : '';
        return preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $s) ? $s : '';
    };
    $d['schedule'] = ['start' => $dt($sc['start'] ?? ''), 'end' => $dt($sc['end'] ?? '')];
    if ($d['schedule']['start'] !== '' && $d['schedule']['end'] !== '' && $d['schedule']['end'] <= $d['schedule']['start']) {
        $errors[] = 'Waktu selesai harus setelah waktu mulai.';
    }
    return [['name' => $name, 'slug' => $slug, 'status' => $status, 'cfg' => $d], $errors];
}

function popup_save(array $d, int $id, int $userId): int
{
    popups_ensure();
    $pdo = db();
    $slug = $d['slug'];
    $base = $slug;
    $n = 1;
    while (true) {
        $st = $pdo->prepare('SELECT id FROM popups WHERE slug = ?' . ($id ? ' AND id <> ' . (int) $id : ''));
        $st->execute([$slug]);
        if (!$st->fetchColumn()) {
            break;
        }
        $slug = substr($base, 0, 70) . '-' . (++$n);
    }
    $cfg = json_encode($d['cfg'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $now = now_utc();
    if ($id > 0) {
        $pdo->prepare('UPDATE popups SET slug=?, name=?, status=?, config=?, updated_at=?, updated_by=? WHERE id=?')->execute([$slug, $d['name'], $d['status'], $cfg, $now, $userId, $id]);
    } else {
        $pdo->prepare('INSERT INTO popups (slug, name, status, config, created_at, updated_at, updated_by) VALUES (?,?,?,?,?,?,?)')->execute([$slug, $d['name'], $d['status'], $cfg, $now, $now, $userId]);
        $id = (int) $pdo->lastInsertId();
    }
    popups_publish();
    rev_snapshot('popup', $id, popup_to_editor(popup_get($id)), $userId);
    return $id;
}

function popup_delete(int $id): void
{
    popups_ensure();
    db()->prepare('DELETE FROM popups WHERE id = ?')->execute([$id]);
    rev_purge('popup', $id);
    popups_publish();
}

/** public/website membaca file ini; hanya pop-up berstatus Terbit yang masuk */
function popups_publish(): void
{
    popups_ensure();
    $list = [];
    foreach (db()->query("SELECT slug, name, config FROM popups WHERE status = 'published' ORDER BY id")->fetchAll() as $r) {
        $cfg = json_decode((string) $r['config'], true);
        if (is_array($cfg)) {
            $list[] = popup_public_def(['slug' => $r['slug'], 'name' => $r['name'], 'cfg' => popup_cfg_merge($cfg)], popup_frame_public((string) $r['slug']));
        }
    }
    $dir = data_dir();
    ensure_dir($dir);
    $final = $dir . '/popups.json';
    $tmp = $dir . '/popups.json.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode(['version' => 1, 'updated' => gmdate('c'), 'popups' => $list], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || @file_put_contents($tmp, $json, LOCK_EX) === false) {
        throw new RuntimeException('Tidak bisa menulis popups.json');
    }
    if (!@rename($tmp, $final)) {
        if (!@copy($tmp, $final)) {
            @unlink($tmp);
            throw new RuntimeException('Tidak bisa memperbarui popups.json');
        }
        @unlink($tmp);
    }
}

/** untuk editor & pratinjau */
function popup_to_editor(?array $p): array
{
    $cfg = $p ? $p['cfg'] : popup_default_cfg();
    return ['id' => $p ? $p['id'] : 0, 'name' => $p ? $p['name'] : '', 'slug' => $p ? $p['slug'] : '', 'status' => $p ? $p['status'] : 'draft'] + $cfg;
}

/** isi tersimpan + bawaan, dengan isi lama diubah ke bentuk baru */
function popup_cfg_merge(array $cfg): array
{
    $m = array_replace_recursive(popup_default_cfg(), $cfg);
    $m['blocks'] = popup_blocks_upgrade($cfg['blocks'] ?? []);
    $m['pages']['list'] = is_array($cfg['pages']['list'] ?? null) ? $cfg['pages']['list'] : [];
    $m['size']['width'] = popup_width_parse($m['size']['width'] ?? '')[0] ?? '';
    return $m;
}

/**
 * definisi yang dipakai popups.js (juga untuk pratinjau draf): tanpa kode blok HTML.
 * @param ?callable $frame fn(blockId, hash): alamat bingkai. Kosong = blok HTML tidak ikut.
 */
function popup_public_def(array $p, ?callable $frame = null): array
{
    $cfg = $p['cfg'];
    $cfg['blocks'] = popup_public_blocks((array) ($cfg['blocks'] ?? []), $frame);
    $cfg['size']['width'] = popup_width_css($cfg['size']['width'] ?? '');
    return ['slug' => $p['slug'], 'name' => $p['name'], 'cfg' => $cfg];
}
