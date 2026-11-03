<?php
/**
 * Checks for the revision history (articles, pop-ups, quizzes) without MySQL or a web server.
 *   php test/php/revisions.php          (from tools/article-editor)
 * It loads the real lib files; only db() is replaced by an in-memory SQLite database, and the published pop-up file goes to a temporary folder.
 */
declare(strict_types=1);
define('EN_PANEL', true);
ini_set('error_log', '/dev/null'); // a failing snapshot is logged on purpose in one check
$lib = realpath(__DIR__ . '/../../../../public/edizon/lib');
require $lib . '/sanitize.php';
require $lib . '/content.php';

$TMP = sys_get_temp_dir() . '/enrev-' . getmypid();
function data_dir(): string { global $TMP; return $TMP; }
function ensure_dir(string $dir): void { if (!is_dir($dir)) { mkdir($dir, 0777, true); } }
function now_utc(): string { static $n = 0; return gmdate('Y-m-d H:i:s', 1700000000 + $n++); }
function is_admin(array $u): bool { return ($u['role'] ?? '') === 'admin'; }
function cfg(?string $key = null, mixed $default = null): mixed { return $default; }
function form_get_by_slug(string $slug, bool $publishedOnly = true): ?array { return $slug === 'free-trial' ? ['slug' => $slug, 'layout' => 'popup', 'name' => 'Free trial'] : null; }
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        foreach ([
            'CREATE TABLE article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)',
            'CREATE TABLE article_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)',
            'CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, title TEXT, category_id INTEGER)',
            'CREATE TABLE article_tag_map (article_id INTEGER, tag_id INTEGER)',
            'CREATE TABLE article_seo (article_id INTEGER, data TEXT)',
            'CREATE TABLE popups (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, zapier_form_id TEXT, zapier_form_name TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER)',
            'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
            'CREATE TABLE item_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, item_id INTEGER, data TEXT, hash TEXT, title TEXT, summary TEXT, saved_at TEXT, saved_by INTEGER)',
            "INSERT INTO users (id, name) VALUES (1, 'Admin Ani'), (2, 'Editor Eko')",
        ] as $q) { $pdo->exec($q); }
    }
    return $pdo;
}
require $lib . '/articles.php';
require $lib . '/popups.php';
require $lib . '/quizzes.php';
require $lib . '/revisions.php';

$pass = 0; $fail = 0;
function ok(string $name, bool $cond, mixed $extra = null): void
{
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS $name\n"; return; }
    $fail++; echo "FAIL $name" . ($extra !== null ? '  -> ' . (is_string($extra) ? $extra : json_encode($extra, JSON_UNESCAPED_UNICODE)) : '') . "\n";
}
function eq(string $name, mixed $got, mixed $want): void { ok($name, $got === $want, ['got' => $got, 'want' => $want]); }
function count_revs(string $kind, int $id): int
{
    $st = db()->prepare('SELECT COUNT(*) FROM item_revisions WHERE kind = ? AND item_id = ?');
    $st->execute([$kind, $id]);
    return (int) $st->fetchColumn();
}

$admin = ['id' => 1, 'role' => 'admin'];
$editor = ['id' => 2, 'role' => 'editor'];

/* ---------- A. storing and listing ---------- */
$s1 = ['id' => 5, 'title' => 'Belajar «Inggris» 😀', 'status' => 'draft', 'blocks' => [['t' => 'h', 'text' => 'Satu'], ['t' => 'columns', 'cols' => [[['t' => 'hr']], [['t' => 'text', 'html' => '<p>x</p>'], ['t' => 'hr']]]]]];
rev_snapshot('article', 5, $s1, 1);
$l = rev_list('article', 5);
eq('A1 one save makes one version', count($l), 1);
eq('A2 the list carries title, who saved it, and a summary (blocks counted inside columns too)', [$l[0]['title'], $l[0]['saved_by_name'], $l[0]['summary']], ['Belajar «Inggris» 😀', 'Admin Ani', '5 blok · draf']);
eq('A3 a version comes back exactly as stored (unicode, nesting)', rev_get('article', 5, $l[0]['id']), $s1);
rev_snapshot('article', 5, $s1, 1);
eq('A4 saving the identical content again does not add a version', count_revs('article', 5), 1);
$s2 = $s1; $s2['title'] = 'Judul baru'; $s2['status'] = 'published';
rev_snapshot('article', 5, $s2, 2);
$l = rev_list('article', 5);
eq('A5 a changed save is a new version, newest first, with its own author and summary', [count($l), $l[0]['title'], $l[0]['saved_by_name'], $l[0]['summary'], $l[1]['title']], [2, 'Judul baru', 'Editor Eko', '5 blok · terbit', 'Belajar «Inggris» 😀']);
rev_snapshot('article', 5, $s1, 1);
eq('A6 going back to an older content is a new version again (only the newest is compared)', count_revs('article', 5), 3);
eq('A7 an unknown user shows as null (the page says "Sistem")', (function () { rev_snapshot('article', 6, ['id' => 6, 'title' => 'x', 'status' => 'draft', 'blocks' => []], 99); return rev_list('article', 6)[0]['saved_by_name']; })(), null);

/* ---------- B. the limit ---------- */
for ($i = 1; $i <= 35; $i++) { rev_snapshot('popup', 9, ['id' => 9, 'name' => 'P' . $i, 'status' => 'draft', 'blocks' => []], 1); }
$l = rev_list('popup', 9);
eq('B1 only the last 30 versions are kept', [count($l), count_revs('popup', 9)], [30, 30]);
eq('B2 the newest is #35 and the oldest kept is #6', [$l[0]['title'], $l[29]['title']], ['P35', 'P6']);
eq('B3 the limit is per item (another item keeps its history)', count_revs('article', 5), 3);
eq('B4 the limit is per kind (same id, other kind)', (function () { rev_snapshot('quiz', 9, ['id' => 9, 'name' => 'Q', 'status' => 'draft', 'sets' => [], 'results' => []], 1); return [count_revs('popup', 9), count_revs('quiz', 9)]; })(), [30, 1]);

/* ---------- C. isolation, bad input, damaged data ---------- */
$any = rev_list('article', 5)[0]['id'];
eq('C1 a version is only readable under its own kind and item', [rev_get('popup', 5, $any), rev_get('article', 6, $any), rev_get('article', 5, 999999)], [null, null, null]);
eq('C2 unknown kinds and bad ids are ignored', [rev_list('page', 5), rev_list('article', 0), rev_get('article', 5, 0)], [[], [], null]);
db()->prepare('INSERT INTO item_revisions (kind, item_id, data, hash, title, summary, saved_at, saved_by) VALUES (?,?,?,?,?,?,?,?)')->execute(['article', 7, 'z:%%%not-base64', 'h', '', '', '2024-01-01 00:00:00', 1]);
db()->prepare('INSERT INTO item_revisions (kind, item_id, data, hash, title, summary, saved_at, saved_by) VALUES (?,?,?,?,?,?,?,?)')->execute(['article', 7, 'z:' . base64_encode('not zlib'), 'h2', '', '', '2024-01-01 00:00:01', 1]);
db()->prepare('INSERT INTO item_revisions (kind, item_id, data, hash, title, summary, saved_at, saved_by) VALUES (?,?,?,?,?,?,?,?)')->execute(['article', 7, 'j:{broken', 'h3', '', '', '2024-01-01 00:00:02', 1]);
$ids = array_column(rev_list('article', 7), 'id');
eq('C3 damaged stored data reads as null, never an exception', array_map(static fn($i) => rev_get('article', 7, $i), $ids), [null, null, null]);
eq('C4 plain JSON versions (no zlib) are readable too', rev_unpack('j:' . json_encode(['a' => 1])), ['a' => 1]);
eq('C5 stored data is compressed when zlib exists', str_starts_with(rev_pack(['x' => str_repeat('a', 500)]), 'z:') && strlen(rev_pack(['x' => str_repeat('a', 500)])) < 200, true);

/* ---------- D. purge ---------- */
rev_purge('article', 6);
eq('D1 deleting an item removes its versions only', [count_revs('article', 6), count_revs('article', 5)], [0, 3]);
rev_purge('article');
eq('D2 purging a kind removes all of that kind', [count_revs('article', 5), count_revs('popup', 9)], [0, 30]);
$pdo = db();
$pdo->exec("INSERT INTO articles (slug, title) VALUES ('a', 'A')");
rev_snapshot('article', 1, ['id' => 1, 'title' => 'A', 'status' => 'draft', 'blocks' => []], 1);
art_delete(1);
eq('D3 art_delete removes the article\'s versions', count_revs('article', 1), 0);
$pdo->exec("INSERT INTO articles (slug, title) VALUES ('b', 'B'), ('c', 'C')");
rev_snapshot('article', 2, ['id' => 2, 'title' => 'B', 'status' => 'draft', 'blocks' => []], 1);
rev_snapshot('article', 3, ['id' => 3, 'title' => 'C', 'status' => 'draft', 'blocks' => []], 1);
art_delete_all();
eq('D4 delete-all removes every article\'s versions', [count_revs('article', 2), count_revs('article', 3)], [0, 0]);

/* ---------- E. pop-ups: the real save writes a version; the preview row equals what was saved ---------- */
$pin = ['name' => 'Promo', 'slug' => 'promo', 'status' => 'published', 'showClose' => true, 'overlay' => true, 'closeOnOverlay' => true, 'size' => ['width' => '70vh'],
    'blocks' => [['t' => 'h', 'text' => 'Halo', 'level' => 2, 'align' => 'center'], ['t' => 'columns', 'cols' => [[['t' => 'text', 'html' => '<p>Kiri</p>']], [['t' => 'button', 'label' => 'Daftar', 'url' => '#close']]]]]];
[$clean, $errs] = validate_popup($pin, $admin, 0);
eq('E0 (setup) the pop-up validates', $errs, []);
$pid = popup_save($clean, 0, 1);
$l = rev_list('popup', $pid);
eq('E1 popup_save records a version of the editor state', [count($l), $l[0]['title'], $l[0]['summary']], [1, 'Promo', '4 blok · terbit']);
$state = rev_get('popup', $pid, $l[0]['id']);
eq('E2 the version is the state the editor gets (flat: id, name, slug, status + settings)', [$state['id'], $state['name'], $state['slug'], $state['size']['width'], $state['blocks'][1]['t']], [$pid, 'Promo', 'promo', '70vh', 'columns']);
[$row, $rerr] = rev_popup_row($state, $admin, $pid);
$saved = popup_get($pid);
eq('E3 the preview row built from a version has the same settings as the saved pop-up', [$rerr, $row['cfg'] == $saved['cfg'], $row['name'], $row['slug']], [[], true, 'Promo', 'promo']);
$pin['name'] = 'Promo 2';
[$clean2, ] = validate_popup($pin, $admin, $pid);
popup_save($clean2, $pid, 2);
eq('E4 a second save is a second version, by the second user', [count_revs('popup', $pid), rev_list('popup', $pid)[0]['saved_by_name']], [2, 'Editor Eko']);
$clean2['status'] = 'draft';
popup_save($clean2, $pid, 1); // what the list page does when unpublishing
eq('E5 unpublishing from the list also makes a version (status in the summary)', [count_revs('popup', $pid), rev_list('popup', $pid)[0]['summary']], [3, '4 blok · draf']);
[$bad, $berr] = rev_popup_row(['name' => '', 'blocks' => []] + $state, $admin, $pid);
eq('E6 a version that no longer passes validation gives a clear error instead of a broken preview', [$bad, count($berr) > 0], [null, true]);
popup_delete($pid);
eq('E7 popup_delete removes its versions', count_revs('popup', $pid), 0);

/* ---------- F. quizzes ---------- */
$qin = ['name' => 'Tes', 'slug' => 'tes', 'status' => 'published', 'zapierFormId' => '', 'zapierFormName' => '',
    'sections' => [['id' => 's1', 'name' => 'Grammar']],
    'sets' => [['id' => 'st1', 'sectionId' => 's1', 'questions' => [['id' => 'q1', 'type' => 'single', 'text' => 'Soal?', 'points' => 1, 'options' => [['id' => 'a', 'text' => 'A', 'correct' => true], ['id' => 'b', 'text' => 'B']]]]]],
    'vars' => [['key' => 'program', 'label' => 'Program']],
    'results' => [['id' => 'r1', 'label' => 'Semua', 'min' => 0, 'max' => 100, 'level' => 'Beginner', 'vars' => ['program' => 'Kids'], 'blocks' => [['t' => 'h', 'level' => 2, 'text' => 'Halo {name}!'], ['t' => 'score'], ['t' => 'sections', 'title' => 'Rincian']]]],
    'settings' => ['resultWidth' => '']];
[$qclean, $qerr] = validate_quiz($qin, $admin, 0);
eq('F0 (setup) the quiz validates', $qerr, []);
$qid = quiz_save($qclean, 0, 1);
$l = rev_list('quiz', $qid);
eq('F1 quiz_save records a version (questions and result pages counted)', [count($l), $l[0]['summary']], [1, '1 soal · 1 halaman hasil (3 blok) · terbit']);
$qs = rev_get('quiz', $qid, $l[0]['id']);
eq('F2 the version has the answer flags on the options, like the editor state', [$qs['sets'][0]['questions'][0]['options'][0]['correct'], $qs['sets'][0]['questions'][0]['options'][1]['correct'], isset($qs['sets'][0]['questions'][0]['correct'])], [true, false, false]);
[$qrow, $qrerr] = rev_quiz_row($qs, $admin, $qid);
$qsaved = quiz_get($qid);
eq('F3 the preview row of a version has the same configuration as the saved quiz (answer key included)', [$qrerr, $qrow['cfg'] == $qsaved['cfg'], $qrow['slug']], [[], true, 'tes']);
quiz_save(['name' => 'Tes', 'slug' => 'tes', 'status' => 'draft', 'zapier_form_id' => '', 'zapier_form_name' => '', 'cfg' => $qsaved['cfg']], $qid, 1); // list page: unpublish
eq('F4 unpublishing from the list makes a version too', [count_revs('quiz', $qid), rev_list('quiz', $qid)[0]['summary']], [2, '1 soal · 1 halaman hasil (3 blok) · draf']);
quiz_delete($qid);
eq('F5 quiz_delete removes its versions', count_revs('quiz', $qid), 0);

/* ---------- G. a failing history never fails the save ---------- */
db()->exec('DROP TABLE item_revisions');
$threw = false;
try { rev_snapshot('article', 1, ['id' => 1, 'title' => 'x', 'status' => 'draft', 'blocks' => []], 1); } catch (Throwable) { $threw = true; }
eq('G1 snapshot swallows database errors (the save has already happened)', $threw, false);
$threw = false;
try { $pid2 = popup_save($clean, 0, 1); } catch (Throwable) { $threw = true; }
eq('G2 popup_save still succeeds when the history table is gone', [$threw, isset($pid2) && $pid2 > 0], [false, true]);
eq('G3 purge swallows errors too', (function () { try { rev_purge('popup', 1); return true; } catch (Throwable) { return false; } })(), true);

array_map('unlink', glob($TMP . '/*') ?: []); @rmdir($TMP);
echo "\n$pass passed, $fail failed\n";
exit($fail > 0 ? 1 : 0);
