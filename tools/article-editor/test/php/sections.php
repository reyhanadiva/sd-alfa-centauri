<?php
/**
 * Cek PHP untuk editor section beranda (lib/sections.php) tanpa MySQL dan tanpa server:
 *   php test/php/sections.php          (dari tools/article-editor)
 */
declare(strict_types=1);
define('EN_PANEL', true);
$lib = realpath(__DIR__ . '/../../../../public/edizon/lib');
require $lib . '/sanitize.php';
require $lib . '/content.php';

$pass = 0; $fail = 0;
function ok(string $name, bool $cond, mixed $extra = null): void
{
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS $name\n"; return; }
    $fail++; echo "FAIL $name" . ($extra !== null ? '  -> ' . json_encode($extra, JSON_UNESCAPED_UNICODE) : '') . "\n";
}
function eq(string $name, mixed $got, mixed $want): void { ok($name, $got === $want, ['got' => $got, 'want' => $want]); }

$seed = json_decode((string) file_get_contents($lib . '/seed/content.json'), true);
ok('S0 seed readable', is_array($seed));

/* ---- A. setiap section: seed lolos validasi, dan hasilnya stabil (validasi dua kali sama) ---- */
foreach (sections_all() as $key => $def) {
    ok("A $key has seed", isset($seed[$key]));
    [$clean, $errs] = validate_section($key, $seed[$key] ?? []);
    ok("A $key seed validates", $errs === [], $errs);
    [$again, $e2] = validate_section($key, $clean);
    ok("A $key idempotent", $e2 === [] && $again === $clean);
    ok("A $key has id+en", isset($clean['id'], $clean['en']));
    ok("A $key title set", $def['title'] !== '');
    ok("A $key validator registered", doc_validator($key) !== null);
}
ok('A99 doc_titles_all has site', isset(doc_titles_all()['site']) && isset(doc_titles_all()['hero']));

/* ---- B. aturan penolakan ---- */
function mut(string $key, callable $f): array
{
    global $seed;
    $d = $seed[$key];
    $f($d);
    return validate_section($key, $d)[1];
}
ok('B1 empty required text rejected', mut('hero', function (&$d) { $d['id']['hero']['register'] = ''; }) !== []);
ok('B2 odd ** rejected', mut('hero', function (&$d) { $d['id']['hero']['sub'] = 'a **b'; }) !== []);
ok('B3 too many nav items rejected', mut('navbar', function (&$d) { for ($i = 0; $i < 9; $i++) { $d['id']['nav'][] = ['label' => 'x', 'href' => '#a', 'children' => []]; } }) !== []);
ok('B4 javascript: link rejected', mut('navbar', function (&$d) { $d['id']['nav'][0]['href'] = 'javascript:alert(1)'; }) !== []);
ok('B5 data: link rejected', mut('berita', function (&$d) { $d['id']['berita']['items'][0]['href'] = 'data:text/html,x'; }) !== []);
ok('B6 tel: link accepted', mut('lokasi', function (&$d) { $d['shared']['site']['phoneHref'] = 'tel:+62227305453'; }) === []);
ok('B7 bad image path rejected', mut('galeri', function (&$d) { $d['id']['galeri']['items'][0]['photo'] = '../../etc/passwd'; }) !== []);
ok('B8 http image host rejected', mut('galeri', function (&$d) { $d['id']['galeri']['items'][0]['photo'] = 'https://evil.example/x.jpg'; }) !== []);
ok('B9 pexels host image accepted', mut('galeri', function (&$d) { $d['id']['galeri']['items'][0]['photo'] = 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress'; }) === []);
ok('B10 unknown icon rejected', mut('inklusi', function (&$d) { $d['id']['inklusi']['points'][0]['icon'] = 'nope'; }) !== []);
ok('B11 fixed list cannot shrink (berita)', mut('berita', function (&$d) { array_pop($d['id']['berita']['items']); }) !== []);
ok('B12 fixed list cannot shrink (program ranah)', mut('program', function (&$d) { array_pop($d['en']['program']['ranah']); }) !== []);
ok('B13 non-integer number rejected', mut('prestasi', function (&$d) { $d['shared']['prestasi']['total'] = 'abc'; }) !== []);
ok('B14 number out of range rejected', mut('prestasi', function (&$d) { $d['shared']['prestasi']['since'] = 5; }) !== []);
ok('B15 stats numbers may be null', mut('why', function (&$d) { $d['shared']['stats']['numbers'] = [null, null, null, null]; }) === []);
ok('B16 stats labels need exactly 4', mut('why', function (&$d) { array_pop($d['id']['stats']['labels']); }) !== []);
ok('B17 map embed must be google maps', mut('lokasi', function (&$d) { $d['shared']['lokasiMap']['mapEmbed'] = 'https://evil.example/maps'; }) !== []);
ok('B18 errors are tagged with language', in_array(true, array_map(fn($m) => str_starts_with($m, '[EN]'), mut('hero', function (&$d) { $d['en']['hero']['register'] = ''; })), true));
ok('B19 control characters are stripped', validate_section('hero', array_replace_recursive($seed['hero'], ['id' => ['hero' => ['register' => "Da\x00ftar\n"]]]))[0]['id']['hero']['register'] === 'Da ftar');
ok('B20 unknown keys are dropped', !isset(validate_section('hero', array_replace_recursive($seed['hero'], ['id' => ['hero' => ['evil' => '<script>']]]))[0]['id']['hero']['evil']));
ok('B21 html in text stays inert text (no tags filtering needed, escaped by site)', validate_section('hero', array_replace_recursive($seed['hero'], ['id' => ['hero' => ['alt' => '<b>x</b>']]]))[1] === []);
ok('B22 pairs need both halves', mut('prestasi', function (&$d) { $d['id']['prestasi']['categories'][0]['items'][0] = ['Juara 1', '']; }) !== []);
ok('B23 list max items for gallery more', mut('galeri', function (&$d) { $d['id']['galeri']['items'][0]['more'] = array_fill(0, 13, '/images/gedung-sd.jpg'); }) !== []);
ok('B24 unknown section', validate_section('nope', [])[1] !== []);
eq('B25 title2 keeps two parts', validate_section('faq', $seed['faq'])[0]['id']['faq']['title'], $seed['faq']['id']['faq']['title']);

/* ---- C. skema ---- */
$js = section_schema_for_js('hero');
ok('C1 schema exported for js', isset($js['fields'], $js['shared']));
foreach (sections_all() as $key => $def) {
    ok("C2 $key json-encodable", json_encode(section_schema_for_js($key)) !== false);
}

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
