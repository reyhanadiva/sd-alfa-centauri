<?php
/** Pengaturan SEO & visibilitas AI tingkat situs: robots.txt, sitemap.xml, llms.txt. */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

function en_create_seo_tables(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS seo_settings (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        data TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function seo_defaults(): array
{
    return [
        // aman secara bawaan: situs beta TIDAK boleh diindeks sampai dinyalakan saat produksi
        'allowIndexing' => false,
        'aiSearch' => true, 'aiUser' => true, 'aiTraining' => true, 'summary' => '', 'links' => [],
        'sitemap' => ['home' => true, 'list' => true, 'articles' => true, 'forms' => []],
        'home' => ['title' => '', 'description' => '', 'keyword' => '', 'image' => '', 'canonical' => ''],
    ];
}

/** token robots.txt per kategori (daftar publik Search Engine Journal, diperiksa 23 Okt 2026; vendor bisa menambah/mengubah) */
function seo_ai_bots(): array
{
    return [
        'search' => ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Meta-WebIndexer', 'DuckAssistBot'],
        'user' => ['ChatGPT-User', 'Claude-User', 'Perplexity-User', 'MistralAI-User'],
        'training' => ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'CCBot', 'Amazonbot', 'Bytespider'],
    ];
}

function seo_settings(): array
{
    try {
        $r = db()->query('SELECT data FROM seo_settings WHERE id = 1')->fetchColumn();
    } catch (Throwable) {
        try {
            en_create_seo_tables(db());
        } catch (Throwable) {
        }
        $r = false;
    }
    $d = is_string($r) ? json_decode($r, true) : null;
    $def = seo_defaults();
    $out = array_merge($def, is_array($d) ? array_intersect_key($d, $def) : []);
    foreach (['sitemap', 'home'] as $k) {
        $out[$k] = array_merge($def[$k], is_array($out[$k]) ? array_intersect_key($out[$k], $def[$k]) : []);
    }
    return $out;
}

/** apakah mesin pencari boleh mengindeks situs ini (false = semua halaman noindex dan robots.txt menolak) */
function seo_index_allowed(): bool
{
    static $v = null;
    return $v ??= !empty(seo_settings()['allowIndexing']);
}

/** gabungkan arahan robots yang diinginkan dengan saklar situs */
function seo_robots(string $wanted): string
{
    return seo_index_allowed() ? $wanted : 'noindex,nofollow';
}

/** formulir halaman yang boleh muncul di hasil pencarian & sitemap (bawaan: tidak ada) */
function seo_form_indexable(string $slug): bool
{
    return in_array($slug, seo_settings()['sitemap']['forms'], true);
}

/**
 * Simpan keluaran yang mahal dibuat (sitemap, llms-full) di berkas selama $ttl detik, supaya kunjungan bot
 * tidak memicu kueri database berulang. Isi memakai token __BASE__ yang diganti per permintaan.
 */
function seo_cached(string $name, callable $build, int $ttl = 300): string
{
    $dir = storage_dir() . '/cache';
    $file = $dir . '/seo-' . preg_replace('/[^a-z0-9-]/', '', $name) . '.txt';
    $mt = is_file($file) ? (int) filemtime($file) : 0;
    if ($mt > time() - $ttl) {
        $c = @file_get_contents($file);
        if ($c !== false && $c !== '') {
            return $c;
        }
    }
    $c = (string) $build('__BASE__');
    if (is_dir($dir) || @mkdir($dir, 0755, true)) {
        $tmp = $file . '.' . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $c) !== false) {
            @rename($tmp, $file);
        }
    }
    return $c;
}

function seo_cache_clear(): void
{
    foreach (glob(storage_dir() . '/cache/seo-*.txt') ?: [] as $f) {
        @unlink($f);
    }
}

/**
 * Tulis data SEO beranda ke data/home-seo.json. Berkas ini dibaca index.php di akar situs TANPA database,
 * jadi beranda tetap cepat dan tetap tayang walau database bermasalah.
 */
function seo_publish_home(array $s): bool
{
    $site = ['name' => 'SD Alfa Centauri', 'tagline' => '', 'logoFull' => ''];
    $same = [];
    try {
        $d = doc_get('site');
        foreach (['name', 'tagline', 'logoFull'] as $k) {
            if (is_array($d) && is_string($d[$k] ?? null) && $d[$k] !== '') {
                $site[$k] = $d[$k];
            }
        }
        $ft = doc_get('footer');
        foreach (is_array($ft['social'] ?? null) ? $ft['social'] : [] as $so) {
            if (is_string($so['url'] ?? null) && preg_match('#^https?://#i', $so['url'])) {
                $same[] = $so['url'];
            }
        }
    } catch (Throwable) {
    }
    $abs = static fn(string $p): string => $p === '' ? '' : (preg_match('#^https?://#i', $p) ? $p : '__BASE__/' . ltrim($p, '/'));
    $h = $s['home'];
    $org = ['@type' => 'Organization', '@id' => '__BASE__/#organization', 'name' => $site['name'], 'url' => '__BASE__/',
        'logo' => ['@type' => 'ImageObject', 'url' => $abs($site['logoFull'] !== '' ? $site['logoFull'] : '/images/logo-horizontal.png')]];
    if ($same) {
        $org['sameAs'] = $same;
    }
    $web = ['@type' => 'WebSite', '@id' => '__BASE__/#website', 'url' => '__BASE__/', 'name' => $site['name'], 'inLanguage' => 'id-ID', 'publisher' => ['@id' => '__BASE__/#organization']];
    $data = [
        'index' => !empty($s['allowIndexing']),
        'title' => $h['title'], 'description' => $h['description'],
        'image' => $abs($h['image']), 'canonical' => $h['canonical'],
        'siteName' => $site['name'],
        'jsonld' => ['@context' => 'https://schema.org', '@graph' => [$org, $web]],
    ];
    $dir = data_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        return false;
    }
    $tmp = $dir . '/home-seo.json.' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
        return false;
    }
    return @rename($tmp, $dir . '/home-seo.json');
}

/** @return array{0: array, 1: string[]} */
function validate_seo_settings(array $in): array
{
    $errors = [];
    $links = [];
    foreach (is_array($in['links'] ?? null) ? array_slice($in['links'], 0, 20) : [] as $i => $l) {
        $label = clean_text($l['label'] ?? '', 80);
        $url = trim((string) ($l['url'] ?? ''));
        $desc = clean_text($l['desc'] ?? '', 160);
        if ($label === '' && $url === '') {
            continue;
        }
        $u = $url !== '' ? safe_url($url) : null;
        if ($label === '' || $u === null || !preg_match('#^(https?://|/)#i', $u)) {
            $errors[] = 'Tautan ' . ($i + 1) . ': isi nama dan alamat (https://… atau /jalur).';
            continue;
        }
        $links[] = ['label' => $label, 'url' => $u, 'desc' => $desc];
    }
    $forms = [];
    foreach (is_array($in['sitemapForms'] ?? null) ? $in['sitemapForms'] : [] as $slug) {
        if (is_string($slug) && preg_match('/^[a-z0-9][a-z0-9-]{0,80}$/', $slug)) {
            $forms[] = $slug;
        }
    }
    $h = is_array($in['home'] ?? null) ? $in['home'] : [];
    $canon = trim((string) ($h['canonical'] ?? ''));
    $canonical = $canon === '' ? '' : (string) clean_link($canon);
    if ($canon !== '' && ($canonical === '' || !preg_match('#^https?://#i', $canonical))) {
        $errors[] = 'Canonical beranda harus berupa alamat lengkap (https://…).';
        $canonical = '';
    }
    return [[
        'allowIndexing' => !empty($in['allowIndexing']),
        'sitemap' => ['home' => !empty($in['smHome']), 'list' => !empty($in['smList']), 'articles' => !empty($in['smArticles']), 'forms' => array_values(array_unique($forms))],
        'home' => [
            'title' => clean_text($h['title'] ?? '', 120), 'description' => clean_text($h['description'] ?? '', 300),
            'keyword' => clean_text($h['keyword'] ?? '', 60), 'image' => teacher_photo($h['image'] ?? '') ?? '', 'canonical' => $canonical,
        ],
        'aiSearch' => !empty($in['aiSearch']), 'aiUser' => !empty($in['aiUser']), 'aiTraining' => !empty($in['aiTraining']),
        'summary' => clean_text($in['summary'] ?? '', 400), 'links' => $links,
    ], $errors];
}

function seo_save(array $clean): void
{
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    try {
        db()->prepare('INSERT INTO seo_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)')->execute([$json]);
    } catch (Throwable) {
        en_create_seo_tables(db());
        db()->prepare('INSERT INTO seo_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)')->execute([$json]);
    }
}
