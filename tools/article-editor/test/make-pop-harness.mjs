/* eslint-disable */
// Throw-away pages for the pop-up / quiz-result editor, served with PHP (only to send the panel's real Content-Security-Policy):
//   /edizon/pop-editor.php   the editor page: the real panel.css, article-editor.css and the built bundle, nothing else (create the editor from the test)
//   /real.php                the public runtime (forms/popups.js + popups.css) with a test pop-up, to compare the editor's look with the real pop-up
//   npm run harness:pop      ->  http://127.0.0.1:8097/edizon/pop-editor.php
import { mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const project = resolve(import.meta.dirname, '../../..');
const pub = join(project, 'public');
const edizon = join(pub, 'edizon');
const root = resolve(import.meta.dirname, '../.harness-pop');
const fwd = (p) => p.replace(/\\/g, '/');
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, 'edizon'), { recursive: true });
mkdirSync(join(root, 'articles'), { recursive: true });
mkdirSync(join(root, 'forms'), { recursive: true });
mkdirSync(join(root, 'data'), { recursive: true });
cpSync(join(edizon, 'assets'), join(root, 'edizon/assets'), { recursive: true });
cpSync(join(pub, 'fonts'), join(root, 'fonts'), { recursive: true });
cpSync(join(pub, 'articles/template-vars.css'), join(root, 'articles/template-vars.css'));
cpSync(join(pub, 'forms/popups.css'), join(root, 'forms/popups.css'));
cpSync(join(pub, 'forms/popups.js'), join(root, 'forms/popups.js'));

const csp = `<?php
$src = (string) file_get_contents('${fwd(join(edizon, 'lib/bootstrap.php'))}');
if (!preg_match('/header\\\\("(Content-Security-Policy: [^"]+)"\\\\);/', $src, $m)) { die('CSP line not found'); }
header($m[1]); header('Cache-Control: no-store');
?>`;
writeFileSync(join(root, 'edizon/pop-editor.php'), csp + `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pop-up editor test</title>
<link rel="stylesheet" href="/edizon/assets/panel.css?v=t">
<link rel="stylesheet" href="/articles/template-vars.css?v=t">
<link rel="stylesheet" href="/edizon/assets/article-editor.css?v=t">
</head><body class="wide"><main><div id="editor"></div></main>
<script src="/edizon/assets/ed.js"></script><script src="/edizon/assets/article-editor.js"></script></body></html>
`);

// a test pop-up for the real runtime (/data/popups.json is where every public page reads them)
const popup = {
  slug: 't1', name: 'Test',
  cfg: {
    position: 'center', overlay: true, showClose: true,
    size: { width: '520px' }, style: { theme: 'site' },
    blocks: [
      { id: 'h1', t: 'h', level: 2, text: 'Judul pop-up', align: 'left' },
      { id: 't1', t: 'text', html: '<p>Isi teks pop-up.</p>' },
      { id: 'b1', t: 'button', label: 'Coba kelas gratis', url: '#close', style: 'solid', align: 'left', full: false },
      { id: 'b2', t: 'button', label: 'Tutup', url: '#close', style: 'outline', align: 'left', full: false },
    ],
  },
};
writeFileSync(join(root, 'data/popups.json'), JSON.stringify({ popups: [popup] }));
writeFileSync(join(root, 'real.php'), csp + `<!doctype html>
<html lang="id" data-audience="kids"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Real runtime</title>
<style>body{margin:0;font:16px/1.5 system-ui}</style>
<link rel="stylesheet" href="/forms/popups.css?v=t"></head><body><p>page</p><script src="/forms/popups.js"></script></body></html>
`);

// ---- the two panel builder pages (popup-builder.js, quiz-builder.js) on the real validators: saving posts to the same page, which runs validate_popup / validate_quiz (no MySQL) ----
writeFileSync(join(root, 'edizon/stub.php'), `<?php
define('EN_PANEL', true);
$lib = '${fwd(join(edizon, 'lib'))}';
require $lib . '/sanitize.php';
require $lib . '/content.php';
function now_utc(): string { return gmdate('Y-m-d H:i:s'); }
function is_admin(array $u): bool { return ($u['role'] ?? '') === 'admin'; }
function cfg(?string $key = null, mixed $default = null): mixed { return $default; }
function form_get_by_slug(string $slug, bool $publishedOnly = true): ?array { return $slug === 'free-trial' ? ['slug' => $slug, 'layout' => 'popup', 'name' => 'Free trial'] : null; }
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        // a file (not memory): every request of the test server is a new process, and the version history must survive between them
        $pdo = new PDO('sqlite:' . dirname(__DIR__) . '/data/test.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        foreach ([
            'CREATE TABLE IF NOT EXISTS article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)',
            'CREATE TABLE IF NOT EXISTS popups (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE IF NOT EXISTS quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, zapier_form_id TEXT, zapier_form_name TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE IF NOT EXISTS quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER)',
            'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)',
            'CREATE TABLE IF NOT EXISTS item_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, item_id INTEGER, data TEXT, hash TEXT, title TEXT, summary TEXT, saved_at TEXT, saved_by INTEGER)',
            'CREATE TABLE IF NOT EXISTS block_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mode TEXT, data TEXT, block_count INTEGER, has_html INTEGER, created_at TEXT, created_by INTEGER)',
            "INSERT OR IGNORE INTO users (id, name) VALUES (1, 'Test user'), (2, 'Other user')",
        ] as $q) { $pdo->exec($q); }
    }
    return $pdo;
}
require $lib . '/articles.php';
require $lib . '/popups.php';
require $lib . '/quizzes.php';
require $lib . '/revisions.php';
require $lib . '/templates.php';
function json_out(array $data, int $code = 200): never { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fmt_time(?string $utc): string { return (string) $utc; }
function audit($u, string $a, string $d = ''): void {}
function csrf_token(): string { return 't'; }
function h(mixed $s): string { return htmlspecialchars((string) $s, ENT_QUOTES); }
function json_for_html(array $a): string { return str_replace(['<', '>', '&'], ['\\\\u003C', '\\\\u003E', '\\\\u0026'], (string) json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); }
$user = ['id' => (int) ($_COOKIE['uid'] ?? 1), 'role' => ($_GET['role'] ?? $_COOKIE['role'] ?? 'admin') === 'editor' ? 'editor' : 'admin'];
$FORMS = [['slug' => 'free-trial', 'name' => 'Free trial', 'status' => 'published', 'layout' => 'popup'], ['slug' => 'kontak', 'name' => 'Kontak', 'status' => 'draft', 'layout' => 'page']];
function quiz_seed(): array
{
    $opt = static fn($id, $t, $c = false) => ['id' => $id, 'text' => $t, 'correct' => $c];
    $blk = static fn($p) => [['id' => $p . 'h', 't' => 'h', 'level' => 2, 'text' => '{name|Halo}, level Anda: {level}', 'align' => 'center'], ['id' => $p . 's', 't' => 'score', 'style' => 'card', 'align' => 'center'], ['id' => $p . 'c', 't' => 'sections', 'title' => 'Skor per bagian'],
      ['id' => $p . 't', 't' => 'text', 'html' => '<p>Program: {program}. Skor {score} dari {max}.</p>'], ['id' => $p . 'b', 't' => 'button', 'label' => 'Daftar', 'url' => '#form:free-trial', 'style' => 'solid', 'align' => 'center', 'full' => false]];
    $seed = ['name' => 'Placement', 'slug' => 'placement', 'status' => 'published', 'intro' => ['title' => 'Cek level'], 'settings' => ['rangeBy' => 'percent', 'resultWidth' => ''],
      'lead' => ['fields' => ['name' => 'optional', 'phone' => 'off', 'email' => 'off']],
      'sections' => [['id' => 'sa1', 'name' => 'Grammar'], ['id' => 'sb2', 'name' => 'Reading']],
      'sets' => [['id' => 'set1', 'sectionId' => 'sa1', 'questions' => [['id' => 'qa1', 'type' => 'single', 'text' => 'She ___ to school.', 'points' => 1, 'options' => [$opt('oa1', 'go'), $opt('oa2', 'goes', true)]],
          ['id' => 'qa2', 'type' => 'tf', 'text' => 'London is in France.', 'points' => 1, 'options' => [$opt('ob1', 'True'), $opt('ob2', 'False', true)]]]],
    ['id' => 'set2', 'sectionId' => 'sb2', 'questions' => [['id' => 'qb1', 'type' => 'single', 'text' => 'Pick the noun.', 'points' => 1, 'options' => [$opt('oc1', 'dog', true), $opt('oc2', 'run')]]]]],
      'vars' => [['key' => 'program', 'label' => 'Program']],
      'results' => [
        ['id' => 'ra1', 'label' => 'Pemula', 'level' => 'Beginner', 'min' => 0, 'max' => 40, 'vars' => ['program' => 'Starter'], 'blocks' => $blk('a')],
        ['id' => 'rb2', 'label' => 'Menengah', 'level' => 'Intermediate', 'min' => 41, 'max' => 70, 'vars' => ['program' => 'General English'], 'blocks' => $blk('b')],
        ['id' => 'rc3', 'label' => 'Mahir', 'level' => 'Advanced', 'min' => 71, 'max' => 100, 'vars' => ['program' => 'Business English'], 'blocks' => $blk('c')],
      ]];
    return $seed;
}
function shell(string $title, string $mid, array $boot, string $js): void
{
    echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . h($title) . '</title>'
        . '<link rel="stylesheet" href="/edizon/assets/panel.css?v=t"><link rel="stylesheet" href="/articles/template-vars.css?v=t"><link rel="stylesheet" href="assets/article-editor.css?v=t"></head><body class="wide"><main>'
        . '<p class="muted" id="last-saved">x</p><div id="errors" class="flash err" hidden></div><div id="editor"></div>'
        . '<div class="savebar"><span id="dirty" class="muted" hidden>Ada perubahan</span><a id="viewlink" class="btn ghost" href="#" hidden>Pratinjau</a><button class="btn" id="save" type="button">Simpan</button></div></main>'
        . '<script type="application/json" id="boot">' . json_for_html($boot) . '</script>'
        . '<script src="assets/picker.js"></script><script src="assets/ed.js"></script><script src="assets/revisions.js"></script><script src="assets/article-editor.js"></script><script src="assets/' . $js . '"></script></body></html>';
}
`);
const cspHead = `<?php
$src = (string) file_get_contents('${fwd(join(edizon, 'lib/bootstrap.php'))}');
if (!preg_match('/header\\\\("(Content-Security-Policy: [^"]+)"\\\\);/', $src, $m)) { die('CSP line not found'); }
header($m[1]); header('Cache-Control: no-store');
require __DIR__ . '/stub.php';
`;
writeFileSync(join(root, 'edizon/popup-page.php'), cspHead + `
$seed = ['name' => 'Promo', 'slug' => 'promo', 'status' => 'published', 'size' => ['width' => ''], 'style' => ['theme' => 'website'], 'position' => 'center', 'overlay' => true, 'showClose' => true, 'closeOnOverlay' => true,
  'blocks' => [['id' => 'ph1', 't' => 'h', 'level' => 2, 'text' => 'Promo semester baru', 'align' => 'left'], ['id' => 'pt1', 't' => 'text', 'html' => '<p>Diskon pendaftaran.</p>'], ['id' => 'pb1', 't' => 'button', 'label' => 'Daftar', 'url' => '#form:free-trial', 'style' => 'solid', 'align' => 'left', 'full' => false]],
  'triggers' => ['load' => ['on' => false, 'delay' => 5], 'scroll' => ['on' => false, 'percent' => 50], 'exit' => ['on' => false]]];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode((string) file_get_contents('php://input'), true);
    [$clean, $errs] = validate_popup($body['data'] ?? [], $user, 1);
    header('Content-Type: application/json');
    if ($errs) { http_response_code(422); echo json_encode(['ok' => false, 'errors' => $errs]); exit; }
    $st = popup_to_editor(['id' => 1, 'name' => $clean['name'], 'slug' => $clean['slug'], 'status' => $clean['status'], 'cfg' => $clean['cfg']]);
    rev_snapshot('popup', 1, $st, 1); // what popup_save() does on the real page
    echo json_encode(['ok' => true, 'data' => $st, 'savedAt' => 'now']);
    exit;
}
[$clean, $errs] = validate_popup($seed, $user, 1);
if ($errs) { die('seed: ' . implode('; ', $errs)); }
if (!db()->query('SELECT 1 FROM popups WHERE id = 1')->fetchColumn()) { // the preview pages read the saved pop-up by id
    db()->prepare('INSERT INTO popups (id, slug, name, status, config, created_at, updated_at, updated_by) VALUES (1, ?, ?, ?, ?, ?, ?, 1)')->execute([$clean['slug'], $clean['name'], $clean['status'], json_encode($clean['cfg']), 'now', 'now']);
}
shell('Popup', '', ['csrf' => 't', 'data' => popup_to_editor(['id' => 1, 'name' => $clean['name'], 'slug' => $clean['slug'], 'status' => $clean['status'], 'cfg' => $clean['cfg']]), 'forms' => $FORMS, 'popups' => [['slug' => 'other', 'name' => 'Other']], 'quizzes' => [['slug' => 'placement', 'name' => 'Placement']], 'isAdmin' => is_admin($user)], 'popup-builder.js');
`);
writeFileSync(join(root, 'edizon/quiz-page.php'), cspHead + `
$seed = quiz_seed();
function qedit(array $clean): array { return quiz_to_editor(['id' => 1, 'name' => $clean['name'], 'slug' => $clean['slug'], 'status' => $clean['status'], 'zapier_form_id' => '', 'zapier_form_name' => '', 'cfg' => $clean['cfg']]); }
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode((string) file_get_contents('php://input'), true);
    [$clean, $errs] = validate_quiz($body['data'] ?? [], $user, 1);
    header('Content-Type: application/json');
    if ($errs) { http_response_code(422); echo json_encode(['ok' => false, 'errors' => $errs]); exit; }
    $st = qedit($clean);
    rev_snapshot('quiz', 1, $st, 1); // what quiz_save() does on the real page
    echo json_encode(['ok' => true, 'data' => $st, 'savedAt' => 'now']);
    exit;
}
[$clean, $errs] = validate_quiz($seed, $user, 1);
if ($errs) { die('seed: ' . implode('; ', $errs)); }
if (!db()->query('SELECT 1 FROM quizzes WHERE id = 1')->fetchColumn()) {
    db()->prepare("INSERT INTO quizzes (id, slug, name, status, zapier_form_id, zapier_form_name, config, created_at, updated_at, updated_by) VALUES (1, ?, ?, ?, '', '', ?, ?, ?, 1)")->execute([$clean['slug'], $clean['name'], $clean['status'], json_encode($clean['cfg']), 'now', 'now']);
}
shell('Quiz', '', ['csrf' => 't', 'data' => qedit($clean), 'forms' => $FORMS, 'popups' => [['slug' => 'promo', 'name' => 'Promo']], 'quizzes' => [], 'hooks' => [], 'isAdmin' => is_admin($user), 'reserved' => QUIZ_RESERVED_VARS], 'quiz-builder.js');
`);

// the real revisions endpoint and preview pages, with only the line that loads the panel (login, MySQL) swapped for the test stub
const swapInit = (name) => {
  const src = readFileSync(join(edizon, name), 'utf8');
  const out = src.replace("require __DIR__ . '/lib/init.php';\n$u = require_content_editor();", "require __DIR__ . '/stub.php';\n$u = $user;");
  if (out === src) throw new Error('panel bootstrap lines not found in ' + name);
  writeFileSync(join(root, 'edizon', name), out);
};
['revisions.php', 'templates.php', 'popup-preview.php', 'quiz-preview.php', 'popup-frame.php'].forEach(swapInit);

// ---- the PUBLIC side: the real forms/popups.js, quiz/quiz-run.js and their css. /quiz-public.php mounts every result of a seeded quiz through the real PHP payload ----
mkdirSync(join(root, 'quiz'), { recursive: true });
for (const f of ['forms.css', 'popup.js', 'popup-preview.css', 'popup-preview.js']) cpSync(join(pub, 'forms', f), join(root, 'forms', f));
for (const f of ['quiz.js', 'quiz-run.js', 'quiz.css', 'preview.js']) cpSync(join(pub, 'quiz', f), join(root, 'quiz', f));
writeFileSync(join(root, 'runtime.php'), `<!doctype html>
<html lang="id" data-audience="kids"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Runtime</title>
<style>body{margin:0;font:16px/1.5 system-ui}</style>
<link rel="stylesheet" href="/forms/forms.css"><link rel="stylesheet" href="/forms/popups.css?v=3"></head><body><p>page</p><script src="/forms/popup.js"></script><script src="/forms/popups.js"></script></body></html>
`);
writeFileSync(join(root, 'quiz-public.php'), `<?php
require __DIR__ . '/edizon/stub.php';
$seed = quiz_seed();
$seed['settings']['resultWidth'] = (string) ($_GET['w'] ?? '');
$sec = [['id' => 'cs1', 't' => 'columns', 'ratio' => '1-1', 'cols' => [[['id' => 'cs2', 't' => 'score', 'style' => 'card', 'align' => 'center']], [['id' => 'cs3', 't' => 'sections', 'title' => 'Rincian']]]]];
$seed['results'][0]['blocks'] = array_merge($seed['results'][0]['blocks'], $sec, [
    ['id' => 'cs4', 't' => 'faq', 'title' => 'Tanya {name}', 'items' => [['q' => 'Level {level}?', 'a' => 'Skor {percent}%']]],
    ['id' => 'cs5', 't' => 'callout', 'tone' => 'info', 'title' => 'Info', 'text' => 'Program {program}'],
    ['id' => 'cs6', 't' => 'spacer', 'h' => 40],
    ['id' => 'cs7', 't' => 'table', 'header' => true, 'rows' => [['A', 'B'], ['{score}', '{max}']], 'caption' => ''],
]);
[$clean, $errs] = validate_quiz($seed, ['id' => 1, 'role' => 'admin'], 1);
if ($errs) { die('seed: ' . implode('; ', $errs)); }
$cfg = $clean['cfg'];
$q = ['id' => 1, 'slug' => 'placement', 'name' => 'Placement', 'status' => 'published', 'cfg' => $cfg];
$out = [];
foreach ($cfg['results'] as $r) {
    $out[$r['id']] = quiz_result_payload($cfg, quiz_fake_scores($cfg, $r), $r, ['name' => 'Budi'], null);
}
?><!doctype html>
<html lang="id" data-audience="<?= h($_GET['a'] ?? 'kids') ?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Quiz public</title>
<style>body{margin:0;font:16px/1.5 system-ui}#m{padding:0}</style>
<link rel="stylesheet" href="/forms/forms.css"><link rel="stylesheet" href="/forms/popups.css?v=3"><link rel="stylesheet" href="/quiz/quiz.css?v=2"></head>
<body><div id="m"></div>
<script>window.__def = <?= json_for_html(quiz_public_def($q)) ?>; window.__res = <?= json_for_html($out) ?>;</script>
<script src="/forms/popup.js"></script><script src="/forms/popups.js"></script><script src="/quiz/quiz.js"></script></body></html>
`);
mkdirSync(join(root, 'uploads'), { recursive: true });
writeFileSync(join(root, 'uploads/sample.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#405fda"/></svg>');
console.log('Serving http://127.0.0.1:8097/edizon/pop-editor.php  (Ctrl+C to stop)');
spawn('php', ['-S', '127.0.0.1:8097', '-t', root], { stdio: 'inherit' });
