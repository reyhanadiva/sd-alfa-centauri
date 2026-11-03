<?php
/**
 * Checks for the block templates (shared by articles, pop-ups and quiz results) without MySQL or a web server.
 *   php test/php/templates.php          (from tools/article-editor)
 * It loads the real lib files; only db() is replaced by an in-memory SQLite database.
 */
declare(strict_types=1);
define('EN_PANEL', true);
ini_set('error_log', '/dev/null');
$lib = realpath(__DIR__ . '/../../../../public/edizon/lib');
require $lib . '/sanitize.php';
require $lib . '/content.php';

$TMP = sys_get_temp_dir() . '/entpl-' . getmypid();
function data_dir(): string { global $TMP; return $TMP; }
function ensure_dir(string $dir): void { if (!is_dir($dir)) { mkdir($dir, 0777, true); } }
function now_utc(): string { static $n = 0; return gmdate('Y-m-d H:i:s', 1700000000 + $n++); }
function is_admin(array $u): bool { return ($u['role'] ?? '') === 'admin'; }
function cfg(?string $key = null, mixed $default = null): mixed { return $default; }
function fmt_time(?string $utc): string { return (string) $utc; }
function form_get_by_slug(string $slug, bool $publishedOnly = true): ?array { return $slug === 'free-trial' ? ['slug' => $slug, 'layout' => 'popup', 'name' => 'Free trial'] : null; }
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        foreach ([
            'CREATE TABLE popups (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, status TEXT, config TEXT, created_at TEXT, updated_at TEXT, updated_by INTEGER)',
            'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
            'CREATE TABLE block_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mode TEXT, data TEXT, block_count INTEGER, has_html INTEGER, created_at TEXT, created_by INTEGER)',
            "INSERT INTO users (id, name) VALUES (1, 'Admin Ani'), (2, 'Editor Eko'), (3, 'Editor Eka')",
        ] as $q) { $pdo->exec($q); }
    }
    return $pdo;
}
require $lib . '/articles.php';
require $lib . '/popups.php';
require $lib . '/revisions.php';
require $lib . '/templates.php';

$pass = 0; $fail = 0;
function ok(string $name, bool $cond, mixed $extra = null): void
{
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS $name\n"; return; }
    $fail++; echo "FAIL $name" . ($extra !== null ? '  -> ' . (is_string($extra) ? $extra : json_encode($extra, JSON_UNESCAPED_UNICODE)) : '') . "\n";
}
function eq(string $name, mixed $got, mixed $want): void { ok($name, $got === $want, ['got' => $got, 'want' => $want]); }
function has_key(array $blocks, string $key): bool
{
    foreach ($blocks as $b) {
        if (array_key_exists($key, $b)) { return true; }
        foreach ($b['cols'] ?? [] as $c) { if (has_key($c, $key)) { return true; } }
    }
    return false;
}

$admin = ['id' => 1, 'role' => 'admin'];
$eko = ['id' => 2, 'role' => 'editor'];
$eka = ['id' => 3, 'role' => 'editor'];
$IMG = '/uploads/hero.jpg';

/* ---------- A. saving from an article ---------- */
[$row, $errs, $info] = tpl_save(['name' => 'Hero artikel', 'mode' => 'article', 'blocks' => [
    ['id' => 'abc', 't' => 'h', 'level' => 2, 'text' => 'Judul'],
    ['id' => 'def', 't' => 'img', 'src' => '', 'alt' => '', 'caption' => '', 'ratio' => '16:9', 'size' => 'normal'],
    ['id' => 'ghi', 't' => 'text', 'html' => '<p>Isi <strong>tebal</strong></p>'],
    ['id' => 'jkl', 't' => 'text', 'html' => '<p></p>'],
]], $eko);
eq('A1 saving works and reports what it kept', [$errs, $row['name'], $row['mode'], $row['count'], $row['html'], $row['by'], $row['can']], [[], 'Hero artikel', 'article', 2, false, 'Editor Eko', true]);
eq('A2 an image with no picture and an empty text are left out and counted', [$info['kept'], $info['dropped']], [2, 2]);
ok('A3 the reason for the left-out image is given', count($info['notes']) === 1 && str_contains($info['notes'][0], 'gambar belum dipilih'), $info['notes']);
$t = tpl_get($row['id'], $eko);
eq('A4 the stored blocks are the valid ones, without ids', [array_column($t['blocks'], 't'), has_key($t['blocks'], 'id')], [['h', 'text'], false]);
eq('A5 the template comes back with its name, mode and nothing skipped', [$t['name'], $t['mode'], $t['htmlSkipped']], ['Hero artikel', 'article', 0]);

/* ---------- B. what the template cannot hold ---------- */
[$r2, $e2] = tpl_save(['name' => ' ', 'mode' => 'article', 'blocks' => [['t' => 'hr']]], $eko);
eq('B1 a name is required', [$r2, $e2], [null, ['Beri nama templat.']]);
[$r2, $e2] = tpl_save(['name' => 'X', 'mode' => 'wiki', 'blocks' => [['t' => 'hr']]], $eko);
eq('B2 the editor kind must be known', [$r2, $e2], [null, ['Jenis editor tidak dikenal.']]);
[$r2, $e2] = tpl_save(['name' => 'Kosong', 'mode' => 'article', 'blocks' => [['t' => 'img', 'src' => ''], ['t' => 'text', 'html' => '<p></p>']]], $eko);
ok('B3 nothing valid = nothing saved, with the reason', $r2 === null && str_starts_with($e2[0], 'Tidak ada blok') && count($e2) === 2, $e2);
[$r2, $e2] = tpl_save(['name' => 'Kosong', 'mode' => 'article', 'blocks' => []], $eko);
ok('B4 an empty page cannot be saved', $r2 === null && $e2 !== [], $e2);
[$r2, $e2] = tpl_save(['name' => 'hero ARTIKEL', 'mode' => 'article', 'blocks' => [['t' => 'hr']]], $eko);
ok('B5 names are unique, ignoring case', $r2 === null && str_contains($e2[0], 'Sudah ada templat'), $e2);
[$r2, $e2] = tpl_save(['name' => 'Bad image', 'mode' => 'article', 'blocks' => [['t' => 'h', 'text' => 'A'], ['t' => 'img', 'src' => 'javascript:alert(1)']]], $eko);
eq('B6 an image address outside the allowed folders is left out (the heading is kept)', [$e2, $r2['count'], $r2['mode']], [[], 1, 'article']);
$id = tpl_get($r2['id'], $eko);
eq('B7 only the heading was stored', array_column($id['blocks'], 't'), ['h']);
[$r2, $e2] = tpl_save(['name' => 'Script', 'mode' => 'article', 'blocks' => [['t' => 'text', 'html' => '<p onclick="x()">Halo<script>alert(1)</script><img src=x onerror=alert(2)> <a href="javascript:alert(3)">tautan</a></p>']]], $eko);
$stored = json_encode(tpl_get($r2['id'], $eko)['blocks']);
ok('B8 rich text is cleaned like on save (no script, handlers, or javascript: links)', !preg_match('/<script|onclick|onerror|javascript:/i', $stored) && str_contains($stored, 'Halo'), $stored);

/* ---------- C. columns, other editors ---------- */
[$rc, $ec, $ic] = tpl_save(['name' => 'Dua kolom', 'mode' => 'article', 'blocks' => [['id' => 'c1', 't' => 'columns', 'ratio' => '1-1', 'cols' => [
    [['id' => 'x1', 't' => 'h', 'text' => 'Kiri'], ['id' => 'x2', 't' => 'img', 'src' => '']],
    [['id' => 'x3', 't' => 'text', 'html' => '<p>Kanan</p>']],
]]]], $eko);
$tc = tpl_get($rc['id'], $eko)['blocks'];
eq('C1 columns keep their valid children and drop the unfinished one', [$ec, $rc['count'], $ic['dropped'], count($tc[0]['cols'][0]), count($tc[0]['cols'][1])], [[], 3, 1, 1, 1]);
eq('C2 ids are removed inside columns too', has_key($tc, 'id'), false);

[$rp, $ep] = tpl_save(['name' => 'Pop-up promo', 'mode' => 'popup', 'blocks' => [
    ['t' => 'h', 'text' => 'Promo', 'align' => 'center'], ['t' => 'spacer', 'h' => 40], ['t' => 'form', 'slug' => 'free-trial'], ['t' => 'form', 'slug' => 'nope'],
    ['t' => 'score', 'style' => 'card'], ['t' => 'button', 'label' => 'Tutup', 'url' => '#close', 'align' => 'center'],
]], $eko);
eq('C3 pop-up template keeps spacer, an existing form and a close button; drops an unknown form and the score block', [$ep, $rp['mode'], array_column(tpl_get($rp['id'], $eko)['blocks'], 't')], [[], 'popup', ['h', 'spacer', 'form', 'button']]);
[$rr, $er] = tpl_save(['name' => 'Hasil kuis', 'mode' => 'result', 'blocks' => [
    ['t' => 'h', 'text' => 'Halo {name}', 'align' => 'center'], ['t' => 'score', 'style' => 'plain', 'align' => 'center'], ['t' => 'sections', 'title' => 'Rincian'],
    ['t' => 'button', 'label' => 'Daftar', 'url' => '/p/{slug}', 'align' => 'center'],
]], $eko);
eq('C4 result template keeps score and sections (and a link that uses a {variable})', [$er, array_column(tpl_get($rr['id'], $eko)['blocks'], 't')], [[], ['h', 'score', 'sections', 'button']]);

/* ---------- D. HTML blocks are for Admin ---------- */
$htmlBlocks = [['t' => 'h', 'text' => 'Embed'], ['t' => 'html', 'code' => '<div class="x">Halo</div>', 'h' => 'auto', 'scripts' => false, 'size' => 'normal', 'caption' => '']];
[$rh, $eh, $ih] = tpl_save(['name' => 'Editor HTML', 'mode' => 'article', 'blocks' => $htmlBlocks], $eko);
eq('D1 an editor cannot store an HTML block (it is left out, the rest is saved)', [$eh, $rh['html'], $rh['count'], $ih['dropped']], [[], false, 1, 1]);
[$ra, $ea] = tpl_save(['name' => 'Admin HTML', 'mode' => 'article', 'blocks' => $htmlBlocks], $admin);
eq('D2 an Admin can, and the list says so', [$ea, $ra['html'], $ra['count']], [[], true, 2]);
$ta = tpl_get($ra['id'], $admin);
$te = tpl_get($ra['id'], $eko);
eq('D3 an Admin receives the HTML block', [array_column($ta['blocks'], 't'), $ta['htmlSkipped']], [['h', 'html'], 0]);
eq('D4 an editor receives the template without it and is told how many were skipped', [array_column($te['blocks'], 't'), $te['htmlSkipped']], [['h'], 1]);
[$rd, $ed] = tpl_save(['name' => 'Page html', 'mode' => 'popup', 'blocks' => $htmlBlocks], $admin);
ok('D5 the pop-up rules apply to Admin HTML too (HTML at top level is fine)', $ed === [] && $rd['html'] === true, $ed);

/* ---------- E. list, rename, delete ---------- */
$l = tpl_list($eka);
eq('E1 the list is shared by everyone and sorted by name, without contents', array_column($l, 'name'), ['Admin HTML', 'Bad image', 'Dua kolom', 'Editor HTML', 'Hasil kuis', 'Hero artikel', 'Page html', 'Pop-up promo', 'Script']);
ok('E2 a row has no data, and "can" is true only for the author or an Admin', !array_key_exists('data', $l[0]) && !array_key_exists('blocks', $l[0]) && $l[array_search('Hero artikel', array_column($l, 'name'))]['can'] === false && tpl_list($eko)[array_search('Hero artikel', array_column($l, 'name'))]['can'] === true && tpl_list($admin)[0]['can'] === true);
[$x, $e] = tpl_rename($row['id'], 'Hero baru', $eka);
eq('E3 another editor cannot rename', [$x, $e], [null, ['Hanya pembuat templat atau Admin yang bisa mengubahnya.']]);
[$x, $e] = tpl_rename($row['id'], 'Hero baru', $eko);
eq('E4 the author can', [$e, $x['name']], [[], 'Hero baru']);
[$x, $e] = tpl_rename($row['id'], 'Dua kolom', $eko);
ok('E5 a rename cannot take an existing name', $x === null && str_contains($e[0], 'Sudah ada'), $e);
[$x, $e] = tpl_rename($row['id'], 'hero BARU', $eko);
eq('E6 renaming to the same name with other letter case is allowed (it is the same template)', [$e, $x['name']], [[], 'hero BARU']);
[$x, $e] = tpl_rename($row['id'], '  ', $eko);
eq('E7 a blank name is refused', [$x, $e], [null, ['Beri nama templat.']]);
[$x, $e] = tpl_rename($row['id'], 'Dari admin', $admin);
eq('E8 an Admin can rename anyone\'s', [$e, $x['name']], [[], 'Dari admin']);
eq('E9 another editor cannot delete', tpl_delete($row['id'], $eka), ['Hanya pembuat templat atau Admin yang bisa menghapusnya.']);
eq('E10 the author deletes', [tpl_delete($row['id'], $eko), tpl_get($row['id'], $eko)], [[], null]);
eq('E11 an Admin deletes anyone\'s', [tpl_delete($rc['id'], $admin), tpl_find($rc['id'])], [[], null]);
eq('E12 deleting twice reports it is gone', tpl_delete($rc['id'], $admin), ['Templat tidak ditemukan. Mungkin sudah dihapus.']);
eq('E13 unknown ids read as null', [tpl_get(99999, $admin), tpl_get(0, $admin)], [null, null]);

/* ---------- F. limits ---------- */
$long = array_fill(0, 40, ['t' => 'text', 'html' => '<p>' . str_repeat('kata ', 3500) . '</p>']);
[$x, $e] = tpl_save(['name' => 'Besar', 'mode' => 'article', 'blocks' => $long], $eko);
ok('F1 a template over the size limit is refused', $x === null && str_contains(implode(' ', $e), 'terlalu besar'), $e);
$pdo = db();
$n = (int) $pdo->query('SELECT COUNT(*) FROM block_templates')->fetchColumn();
$ins = $pdo->prepare("INSERT INTO block_templates (name, mode, data, block_count, has_html, created_at, created_by) VALUES (?, 'article', '[]', 0, 0, '2024-01-01 00:00:00', 1)");
for ($i = $n; $i < TPL_MAX; $i++) { $ins->execute(['Isi ' . $i]); }
[$x, $e] = tpl_save(['name' => 'Kelebihan', 'mode' => 'article', 'blocks' => [['t' => 'hr']]], $eko);
ok('F2 the list is capped', $x === null && str_contains($e[0], 'penuh'), $e);
eq('F3 the list call never returns more than the cap', count(tpl_list($admin)), TPL_MAX);

/* ---------- G. damaged data, missing table ---------- */
$pdo->prepare("INSERT INTO block_templates (name, mode, data, block_count, has_html, created_at, created_by) VALUES ('Rusak', 'article', '{broken', 1, 0, '2024-01-01 00:00:00', NULL)")->execute();
$bid = (int) $pdo->lastInsertId();
eq('G1 damaged stored data reads as an empty template, never an exception', tpl_get($bid, $admin)['blocks'], []);
eq('G2 a template without an author shows as "Sistem" and only Admin can change it', [tpl_list($admin)[array_search('Rusak', array_column(tpl_list($admin), 'name'))]['by'], tpl_delete($bid, $eko)], ['Sistem', ['Hanya pembuat templat atau Admin yang bisa menghapusnya.']]);

array_map('unlink', glob($TMP . '/*') ?: []); @rmdir($TMP);
echo "\n$pass passed, $fail failed\n";
exit($fail > 0 ? 1 : 0);
