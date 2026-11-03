<?php
/**
 * Hanya untuk uji di komputer sendiri:  php -S 127.0.0.1:8081 -t public dev/router.php   (npm run panel)
 * Menyajikan /uploads dan /data dari folder storage/ (di luar public/, supaya tidak ikut ter-commit).
 * Di hosting sebenarnya file ini tidak dipakai.
 */
$root = rtrim(str_replace('\\', '/', (string) ($_SERVER['DOCUMENT_ROOT'] ?? (__DIR__ . '/../public'))), '/');
$uri = rawurldecode((string) parse_url((string) $_SERVER['REQUEST_URI'], PHP_URL_PATH));
$storage = realpath(__DIR__ . '/../storage');
foreach (['/uploads/', '/data/'] as $prefix) {
    if (strncmp($uri, $prefix, strlen($prefix)) === 0) {
        $file = $storage ? realpath($storage . $uri) : false;
        $ok = $file && strncmp($file, $storage . DIRECTORY_SEPARATOR, strlen($storage) + 1) === 0
            && is_file($file) && !preg_match('/\.(php|phtml|htaccess)$/i', $file) && basename($file)[0] !== '.';
        if (!$ok) {
            http_response_code(404);
            echo 'Not found';
            return true;
        }
        $types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'json' => 'application/json; charset=utf-8', 'mp3' => 'audio/mpeg', 'm4a' => 'audio/mp4', 'ogg' => 'audio/ogg', 'wav' => 'audio/wav'];
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
        header('X-Content-Type-Options: nosniff');
        if ($prefix === '/data/') {
            header('Cache-Control: no-cache');
            header('Access-Control-Allow-Origin: *');
        }
        readfile($file);
        return true;
    }
}
/* halaman artikel: /articles/ dan /articles/<judul> (di hosting: lihat public/articles/.htaccess) */
if (preg_match('#^/articles/?$#', $uri)) {
    chdir($root . '/articles');
    require $root . '/articles/index.php';
    return true;
}
if (preg_match('#^/articles/([A-Za-z0-9][A-Za-z0-9-]*)/?$#', $uri, $m) && !is_file($root . '/articles/' . $m[1])) {
    $_GET['slug'] = $m[1];
    chdir($root . '/articles');
    require $root . '/articles/view.php';
    return true;
}
if (preg_match('#^/articles/_#', $uri)) {
    http_response_code(404);
    echo 'Not found';
    return true;
}
/* robots.txt, sitemap.xml, llms.txt (di hosting: aturan rewrite di .htaccess akar, lihat panel > SEO & AI) */
$seoRoutes = ['/robots.txt' => 'robots.php', '/sitemap.xml' => 'sitemap.php', '/llms.txt' => 'llms.php', '/llms-full.txt' => 'llms.php'];
if (isset($seoRoutes[$uri])) {
    if ($uri === '/llms-full.txt') {
        $_GET['full'] = '1';
    }
    chdir($root . '/seo');
    require $root . '/seo/' . $seoRoutes[$uri];
    return true;
}
/* halaman formulir: /form/<alamat> (di hosting: lihat public/form/.htaccess) */
if (preg_match('#^/form/([A-Za-z0-9][A-Za-z0-9-]*)/?$#', $uri, $m) && !is_file($root . '/form/' . $m[1])) {
    $_GET['slug'] = $m[1];
    chdir($root . '/form');
    require $root . '/form/view.php';
    return true;
}
return false;
