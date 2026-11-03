/* eslint-disable */
// Sets up a throw-away copy of the article editor page that needs neither MySQL nor a login, and serves it with PHP.
//  - the real article.php, lib/articles.php (validation, sanitiser, renderer), lib/view.php and the built assets are used as they are;
//  - only storage is replaced: "saving" writes one JSON file, and art_get() reads it back through the real art_draft_row();
//  - the page is served with the panel's real Content-Security-Policy header (read from lib/bootstrap.php), so a violation shows up here;
//  - the preview page renders the real art_render_blocks() output with the real public stylesheet and the public CSP.
//   npm run harness      (needs PHP on the PATH; XAMPP ships one)  ->  http://127.0.0.1:8099/edizon/article.php
import { mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const project = resolve(import.meta.dirname, '../../..');
const pub = join(project, 'public');
const edizon = join(pub, 'edizon');
const root = resolve(import.meta.dirname, '../.harness');
const fwd = (p) => p.replace(/\\/g, '/');
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, 'edizon/lib'), { recursive: true });
mkdirSync(join(root, 'uploads'), { recursive: true });
mkdirSync(join(root, 'articles'), { recursive: true });
cpSync(join(edizon, 'assets'), join(root, 'edizon/assets'), { recursive: true });
cpSync(join(pub, 'fonts'), join(root, 'fonts'), { recursive: true });
cpSync(join(pub, 'articles/articles.css'), join(root, 'articles/articles.css'));
cpSync(join(pub, 'articles/template-vars.css'), join(root, 'articles/template-vars.css'));
cpSync(join(edizon, 'article.php'), join(root, 'edizon/article.php'));
cpSync(join(edizon, 'revisions.php'), join(root, 'edizon/revisions.php')); // the real history endpoint (the stand-in init.php below supplies login and database)
cpSync(join(edizon, 'templates.php'), join(root, 'edizon/templates.php')); // the real block-templates endpoint
cpSync(join(edizon, 'article-frame.php'), join(root, 'edizon/article-frame.php')); // the real frame pages for the HTML block
cpSync(join(pub, 'articles/frame.php'), join(root, 'articles/frame.php'));
cpSync(join(pub, 'articles/articles.js'), join(root, 'articles/articles.js'));

// the real lib/articles.php, with only the four database-backed functions renamed so the harness can supply its own
const art = readFileSync(join(edizon, 'lib/articles.php'), 'utf8').replace(/function art_(get_published|get|save|terms)\(/g, 'function real_art_$1(');
writeFileSync(join(root, 'edizon/lib/articles.php'), art);

// sample pictures with different shapes, so cropping and frames are visible
const svg = (w, h, c1, c2, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="rgba(255,255,255,.55)"/><text x="${w / 2}" y="${h - 24}" font-size="28" text-anchor="middle" fill="#123" font-family="sans-serif">${label}</text></svg>`;
writeFileSync(join(root, 'uploads/sample-wide.svg'), svg(1600, 900, '#405fda', '#07a9f8', '16:9 sample'));
writeFileSync(join(root, 'uploads/sample-tall.svg'), svg(900, 1200, '#f4c77b', '#e3d24a', '3:4 sample'));
writeFileSync(join(root, 'uploads/sample-square.svg'), svg(1000, 1000, '#7c3aed', '#ec4899', '1:1 sample'));

writeFileSync(join(root, 'edizon/lib/init.php'), `<?php
// TEST HARNESS ONLY: stands in for lib/init.php (no database, no login).
declare(strict_types=1);
define('EN_PANEL', true);
const PANEL_VERSION = 'test';
$lib = '${fwd(join(edizon, 'lib'))}';
$src = (string) file_get_contents($lib . '/bootstrap.php');
if (!preg_match('/header\\("(Content-Security-Policy: [^"]+)"\\);/', $src, $m)) { die('CSP line not found in bootstrap.php'); }
header($m[1]);
header('X-Frame-Options: DENY'); header('X-Content-Type-Options: nosniff'); header('Cache-Control: no-store');
function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function json_for_html(mixed $data): string { return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?: '{}'; }
function json_out(array $data, int $code = 200): never { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function flash_get() { return null; }
function flash_set($k, $m = null) {}
function redirect(string $to): never { header('Location: ' . $to); exit; }
function forms_all(): array { return []; }
function can_edit_content($u): bool { return true; }
function can_view_leads($u): bool { return true; }
function is_admin($u): bool { return ($u['role'] ?? '') === 'admin'; }
function role_label($r): string { return (string) $r; }
function csrf_token(): string { return 'test'; }
function csrf_require(): void { if ((string) ($_POST['_csrf'] ?? '') !== 'test') { http_response_code(403); echo 'csrf'; exit; } }
function current_user(): ?array { return ['id' => (int) ($_COOKIE['uid'] ?? 1), 'name' => 'Test user', 'role' => ($_COOKIE['role'] ?? 'admin')]; }
function require_content_editor(): array { return current_user(); }
function now_utc(): string { return gmdate('Y-m-d H:i:s'); }
function fmt_time(?string $utc): string { return (string) $utc; }
function audit($u, string $a, string $d = ''): void {}
function seo_settings(): array { return ['aiSearch' => true]; }
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        // a file (not memory): every request of the test server is a new process, and the version history must survive between them
        $pdo = new PDO('sqlite:' . dirname(__DIR__, 2) . '/test.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $pdo->exec('CREATE TABLE IF NOT EXISTS article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
        $pdo->exec("INSERT OR IGNORE INTO users (id, name) VALUES (1, 'Test user'), (2, 'Other user')");
        $pdo->exec('CREATE TABLE IF NOT EXISTS block_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mode TEXT, data TEXT, block_count INTEGER, has_html INTEGER, created_at TEXT, created_by INTEGER)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS item_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, item_id INTEGER, data TEXT, hash TEXT, title TEXT, summary TEXT, saved_at TEXT, saved_by INTEGER)');
    }
    return $pdo;
}
require $lib . '/view.php';
require $lib . '/sanitize.php';
require $lib . '/content.php';
require __DIR__ . '/articles.php';
require $lib . '/revisions.php';
require $lib . '/templates.php';

// storage: one JSON file instead of MySQL
function store_file(): string { return dirname(__DIR__, 2) . '/store.json'; }
function art_save(array $d, int $id, int $userId, bool $sample = false): int
{
    $id = $id > 0 ? $id : 1;
    file_put_contents(store_file(), json_encode(['id' => $id, 'clean' => $d, 'saved' => now_utc()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    return $id;
}
function art_get(int $id): ?array
{
    $f = store_file();
    $s = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    if (!is_array($s) || (int) $s['id'] !== $id) { return null; }
    $row = art_draft_row($s['clean'], ['name' => 'Test user'], $id);
    $row['status'] = $s['clean']['status'];
    $row['updated_at'] = $s['saved'];
    $row['created_at'] = $s['saved'];
    return $row;
}
function art_get_published(int $id): ?array
{
    $a = art_get($id);
    return $a && $a['status'] === 'published' ? $a : null;
}
function art_terms(): array
{
    return ['categories' => [['name' => 'Tips Belajar', 'n' => 3], ['name' => 'Orang Tua', 'n' => 1]], 'tags' => [['name' => 'speaking', 'n' => 2], ['name' => 'anak', 'n' => 4]]];
}
`);

// the public frame page loads this in production (library without a login); here it loads the harness library, whose panel headers
// art_frame_send() must replace
writeFileSync(join(root, 'articles/_boot.php'), `<?php
declare(strict_types=1);
require dirname(__DIR__) . '/edizon/lib/init.php';
`);

// stand-in for upload.php: GET lists three library pictures, POST pretends to store an upload
writeFileSync(join(root, 'edizon/upload.php'), `<?php
declare(strict_types=1);
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['ok' => true, 'items' => [
        ['path' => '/uploads/sample-wide.svg', 'original_name' => 'sample-wide.svg'],
        ['path' => '/uploads/sample-tall.svg', 'original_name' => 'sample-tall.svg'],
        ['path' => '/uploads/sample-square.svg', 'original_name' => 'sample-square.svg'],
    ]]);
    exit;
}
if ((string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '') !== 'test') { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'csrf']); exit; }
$f = $_FILES['file'] ?? null;
$info = $f ? getimagesize($f['tmp_name']) : false;
echo json_encode(['ok' => true, 'path' => '/uploads/sample-wide.svg', 'format' => 'webp', 'bytes' => (int) ($f['size'] ?? 0), 'got' => ['type' => $f['type'] ?? '', 'w' => $info[0] ?? 0, 'h' => $info[1] ?? 0]]);
`);

// preview: same validation as the real article-preview.php (POST), then the real renderer inside a page with the public stylesheet and CSP
const pubCsp = (readFileSync(join(pub, 'articles/_render.php'), 'utf8').match(/function art_csp\(\): string\s*\{\s*return "([^"]+)";/) || [])[1];
if (!pubCsp) throw new Error('art_csp() not found in articles/_render.php');
writeFileSync(join(root, 'edizon/article-preview.php'), `<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $in = json_decode((string) ($_POST['data'] ?? ''), true);
} else { // GET ?id=N&rev=R: an older version from the history (the real article-preview.php does the same)
    $in = rev_get('article', (int) ($_GET['id'] ?? 0), (int) ($_GET['rev'] ?? 0));
}
if (!is_array($in)) { http_response_code(400); echo 'bad data'; exit; }
$in['status'] = 'draft';
[$clean, $errs] = art_validate($in, $u);
define('ART_DRAFT_PREVIEW', true);
header_remove('Content-Security-Policy');
header("Content-Security-Policy: ${pubCsp}");
$aud = ($_GET['aud'] ?? 'kids') === 'adult' ? 'adult' : 'kids';
$a = art_draft_row($clean, $u, (int) ($in['id'] ?? 0));
$blocks = $clean['blocks'];
?><!doctype html>
<html lang="id" data-audience="<?= h($aud) ?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pratinjau</title>
<link rel="stylesheet" href="/articles/template-vars.css?v=test"><link rel="stylesheet" href="/articles/articles.css?v=test"><script src="/articles/articles.js?v=test" defer></script></head><body class="page-article">
<div class="previewbar">Pratinjau perubahan yang belum disimpan<?php if ($errs): ?><ul class="previewnotes"><?php foreach ($errs as $n): ?><li><?= h($n) ?></li><?php endforeach; ?></ul><?php endif; ?></div>
<article class="art<?= ($a['seo']['layout'] ?? '') === 'full' ? ' art-full' : '' ?>"><header class="art-head"><h1><?= h((string) $a['title']) ?></h1></header>
<div class="prose">
<?= art_render_blocks($blocks, false, art_frame_ctx($a, true)) ?>
</div></article></body></html>
`);
// a stand-in for the public article page (published articles only): the real renderer with the public context, public stylesheet, script and CSP
writeFileSync(join(root, 'articles/public-test.php'), `<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';
$a = art_get_published((int) ($_GET['id'] ?? 0));
if (!$a) { http_response_code(404); echo 'not published'; exit; }
header_remove('Content-Security-Policy');
header("Content-Security-Policy: ${pubCsp}");
$blocks = json_decode((string) $a['body'], true) ?: [];
?><!doctype html>
<html lang="id" data-audience="kids"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Publik</title>
<link rel="stylesheet" href="/articles/template-vars.css?v=test"><link rel="stylesheet" href="/articles/articles.css?v=test"><script src="/articles/articles.js?v=test" defer></script></head><body class="page-article">
<article class="art<?= ($a['seo']['layout'] ?? '') === 'full' ? ' art-full' : '' ?>"><header class="art-head"><h1><?= h((string) $a['title']) ?></h1></header>
<div class="prose">
<?= art_render_blocks($blocks, false, art_frame_ctx($a, false)) ?>
</div></article></body></html>
`);
console.log('Serving http://127.0.0.1:8099/edizon/article.php  (Ctrl+C to stop)');
spawn('php', ['-S', '127.0.0.1:8099', '-t', root], { stdio: 'inherit' });
