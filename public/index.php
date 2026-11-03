<?php
/**
 * Beranda. Menyajikan index.html hasil build Next.js, ditambah SEO dari panel (data/home-seo.json).
 * Sengaja TANPA database: cepat, dan beranda tetap tayang walau database bermasalah.
 * Bila berkas SEO belum ada, beranda diberi noindex (aman untuk situs beta).
 */
declare(strict_types=1);

$html = @file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
    http_response_code(404);
    exit('Not found');
}
$cfg = [];
foreach ([__DIR__ . '/api/config.php', dirname(__DIR__) . '/en-config.php'] as $f) {
    if (is_file($f)) {
        $l = require $f;
        if (is_array($l)) {
            $cfg = $l;
            break;
        }
    }
}
$dir = (string) ($cfg['storage_dir'] ?? '');
$dir = $dir !== '' ? rtrim(str_replace('\\', '/', $dir), '/') : __DIR__;
$raw = @file_get_contents($dir . '/data/home-seo.json');
$d = is_string($raw) ? json_decode($raw, true) : null;
$d = is_array($d) ? $d : ['index' => false];

$base = rtrim((string) ($cfg['site_url'] ?? ''), '/');
if (!preg_match('#^https?://[A-Za-z0-9.-]+(:\d+)?$#', $base)) {
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $base = preg_match('/^[A-Za-z0-9.-]+(:\d+)?$/', $host) ? ($https ? 'https://' : 'http://') . $host : '';
}
$e = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$sub = static fn(string $s): string => str_replace('__BASE__', $base, $s);
$title = trim((string) ($d['title'] ?? ''));
$desc = trim((string) ($d['description'] ?? ''));
$allow = !empty($d['index']);
$canonical = trim((string) ($d['canonical'] ?? ''));
$canonical = $canonical !== '' ? $canonical : ($base !== '' ? $base . '/' : '');
$image = $sub((string) ($d['image'] ?? ''));

if ($title !== '') {
    $html = preg_replace('#<title>.*?</title>#s', '<title>' . $e($title) . '</title>', $html, 1) ?? $html;
}
if ($desc !== '') {
    $html = preg_replace('#<meta name="description"[^>]*>#', '<meta name="description" content="' . $e($desc) . '"/>', $html, 1) ?? $html;
}
preg_match('#<title>(.*?)</title>#s', $html, $tm);
preg_match('#<meta name="description" content="([^"]*)"#', $html, $dm);
$t = html_entity_decode($tm[1] ?? '', ENT_QUOTES, 'UTF-8');
$ds = html_entity_decode($dm[1] ?? '', ENT_QUOTES, 'UTF-8');
$site = (string) ($d['siteName'] ?? 'English Now');

$m = [];
$m[] = '<meta name="robots" content="' . ($allow ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,nofollow') . '"/>';
if ($canonical !== '') {
    $m[] = '<link rel="canonical" href="' . $e($canonical) . '"/>';
    $m[] = '<meta property="og:url" content="' . $e($canonical) . '"/>';
}
$m[] = '<meta property="og:type" content="website"/>';
$m[] = '<meta property="og:site_name" content="' . $e($site) . '"/>';
$m[] = '<meta property="og:locale" content="id_ID"/>';
$m[] = '<meta property="og:title" content="' . $e($t) . '"/>';
$m[] = '<meta property="og:description" content="' . $e($ds) . '"/>';
$m[] = '<meta name="twitter:card" content="' . ($image !== '' ? 'summary_large_image' : 'summary') . '"/>';
$m[] = '<meta name="twitter:title" content="' . $e($t) . '"/>';
$m[] = '<meta name="twitter:description" content="' . $e($ds) . '"/>';
if ($image !== '') {
    $m[] = '<meta property="og:image" content="' . $e($image) . '"/>';
    $m[] = '<meta name="twitter:image" content="' . $e($image) . '"/>';
}
if (is_array($d['jsonld'] ?? null)) {
    array_walk_recursive($d['jsonld'], static function (&$v) use ($base) {
        if (is_string($v)) {
            $v = str_replace('__BASE__', $base, $v);
        }
    });
    $m[] = '<script type="application/ld+json">' . json_encode($d['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . '</script>';
}
$m[] = '<!--en-seo-home-->';
$html = preg_replace('#</head>#', implode('', $m) . '</head>', $html, 1) ?? $html;

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache');
if (!$allow) {
    header('X-Robots-Tag: noindex, nofollow');
}
$etag = '"' . md5($html) . '"';
header('ETag: ' . $etag);
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
echo $html;
