<?php
/**
 * Checks for the form builder (steps, rows, layout blocks, drafts flag) without MySQL or a web server.
 *   php test/php/forms.php          (from tools/article-editor)
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
        $pdo->exec('CREATE TABLE suggest_lists (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, items TEXT, created_at TEXT, updated_at TEXT)');
        $pdo->exec('CREATE TABLE article_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, slug TEXT)');
    }
    return $pdo;
}
require $lib . '/articles.php';
require $lib . '/forms.php';

$pass = 0; $fail = 0;
function ok(string $name, bool $cond, mixed $extra = null): void
{
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS $name\n"; return; }
    $fail++; echo "FAIL $name" . ($extra !== null ? '  -> ' . (is_string($extra) ? $extra : json_encode($extra, JSON_UNESCAPED_UNICODE)) : '') . "\n";
}
function eq(string $name, mixed $got, mixed $want): void { ok($name, $got === $want, ['got' => $got, 'want' => $want]); }

$user = ['id' => 1, 'role' => 'admin'];
function fld(string $key, string $type = 'text', array $x = []): array
{
    return array_merge(['key' => $key, 'type' => $type, 'label' => 'Label ' . $key, 'labelAdult' => '', 'hint' => '', 'required' => false, 'options' => [], 'zkey' => '',
        'suggest' => ['list' => [], 'learn' => false], 'showIf' => null, 'consent' => ['text' => '', 'url' => '']], $x);
}
function base(array $over = []): array
{
    $texts = ['kids' => ['eyebrow' => '', 'title' => 'Judul', 'intro' => '', 'submit' => 'Kirim', 'note' => '', 'successTitle' => 'Terima kasih', 'successMsg' => 'Sudah masuk.'],
        'adult' => ['eyebrow' => '', 'title' => '', 'intro' => '', 'submit' => '', 'note' => '', 'successTitle' => '', 'successMsg' => '']];
    return array_merge(['name' => 'Uji', 'slug' => 'uji', 'layout' => 'popup', 'status' => 'published', 'zapierFormId' => '', 'zapierFormName' => '', 'waFallback' => true, 'photo' => '', 'texts' => $texts, 'fields' => [], 'steps' => []], $over);
}
function v(array $in): array { global $user; return validate_form_def($in, $user); }
function step(string $id, string $name, array $items): array { return ['id' => $id, 'name' => $name, 'items' => $items]; }
function fi(string $k): array { return ['t' => 'field', 'key' => $k]; }
function row(array $ks, string $id = 'row1'): array { return ['t' => 'row', 'id' => $id, 'keys' => $ks]; }
function errHas(array $errs, string $needle): bool { foreach ($errs as $e) { if (str_contains($e, $needle)) { return true; } } return false; }

/* ---------- F. legacy forms and the plain shape ---------- */
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb')]]));
ok('F1 no steps sent (old editor): one nameless step with every field in order', !$e && count($d['cfg']['steps']) === 1 && $d['cfg']['steps'][0]['name'] === '' && array_column($d['cfg']['steps'][0]['items'], 'key') === ['aa', 'bb'], [$e, $d['cfg']['steps'] ?? null]);
ok('F1b drafts default to on when the key is not sent', $d['cfg']['drafts'] === true);
[$d, $e] = v(base(['fields' => [fld('aa')], 'drafts' => false]));
ok('F1c drafts can be switched off', !$e && $d['cfg']['drafts'] === false);
[$d, $e] = v(base(['fields' => [fld('aa')], 'drafts' => true]));
ok('F1d drafts on stays on', $d['cfg']['drafts'] === true);
$cfgOld = ['texts' => [], 'fields' => [fld('aa'), fld('bb')]];
eq('F1e a stored form without steps becomes one step', array_column(form_cfg_steps($cfgOld)[0]['items'], 'key'), ['aa', 'bb']);

/* ---------- G. steps ---------- */
$two = base(['fields' => [fld('cc'), fld('aa'), fld('bb')], 'steps' => [step('s1', 'Data diri', [fi('aa'), fi('bb')]), step('s2', 'Pilihan', [fi('cc')])]]);
[$d, $e] = v($two);
ok('G1 two steps are saved with their names', !$e && count($d['cfg']['steps']) === 2 && $d['cfg']['steps'][1]['name'] === 'Pilihan', $e);
eq('G2 the field list follows the display order (not the order it was sent in)', array_column($d['cfg']['fields'], 'key'), ['aa', 'bb', 'cc']);
$nine = []; $f9 = [];
for ($i = 1; $i <= 9; $i++) { $f9[] = fld('k' . $i); $nine[] = step('st' . $i, 'Langkah ' . $i, [fi('k' . $i)]); }
[$d, $e] = v(base(['fields' => $f9, 'steps' => $nine]));
ok('G3 more than 8 steps is refused', errHas($e, 'Maksimal 8 langkah'), $e);
[$d, $e] = v(base(['fields' => array_slice($f9, 0, 8), 'steps' => array_slice($nine, 0, 8)]));
ok('G3b exactly 8 steps is fine', !$e && count($d['cfg']['steps']) === 8, $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb')], 'steps' => [step('s1', '', [fi('aa')]), step('s2', 'Dua', [fi('bb')])]]));
ok('G4 with more than one step every step needs a name', errHas($e, 'Langkah 1: nama wajib diisi'), $e);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', 'Satu', [fi('aa')]), step('s2', 'Kosong', [])]]));
ok('G5 an empty step is refused with its name', errHas($e, 'Langkah 2 ("Kosong") belum berisi apa pun'), $e);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', [fi('aa')])]]));
ok('G6 a single step may have no name', !$e && $d['cfg']['steps'][0]['name'] === '', $e);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', 'Satu', [fi('aa'), fi('aa')])]]));
ok('G7 a field placed twice is refused', errHas($e, 'muncul lebih dari sekali'), $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb')], 'steps' => [step('s1', 'Satu', [fi('aa')]), step('s2', 'Dua', [fi('zzz')])]]));
ok('G8 a step that only points at deleted fields counts as empty', errHas($e, 'Langkah 2'), $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb'), fld('cc')], 'steps' => [step('s1', 'Satu', [fi('aa')]), step('s2', 'Dua', [fi('bb')])]]));
ok('G9 a field that is in no step goes to the last step', !$e && array_column($d['cfg']['steps'][1]['items'], 'key') === ['bb', 'cc'], [$e, $d['cfg']['steps'] ?? null]);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('A!', 'Satu', [fi('aa')])]]));
ok('G10 an invalid step id is replaced by a valid one', !$e && preg_match('/^[a-z0-9]{2,12}$/', $d['cfg']['steps'][0]['id']) === 1, $d['cfg']['steps'][0]['id'] ?? null);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb')], 'steps' => [step('same', 'Satu', [fi('aa')]), step('same', 'Dua', [fi('bb')])]]));
ok('G11 two steps with the same id get different ids', !$e && $d['cfg']['steps'][0]['id'] !== $d['cfg']['steps'][1]['id'], $d['cfg']['steps'] ?? null);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', str_repeat('x', 80), [fi('aa')])]]));
ok('G12 a step name is cut at 40 letters', mb_strlen($d['cfg']['steps'][0]['name']) === 40);

/* ---------- H. rows (fields side by side) ---------- */
[$d, $e] = v(base(['fields' => [fld('nama'), fld('umur', 'text'), fld('hp', 'phone')], 'steps' => [step('s1', '', [row(['nama', 'umur']), fi('hp')])]]));
ok('H1 two short fields can share a row', !$e && $d['cfg']['steps'][0]['items'][0]['t'] === 'row' && $d['cfg']['steps'][0]['items'][0]['keys'] === ['nama', 'umur'], [$e, $d['cfg']['steps'][0]['items'] ?? null]);
eq('H1b the row id is kept', $d['cfg']['steps'][0]['items'][0]['id'], 'row1');
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb'), fld('cc')], 'steps' => [step('s1', '', [row(['aa', 'bb', 'cc'])])]]));
ok('H2 three fields can share a row', !$e && count($d['cfg']['steps'][0]['items'][0]['keys']) === 3, $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb'), fld('cc'), fld('dd')], 'steps' => [step('s1', '', [row(['aa', 'bb', 'cc', 'dd'])])]]));
ok('H3 four in a row is refused', errHas($e, 'maksimal 3 isian'), $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb', 'textarea')], 'steps' => [step('s1', '', [row(['aa', 'bb'])])]]));
ok('H4 a long text field cannot go in a row', errHas($e, 'tidak bisa diletakkan sebaris'), $e);
foreach (['radio', 'checkbox', 'file', 'consent'] as $t) {
    [$d, $e] = v(base(['fields' => [fld('aa'), fld('bb', $t, ['options' => ['x', 'y']])], 'steps' => [step('s1', '', [row(['aa', 'bb'])])]]));
    ok("H5 a $t field cannot go in a row", errHas($e, 'tidak bisa diletakkan sebaris'), $e);
}
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb', 'select', ['options' => ['x']]), fld('cc', 'email'), fld('dt', 'date')], 'steps' => [step('s1', '', [row(['aa', 'bb', 'cc']), row(['dt', 'aa'], 'row2')])]]));
ok('H6 dropdown, email and date are fine in a row (and a field cannot be in two rows)', errHas($e, 'muncul lebih dari sekali') && !errHas($e, 'sebaris'), $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb')], 'steps' => [step('s1', '', [row(['aa']), fi('bb')])]]));
ok('H7 a row with one field becomes a plain field', !$e && $d['cfg']['steps'][0]['items'][0] === ['t' => 'field', 'key' => 'aa'], $d['cfg']['steps'][0]['items'] ?? null);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', [row([]), fi('aa')])]]));
ok('H8 an empty row is dropped', !$e && count($d['cfg']['steps'][0]['items']) === 1, $d['cfg']['steps'][0]['items'] ?? null);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb'), fld('cc')], 'steps' => [step('s1', '', [fi('cc'), row(['bb', 'aa'])])]]));
eq('H9 the field order follows rows from left to right', array_column($d['cfg']['fields'], 'key'), ['cc', 'bb', 'aa']);

/* ---------- I. conditional fields across steps ---------- */
$sel = fld('kelas', 'select', ['options' => ['Anak', 'Dewasa']]);
[$d, $e] = v(base(['fields' => [$sel, fld('usia', 'text', ['showIf' => ['key' => 'kelas', 'equals' => 'Anak']])], 'steps' => [step('s1', 'Satu', [fi('kelas')]), step('s2', 'Dua', [fi('usia')])]]));
ok('I1 a field may depend on a field in an earlier step', !$e && $d['cfg']['fields'][1]['showIf'] === ['key' => 'kelas', 'equals' => 'Anak'], $e);
[$d, $e] = v(base(['fields' => [$sel, fld('usia', 'text', ['showIf' => ['key' => 'kelas', 'equals' => 'Anak']])], 'steps' => [step('s1', 'Satu', [fi('usia')]), step('s2', 'Dua', [fi('kelas')])]]));
ok('I2 a field cannot depend on a field in a later step', errHas($e, 'DI ATASNYA'), $e);
[$d, $e] = v(base(['fields' => [$sel, fld('usia', 'text', ['showIf' => ['key' => 'kelas', 'equals' => 'Anak']])], 'steps' => [step('s1', 'Satu', [row(['usia', 'kelas'])])]]));
ok('I3 inside a row the left field comes first, so a dependency on the right one is refused', errHas($e, 'DI ATASNYA'), $e);
[$d, $e] = v(base(['fields' => [fld('aa'), fld('bb', 'text', ['showIf' => ['key' => 'aa', 'equals' => '']])], 'steps' => [step('s1', '', [fi('bb'), fi('aa')])]]));
ok('I4 moving the trigger below its field is caught', errHas($e, 'DI ATASNYA'), $e);

/* ---------- J. layout blocks ---------- */
$lay = [['t' => 'h', 'id' => 'h0001', 'text' => 'Data anak', 'textAdult' => 'Data Anda', 'level' => 3], ['t' => 'text', 'id' => 'tx001', 'text' => "Baris satu\nBaris dua", 'textAdult' => ''], ['t' => 'hr', 'id' => 'hr001'], fi('aa')];
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', $lay)]]));
$it = $d['cfg']['steps'][0]['items'] ?? [];
ok('J1 heading, text and divider are saved', !$e && count($it) === 4 && $it[0]['t'] === 'h' && $it[0]['level'] === 3 && $it[0]['textAdult'] === 'Data Anda' && $it[1]['text'] === "Baris satu\nBaris dua" && $it[2]['t'] === 'hr', [$e, $it]);
eq('J1b layout ids are kept when valid', [$it[0]['id'], $it[1]['id'], $it[2]['id']], ['h0001', 'tx001', 'hr001']);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', [['t' => 'h', 'id' => 'x', 'text' => '  ', 'textAdult' => ''], ['t' => 'text', 'text' => ''], fi('aa')])]]));
ok('J2 an empty heading or text is dropped', !$e && count($d['cfg']['steps'][0]['items']) === 1, $d['cfg']['steps'][0]['items'] ?? null);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', [['t' => 'h', 'id' => 'same1', 'text' => 'A'], ['t' => 'h', 'id' => 'same1', 'text' => 'B'], fi('aa')])]]));
ok('J3 duplicate layout ids are made unique', !$e && $d['cfg']['steps'][0]['items'][0]['id'] !== $d['cfg']['steps'][0]['items'][1]['id'], $d['cfg']['steps'][0]['items'] ?? null);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', [['t' => 'h', 'id' => 'h1', 'text' => str_repeat('é', 200)], ['t' => 'text', 'id' => 't1', 'text' => str_repeat('bb', 600)], fi('aa')])]]));
ok('J4 a heading is cut at 120 and a text at 400 letters', mb_strlen($d['cfg']['steps'][0]['items'][0]['text']) === 120 && mb_strlen($d['cfg']['steps'][0]['items'][1]['text']) === 400);
$many = [];
for ($i = 0; $i < 41; $i++) { $many[] = ['t' => 'hr', 'id' => 'hr' . str_pad((string) $i, 3, '0', STR_PAD_LEFT)]; }
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', array_merge($many, [fi('aa')]))]]));
ok('J5 more than 40 layout blocks (or 60 items in a step) is refused', errHas($e, 'Maksimal 40 judul') || errHas($e, 'maksimal 60 butir'), $e);
[$d, $e] = v(base(['fields' => [fld('aa')], 'steps' => [step('s1', '', [['t' => 'script', 'text' => 'x'], ['t' => 'h', 'id' => 'h1', 'text' => 'Ok', 'level' => 9], fi('aa')])]]));
ok('J6 unknown item types are ignored and a bad heading level becomes 2', !$e && count($d['cfg']['steps'][0]['items']) === 2 && $d['cfg']['steps'][0]['items'][0]['level'] === 2, [$e, $d['cfg']['steps'][0]['items'] ?? null]);

/* ---------- K. the form seen by visitors ---------- */
$cfgOk = $d['cfg'];
$form = ['id' => 9, 'slug' => 'uji', 'name' => 'Uji', 'layout' => 'popup', 'status' => 'published', 'zapier_form_id' => '', 'zapier_form_name' => '', 'cfg' => $cfgOk];
$pub = form_public_def($form);
ok('K1 the public definition has steps, drafts, draftDays and a revision', is_array($pub['steps']) && $pub['drafts'] === true && $pub['draftDays'] === 3 && preg_match('/^[0-9a-f]{8}$/', $pub['rev']) === 1, array_keys($pub));
ok('K2 layout items reach visitors without internal ids; the Adult text falls back to the Kids text', !isset($pub['steps'][0]['items'][0]['id']) && $pub['steps'][0]['items'][0]['textAdult'] === 'Ok', $pub['steps'][0]['items'][0] ?? null);
$f2 = $form; $f2['cfg']['fields'][0]['label'] = 'Nama baru';
eq('K3 renaming a label keeps the revision (a saved draft stays valid)', form_public_def($f2)['rev'], $pub['rev']);
$f3 = $form; $f3['cfg']['fields'][0]['type'] = 'select'; $f3['cfg']['fields'][0]['options'] = ['x'];
ok('K4 changing a field type changes the revision (an old draft is dropped)', form_public_def($f3)['rev'] !== $pub['rev']);
$f4 = $form; unset($f4['cfg']['steps']);
ok('K5 a stored form without steps still has a public definition (one step)', count(form_public_def($f4)['steps']) === 1 && $form_pub = true);
$f5 = $form; $f5['cfg']['drafts'] = false;
ok('K6 drafts off reaches visitors as false', form_public_def($f5)['drafts'] === false);
$f6 = $form; unset($f6['cfg']['drafts']);
ok('K7 a stored form without the drafts flag defaults to on', form_public_def($f6)['drafts'] === true);
$f7 = $form; $f7['cfg']['steps'][0]['items'][] = ['t' => 'field', 'key' => 'ghost'];
ok('K8 a step that points at a missing field is cleaned for visitors', !in_array('ghost', array_map(static fn($i) => $i['key'] ?? '', form_public_def($f7)['steps'][0]['items']), true));

/* ---------- L. idempotent save: feeding the saved shape back changes nothing ---------- */
$in = base(['fields' => [fld('nama', 'text', ['required' => true]), fld('umur'), fld('kelas', 'select', ['options' => ['A', 'B']]), fld('wa', 'phone')], 'steps' => [
    step('data1', 'Data diri', [['t' => 'h', 'id' => 'h0001', 'text' => 'Siapa Anda?', 'textAdult' => '', 'level' => 2], row(['nama', 'umur'], 'row001'), fi('wa')]),
    step('pil2', 'Pilihan', [fi('kelas'), ['t' => 'hr', 'id' => 'hr001']]),
], 'drafts' => false]);
[$d1, $e1] = v($in);
$again = base(['fields' => $d1['cfg']['fields'], 'steps' => $d1['cfg']['steps'], 'drafts' => $d1['cfg']['drafts']]);
[$d2, $e2] = v($again);
ok('L1 saving the saved shape again gives the same definition', !$e1 && !$e2 && json_encode($d1['cfg']) === json_encode($d2['cfg']), [$e1, $e2]);

/* ---------- M. submission rules are unchanged by steps ---------- */
$formM = ['id' => 9, 'slug' => 'uji', 'name' => 'Uji', 'layout' => 'popup', 'cfg' => $d1['cfg']];
$r = form_collect($formM, ['nama' => 'Budi', 'umur' => '9', 'wa' => '081234567890', 'kelas' => 'A'], [], 'kids');
ok('M1 every visible field is collected, whatever step it is in', !$r['errors'] && array_keys($r['values']) === ['nama', 'umur', 'wa', 'kelas'], $r);
$r = form_collect($formM, ['umur' => '9', 'wa' => '081234567890', 'kelas' => 'A'], [], 'kids');
ok('M2 a required field in an early step is still enforced by the server', errHas($r['errors'], 'wajib diisi'), $r['errors']);
$payload = [];
foreach ($formM['cfg']['fields'] as $fl) { $payload[] = $fl['key']; }
eq('M3 the field order used for Zapier is the display order', $payload, ['nama', 'umur', 'wa', 'kelas']);

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
