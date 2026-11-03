<?php
/**
 * Checks for pop-ups and quiz results (shared block set with articles, width field, variables, HTML-block frames) without MySQL or a web server.
 *   php test/php/popups.php          (from tools/article-editor)
 * It loads the real lib files; only db() is replaced by an in-memory SQLite database.
 */
declare(strict_types=1);
define('EN_PANEL', true);
$lib = realpath(__DIR__ . '/../../../../public/edizon/lib');
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
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        foreach ([
            'CREATE TABLE article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)',
            'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
            'CREATE TABLE item_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, item_id INTEGER, data TEXT, hash TEXT, title TEXT, summary TEXT, saved_at TEXT, saved_by INTEGER)',
            'CREATE TABLE popups (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, zapier_form_id TEXT, zapier_form_name TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER)',
        ] as $q) { $pdo->exec($q); }
        $pdo->exec("INSERT INTO popups (slug, name, status, config) VALUES ('promo', 'Promo', 'published', '{}')");
        $pdo->exec("INSERT INTO quizzes (slug, name, status, config) VALUES ('placement', 'Placement', 'published', '{}')");
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

$admin = ['id' => 1, 'role' => 'admin'];
$editor = ['id' => 2, 'role' => 'editor'];
function pv(array $blocks, bool $isAdmin = true, array $opts = []): array { return popup_validate_blocks($blocks, $isAdmin, $opts); }
function types(array $blocks): array { return array_map(static fn($b) => $b['t'], $blocks); }
$IMG = '/uploads/a.jpg';

/* ---------- A. width field ---------- */
eq('A1 empty stays empty (default 520px)', popup_width_parse('')[0], '');
eq('A2 a bare number is px', popup_width_parse('640')[0], '640px');
eq('A3 vh, vw, %, rem and ch are accepted', array_map(static fn($v) => popup_width_parse($v)[0], ['80vh', '70 VW', '90%', '40,5rem', '60ch', '45em', '80vmin']), ['80vh', '70vw', '90%', '40.5rem', '60ch', '45em', '80vmin']);
eq('A4 unknown unit or text is refused with a hint', [popup_width_parse('50pt')[0], str_contains((string) popup_width_parse('50pt')[1], 'mis. 520px')], [null, true]);
eq('A5 css injection attempts are refused', array_map(static fn($v) => popup_width_parse($v)[0], ['520px;color:red', 'calc(100% - 4px)', '10px 20px', 'url(x)', '1e3px', '-300px']), [null, null, null, null, null, null]);
eq('A6 out-of-range values are refused per unit', array_map(static fn($v) => popup_width_parse($v)[0], ['50px', '5000px', '120%', '10vw', '300vh']), [null, null, null, null, null]);
eq('A7 css value falls back to 520px', [popup_width_css(''), popup_width_css('80vh'), popup_width_css(640), popup_width_css('junk')], ['520px', '80vh', '640px', '520px']);
eq('A8 whole number display has no trailing zeros', popup_width_parse('520.00px')[0], '520px');

/* ---------- B. legacy blocks are upgraded ---------- */
$up = popup_blocks_upgrade([
    ['t' => 'title', 'text' => 'Halo', 'align' => 'center'], ['t' => 'subtitle', 'text' => 'A & B', 'align' => 'right'],
    ['t' => 'p', 'html' => 'Isi <strong>tebal</strong>', 'align' => 'left'], ['t' => 'img', 'src' => $IMG, 'size' => 'full'],
    ['t' => 'columns', 'cols' => [[['t' => 'title', 'text' => 'Kiri']], [['t' => 'p', 'html' => 'Kanan']]]],
]);
eq('B1 title becomes a level-2 heading and keeps alignment', [$up[0]['t'], $up[0]['level'], $up[0]['align']], ['h', 2, 'center']);
eq('B2 subtitle becomes rich text with the large size class and alignment', $up[1], ['t' => 'text', 'html' => '<p class="ta-right"><span class="fs-lg">A &amp; B</span></p>']);
eq('B3 paragraph becomes rich text', $up[2]['html'], '<p>Isi <strong>tebal</strong></p>');
eq('B4 full-width image becomes wide', $up[3]['size'], 'wide');
eq('B5 blocks inside columns are upgraded too', [$up[4]['cols'][0][0]['t'], $up[4]['cols'][1][0]['t']], ['h', 'text']);
eq('B6 upgrading twice changes nothing', popup_blocks_upgrade($up), $up);

/* ---------- C. every article block works in a pop-up ---------- */
$all = [
    ['t' => 'h', 'level' => 2, 'text' => 'Judul', 'align' => 'center'],
    ['t' => 'text', 'html' => '<p class="ta-center">Hai <span class="ff-lora fs-lg">dunia</span></p><ul><li><p>a</p></li></ul>'],
    ['t' => 'ul', 'style' => 'numbers', 'items' => ['satu', 'dua']],
    ['t' => 'quote', 'text' => 'Kutipan', 'cite' => 'Budi'],
    ['t' => 'img', 'src' => $IMG, 'alt' => 'x', 'ratio' => '16:9', 'size' => 'small', 'align' => 'center', 'link' => '#popup:promo'],
    ['t' => 'video', 'url' => 'https://youtu.be/jNQXAC9IVRw'],
    ['t' => 'embed', 'url' => 'https://www.openstreetmap.org/export/embed.html', 'height' => 'm'],
    ['t' => 'callout', 'tone' => 'tip', 'title' => 'T', 'text' => 'Catatan'],
    ['t' => 'faq', 'title' => 'FAQ', 'items' => [['q' => 'Q?', 'a' => 'A.']]],
    ['t' => 'button', 'label' => 'Daftar', 'url' => '#form:free-trial', 'style' => 'outline', 'align' => 'center', 'full' => true],
    ['t' => 'cards', 'per' => 2, 'items' => [['title' => 'K1', 'text' => 'x', 'label' => 'Buka', 'url' => '#quiz:placement'], ['title' => 'K2']]],
    ['t' => 'table', 'header' => true, 'rows' => [['A', 'B'], ['1', '2']], 'aligns' => ['left', 'right']],
    ['t' => 'columns', 'ratio' => '1-2', 'cols' => [[['t' => 'h', 'level' => 3, 'text' => 'L']], [['t' => 'text', 'html' => '<p>R</p>']]]],
    ['t' => 'hr'], ['t' => 'spacer', 'h' => 40], ['t' => 'form', 'slug' => 'free-trial'],
];
[$vb, $ve] = pv($all);
eq('C1 a pop-up accepts all article blocks plus form and spacer, with no errors', [$ve, types($vb)],
    [[], ['h', 'text', 'ul', 'quote', 'img', 'video', 'embed', 'callout', 'faq', 'button', 'cards', 'table', 'columns', 'hr', 'spacer', 'form']]);
eq('C2 heading and button keep their alignment, the button its full-width flag', [$vb[0]['align'], $vb[9]['align'], $vb[9]['full']], ['center', 'center', true]);
eq('C3 image keeps small size, alignment, frame ratio and link', [$vb[4]['size'], $vb[4]['align'], $vb[4]['ratio'], $vb[4]['link']], ['small', 'center', '16:9', '#popup:promo']);
eq('C4 every block has an id', count(array_filter($vb, static fn($b) => preg_match('/^[a-z0-9]{4,12}$/', (string) ($b['id'] ?? '')) === 1)), count($vb));
eq('C5 rich text is cleaned like in articles', pv([['t' => 'text', 'html' => '<p onclick="x()" class="ta-center evil">Hi<script>alert(1)</script></p>']])[0][0]['html'], '<p class="ta-center">Hi</p>');
eq('C6 columns work and nested blocks are kept', [count($vb[12]['cols']), $vb[12]['cols'][0][0]['text']], [2, 'L']);
eq('C7 columns inside columns are refused', count(pv([['t' => 'columns', 'cols' => [[['t' => 'columns', 'cols' => [[['t' => 'hr']], [['t' => 'hr']]]]], [['t' => 'hr']]]]])[1]), 1);

/* buttons and links */
[, $e] = pv([['t' => 'button', 'label' => 'X', 'url' => '#form:nope']]);
ok('C8 a button to a form that does not exist is refused', count($e) === 1 && str_contains($e[0], 'tidak ditemukan'), $e);
[, $e] = pv([['t' => 'button', 'label' => 'X', 'url' => '#popup:nope']]);
ok('C9 a button to a pop-up that does not exist is refused', count($e) === 1, $e);
eq('C10 #close, #popup, #quiz, paths and https are accepted', array_map(static fn($u) => count(pv([['t' => 'button', 'label' => 'X', 'url' => $u]])[1]), ['#close', '#popup:promo', '#quiz:placement', '/articles/', 'https://example.com/a', 'mailto:a@b.co']), [0, 0, 0, 0, 0, 0]);
eq('C11 javascript: links are refused', count(pv([['t' => 'button', 'label' => 'X', 'url' => 'javascript:alert(1)']])[1]), 1);
eq('C12 card buttons to missing forms are refused', count(pv([['t' => 'cards', 'items' => [['title' => 'a', 'label' => 'Go', 'url' => '#form:nope']]]])[1]), 1);
[$vv, $e] = pv([['t' => 'button', 'label' => 'Halo {name}', 'url' => '/hasil?n={name}&l={level}']], true, ['vars' => true]);
eq('C13 with variables on, a button may use {name} in label and address (kept as typed)', [$e, $vv[0]['label'], $vv[0]['url']], [[], 'Halo {name}', '/hasil?n={name}&l={level}']);
[$vv, $e] = pv([['t' => 'cards', 'items' => [['title' => 'x', 'label' => 'Go', 'url' => '/p?l={level}']]]], true, ['vars' => true]);
eq('C15 card buttons may use variables too', [$e, $vv[0]['items'][0]['url']], [[], '/p?l={level}']);

/* extras and limits */
eq('C16 score and sections blocks are dropped in a pop-up and kept in a quiz result', [types(pv([['t' => 'score'], ['t' => 'sections', 'title' => 'x'], ['t' => 'hr']])[0]), types(pv([['t' => 'score'], ['t' => 'sections', 'title' => 'x'], ['t' => 'hr']], true, ['extra' => ['score', 'sections']])[0])], [['hr'], ['score', 'sections', 'hr']]);
eq('C17 the 80 block limit counts blocks inside columns', count(pv(array_merge(array_fill(0, 79, ['t' => 'hr']), [['t' => 'columns', 'cols' => [[['t' => 'hr']], [['t' => 'hr']]]]]))[1]) >= 1, true);
eq('C18 empty text and heading are dropped silently', [pv([['t' => 'h', 'text' => ' '], ['t' => 'text', 'html' => '<p> </p>'], ['t' => 'ul', 'items' => ['']]])[0], pv([['t' => 'h', 'text' => ' ']])[1]], [[], []]);
eq('C19 a form block needs an existing form', [count(pv([['t' => 'form', 'slug' => 'free-trial']])[1]), count(pv([['t' => 'form', 'slug' => 'nope']])[1]), count(pv([['t' => 'form', 'slug' => '']])[1])], [0, 1, 1]);

/* ---------- D. HTML block ---------- */
$H = ['t' => 'html', 'id' => 'hb1234', 'code' => '<h1>Halo</h1><script>alert(1)</script>', 'scripts' => true, 'h' => 'l', 'size' => 'wide', 'caption' => 'c'];
[$hb, $e] = pv([$H], true);
eq('D1 Admin can add an HTML block (code kept as typed)', [$e, $hb[0]['code'], $hb[0]['scripts'], $hb[0]['h'], $hb[0]['size']], [[], $H['code'], true, 'l', 'wide']);
[$hb2, $e] = pv([$H], false);
ok('D2 an Editor cannot add one', $hb2 === [] && count($e) === 1 && str_contains($e[0], 'Admin'), $e);
[$hb3, $e] = pv([$H], false, ['prior' => popup_html_prior([$H])]);
eq('D3 an Editor may leave an existing HTML block exactly as it is', [$e, count($hb3)], [[], 1]);
[, $e] = pv([array_replace($H, ['code' => $H['code'] . ' '])], false, ['prior' => popup_html_prior([$H])]);
eq('D4 ...but not change it by a single character', count($e), 1);
[, $e] = pv([array_replace($H, ['scripts' => false])], false, ['prior' => popup_html_prior([$H])]);
eq('D5 ...nor switch JavaScript off or on', count($e), 1);
[, $e] = pv([['t' => 'columns', 'cols' => [[$H], [['t' => 'hr']]]]], true);
ok('D6 an HTML block inside a column is refused', count($e) === 1 && str_contains($e[0], 'kolom'), $e);

/* ---------- E. what visitors receive ---------- */
$pub = popup_public_def(['slug' => 'promo', 'name' => 'Promo', 'cfg' => array_replace_recursive(popup_default_cfg(), ['size' => ['width' => '80vh'], 'blocks' => $hb + [1 => ['t' => 'video', 'url' => 'https://youtu.be/jNQXAC9IVRw', 'id' => 'vd1234']]])], popup_frame_public('promo'));
$json = json_encode($pub);
eq('E1 the published definition never contains the HTML code', [str_contains($json, 'alert(1)'), str_contains($json, '<h1>')], [false, false]);
eq('E2 an HTML block becomes a frame address with a content hash', [$pub['cfg']['blocks'][0]['t'], preg_match('#^/forms/frame\.php\?p=promo&b=hb1234&v=[0-9a-f]{8}$#', $pub['cfg']['blocks'][0]['src'])], ['html', 1]);
eq('E3 video blocks carry kind and embed address for the browser', [$pub['cfg']['blocks'][1]['kind'], $pub['cfg']['blocks'][1]['src']], ['youtube', 'https://www.youtube-nocookie.com/embed/jNQXAC9IVRw']);
eq('E4 the width is a css value; empty means 520px', [$pub['cfg']['size']['width'], popup_public_def(['slug' => 'a', 'name' => 'a', 'cfg' => popup_default_cfg()])['cfg']['size']['width']], ['80vh', '520px']);
eq('E5 without a frame builder HTML blocks are left out', popup_public_blocks([$H], null), []);
eq('E6 changing the code changes the hash (frame cache is busted)', popup_public_blocks([$H], static fn($b, $v) => $v)[0]['v'] !== popup_public_blocks([array_replace($H, ['code' => 'x'])], static fn($b, $v) => $v)[0]['v'], true);
eq('E7 panel frames use the saved pop-up id', str_contains(popup_frame_panel(7)('hb1234', 'abcd1234'), 'popup-frame.php?id=7&b=hb1234'), true);
eq('E8 find html block only finds top-level HTML blocks by id', [popup_find_html_block([$H], 'hb1234')['code'] ?? null, popup_find_html_block([$H], 'zzzzzz')], [$H['code'], null]);

/* ---------- F. whole pop-up ---------- */
$base = ['name' => 'Promo baru', 'slug' => 'promo-baru', 'status' => 'published', 'showClose' => true, 'overlay' => true, 'closeOnOverlay' => true, 'blocks' => [['t' => 'h', 'text' => 'Halo', 'level' => 2]]];
[$res, $e] = validate_popup($base + ['size' => ['width' => '70vh']], $admin);
eq('F1 a pop-up with a custom width in vh is saved as typed', [$e, $res['cfg']['size']['width']], [[], '70vh']);
[$res, $e] = validate_popup($base + ['size' => ['width' => '']], $admin);
eq('F2 empty width is kept empty (default 520px at display time)', [$e, $res['cfg']['size']['width']], [[], '']);
[, $e] = validate_popup($base + ['size' => ['width' => 'lebar']], $admin);
eq('F3 a bad width stops the save with a clear message', [count($e), str_contains($e[0] ?? '', 'Tulis angka')], [1, true]);
[$res, $e] = validate_popup($base + ['size' => ['width' => 800]], $admin);
eq('F4 an old numeric width keeps working (px)', [$e, $res['cfg']['size']['width']], [[], '800px']);
$row = popup_row_decode(['id' => '3', 'slug' => 'x', 'name' => 'x', 'status' => 'draft', 'config' => json_encode(['size' => ['width' => 640], 'blocks' => [['t' => 'title', 'text' => 'Lama', 'align' => 'center'], ['t' => 'p', 'html' => 'Isi', 'align' => 'left']]])]);
eq('F5 an old saved pop-up is upgraded when read (blocks and width)', [$row['cfg']['size']['width'], types($row['cfg']['blocks'])], ['640px', ['h', 'text']]);

/* ---------- G. quiz results ---------- */
function quiz_in(array $over = []): array
{
    $q = ['id' => 'q1', 'type' => 'single', 'text' => 'Soal?', 'options' => [['id' => 'a', 'text' => 'A', 'correct' => true], ['id' => 'b', 'text' => 'B']], 'points' => 1];
    $res = ['id' => 'r1', 'label' => 'Semua', 'min' => 0, 'max' => 100, 'level' => 'Beginner', 'vars' => ['program' => 'Kids Class'],
        'blocks' => [['t' => 'h', 'level' => 2, 'text' => 'Halo {name}!'], ['t' => 'score'], ['t' => 'sections', 'title' => 'Rincian']]];
    $quiz = ['name' => 'Tes', 'slug' => 'tes', 'status' => 'published', 'sections' => [['id' => 's1', 'name' => 'Grammar']],
        'sets' => [['id' => 'st1', 'sectionId' => 's1', 'questions' => [$q]]], 'vars' => [['key' => 'program', 'label' => 'Program']], 'results' => [$res],
        'settings' => ['resultWidth' => '']];
    if (isset($over['results'])) {
        $quiz['results'] = [array_replace($res, $over['results'][0])];
        unset($over['results']);
    }
    return array_replace_recursive($quiz, $over);
}
[$qr, $e] = validate_quiz(quiz_in(), $admin);
eq('G1 a quiz with a default result validates', $e, []);
eq('G2 result width is kept empty by default', $qr['cfg']['settings']['resultWidth'], '');
[$qr, $e] = validate_quiz(quiz_in(['settings' => ['resultWidth' => '75vh']]), $admin);
eq('G3 result width accepts vh', [$e, $qr['cfg']['settings']['resultWidth']], [[], '75vh']);
[, $e] = validate_quiz(quiz_in(['settings' => ['resultWidth' => 'x']]), $admin);
eq('G4 a bad result width is refused', [count($e), str_contains($e[0] ?? '', 'Lebar halaman hasil')], [1, true]);
[$qr, $e] = validate_quiz(quiz_in(['results' => [['blocks' => [['t' => 'h', 'level' => 2, 'text' => 'Halo {name}'], ['t' => 'text', 'html' => '<p>Level <strong>{level}</strong></p>'],
    ['t' => 'cards', 'items' => [['title' => 'Program {program}', 'label' => 'Daftar', 'url' => '/daftar?p={program}']]], ['t' => 'table', 'rows' => [['Skor', '{score}/{max}']]],
    ['t' => 'columns', 'cols' => [[['t' => 'faq', 'items' => [['q' => 'Kenapa {name}?', 'a' => 'Karena {percent}%']]]], [['t' => 'score']]]],
    ['t' => 'button', 'label' => 'Lanjut', 'url' => '#popup:promo', 'align' => 'center'], ['t' => 'sections', 'title' => 'Rincian']]]]]), $admin);
eq('G5 a result accepts the whole article block set (columns, cards, table, FAQ, rich text) with variables', [$e, types($qr['cfg']['results'][0]['blocks'])], [[], ['h', 'text', 'cards', 'table', 'columns', 'button', 'sections']]);
$HR = ['t' => 'html', 'id' => 'hr1234', 'code' => '<p>Level {level}</p>', 'scripts' => false, 'h' => 'auto', 'size' => 'normal', 'caption' => ''];
[$qr2, $e] = validate_quiz(quiz_in(['results' => [['blocks' => [$HR, ['t' => 'score']]]]]), $admin);
eq('G6 Admin can put an HTML block in a result', [$e, types($qr2['cfg']['results'][0]['blocks'])], [[], ['html', 'score']]);
[, $e] = validate_quiz(quiz_in(['results' => [['blocks' => [$HR, ['t' => 'score']]]]]), $editor);
ok('G7 an Editor cannot add one', count($e) === 1 && str_contains($e[0], 'Hasil 1') && str_contains($e[0], 'Admin'), $e);

/* variables in every block type */
$cfg = $qr2['cfg'];
$scores = ['total' => ['pts' => 7.5, 'max' => 10.0, 'pct' => 75, 'correct' => 7, 'count' => 10], 'sections' => [['key' => 'grammar', 'name' => 'Grammar', 'pts' => 7.5, 'max' => 10.0, 'pct' => 75, 'correct' => 7]]];
$range = $cfg['results'][0];
$lead = ['name' => 'Siti <b>&"\'</b>'];
$map = quiz_vars_map($cfg, $scores, $range, $lead);
$sb = quiz_subst_blocks([
    ['t' => 'h', 'level' => 2, 'text' => 'Halo {name}'],
    ['t' => 'text', 'html' => '<p>Level <strong>{level}</strong> untuk {name}</p>'],
    ['t' => 'cards', 'items' => [['alt' => '', 'title' => 'Program {program}', 'text' => '{percent}%', 'label' => 'Daftar {name}', 'url' => '/d?n={name}&p={program}']]],
    ['t' => 'table', 'caption' => 'Skor {name}', 'rows' => [['Skor', '{score}/{max}']]],
    ['t' => 'columns', 'cols' => [[['t' => 'faq', 'title' => '{level}', 'items' => [['q' => 'Kenapa {name}?', 'a' => 'Karena {percent}%']]]], [['t' => 'callout', 'title' => 'T', 'text' => '{score} dari {max}']]]],
    ['t' => 'button', 'label' => 'Lanjut {name|Teman}', 'url' => '/h?x={name}'],
    ['t' => 'ul', 'items' => ['{level}']], ['t' => 'quote', 'text' => '{name}', 'cite' => '{level}'], ['t' => 'img', 'alt' => '{name}', 'caption' => '{level}', 'link' => '/p?n={name}'],
    ['t' => 'sections', 'title' => 'Rincian {name}'],
], $map);
eq('G8 text blocks get the value as plain text', [$sb[0]['text'], $sb[5]['label']], ['Halo Siti <b>&"\'</b>', 'Lanjut Siti <b>&"\'</b>']);
eq('G9 rich text and table cells get the value HTML-escaped (no markup injection from the name)', [$sb[1]['html'], $sb[3]['rows'][0][1]], ['<p>Level <strong>Beginner</strong> untuk Siti &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;</p>', '7.5/10']);
eq('G10 card fields and addresses are substituted (addresses URL-encoded)', [$sb[2]['items'][0]['title'], $sb[2]['items'][0]['label'], $sb[2]['items'][0]['url']], ['Program Kids Class', 'Daftar Siti <b>&"\'</b>', '/d?n=' . rawurlencode('Siti <b>&"\'</b>') . '&p=Kids%20Class']);
eq('G11 blocks inside columns are substituted', [$sb[4]['cols'][0][0]['items'][0]['q'], $sb[4]['cols'][0][0]['items'][0]['a'], $sb[4]['cols'][1][0]['text']], ['Kenapa Siti <b>&"\'</b>?', 'Karena 75%', '7.5 dari 10']);
eq('G12 the rest: list, quote, image, sections, table caption, faq title', [$sb[6]['items'][0], $sb[7]['cite'], $sb[8]['link'], $sb[9]['title'], $sb[3]['caption'], $sb[4]['cols'][0][0]['title']], ['Beginner', 'Beginner', '/p?n=' . rawurlencode('Siti <b>&"\'</b>'), 'Rincian Siti <b>&"\'</b>', 'Skor Siti <b>&"\'</b>', 'Beginner']);

/* payload */
$pay = quiz_result_payload($cfg, $scores, $range, $lead, quiz_frame_public(42));
$pj = json_encode($pay);
eq('G13 the payload carries the result width (default 520px) and never the HTML code', [$pay['width'], str_contains($pj, 'Level {level}'), str_contains($pj, '<p>Level')], ['520px', false, false]);
eq('G14 the HTML block arrives as a signed frame address for this attempt', [$pay['blocks'][0]['t'], preg_match('#^/quiz/frame\.php\?a=42&b=hr1234&s=[0-9a-f]{24}&v=[0-9a-f]{8}$#', $pay['blocks'][0]['src'])], ['html', 1]);
eq('G15 without a frame builder (no stored attempt) HTML blocks are not sent', types(quiz_result_payload($cfg, $scores, $range, $lead)['blocks']), ['score']);
eq('G16 the signature depends on attempt and block', [quiz_frame_mac(42, 'hr1234') === quiz_frame_mac(42, 'hr1234'), quiz_frame_mac(42, 'hr1234') === quiz_frame_mac(43, 'hr1234'), quiz_frame_mac(42, 'hr1234') === quiz_frame_mac(42, 'hr9999')], [true, false, false]);
eq('G17 the payload width follows the setting', quiz_result_payload(array_replace_recursive($cfg, ['settings' => ['resultWidth' => '75vh']]), $scores, $range, $lead)['width'], '75vh');

/* frame content */
$cfg2 = $cfg;
$cfg2['results'][0]['blocks'] = [['id' => 'hr1234', 't' => 'html', 'scripts' => true, 'h' => 'auto', 'size' => 'normal', 'caption' => '',
    'code' => '<style>.a{color:red}</style><p class="a">Halo {name}, level {level|n/a}, {unknown} {skor}</p><script>const {name} = ENQ; var o={a:1}; document.title="{level}";</script>']];
$fr = quiz_frame_render($cfg2, $cfg2['results'][0], $scores, $lead, 'hr1234');
eq('G18 known variables outside <script> are replaced (HTML-escaped); unknown braces stay', str_contains((string) $fr['code'], '<p class="a">Halo Siti &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;, level Beginner, {unknown} {skor}</p>'), true);
eq('G19 script contents are never touched, CSS braces are safe', [str_contains((string) $fr['code'], 'const {name} = ENQ; var o={a:1}; document.title="{level}";'), str_contains((string) $fr['code'], '.a{color:red}')], [true, true]);
eq('G20 ENQ has the test data with numbers as numbers', [$fr['enq']['percent'], $fr['enq']['score'], $fr['enq']['level'], $fr['enq']['program'], $fr['enq']['sections']['grammar']['percent'], $fr['scripts']], [75, 7.5, 'Beginner', 'Kids Class', 75, true]);
eq('G21 a block id that is not in the result gives nothing', quiz_frame_render($cfg2, $cfg2['results'][0], $scores, $lead, 'nope99'), null);
$doc = art_frame_doc($fr['code'], 'NONCE', true, $fr['enq']);
ok('G22 the frame document defines window.ENQ in a nonce script, with markup characters escaped', str_contains($doc, '<script nonce="NONCE">window.ENQ=Object.freeze(') && !str_contains(substr($doc, (int) strpos($doc, 'window.ENQ'), 400), '<b>'), substr($doc, (int) strpos($doc, 'window.ENQ'), 200));
eq('G23 articles are unchanged: no ENQ without quiz data', str_contains(art_frame_doc('<p>x</p>', 'N'), 'ENQ'), false);

/* ---------- I. quiz results saved before the shared editor ---------- */
$old = quiz_cfg_merge(['results' => [['id' => 'r1', 'label' => 'Lama', 'min' => 0, 'max' => 100, 'vars' => [], 'blocks' => [
    ['id' => 'ob1', 't' => 'title', 'text' => 'Halo {name}', 'align' => 'center'], ['id' => 'ob2', 't' => 'subtitle', 'text' => 'Sub'], ['id' => 'ob3', 't' => 'p', 'html' => 'Isi <b>tebal</b>', 'align' => 'center'], ['id' => 'ob4', 't' => 'score', 'style' => 'card']]]],
    'settings' => ['resultWidth' => '80VW']]);
eq('I1 old result blocks (title / subtitle / p) are read as the shared blocks, ids and other blocks kept', [types($old['results'][0]['blocks']), array_column($old['results'][0]['blocks'], 'id')], [['h', 'text', 'text', 'score'], ['ob1', 'ob2', 'ob3', 'ob4']]);
eq('I2 the heading keeps its text and alignment; the paragraph keeps its HTML and alignment', [$old['results'][0]['blocks'][0]['text'], $old['results'][0]['blocks'][0]['align'], $old['results'][0]['blocks'][2]['html']], ['Halo {name}', 'center', '<p class="ta-center">Isi <b>tebal</b></p>']);
eq('I3 the stored result width is normalised when read (80VW -> 80vw)', $old['settings']['resultWidth'], '80vw');
eq('I4 a wrong stored width reads as empty (default), a bare number as px', [quiz_cfg_merge(['settings' => ['resultWidth' => 'wide']])['settings']['resultWidth'], quiz_cfg_merge(['settings' => ['resultWidth' => '640']])['settings']['resultWidth']], ['', '640px']);
eq('I5 a quiz without results is still fine', quiz_cfg_merge([])['results'], []);
[$cleanOld, $eOld] = validate_quiz(['name' => 'Lama', 'slug' => 'lama', 'sections' => [['id' => 'sa1', 'name' => 'Grammar']], 'sets' => [['id' => 'set1', 'sectionId' => 'sa1', 'questions' => [['id' => 'qa1', 'type' => 'single', 'text' => 'Q', 'points' => 1, 'options' => [['id' => 'o1', 'text' => 'a', 'correct' => true], ['id' => 'o2', 'text' => 'b']]]]]],
    'results' => $old['results']] + [], $admin);
eq('I6 an old result passes the validator after the upgrade and comes out in the new block types', [$eOld, types($cleanOld['cfg']['results'][0]['blocks'])], [[], ['h', 'text', 'text', 'score']]);

/* ---------- H. articles keep working with the shared validator ---------- */
[$ab, $e] = art_validate_blocks([['t' => 'button', 'label' => 'A', 'url' => '#close'], ['t' => 'h', 'text' => 'H', 'level' => 2, 'align' => 'center'], ['t' => 'img', 'src' => $IMG, 'size' => 'small']], true);
eq('H1 in articles headings have no alignment and images are normal or wide only (pop-up options do not leak in)', [isset($ab[1]['align']), array_column(array_filter($ab, static fn($b) => $b['t'] === 'img'), 'size'), array_key_exists('full', $ab[0])], [false, ['normal'], false]);

echo "\n$pass passed, $fail failed\n";
exit($fail > 0 ? 1 : 0);
