/* eslint-disable */
// Throw-away site for the FORM builder and the public form script. Needs neither MySQL nor a login.
//  - the real forms.php library (validation, public definition, submission rules), public/forms/*.php endpoints and form.php editor page are used as they are;
//  - only storage is replaced: a SQLite file instead of MySQL, Zapier is never called;
//  - pages are served with the real Content-Security-Policies (panel: lib/bootstrap.php, public: articles/_render.php), so a violation shows up here.
//   node test/make-form-harness.mjs      (needs PHP on the PATH)  ->  http://127.0.0.1:8098/t/page.php?slug=...
// Static files (css/js and the panel assets) are symlinked, so a change to them shows without restarting.
// PHP pages are copied at startup: restart after changing a .php file.
import { mkdirSync, cpSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const project = resolve(import.meta.dirname, '../../..');
const pub = join(project, 'public');
const edizon = join(pub, 'edizon');
const root = resolve(import.meta.dirname, '../.harness-forms');
const fwd = (p) => p.replace(/\\/g, '/');
rmSync(root, { recursive: true, force: true });
for (const d of ['edizon/lib', 'forms', 'form', 'articles', 'h', 't', 'storage']) mkdirSync(join(root, d), { recursive: true });
const link = (from, to) => symlinkSync(from, join(root, to));

// static: symlinks
link(join(edizon, 'assets'), 'edizon/assets');
link(join(pub, 'fonts'), 'fonts');
for (const f of ['popup.js', 'forms.css', 'preview.js']) link(join(pub, 'forms', f), 'forms/' + f);
for (const f of ['articles.css', 'template-vars.css']) link(join(pub, 'articles', f), 'articles/' + f);
// PHP pages: real files, copied
for (const f of ['form.php', 'form-preview.php']) cpSync(join(edizon, f), join(root, 'edizon', f));
for (const f of ['def.php', 'submit.php', 'suggest.php']) cpSync(join(pub, 'forms', f), join(root, 'forms', f));

const pubCsp = (readFileSync(join(pub, 'articles/_render.php'), 'utf8').match(/function art_csp\(\): string\s*\{\s*return "([^"]+)";/) || [])[1];
if (!pubCsp) throw new Error('art_csp() not found in articles/_render.php');

writeFileSync(join(root, 'edizon/lib/init.php'), `<?php
// TEST HARNESS ONLY: stands in for lib/init.php (no MySQL, no login).
declare(strict_types=1);
if (!defined('EN_PANEL')) { define('EN_PANEL', true); }
const PANEL_VERSION = 'test';
const ZAPIER_URL_RE = '#^https://hooks\\\\.zapier\\\\.com/#';
$lib = '${fwd(join(edizon, 'lib'))}';
if (!defined('EN_PUBLIC_HARNESS')) {
    $src = (string) file_get_contents($lib . '/bootstrap.php');
    if (!preg_match('/header\\\\("(Content-Security-Policy: [^"]+)"\\\\);/', $src, $m)) { die('CSP line not found in bootstrap.php'); }
    header($m[1]);
    header('X-Frame-Options: DENY'); header('X-Content-Type-Options: nosniff'); header('Cache-Control: no-store');
}
function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function json_for_html(mixed $data): string { return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?: '{}'; }
function json_out(array $data, int $code = 200): never { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function flash_get() { return null; }
function flash_set($k, $m = null) {}
function redirect(string $to): never { header('Location: ' . $to); exit; }
function can_edit_content($u): bool { return true; }
function can_view_leads($u): bool { return true; }
function is_admin($u): bool { return ($u['role'] ?? '') === 'admin'; }
function role_label($r): string { return (string) $r; }
function csrf_token(): string { return 'test'; }
function current_user(): ?array { return ['id' => 1, 'name' => 'Test user', 'role' => 'admin']; }
function require_content_editor(): array { return current_user(); }
function now_utc(): string { return gmdate('Y-m-d H:i:s'); }
function fmt_time(?string $utc): string { return (string) $utc; }
function audit($u, string $a, string $d = ''): void {}
function zapier_hooks(): array { return [['form_id' => 'zf1', 'label' => 'Hook uji']]; }
function zapier_hook_for(string $id): ?string { return null; }
function storage_dir(): string { $d = dirname(__DIR__, 2) . '/storage'; if (!is_dir($d)) { mkdir($d, 0777, true); } return $d; }
function ensure_dir(string $d): void { if (!is_dir($d)) { mkdir($d, 0777, true); } }
function cfg(?string $key = null, mixed $default = null): mixed { return $default; }
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO('sqlite:' . dirname(__DIR__, 2) . '/store.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $pdo->exec('CREATE TABLE IF NOT EXISTS forms (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, name TEXT, layout TEXT, zapier_form_id TEXT DEFAULT "", zapier_form_name TEXT DEFAULT "", status TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INT)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS form_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, form_id INT, data TEXT, audience TEXT, query_string TEXT, page TEXT, zapier_ok INT, zapier_status INT, imported INT DEFAULT 0, created_at TEXT)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS form_files (id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id INT, field_key TEXT, original TEXT, stored TEXT, mime TEXT, bytes INT)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS suggest_lists (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, name TEXT, items TEXT, created_at TEXT, updated_at TEXT)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)');
    }
    return $pdo;
}
require $lib . '/view.php';
require $lib . '/sanitize.php';
require $lib . '/content.php';
require $lib . '/articles.php';
require $lib . '/forms.php';
`);

// public endpoints load this instead of the real forms/_boot.php
writeFileSync(join(root, 'forms/_boot.php'), `<?php
declare(strict_types=1);
define('EN_PUBLIC_HARNESS', true);
require_once dirname(__DIR__) . '/edizon/lib/init.php';
function forms_json(array $body, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}
function forms_site_wa(): string { return '6281200000000'; }
`);
writeFileSync(join(root, 'articles/_boot.php'), `<?php
declare(strict_types=1);
define('EN_PUBLIC_HARNESS', true);
require_once dirname(__DIR__) . '/edizon/lib/init.php';
function art_site(): array { return ['name' => 'Uji']; }
function art_csp(): string { return "${pubCsp}"; }
`);

// helper endpoints for the tests
writeFileSync(join(root, 'h/seed.php'), `<?php
declare(strict_types=1);
define('EN_PUBLIC_HARNESS', true);
require_once dirname(__DIR__) . '/edizon/lib/init.php';
$in = json_decode((string) file_get_contents('php://input'), true);
$u = current_user();
[$clean, $errs] = validate_form_def($in, $u, (int) ($in['id'] ?? 0));
if ($errs) { json_out(['ok' => false, 'errors' => $errs], 422); }
$id = form_save($clean, (int) ($in['id'] ?? 0), 1);
json_out(['ok' => true, 'id' => $id, 'slug' => form_get($id)['slug']]);
`);
writeFileSync(join(root, 'h/reset.php'), `<?php
declare(strict_types=1);
define('EN_PUBLIC_HARNESS', true);
require_once dirname(__DIR__) . '/edizon/lib/init.php';
foreach (['forms', 'form_submissions', 'form_files', 'suggest_lists'] as $t) { db()->exec('DELETE FROM ' . $t); }
db()->exec("DELETE FROM sqlite_sequence");
foreach (glob(storage_dir() . '/rate-forms-*') ?: [] as $f) { @unlink($f); }
json_out(['ok' => true]);
`);
writeFileSync(join(root, 'h/subs.php'), `<?php
declare(strict_types=1);
define('EN_PUBLIC_HARNESS', true);
require_once dirname(__DIR__) . '/edizon/lib/init.php';
$rows = db()->query('SELECT id, form_id, data, audience, page FROM form_submissions ORDER BY id')->fetchAll();
foreach ($rows as &$r) { $r['data'] = json_decode((string) $r['data'], true); }
json_out(['ok' => true, 'rows' => $rows]);
`);
// a plain page that loads the public script like the website does (public CSP, no inline code)
writeFileSync(join(root, 't/page.php'), `<?php
declare(strict_types=1);
$aud = ($_GET['aud'] ?? 'kids') === 'adult' ? 'adult' : 'kids';
$slug = preg_replace('/[^a-z0-9-]/', '', (string) ($_GET['slug'] ?? ''));
header("Content-Security-Policy: ${pubCsp}");
header('Cache-Control: no-store');
?><!doctype html>
<html lang="id" data-audience="<?= $aud ?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Uji formulir</title>
<script src="/forms/popup.js" defer></script></head><body>
<p><a id="open" href="#form:<?= $slug ?>">Buka formulir</a></p>
<?php if (($_GET['mode'] ?? '') === 'page'): ?><div id="mount" data-enf-mount="<?= $slug ?>"></div><?php endif; ?>
</body></html>
`);
console.log('Serving http://127.0.0.1:8098  (Ctrl+C to stop)');
spawn('php', ['-S', '127.0.0.1:8098', '-t', root], { stdio: 'inherit' });
