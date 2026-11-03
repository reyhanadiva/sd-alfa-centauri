<?php
/**
 * Checks for the article PHP code (validation, sanitiser, renderer, Markdown, delete-all) without MySQL or a web server.
 *   php test/php/run.php          (from tools/article-editor)
 * It loads the real lib files; only db() is replaced by an in-memory SQLite database.
 */
declare(strict_types=1);
define('EN_PANEL', true);
$lib = realpath(__DIR__ . '/../../../../public/edizon/lib');
require $lib . '/sanitize.php';
require $lib . '/content.php';

function now_utc(): string { return gmdate('Y-m-d H:i:s'); }
function is_admin(array $u): bool { return ($u['role'] ?? '') === 'admin'; }
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        foreach ([
            'CREATE TABLE article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)',
            'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
            'CREATE TABLE item_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, item_id INTEGER, data TEXT, hash TEXT, title TEXT, summary TEXT, saved_at TEXT, saved_by INTEGER)',
            'CREATE TABLE article_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)',
            'CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, title TEXT, category_id INTEGER NULL)',
            'CREATE TABLE article_seo (article_id INTEGER PRIMARY KEY, data TEXT)',
            'CREATE TABLE article_tag_map (article_id INTEGER, tag_id INTEGER, PRIMARY KEY (article_id, tag_id))',
        ] as $q) { $pdo->exec($q); }
    }
    return $pdo;
}
require $lib . '/articles.php';
require $lib . '/revisions.php';

$pass = 0; $fail = 0;
function ok(string $name, bool $cond, mixed $extra = null): void
{
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS $name\n"; return; }
    $fail++; echo "FAIL $name" . ($extra !== null ? '  -> ' . (is_string($extra) ? $extra : json_encode($extra, JSON_UNESCAPED_UNICODE)) : '') . "\n";
}
function eq(string $name, mixed $got, mixed $want): void { ok($name, $got === $want, ['got' => $got, 'want' => $want]); }

/* ---------- A. rich text sanitiser ---------- */
eq('A1 plain paragraph stays', art_rich('<p>Hello</p>'), '<p>Hello</p>');
eq('A2 script, style and event attributes are removed', art_rich('<p onclick="x()" style="color:red">Hi<script>alert(1)</script><style>p{}</style></p>'), '<p>Hi</p>');
eq('A3 approved classes stay, others go', art_rich('<p class="ta-center evil"><span class="fs-lg">Big</span> <span class="fs-huge">x</span> <span class="ff-lora fs-sm">y</span></p>'),
    '<p class="ta-center"><span class="fs-lg">Big</span> x <span class="fs-sm ff-lora">y</span></p>');
eq('A4 javascript: link is unwrapped', art_rich('<p><a href="javascript:alert(1)">bad</a></p>'), '<p>bad</p>');
eq('A5 https link gets target and rel', art_rich('<p><a href="https://example.com/a">go</a></p>'), '<p><a href="https://example.com/a" target="_blank" rel="noopener noreferrer">go</a></p>');
eq('A6 internal and form links stay plain', art_rich('<p><a href="/program">a</a> <a href="#form:free-trial">b</a></p>'), '<p><a href="/program">a</a> <a href="#form:free-trial">b</a></p>');
eq('A7 h1 becomes h2, h5 and h6 become h4', art_rich('<h1>One</h1><h5>Five</h5><h6>Six</h6>'), '<h2>One</h2><h4>Five</h4><h4>Six</h4>');
eq('A8 headings keep alignment class', art_rich('<h3 class="ta-right">T</h3>'), '<h3 class="ta-right">T</h3>');
eq('A9 loose text is wrapped in a paragraph', art_rich('Just text'), '<p>Just text</p>');
eq('A10 empty paragraphs are dropped', art_rich('<p></p><p>A</p><p><br></p><p> </p>'), '<p>A</p>');
eq('A11 bullet list with paragraphs inside items', art_rich('<ul><li><p>One</p></li><li><p>Two</p></li></ul>'), '<ul><li><p>One</p></li><li><p>Two</p></li></ul>');
eq('A12 nested lists keep their shape', art_rich('<ol><li><p>A</p><ul><li><p>B</p></li></ul></li></ol>'), '<ol><li><p>A</p><ul><li><p>B</p></li></ul></li></ol>');
eq('A13 bare list item text becomes a paragraph', art_rich('<ul><li>Plain</li></ul>'), '<ul><li><p>Plain</p></li></ul>');
eq('A14 Word paste: MsoNormal class and style vanish', art_rich('<p class="MsoNormal" style="margin:0cm"><b>Bold</b> <i>it</i></p>'), '<p><strong>Bold</strong> <em>it</em></p>');
eq('A15 heading inside a list item becomes a paragraph', art_rich('<ul><li><h2>H</h2></li></ul>'), '<ul><li><p>H</p></li></ul>');
eq('A16 iframe, svg, object are dropped with their content', art_rich('<p>a</p><iframe src="https://x"></iframe><svg><text>t</text></svg><object data="x">o</object>'), '<p>a</p>');
eq('A17 strike, underline, hard break survive', art_rich('<p><s>a</s> <u>b</u><br>c</p>'), '<p><s>a</s> <u>b</u><br>c</p>');
eq('A18 images are not allowed in text', art_rich('<p>a<img src="/x.jpg" onerror="x"></p>'), '<p>a</p>');
$samples = ['<p class="ta-center"><span class="fs-lg"><span class="ff-lora">Hi</span></span> <a href="https://e.com">l</a></p><h2>H</h2><ul><li><p>a</p><ol><li><p>b</p></li></ol></li></ul>', '<p>a &amp; b &lt; c</p>', "<p>It's</p>", '<p>emoji 😀 and ñ</p>'];
$idem = true; foreach ($samples as $x) { $a = art_rich($x); if (art_rich($a) !== $a) { $idem = false; } }
ok('A19 cleaning is idempotent (cleaning twice changes nothing)', $idem);
ok('A20 entities and unicode survive', str_contains(art_rich($samples[1]), 'a &amp; b &lt; c') && str_contains(art_rich($samples[3]), '😀 and ñ'));

/* ---------- B. block validation ---------- */
[$o, $e] = art_validate_blocks([['t' => 'text', 'html' => '<p>Hi</p>', 'id' => 'abc123'], ['t' => 'text', 'html' => '<p>Dup</p>', 'id' => 'abc123'], ['t' => 'h', 'level' => 3, 'text' => 'Sub', 'id' => 'BAD ID!']], true);
ok('B1 ids kept when valid and unique; fixed otherwise', $o[0]['id'] === 'abc123' && $o[1]['id'] !== 'abc123' && preg_match('/^[a-z0-9]{4,12}$/', $o[2]['id']) && count(array_unique(array_column($o, 'id'))) === 3, $o);
[$o] = art_validate_blocks([['t' => 'h', 'level' => 1, 'text' => 'A'], ['t' => 'h', 'level' => 4, 'text' => 'B'], ['t' => 'h', 'level' => 9, 'text' => 'C'], ['t' => 'h', 'text' => '  ']], true);
eq('B2 heading levels: 2-4 kept, others become 2, empty dropped', array_column($o, 'level'), [2, 4, 2]);
[$o] = art_validate_blocks([['t' => 'text', 'html' => '<p></p>'], ['t' => 'text', 'html' => '']], true);
eq('B3 empty text blocks are dropped silently', $o, []);
[$o, $e] = art_validate_blocks([['t' => 'text', 'html' => '<p>' . str_repeat('a', ART_RICH_MAX + 1) . '</p>']], true);
ok('B4 a text block over the limit is refused with a message (not silently emptied)', $o === [] && count($e) === 1 && str_contains($e[0], 'terlalu panjang'), $e);
[$o, $e] = art_validate_blocks([['t' => 'img', 'src' => '/uploads/2026/10/a.webp', 'alt' => 'x', 'ratio' => '4:3', 'size' => 'wide'], ['t' => 'img', 'src' => '/uploads/2026/10/b.webp', 'ratio' => '2:1'], ['t' => 'img', 'src' => '/uploads/2026/10/c.webp']], true);
ok('B5 image ratio kept when approved; unknown or missing is left out (old images keep natural height)', $o[0]['ratio'] === '4:3' && !isset($o[1]['ratio']) && !isset($o[2]['ratio']) && $o[0]['size'] === 'wide', $o);
foreach (['4:3', '1:1', '16:9', '3:4', '3:2'] as $r) { [$o] = art_validate_blocks([['t' => 'img', 'src' => '/uploads/a.webp', 'ratio' => $r]], true); if (($o[0]['ratio'] ?? '') !== $r) { ok("B5b ratio $r accepted", false); } }
ok('B5b all five frame shapes are accepted', true);
[$o, $e] = art_validate_blocks([['t' => 'img', 'src' => ''], ['t' => 'img', 'src' => 'javascript:alert(1)']], true);
ok('B6 image without a picture, or with a bad address, is an error that names the block', $o === [] && count($e) === 2 && str_contains($e[0], 'Blok 1 (gambar)') && str_contains($e[1], 'Blok 2 (gambar)'), $e);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'ratio' => '1-2', 'cols' => [[['t' => 'text', 'html' => '<p>L</p>']], [['t' => 'button', 'label' => 'Go', 'url' => '/x', 'style' => 'outline']]]]], true);
ok('B7 columns keep their blocks, ratio, button style', $e === [] && $o[0]['t'] === 'columns' && $o[0]['ratio'] === '1-2' && count($o[0]['cols']) === 2 && $o[0]['cols'][1][0]['style'] === 'outline', $o);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [[['t' => 'columns', 'cols' => [[['t' => 'text', 'html' => '<p>deep</p>']], []]]], []]]], true);
ok('B8 columns inside columns are refused', count($e) === 1 && str_contains($e[0], 'kolom tidak bisa'), $e);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [[], []]]], true);
eq('B9 a columns block with nothing in it is dropped', $o, []);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [[['t' => 'hr']], [], [], [['t' => 'hr']]]]], true);
ok('B10 more than 3 columns is an error and only 3 are kept', count($e) === 1 && count($o[0]['cols']) === 3 && $o[0]['ratio'] === '1-1-1', $e);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [[['t' => 'hr']]]]], true);
ok('B11 a single column is padded to two', count($o[0]['cols']) === 2 && $o[0]['ratio'] === '1-1');
$many = []; for ($i = 0; $i < ART_MAX_BLOCKS; $i++) { $many[] = ['t' => 'hr']; }
[$o, $e] = art_validate_blocks($many, true);
ok('B12 exactly 250 blocks is fine', count($o) === 250 && $e === []);
$many[] = ['t' => 'hr'];
[$o, $e] = art_validate_blocks($many, true);
ok('B13 251 blocks is refused', count($e) === 1 && count($o) === 250, count($e));
$nested = []; for ($i = 0; $i < 124; $i++) { $nested[] = ['t' => 'hr']; }
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [$nested, $nested]], ['t' => 'hr'], ['t' => 'hr'], ['t' => 'hr']], true);
ok('B14 blocks inside columns count toward the 250 limit (1 + 248 + 3 = 252)', count($e) === 1 && str_contains($e[0], '250'), $e);
[$o] = art_validate_blocks([['t' => 'p', 'html' => 'Old <b>paragraph</b>'], ['t' => 'ul', 'style' => 'numbers', 'items' => ['a', 'b']]], true);
ok('B15 old paragraph and list blocks are still accepted', $o[0]['t'] === 'p' && $o[1]['t'] === 'ul' && $o[1]['items'] === ['a', 'b']);
[$o, $e] = art_validate_blocks([['t' => 'button', 'label' => 'Go', 'url' => 'javascript:x'], ['t' => 'button', 'label' => '', 'url' => '/a'], ['t' => 'button', 'label' => 'Ok', 'url' => '#form:free-trial']], true);
ok('B16 button needs a label and a safe address; #form: links are fine; default style is solid', count($e) === 2 && $o[0]['style'] === 'solid' && $o[0]['url'] === '#form:free-trial', $e);
[$o, $e] = art_validate_blocks([['t' => 'embed', 'url' => 'https://evil.example/x'], ['t' => 'video', 'url' => 'https://example.com/a'], ['t' => 'faq', 'items' => [['q' => 'Q', 'a' => '']]]], false);
ok('B17 embed host, video address and half-filled FAQ items are errors', count($e) === 3, $e);
[$o, $e] = art_validate_blocks([['t' => 'quote', 'text' => 'Q', 'cite' => 'Me'], ['t' => 'callout', 'tone' => 'tip', 'title' => 'T', 'text' => 'B'], ['t' => 'video', 'url' => 'https://youtu.be/jNQXAC9IVRw'], ['t' => 'embed', 'url' => 'https://www.openstreetmap.org/export/embed.html', 'height' => 'xl'], ['t' => 'faq', 'title' => 'F', 'items' => [['q' => 'Q', 'a' => 'A']]], ['t' => 'hr']], false);
ok('B18 quote, callout, video, embed, FAQ and divider all survive validation', $e === [] && count($o) === 6 && array_column($o, 't') === ['quote', 'callout', 'video', 'embed', 'faq', 'hr'], $e);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [[['t' => 'img', 'src' => ''], ['t' => 'hr']], []]]], true);
ok('B19 an error inside a column names the column and the block', count($e) === 1 && str_contains($e[0], 'Blok 1 (kolom 1), blok 1 (gambar)'), $e);

/* ---------- C. whole-article validation ---------- */
$admin = ['role' => 'admin', 'name' => 'T'];
[$c, $e] = art_validate(['title' => 'Judul Saya', 'status' => 'draft', 'blocks' => [['t' => 'text', 'html' => '<h2>Head</h2><p>First paragraph here.</p>']]], $admin);
ok('C1 excerpt is taken from the first paragraph of a text block', $e === [] && $c['excerpt'] === 'First paragraph here.', $c['excerpt']);
[$c, $e] = art_validate(['title' => 'X', 'status' => 'draft', 'blocks' => [['t' => 'columns', 'cols' => [[['t' => 'text', 'html' => '<p>In column</p>']], []]]]], $admin);
eq('C2 excerpt falls back to text inside a column', $c['excerpt'], 'In column');
[$c, $e] = art_validate(['title' => 'X', 'status' => 'published', 'audiences' => ['kids'], 'hero' => '/uploads/a.webp', 'blocks' => []], $admin);
ok('C3 publishing with no content is still refused', in_array('Isi artikel masih kosong.', $e, true), $e);

/* ---------- D. rendering ---------- */
$blocks = [
    ['id' => 'a1', 't' => 'h', 'level' => 4, 'text' => 'Small <b>head</b>'],
    ['id' => 'a2', 't' => 'text', 'html' => '<p class="ta-center"><span class="fs-xl">Big</span></p><ul><li><p>One</p></li></ul>'],
    ['id' => 'a3', 't' => 'img', 'src' => '/uploads/a.webp', 'alt' => 'Alt "q"', 'caption' => 'Cap', 'ratio' => '3:4', 'size' => 'wide'],
    ['id' => 'a4', 't' => 'columns', 'ratio' => '1-2', 'cols' => [[['t' => 'img', 'src' => '/uploads/b.webp', 'alt' => '', 'ratio' => '1:1', 'size' => 'wide'], ['t' => 'video', 'url' => 'https://youtu.be/jNQXAC9IVRw', 'caption' => '']], [['t' => 'button', 'label' => 'Go', 'url' => '/x', 'style' => 'outline'], ['t' => 'columns', 'cols' => [[], []]]]]],
    ['id' => 'a5', 't' => 'img', 'src' => '/uploads/old.webp', 'alt' => '', 'caption' => '', 'size' => 'normal'],
];
$html = art_render_blocks($blocks);
ok('D1 heading level 4 renders with its class and escapes text', str_contains($html, '<h4 class="a-h4">Small &lt;b&gt;head&lt;/b&gt;</h4>'));
ok('D2 text block output is the cleaned HTML', str_contains($html, '<p class="ta-center"><span class="fs-xl">Big</span></p><ul><li><p>One</p></li></ul>'));
ok('D3 image: frame class from ratio, wide class at top level, escaped alt', str_contains($html, '<figure class="a-fig ar-3-4 a-wide"><img src="/uploads/a.webp" alt="Alt &quot;q&quot;" loading="lazy"><figcaption>Cap</figcaption></figure>'), $html);
ok('D4 old image without a ratio keeps the old markup', str_contains($html, '<figure class="a-fig"><img src="/uploads/old.webp"'));
ok('D5 columns markup', str_contains($html, '<div class="a-cols a-cols-2 a-r-1-2"><div class="a-col">') && substr_count($html, 'class="a-col"') === 2);
ok('D6 wide is never applied inside a column (only the top-level wide image has it)', substr_count($html, 'a-wide') === 1, substr_count($html, 'a-wide'));
ok('D7 outline button class and no nested columns output', str_contains($html, 'class="a-btn a-btn-outline"') && substr_count($html, 'a-cols a-cols') === 1);
ok('D8 no style attribute or style tag anywhere (public CSP is style-src self)', !preg_match('/\sstyle\s*=|<style/i', $html));
ok('D9 render cleans text again (defence in depth)', !str_contains(art_render_blocks([['t' => 'text', 'html' => '<p onclick="x()">Hi<script>1</script></p>']]), 'onclick'));

/* ---------- E. helpers ---------- */
$tree = [['t' => 'text', 'html' => '<p>' . str_repeat('word ', 400) . '</p>'], ['t' => 'columns', 'cols' => [[['t' => 'text', 'html' => '<p>' . str_repeat('word ', 400) . '</p>']], []]]];
eq('E1 reading time counts words in columns too (800 words = 4 min)', art_reading_minutes($tree), 4);
$seen = []; art_walk_blocks([['t' => 'columns', 'cols' => [[['t' => 'hr']], [['t' => 'h', 'text' => 'x']]]], ['t' => 'hr']], function ($b) use (&$seen) { $seen[] = $b['t']; });
eq('E2 walker visits nested blocks in order', $seen, ['columns', 'hr', 'h', 'hr']);
$md = art_blocks_markdown([['t' => 'h', 'level' => 4, 'text' => 'Deep'], ['t' => 'text', 'html' => '<h2>Two</h2><p>Para <strong>bold</strong></p><ul><li><p>a</p><ol><li><p>b</p></li></ol></li><li><p>c</p></li></ul>'], ['t' => 'columns', 'cols' => [[['t' => 'text', 'html' => '<p>left</p>']], [['t' => 'text', 'html' => '<p>right</p>']]]]]);
eq('E3 Markdown covers headings, text blocks, nested lists and columns', $md, "#### Deep\n\n## Two\nPara bold\n- a\n  1. b\n- c\n\nleft\n\nright");
eq('E4 plain text helper', art_plain('<p>A&amp;B</p><p>C<br>D</p>'), 'A&B C D');

/* ---------- F. delete all, draft preview row ---------- */
$pdo = db();
$pdo->exec("INSERT INTO article_categories (name, slug) VALUES ('Tips', 'tips'), ('Unused', 'unused')");
$pdo->exec("INSERT INTO articles (slug, title, category_id) VALUES ('a', 'A', 1), ('b', 'B', 1)");
$pdo->exec("INSERT INTO article_tags (name, slug) VALUES ('x', 'x'), ('y', 'y')");
$pdo->exec("INSERT INTO article_tag_map (article_id, tag_id) VALUES (1, 1), (2, 2)");
$pdo->exec("INSERT INTO article_seo (article_id, data) VALUES (1, '{}'), (2, '{}')");
$row = art_draft_row(['category' => 'Tips', 'tags' => ['Belajar Cepat'], 'slug' => 's', 'title' => 'T', 'subtitle' => '', 'excerpt' => '', 'hero' => '', 'author' => '', 'audiences' => [], 'blocks' => [['t' => 'hr']], 'published_at' => null, 'seo' => art_seo_default()], ['name' => 'W'], 0);
ok('F1 draft row looks like a stored article (category id found, tag slugs, body JSON, status draft, both audiences)', $row['category_id'] === 1 && $row['tags'][0]['slug'] === 'belajar-cepat' && $row['audiences'] === ['kids', 'adult'] && $row['status'] === 'draft' && json_decode($row['body'], true)[0]['t'] === 'hr', $row);
eq('F2 delete all returns how many were removed', art_delete_all(), 2);
$left = [(int) $pdo->query('SELECT COUNT(*) FROM articles')->fetchColumn(), (int) $pdo->query('SELECT COUNT(*) FROM article_tag_map')->fetchColumn(), (int) $pdo->query('SELECT COUNT(*) FROM article_seo')->fetchColumn(), (int) $pdo->query('SELECT COUNT(*) FROM article_tags')->fetchColumn(), (int) $pdo->query('SELECT COUNT(*) FROM article_categories')->fetchColumn()];
eq('F3 articles, tag links, SEO rows, tags and categories are all gone', $left, [0, 0, 0, 0, 0]);
eq('F4 delete all on an empty table is fine and returns 0', art_delete_all(), 0);

/* ---------- G. the old sample articles still validate ---------- */
$allOk = true; $msgs = [];
foreach (art_sample_data() as $s) {
    [$c, $e] = art_validate(['title' => $s['title'], 'hero' => $s['hero'], 'audiences' => $s['aud'], 'status' => 'published', 'blocks' => $s['blocks']], ['role' => 'admin']);
    if ($e) { $allOk = false; $msgs[] = $e; }
    if (preg_match('/\sstyle\s*=/i', art_render_blocks($c['blocks']))) { $allOk = false; }
}
ok('G1 all 10 old sample articles still validate and render without style attributes', $allOk, $msgs);

/* ---------- H. cards ---------- */
$card = static fn(array $x = []) => array_merge(['src' => '/uploads/a.webp', 'alt' => 'Alt', 'title' => 'Title', 'text' => "Line one\nLine two", 'label' => 'Go', 'url' => '/articles/'], $x);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'per' => 4, 'ratio' => '1:1', 'btn' => 'outline', 'items' => [$card(), $card(['url' => '#form:free-trial', 'title' => 'Two']), $card(['label' => '', 'url' => '', 'src' => ''])]]], true);
ok('H1 cards keep per-row, frame shape, button style and every field', $e === [] && $o[0]['t'] === 'cards' && $o[0]['per'] === 4 && $o[0]['ratio'] === '1:1' && $o[0]['btn'] === 'outline' && count($o[0]['items']) === 3
    && $o[0]['items'][0]['title'] === 'Title' && $o[0]['items'][0]['text'] === "Line one\nLine two" && $o[0]['items'][1]['url'] === '#form:free-trial' && $o[0]['items'][2]['label'] === '' && $o[0]['items'][2]['src'] === '', $o);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'per' => 7, 'ratio' => '9:9', 'btn' => 'weird', 'items' => [$card()]], ['t' => 'cards', 'items' => [$card()]]], true);
ok('H2 unknown per-row, shape and button style fall back to 3, 4:3 and solid', $o[0]['per'] === 3 && $o[0]['ratio'] === '4:3' && $o[0]['btn'] === 'solid' && $o[1]['per'] === 3, $o);
foreach ([2, 3, 4] as $p) { [$o] = art_validate_blocks([['t' => 'cards', 'per' => $p, 'items' => [$card()]]], true); if ($o[0]['per'] !== $p) { ok("H3 per $p", false); } }
ok('H3 2, 3 and 4 cards per row are accepted', true);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'items' => [['src' => '', 'title' => ' ', 'text' => '', 'label' => '', 'url' => '']]], ['t' => 'cards', 'items' => []], ['t' => 'cards']], true);
ok('H4 empty cards and empty card blocks are dropped silently', $o === [] && $e === [], [$o, $e]);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'items' => [$card(['url' => '']), $card(['label' => '']), $card(['url' => 'javascript:alert(1)'])]]], true);
ok('H5 a button needs both a label and a safe address; each bad card is named', count($e) === 3 && str_contains($e[0], '(kartu 1)') && str_contains($e[1], '(kartu 2)') && str_contains($e[2], '(kartu 3)') && $o[0]['items'][0]['label'] === '' && $o[0]['items'][0]['url'] === '', $e);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'items' => [$card(['src' => 'javascript:alert(1)']), $card(['src' => 'https://evil.example/x.jpg'])]]], true);
ok('H6 a card image must be an uploaded picture; others are errors', count($e) === 2 && str_contains($e[0], 'gambar') && $o[0]['items'][0]['src'] === '', $e);
$urls = ['/articles/', 'https://example.com/x', '#form:free-trial', '#popup:promo', '#quiz:level', '[form:free-trial]', '[quiz:level]'];
[$o, $e] = art_validate_blocks([['t' => 'cards', 'items' => array_map(static fn($u) => $card(['url' => $u]), $urls)]], true);
ok('H7 button destinations match the Button block, including #form:, #popup: and #quiz: links and shortcodes', $e === [] && array_column($o[0]['items'], 'url') === ['/articles/', 'https://example.com/x', '#form:free-trial', '#popup:promo', '#quiz:level', '#form:free-trial', '#quiz:level'], $o[0]['items'] ?? $e);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'items' => array_fill(0, 13, $card())]], true);
ok('H8 13 cards is an error and 12 are kept', count($e) === 1 && str_contains($e[0], '12') && count($o[0]['items']) === 12, $e);
[$o, $e] = art_validate_blocks([['t' => 'cards', 'items' => [$card(['title' => str_repeat('t', 200), 'text' => str_repeat('x', 900), 'label' => str_repeat('l', 100)])]]], true);
ok('H9 title, text and label are cut at 80, 300 and 40 letters', mb_strlen($o[0]['items'][0]['title']) === 80 && mb_strlen($o[0]['items'][0]['text']) === 300 && mb_strlen($o[0]['items'][0]['label']) === 40, $e);
$ch = art_render_blocks([['t' => 'cards', 'per' => 3, 'ratio' => '16:9', 'btn' => 'outline', 'items' => [$card(['title' => 'A <b>&</b>']), $card(['src' => '', 'url' => 'https://example.com/x', 'label' => 'Ext']), $card(['url' => '#form:free-trial', 'label' => 'Form'])]]]);
ok('H10 cards markup: wide wrapper, grid class, article per card, image frame class, h3 title (escaped), text with line break', str_contains($ch, '<div class="a-cardsw a-wide"><div class="a-cards a-cards-3">') && substr_count($ch, '<article class="a-card">') === 3
    && str_contains($ch, '<div class="a-card-img ar-16-9"><img src="/uploads/a.webp" alt="Alt" loading="lazy"></div>') && str_contains($ch, '<h3 class="a-card-t">A &lt;b&gt;&amp;&lt;/b&gt;</h3>') && str_contains($ch, "<p class=\"a-card-p\">Line one<br>\nLine two</p>"), $ch);
ok('H11 a card without a picture has no image; external button opens a new tab, internal and #form: do not', substr_count($ch, '<img ') === 2 && str_contains($ch, 'href="https://example.com/x" target="_blank" rel="noopener noreferrer">Ext</a>')
    && str_contains($ch, '<a class="a-btn a-btn-outline" href="#form:free-trial">Form</a>') && str_contains($ch, '<a class="a-btn a-btn-outline" href="/articles/">Go</a>'), $ch);
ok('H12 no style attribute in cards output', !preg_match('/\sstyle\s*=|<style/i', $ch));
$ch2 = art_render_blocks([['t' => 'cards', 'items' => [['src' => '/uploads/a.webp', 'title' => 'T', 'label' => 'Bad', 'url' => 'javascript:alert(1)'], ['title' => 'NoLabel', 'label' => '', 'url' => '/x']]]]);
ok('H13 render re-checks the button address and needs a label', !str_contains($ch2, '<a ') && !str_contains($ch2, 'javascript'), $ch2);
$ch3 = art_render_blocks([['t' => 'columns', 'cols' => [[['t' => 'cards', 'per' => 2, 'items' => [$card()]]], []]]]);
$ch4 = art_render_blocks([['t' => 'cards', 'items' => [['src' => 'javascript:alert(1)', 'title' => 'X'], ['src' => 'data:image/svg+xml,<svg/>', 'title' => 'Y'], ['src' => '/uploads/ok.webp', 'title' => 'Z']]]]);
ok('H13b render shows only pictures from our own uploads or https (javascript: and data: are never output)', substr_count($ch4, '<img ') === 1 && !str_contains($ch4, 'javascript') && !str_contains($ch4, 'data:'), $ch4);
ok('H14 cards inside a column are allowed and never "wide"', str_contains($ch3, 'class="a-cardsw"') && !str_contains($ch3, 'a-wide'), $ch3);

/* ---------- I. table ---------- */
[$o, $e] = art_validate_blocks([['t' => 'table', 'header' => true, 'caption' => 'Prices', 'aligns' => ['left', 'center', 'right'], 'rows' => [['Plan', 'Hours', 'Price'], ['Basic', '4', '100'], ['Plus', '8', '180']]]], true);
ok('I1 table keeps header flag, caption, alignment and cells', $e === [] && $o[0]['t'] === 'table' && $o[0]['header'] === true && $o[0]['caption'] === 'Prices' && $o[0]['aligns'] === ['left', 'center', 'right'] && $o[0]['rows'][2] === ['Plus', '8', '180'], $o);
[$o, $e] = art_validate_blocks([['t' => 'table', 'rows' => [['<b>B</b> <i>I</i> <u>U</u> <s>S</s> <code>C</code>', '<script>alert(1)</script>x<span style="color:red" onclick="y()">sp</span>', '<a href="javascript:alert(1)">bad</a> <a href="https://e.com/a?x=1&y=2">good</a> <a href="/program">in</a>', '<img src="/x.jpg" onerror="z()">pic']]]], true);
ok('I2 cell text allows bold, italic, links and line breaks only', $e === [] && $o[0]['rows'][0][0] === '<strong>B</strong> <em>I</em> U S C' && !str_contains($o[0]['rows'][0][1], 'onclick') && !str_contains($o[0]['rows'][0][1], 'style') && $o[0]['rows'][0][1] !== ''
    && str_contains($o[0]['rows'][0][2], 'bad <a href="https://e.com/a?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">good</a> <a href="/program">in</a>') && !str_contains($o[0]['rows'][0][2], 'javascript') && !str_contains($o[0]['rows'][0][3], '<img') , $o[0]['rows'][0] ?? $e);
$cellSamples = ['<b>x</b> <i>y</i> <a href="https://e.com">l</a>', 'a &amp; b &lt; c', "It's <br>two lines", 'emoji 😀 ñ'];
$idem = true; foreach ($cellSamples as $x) { $a = art_cell($x); if (art_cell($a) !== $a) { $idem = false; } }
ok('I3 cleaning a cell twice changes nothing', $idem);
[$o, $e] = art_validate_blocks([['t' => 'table', 'rows' => [['ok', str_repeat('a', 301)], ['<b>' . str_repeat('b', 300) . '</b>', str_repeat('c', 5000)]]]], true);
ok('I4 a cell over 300 letters is an error naming the row and column; exactly 300 is fine', count($e) === 2 && str_contains($e[0], 'baris 1, kolom 2') && str_contains($e[1], 'baris 2, kolom 2') && mb_strlen(strip_tags($o[0]['rows'][1][0])) === 300, $e);
$wideRow = array_fill(0, 9, 'x');
[$o, $e] = art_validate_blocks([['t' => 'table', 'rows' => [$wideRow, $wideRow]]], true);
ok('I5 more than 8 columns is an error and 8 are kept', count($e) === 1 && str_contains($e[0], '8 kolom') && count($o[0]['rows'][0]) === 8 && count($o[0]['aligns']) === 8, $e);
[$o, $e] = art_validate_blocks([['t' => 'table', 'rows' => array_fill(0, 31, ['a', 'b'])]], true);
ok('I6 more than 30 rows is an error and 30 are kept', count($e) === 1 && str_contains($e[0], '30 baris') && count($o[0]['rows']) === 30, $e);
[$o, $e] = art_validate_blocks([['t' => 'table', 'rows' => array_fill(0, 30, array_fill(0, 8, 'z'))]], true);
ok('I7 exactly 30 rows and 8 columns is fine', $e === [] && count($o[0]['rows']) === 30 && count($o[0]['rows'][29]) === 8);
[$o, $e] = art_validate_blocks([['t' => 'table', 'aligns' => ['center', 'weird'], 'rows' => [['a'], ['b', 'c', 'd']]]], true);
ok('I8 short rows are padded to the widest row; bad or missing alignments become left', $e === [] && $o[0]['rows'][0] === ['a', '', ''] && $o[0]['aligns'] === ['center', 'left', 'left'] && $o[0]['header'] === false && $o[0]['caption'] === '', $o);
[$o, $e] = art_validate_blocks([['t' => 'table', 'rows' => [['', ''], ['', '']]], ['t' => 'table', 'rows' => []], ['t' => 'table'], ['t' => 'table', 'rows' => [['a', 'b'], ['', ''], ['', '']]]], true);
ok('I9 an empty table is dropped silently; empty rows at the end are trimmed', $e === [] && count($o) === 1 && count($o[0]['rows']) === 1, [$o, $e]);
$th = art_render_blocks([['t' => 'table', 'header' => true, 'caption' => 'Fees "2026"', 'aligns' => ['left', 'center', 'right'], 'rows' => [['Plan', 'Hours', 'Price'], ['<b>Basic</b>', '4', '<a href="/x">100</a>'], ['Plus', '8', '180']]]]);
ok('I10 table markup: scroll box, caption, header cells with scope, body rows, alignment classes', str_contains($th, '<div class="a-tablewrap" role="region" tabindex="0" aria-label="Fees &quot;2026&quot;"><table class="a-table"><caption>Fees &quot;2026&quot;</caption>')
    && str_contains($th, '<thead><tr><th scope="col">Plan</th><th scope="col" class="ta-center">Hours</th><th scope="col" class="ta-right">Price</th></tr></thead>')
    && str_contains($th, '<tbody><tr><td><strong>Basic</strong></td><td class="ta-center">4</td><td class="ta-right"><a href="/x">100</a></td></tr><tr><td>Plus</td>') && substr_count($th, '<tr>') === 3, $th);
$th2 = art_render_blocks([['t' => 'table', 'header' => false, 'rows' => [['a', 'b'], ['c', 'd']]]]);
ok('I11 without a header row there is no thead and no th; no caption means the box is labelled "Tabel"', !str_contains($th2, '<thead>') && !str_contains($th2, '<th') && !str_contains($th2, '<caption>') && str_contains($th2, 'aria-label="Tabel"') && substr_count($th2, '<td') === 4, $th2);
$th3 = art_render_blocks([['t' => 'table', 'header' => true, 'rows' => [['H1', 'H2']]]]);
ok('I12 a table with only a header row renders without an empty tbody', str_contains($th3, '<thead>') && !str_contains($th3, '<tbody>'), $th3);
$th4 = art_render_blocks([['t' => 'table', 'rows' => [['<b onclick="x()">A</b><script>1</script>', '<a href="javascript:x">b</a>']]]]);
ok('I13 render cleans the cells again, and there is no style attribute', !str_contains($th4, 'onclick') && !str_contains($th4, 'script') && !str_contains($th4, 'javascript') && !preg_match('/\sstyle\s*=|<style/i', $th . $th2 . $th4), $th4);
$th5 = art_render_blocks([['t' => 'columns', 'cols' => [[['t' => 'table', 'rows' => [['a', 'b']]]], []]]]);
ok('I14 a table inside a column is allowed', str_contains($th5, '<div class="a-col"><div class="a-tablewrap"'), $th5);

/* ---------- J. cards and table in the helpers ---------- */
$mdc = art_blocks_markdown([['t' => 'cards', 'items' => [['title' => 'One', 'text' => "Two\nlines", 'label' => 'Go', 'url' => '/x'], ['title' => 'Only title', 'text' => '', 'label' => '', 'url' => '']]]]);
eq('J1 cards as Markdown: bold title, text on one line, link', $mdc, "**One**\nTwo lines\n[Go](/x)\n\n**Only title**");
$mdt = art_blocks_markdown([['t' => 'table', 'header' => true, 'caption' => 'Fees', 'aligns' => ['left', 'center', 'right'], 'rows' => [['Plan', 'Hours', 'Price'], ['<strong>Basic</strong> | <em>x</em>', '4', '<a href="https://e.com/a?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">100</a>']]]]);
eq('J2 table as a Markdown table with caption, alignment marks, bold, italic, links and escaped bars', $mdt, "**Fees**\n\n| Plan | Hours | Price |\n| --- | :---: | ---: |\n| **Basic** \\| *x* | 4 | [100](https://e.com/a?x=1&y=2) |");
$mdt2 = art_blocks_markdown([['t' => 'table', 'rows' => [['a', 'b'], ['c', 'd']]]]);
eq('J3 table without a header gets an empty Markdown header row', $mdt2, "|  |  |\n| --- | --- |\n| a | b |\n| c | d |");
$words = str_repeat('word ', 400);
eq('J4 reading time counts words in cards and table cells (400 + 400 words = 4 min)', art_reading_minutes([['t' => 'cards', 'items' => [['title' => '', 'text' => $words, 'label' => '']]], ['t' => 'table', 'caption' => '', 'rows' => [[$words]]]]), 4);
$seen = []; art_walk_blocks([['t' => 'cards', 'items' => []], ['t' => 'columns', 'cols' => [[['t' => 'table', 'rows' => []]], []]]], function ($b) use (&$seen) { $seen[] = $b['t']; });
eq('J5 the walker visits cards and tables', $seen, ['cards', 'columns', 'table']);
[$o, $e] = art_validate_blocks(array_merge(array_fill(0, 249, ['t' => 'hr']), [['t' => 'cards', 'items' => [$card()]], ['t' => 'table', 'rows' => [['a']]]]), true);
ok('J6 a cards block and a table each count as one block toward the 250 limit', count($e) === 1 && count($o) === 250 && $o[249]['t'] === 'cards', $e);
[$c, $e] = art_validate(['title' => 'X', 'status' => 'draft', 'blocks' => [['t' => 'cards', 'items' => [$card()]], ['t' => 'text', 'html' => '<p>First text</p>']]], $admin);
eq('J7 the excerpt comes from the first paragraph, not from card text', $c['excerpt'], 'First text');
$j1 = json_encode(art_validate_blocks([['t' => 'cards', 'per' => 2, 'items' => [$card()]], ['t' => 'table', 'header' => true, 'rows' => [['a', 'b'], ['<b>c</b>', 'd']]]], true)[0]);
$again = art_validate_blocks(json_decode($j1, true), true);
eq('J8 validating already-validated cards and table changes nothing (save, reload, save)', json_encode($again[0]), $j1);

/* ---------- K. HTML block (Admin only, isolated frame) ---------- */
$editor = ['role' => 'editor'];
$H = static fn(array $x = []) => array_merge(['t' => 'html', 'code' => '<div class="x">Hello</div>'], $x);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa', 'code' => "<p>a</p>\r\n<p>b\0</p>", 'caption' => '  Cap & co  '])], true);
ok('K1 Admin: an html block is kept as typed (line breaks normalised, NUL removed) with defaults auto height, normal width, scripts off', !$e && $o[0]['t'] === 'html' && $o[0]['code'] === "<p>a</p>\n<p>b</p>" && $o[0]['h'] === 'auto' && $o[0]['size'] === 'normal' && $o[0]['scripts'] === false && $o[0]['caption'] === 'Cap & co', [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['code' => "  \n\t "])], true);
ok('K2 an html block with no code is dropped without an error', !$e && !$o, [$o, $e]);
[$o, $e] = art_validate_blocks([['t' => 'hr'], $H(['code' => str_repeat('a', ART_HTML_MAX + 1)])], true);
ok('K3 more than 300,000 letters is refused and the block is named', count($e) === 1 && str_contains($e[0], 'Blok 2 (HTML)') && count($o) === 1, [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['code' => "bad \xC3\x28 bytes"])], true);
ok('K3b code that is not valid UTF-8 is refused', count($e) === 1 && str_contains($e[0], 'UTF-8'), $e);
[$o, $e] = art_validate_blocks([['t' => 'columns', 'cols' => [[$H()], []]]], true);
ok('K4 an html block inside a column is refused (it must be at the top level)', count($e) === 1 && str_contains($e[0], 'kolom'), [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa'])], false, []);
ok('K5 Editor: a new html block is refused with a clear message, nothing is saved', count($e) === 1 && str_contains($e[0], 'hanya Admin') && !$o, [$o, $e]);
$fp = art_html_fp('<div class="x">Hello</div>', false);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa', 'size' => 'wide', 'h' => 'l', 'caption' => 'New caption'])], false, ['hb1aa' => $fp]);
ok('K5b Editor: an html block that is already saved can stay; width, height and caption may change', !$e && count($o) === 1 && $o[0]['size'] === 'wide' && $o[0]['h'] === 'l' && $o[0]['caption'] === 'New caption', [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa', 'code' => '<div class="x">Hello!</div>'])], false, ['hb1aa' => $fp]);
ok('K5c Editor: changing the saved code is refused', count($e) === 1 && !$o, [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa', 'scripts' => true])], false, ['hb1aa' => $fp]);
ok('K5d Editor: switching scripts on is refused', count($e) === 1 && !$o, [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['id' => 'zzzz9'])], false, ['hb1aa' => $fp]);
ok('K5e Editor: copying the same code into a block with another id is refused', count($e) === 1 && !$o, [$o, $e]);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa', 'scripts' => 'false'])], true);
ok('K6 the scripts option is a real yes/no: the text "false" does not switch scripts on', $o[0]['scripts'] === false, $o);
[$o, $e] = art_validate_blocks([$H(['id' => 'hb1aa', 'scripts' => true, 'h' => 'xl', 'size' => 'wide'])], true);
ok('K6b scripts true, height xl, width wide are kept; an unknown height falls back to auto', $o[0]['scripts'] === true && $o[0]['h'] === 'xl' && $o[0]['size'] === 'wide' && art_validate_blocks([$H(['h' => 'giant'])], true)[0][0]['h'] === 'auto', $o);
$hb = ['id' => 'hb1aa', 't' => 'html', 'code' => '<h1>SECRET-CODE</h1><script>alert(1)</script>', 'scripts' => true, 'h' => 'auto', 'size' => 'wide', 'caption' => 'Pricing "widget"'];
$pub = art_render_blocks([$hb], false, ['frames' => 'public', 'id' => 7]);
ok('K7 public page: the code itself is NOT in the page; there is a sandboxed frame loading /articles/frame.php with the article and block ids',
    !str_contains($pub, 'SECRET-CODE') && !str_contains($pub, '<script') && str_contains($pub, 'data-src="/articles/frame.php?id=7&amp;b=hb1aa&amp;v=') && !str_contains($pub, ' src="') && str_contains($pub, 'data-ls="7:hb1aa"') && str_contains($pub, 'data-auto="1"') && str_contains($pub, 'a-wide'), $pub);
ok('K7b the sandbox lets scripts and popups run but never same-origin, top navigation, forms or downloads', preg_match('/sandbox="([^"]*)"/', $pub, $m) && $m[1] === 'allow-scripts allow-popups allow-popups-to-escape-sandbox', $pub);
$off = art_render_blocks([array_merge($hb, ['scripts' => false])], false, ['frames' => 'public', 'id' => 7]);
ok('K7e with JavaScript off the frame address is set right away (no storage hand-over)', str_contains($off, ' src="/articles/frame.php?id=7&amp;b=hb1aa&amp;v=') && !str_contains($off, 'data-ls') && !str_contains($off, 'data-src'), $off);
$vh = art_render_blocks([array_merge($hb, ['h' => 'vh', 'scripts' => false])], false, ['frames' => 'public', 'id' => 7]);
ok('K7f height "vh" (as tall as the screen) gets its own class and no auto-size', str_contains($vh, 'a-hf-vh') && !str_contains($vh, 'data-auto'), $vh);
ok('K7c caption is shown (escaped) and used as the frame title', str_contains($pub, '<figcaption>Pricing &quot;widget&quot;</figcaption>') && str_contains($pub, 'title="Pricing &quot;widget&quot;"'), $pub);
$fixed = art_render_blocks([array_merge($hb, ['h' => 'l', 'size' => 'normal'])], false, ['frames' => 'public', 'id' => 7]);
ok('K7d a fixed height uses a height class and no auto-size; normal width is not wide', str_contains($fixed, 'a-hf-l') && !str_contains($fixed, 'data-auto') && !str_contains($fixed, 'a-wide'), $fixed);
$post = art_render_blocks([array_merge($hb, ['code' => "</textarea><script>alert(2)</script>\nx & y"])], false, ['frames' => 'panel-post', 'id' => 0, 'panel' => '/edizon', 'csrf' => 'tok"en']);
ok('K8 unsaved preview: the code travels in a hidden form to the panel frame page, fully escaped, with the csrf token and a matching frame name',
    str_contains($post, 'action="/edizon/article-frame.php"') && str_contains($post, 'target="hf-hb1aa"') && str_contains($post, 'name="hf-hb1aa"') && str_contains($post, '&lt;/textarea&gt;&lt;script&gt;') && !str_contains($post, '</textarea><script>') && str_contains($post, 'value="tok&quot;en"'), $post);
$get = art_render_blocks([$hb], false, ['frames' => 'panel-get', 'id' => 7, 'panel' => '/edizon']);
ok('K8b saved-article preview in the panel uses the panel frame page', str_contains($get, 'src="/edizon/article-frame.php?id=7&amp;b=hb1aa&amp;v=') && !str_contains($get, 'SECRET-CODE'), $get);
$none = art_render_blocks([$hb]);
ok('K9 without a frame context nothing of the code leaks, only a short note', !str_contains($none, 'SECRET-CODE') && !str_contains($none, '<iframe') && str_contains($none, 'a-note'), $none);
ok('K9b an html block saved inside a column (old or hand-made data) is not rendered', !str_contains(art_render_blocks([['t' => 'columns', 'cols' => [[$hb], []]]], false, ['frames' => 'public', 'id' => 7]), 'a-hf'));
$c0 = art_frame_csp(false, 'N0nce_-x'); $c1 = art_frame_csp(true, 'N0nce_-x');
ok('K10 frame policy with scripts off: only the page\'s own height script (by nonce) may run, no connections, own sandbox, only this site may embed it',
    str_contains($c0, "script-src 'nonce-N0nce_-x';") && !str_contains($c0, "'unsafe-inline' https:; style") && str_contains($c0, "connect-src 'none'") && str_contains($c0, "default-src 'none'") && str_contains($c0, "frame-ancestors 'self'") && str_contains($c0, "base-uri 'none'") && str_contains($c0, "form-action 'none'"), $c0);
ok('K10b frame policy with scripts on: inline and https scripts and connections are allowed', str_contains($c1, "script-src 'unsafe-inline' https:;") && str_contains($c1, 'connect-src https:'), $c1);
ok('K10c neither policy ever lets the frame be same-origin or navigate the page', !str_contains($c0 . $c1, 'allow-same-origin') && !str_contains($c0 . $c1, 'allow-top-navigation') && !str_contains($c0 . $c1, 'allow-forms') && str_contains($c0, 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox'), [$c0, $c1]);
$raw = "<style>p{color:red}</style>\n<p onclick=\"x()\">Hi & <b>there</b></p><script>var s='</div>';</script>";
$doc = art_frame_doc($raw, 'abc123');
ok('K11 frame document: the code is inside #en-root byte for byte, the height script carries the nonce, links open in a new tab', str_contains($doc, '<div id="en-root">' . $raw . '</div>') && str_contains($doc, '<script nonce="abc123">') && str_contains($doc, '<base target="_blank">') && substr_count($doc, 'nonce="abc123"') === 1, $doc);
$docJs = art_frame_doc($raw, 'abc123', true);
ok('K11c with JavaScript on the document gets a replacement localStorage / sessionStorage before the code; with JavaScript off it has none',
    strpos($docJs, 'enls:') !== false && strpos($docJs, 'enls:') < strpos($docJs, 'id="en-root"') && str_contains($docJs, '<div id="en-root">' . $raw . '</div>') && !str_contains($doc, 'enls:') && !str_contains($doc, 'localStorage'), $docJs);
ok('K11b the height script is posted to the parent and does not contain a closing script tag', str_contains($doc, 'postMessage({enFrame:1,h:h}') && substr_count(substr($doc, strpos($doc, '<script nonce')), '</script>') === 1);
[$o, $e] = art_validate_blocks([$H(['code' => str_repeat('a', 120000)])], true);
ok('K17 a whole web page of 120,000 letters is accepted (the limit is 300,000)', !$e && strlen($o[0]['code']) === 120000, $e);
[$c, $e] = art_validate(['title' => 'X', 'status' => 'draft', 'blocks' => [], 'seo' => ['layout' => 'full']], $admin);
[$c2, $e2] = art_validate(['title' => 'X', 'status' => 'draft', 'blocks' => [], 'seo' => ['layout' => 'wide']], $admin);
[$c3, $e3] = art_validate(['title' => 'X', 'status' => 'draft', 'blocks' => []], $admin);
ok('K18 the article option "use the whole browser width" is kept only as "full"; anything else, or nothing, means the template width',
    !$e && $c['seo']['layout'] === 'full' && $c2['seo']['layout'] === '' && $c3['seo']['layout'] === '' && art_seo_default()['layout'] === '', [$c['seo'], $c2['seo'], $c3['seo']]);
ok('K12 finding a block: only a top-level html block with that exact id', art_find_html_block(['body' => json_encode([$hb, ['t' => 'columns', 'cols' => [[['id' => 'inner1', 't' => 'html', 'code' => 'x']]]]])], 'hb1aa')['code'] === $hb['code'] && art_find_html_block(['body' => json_encode([$hb])], 'nope1') === null && art_find_html_block(['body' => json_encode([['t' => 'columns', 'cols' => [[['id' => 'inner1', 't' => 'html', 'code' => 'x']]]]])], 'inner1') === null && art_find_html_block(['body' => 'not json'], 'hb1aa') === null);
ok('K13 an html block adds nothing to the Markdown export, the reading time or the SEO word count', art_blocks_markdown([$hb]) === '' && art_reading_minutes([$hb]) === art_reading_minutes([]), [art_blocks_markdown([$hb])]);
$k14 = art_validate_blocks([$H(['id' => 'hb1aa', 'scripts' => true, 'h' => 'm', 'size' => 'wide', 'caption' => 'C']), ['t' => 'hr']], true)[0];
eq('K14 validating already-validated html blocks changes nothing (save, reload, save)', json_encode(art_validate_blocks(json_decode(json_encode($k14), true), true)[0]), json_encode($k14));
[$o, $e] = art_validate_blocks(array_merge(array_fill(0, 249, ['t' => 'hr']), [$H(), $H(['code' => '<p>2</p>'])]), true);
ok('K15 an html block counts as one block toward the 250 limit', count($e) === 1 && count($o) === 250 && $o[249]['t'] === 'html', $e);
[$c, $e] = art_validate(['title' => 'X', 'status' => 'draft', 'blocks' => [$H(['code' => '<p>Not the excerpt</p>']), ['t' => 'text', 'html' => '<p>Real first text</p>']]], $admin);
eq('K16 the excerpt never comes from html block code', $c['excerpt'], 'Real first text');

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
