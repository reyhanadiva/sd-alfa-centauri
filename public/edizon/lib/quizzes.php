<?php
/**
 * Pembuat kuis / tes penempatan: tabel, validasi, penilaian (di server), hasil per rentang skor, dan penyimpanan hasil pengunjung.
 * Kunci jawaban TIDAK PERNAH dikirim ke browser pengunjung: penilaian dan pemilihan halaman hasil dilakukan di server
 * setelah pengunjung mengisi data diri. Dipakai panel (edizon/) dan endpoint publik (quiz/).
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const QUIZ_MAX_SETS = 80;
const QUIZ_MAX_QUESTIONS = 400;
const QUIZ_MAX_OPTIONS = 8;
const QUIZ_MAX_RESULTS = 12;
const QUIZ_MAX_SECTIONS = 8;
const QUIZ_MAX_VARS = 12;
const QUIZ_AUDIO_MAX = 26214400; // 25 MB
const QUIZ_RESERVED_VARS = ['name', 'score', 'max', 'percent', 'correct', 'questions', 'level'];
const QUIZ_QTYPES = ['single' => 'Pilihan ganda (satu jawaban)', 'multi' => 'Pilihan ganda (beberapa jawaban)', 'tf' => 'Benar / Salah'];

function en_create_quizzes_tables(PDO $pdo): void
{
    $opt = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo->exec("CREATE TABLE IF NOT EXISTS quizzes (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(80) NOT NULL,
        name VARCHAR(100) NOT NULL,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        zapier_form_id VARCHAR(60) NOT NULL DEFAULT '',
        zapier_form_name VARCHAR(100) NOT NULL DEFAULT '',
        config MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by INT UNSIGNED NULL,
        UNIQUE KEY uq_quiz_slug (slug)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT UNSIGNED NOT NULL,
        lead MEDIUMTEXT NOT NULL,
        answers MEDIUMTEXT NOT NULL,
        scores MEDIUMTEXT NOT NULL,
        result_id VARCHAR(24) NOT NULL DEFAULT '',
        level VARCHAR(60) NOT NULL DEFAULT '',
        percent SMALLINT NOT NULL DEFAULT 0,
        points DECIMAL(8,2) NOT NULL DEFAULT 0,
        audience VARCHAR(10) NOT NULL DEFAULT '',
        query_string VARCHAR(300) NOT NULL DEFAULT '',
        page VARCHAR(300) NOT NULL DEFAULT '',
        elapsed INT UNSIGNED NOT NULL DEFAULT 0,
        zapier_ok TINYINT(1) NULL,
        zapier_status SMALLINT NULL,
        created_at DATETIME NOT NULL,
        KEY ix_qa_quiz (quiz_id, created_at)
    ) $opt");
}

function quizzes_ensure(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->query('SELECT 1 FROM quizzes LIMIT 1');
        db()->query('SELECT 1 FROM quiz_attempts LIMIT 1');
    } catch (Throwable) {
        en_create_quizzes_tables(db());
    }
}

function quiz_default_cfg(): array
{
    return [
        'intro' => ['title' => '', 'subtitle' => '', 'image' => '', 'startLabel' => 'Mulai tes', 'note' => ''],
        'settings' => ['timeLimit' => 0, 'shuffleOptions' => false, 'allowBack' => true, 'showProgress' => true, 'rangeBy' => 'percent', 'indexable' => false, 'resultWidth' => ''],
        'sections' => [],
        'sets' => [],
        'lead' => [
            'title' => 'Satu langkah lagi', 'intro' => 'Isi data berikut untuk melihat hasil tes Anda.', 'button' => 'Lihat hasil', 'consent' => '',
            'fields' => ['name' => 'required', 'phone' => 'required', 'email' => 'optional'],
        ],
        'vars' => [],
        'results' => [],
    ];
}

function quiz_cfg_merge(mixed $cfg): array
{
    $d = quiz_default_cfg();
    $cfg = is_array($cfg) ? $cfg : [];
    foreach (['intro', 'settings'] as $k) {
        if (is_array($cfg[$k] ?? null)) {
            $d[$k] = array_replace($d[$k], $cfg[$k]);
        }
    }
    if (is_array($cfg['lead'] ?? null)) {
        $d['lead'] = array_replace($d['lead'], array_diff_key($cfg['lead'], ['fields' => 1]));
        if (is_array($cfg['lead']['fields'] ?? null)) {
            $d['lead']['fields'] = array_replace($d['lead']['fields'], $cfg['lead']['fields']);
        }
    }
    foreach (['sections', 'sets', 'vars', 'results'] as $k) {
        $d[$k] = is_array($cfg[$k] ?? null) ? array_values($cfg[$k]) : [];
    }
    // result pages saved before the shared editor (types title / subtitle / p) become the same blocks the editor and the pages use
    foreach ($d['results'] as $i => $r) {
        if (is_array($r) && array_key_exists('blocks', $r)) {
            $d['results'][$i]['blocks'] = is_array($r['blocks']) ? popup_blocks_upgrade($r['blocks']) : [];
        }
    }
    $d['settings']['resultWidth'] = popup_width_parse($d['settings']['resultWidth'] ?? '')[0] ?? '';
    return $d;
}

function quiz_row_decode(array $r): array
{
    $r['cfg'] = quiz_cfg_merge(json_decode((string) $r['config'], true));
    $r['id'] = (int) $r['id'];
    return $r;
}

function quiz_get(int $id): ?array
{
    quizzes_ensure();
    $st = db()->prepare('SELECT * FROM quizzes WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ? quiz_row_decode($r) : null;
}

function quiz_get_by_slug(string $slug, bool $publishedOnly = true): ?array
{
    quizzes_ensure();
    $st = db()->prepare('SELECT * FROM quizzes WHERE slug = ?' . ($publishedOnly ? " AND status = 'published'" : ''));
    $st->execute([$slug]);
    $r = $st->fetch();
    return $r ? quiz_row_decode($r) : null;
}

function quizzes_all(): array
{
    quizzes_ensure();
    return db()->query('SELECT q.id, q.slug, q.name, q.status, q.config, q.updated_at, (SELECT COUNT(*) FROM quiz_attempts a WHERE a.quiz_id = q.id) AS n FROM quizzes q ORDER BY q.id')->fetchAll();
}

/** jumlah soal & skor maksimum */
function quiz_totals(array $cfg): array
{
    $n = 0;
    $max = 0.0;
    foreach ($cfg['sets'] as $s) {
        foreach ($s['questions'] ?? [] as $q) {
            $n++;
            $max += (float) ($q['points'] ?? 1);
        }
    }
    return ['questions' => $n, 'max' => $max];
}

function quiz_num(float $v): string
{
    $v = round($v, 1);
    return rtrim(rtrim(number_format($v, 1, '.', ''), '0'), '.');
}

/** audio: jalur unggahan panel atau tautan https ke berkas audio */
function quiz_audio_src(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    if ($s === '') {
        return '';
    }
    if (preg_match('#^/uploads/audio/\d{4}/\d{2}/[a-f0-9]{16}\.(mp3|m4a|ogg|wav)$#', $s)) {
        return $s;
    }
    if (preg_match('#^https://[A-Za-z0-9.-]+(/[A-Za-z0-9_./%+-]*)?\.(mp3|m4a|ogg|wav)(\?[A-Za-z0-9_=&%.-]*)?$#i', $s) && strlen($s) <= 400) {
        return $s;
    }
    return null;
}

function quiz_audio_kind(string $tmp): ?string
{
    $h = (string) file_get_contents($tmp, false, null, 0, 16);
    if (strncmp($h, 'ID3', 3) === 0) {
        return 'mp3';
    }
    if (strlen($h) >= 2 && ord($h[0]) === 0xFF && (ord($h[1]) & 0xE0) === 0xE0) {
        return 'mp3';
    }
    if (strncmp($h, 'OggS', 4) === 0) {
        return 'ogg';
    }
    if (strncmp($h, 'RIFF', 4) === 0 && substr($h, 8, 4) === 'WAVE') {
        return 'wav';
    }
    if (substr($h, 4, 4) === 'ftyp') {
        return 'm4a';
    }
    return null;
}

/** @return array{ok:bool, path?:string, bytes?:int, error?:string} */
function process_audio_upload(array $file, ?int $userId): array
{
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        return ['ok' => false, 'error' => 'Berkas melebihi batas unggah server (upload_max_filesize/post_max_size di PHP). Perkecil audio (mis. MP3 128 kbps) atau minta hosting menaikkan batasnya.'];
    }
    if ($err !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Unggahan gagal. Coba lagi.'];
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmp) || (int) ($file['size'] ?? 0) > QUIZ_AUDIO_MAX || (int) ($file['size'] ?? 0) < 200) {
        return ['ok' => false, 'error' => 'Berkas tidak valid atau lebih dari 25 MB.'];
    }
    $kind = quiz_audio_kind($tmp);
    if ($kind === null) {
        return ['ok' => false, 'error' => 'Hanya audio MP3, M4A, OGG, atau WAV yang diterima.'];
    }
    $sub = 'audio/' . gmdate('Y') . '/' . gmdate('m');
    $dir = uploads_dir() . '/' . $sub;
    ensure_dir(uploads_dir());
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => 'Folder unggahan tidak bisa dibuat. Periksa izin folder di server.'];
    }
    $name = bin2hex(random_bytes(8)) . '.' . $kind;
    if (!@move_uploaded_file($tmp, $dir . '/' . $name)) {
        return ['ok' => false, 'error' => 'Audio gagal disimpan di server.'];
    }
    @chmod($dir . '/' . $name, 0644);
    return ['ok' => true, 'path' => '/uploads/' . $sub . '/' . $name, 'bytes' => (int) filesize($dir . '/' . $name)];
}

/* ------------------------------------------------------------------ validasi */

function quiz_key(string $name, array $taken): string
{
    $k = str_replace('-', '_', art_slugify($name, 20));
    if ($k === '' || !preg_match('/^[a-z]/', $k)) {
        $k = 's' . $k;
    }
    $base = $k;
    $n = 1;
    while (in_array($k, $taken, true)) {
        $k = substr($base, 0, 18) . '_' . (++$n);
    }
    return $k;
}

/** @return array{0: array, 1: string[]} */
function validate_quiz(array $in, array $user, int $ignoreId = 0): array
{
    $errors = [];
    $name = clean_text($in['name'] ?? '', 100);
    if ($name === '') {
        $errors[] = 'Nama kuis wajib diisi.';
    }
    $status = ($in['status'] ?? '') === 'published' ? 'published' : 'draft';
    $slug = art_slugify(trim((string) ($in['slug'] ?? '')) !== '' ? (string) $in['slug'] : $name, 60);
    if ($slug === '' || !preg_match('/^[a-z0-9][a-z0-9-]*$/', $slug)) {
        $errors[] = 'Alamat (slug) kuis tidak valid.';
        $slug = 'kuis';
    }
    if (in_array($slug, ['index', 'view', 'def', 'submit', 'preview', 'assets', 'quiz', 'frame'], true)) {
        $errors[] = "Alamat \"$slug\" dicadangkan sistem. Pilih alamat lain.";
    }
    $zfid = trim((string) ($in['zapierFormId'] ?? ''));
    if ($zfid !== '' && !preg_match('/^[A-Za-z0-9_-]{2,60}$/', $zfid)) {
        $errors[] = 'Form ID Zapier tidak valid.';
        $zfid = '';
    }
    $zname = clean_text($in['zapierFormName'] ?? '', 100);

    $d = quiz_default_cfg();

    /* halaman awal */
    $it = is_array($in['intro'] ?? null) ? $in['intro'] : [];
    $img = teacher_photo($it['image'] ?? '');
    if ($img === null) {
        $errors[] = 'Gambar halaman awal tidak valid. Pilih atau unggah lewat panel.';
        $img = '';
    }
    $d['intro'] = [
        'title' => clean_text($it['title'] ?? '', 150),
        'subtitle' => clean_text($it['subtitle'] ?? '', 300),
        'image' => $img,
        'startLabel' => clean_text($it['startLabel'] ?? '', 40) ?: 'Mulai tes',
        'note' => clean_text($it['note'] ?? '', 200),
    ];
    if ($d['intro']['title'] === '') {
        $d['intro']['title'] = $name;
    }

    /* pengaturan */
    $st = is_array($in['settings'] ?? null) ? $in['settings'] : [];
    $d['settings'] = [
        'timeLimit' => popup_int($st['timeLimit'] ?? null, 0, 240, 0),
        'shuffleOptions' => !empty($st['shuffleOptions']),
        'allowBack' => !empty($st['allowBack']),
        'showProgress' => !empty($st['showProgress']),
        'rangeBy' => ($st['rangeBy'] ?? '') === 'points' ? 'points' : 'percent',
        'indexable' => !empty($st['indexable']),
        'resultWidth' => '',
    ];
    [$rw, $rwErr] = popup_width_parse($st['resultWidth'] ?? '');
    if ($rwErr !== null) {
        $errors[] = 'Lebar halaman hasil: ' . $rwErr;
    }
    $d['settings']['resultWidth'] = $rw ?? '';
    $priorHtml = [];
    if ($ignoreId > 0 && ($oldQuiz = quiz_get($ignoreId))) {
        foreach ($oldQuiz['cfg']['results'] as $oldR) {
            $priorHtml += popup_html_prior((array) ($oldR['blocks'] ?? []));
        }
    }

    /* bagian (section) */
    $secIn = is_array($in['sections'] ?? null) ? array_values($in['sections']) : [];
    if (count($secIn) > QUIZ_MAX_SECTIONS) {
        $errors[] = 'Bagian tes maksimal ' . QUIZ_MAX_SECTIONS . '.';
        $secIn = array_slice($secIn, 0, QUIZ_MAX_SECTIONS);
    }
    $sections = [];
    $secIds = [];
    $keys = [];
    foreach ($secIn as $i => $s) {
        $s = is_array($s) ? $s : [];
        $sn = clean_text($s['name'] ?? '', 40);
        if ($sn === '') {
            $errors[] = 'Bagian ' . ($i + 1) . ': nama wajib diisi.';
            continue;
        }
        $id = clean_id($s['id'] ?? '');
        if ($id === '' || isset($secIds[$id])) {
            $id = new_id();
        }
        $secIds[$id] = true;
        $key = quiz_key($sn, $keys);
        $keys[] = $key;
        $sections[] = ['id' => $id, 'name' => $sn, 'key' => $key];
    }
    if (!$sections) {
        $errors[] = 'Buat minimal satu bagian tes (mis. Grammar, Vocabulary, Reading, Listening).';
    }
    $d['sections'] = $sections;
    $firstSec = $sections[0]['id'] ?? '';

    /* soal */
    $setsIn = is_array($in['sets'] ?? null) ? array_values($in['sets']) : [];
    if (count($setsIn) > QUIZ_MAX_SETS) {
        $errors[] = 'Kelompok soal maksimal ' . QUIZ_MAX_SETS . '.';
        $setsIn = array_slice($setsIn, 0, QUIZ_MAX_SETS);
    }
    $sets = [];
    $usedIds = [];
    $qCount = 0;
    foreach ($setsIn as $si => $s) {
        $sn = $si + 1;
        $s = is_array($s) ? $s : [];
        $sid = clean_id($s['id'] ?? '');
        if ($sid === '' || isset($usedIds[$sid])) {
            $sid = new_id();
        }
        $usedIds[$sid] = true;
        $secId = clean_id($s['sectionId'] ?? '');
        if (!isset($secIds[$secId])) {
            $secId = $firstSec;
        }
        $simg = teacher_photo($s['image'] ?? '');
        if ($simg === null) {
            $errors[] = "Kelompok $sn: gambar tidak valid.";
            $simg = '';
        }
        $audio = quiz_audio_src($s['audio'] ?? '');
        if ($audio === null) {
            $errors[] = "Kelompok $sn: alamat audio tidak valid. Unggah lewat panel, atau pakai tautan https yang berakhir .mp3/.m4a/.ogg/.wav.";
            $audio = '';
        }
        $qs = [];
        $qIn = is_array($s['questions'] ?? null) ? array_values($s['questions']) : [];
        foreach ($qIn as $qi => $q) {
            $tag = "Kelompok $sn, soal " . ($qi + 1);
            $q = is_array($q) ? $q : [];
            $type = in_array($q['type'] ?? '', ['single', 'multi', 'tf'], true) ? $q['type'] : 'single';
            $text = clean_multiline($q['text'] ?? '', 700);
            if ($text === '') {
                $errors[] = "$tag: teks soal wajib diisi.";
            }
            $qimg = teacher_photo($q['image'] ?? '');
            if ($qimg === null) {
                $errors[] = "$tag: gambar tidak valid.";
                $qimg = '';
            }
            $opts = [];
            $oids = [];
            foreach (is_array($q['options'] ?? null) ? array_values($q['options']) : [] as $o) {
                $o = is_array($o) ? $o : [];
                $ot = clean_text($o['text'] ?? '', 200);
                if ($ot === '') {
                    continue;
                }
                $oid = clean_id($o['id'] ?? '');
                if ($oid === '' || isset($oids[$oid])) {
                    $oid = new_id();
                }
                $oids[$oid] = true;
                $opts[] = ['id' => $oid, 'text' => $ot, '_c' => !empty($o['correct'])];
            }
            if (count($opts) > QUIZ_MAX_OPTIONS) {
                $errors[] = "$tag: pilihan jawaban maksimal " . QUIZ_MAX_OPTIONS . '.';
                $opts = array_slice($opts, 0, QUIZ_MAX_OPTIONS);
            }
            $minOpt = $type === 'tf' ? 2 : 2;
            if (count($opts) < $minOpt) {
                $errors[] = "$tag: isi minimal $minOpt pilihan jawaban.";
            }
            if ($type === 'tf' && count($opts) > 3) {
                $errors[] = "$tag: soal Benar/Salah maksimal 3 pilihan (mis. True, False, Not Given).";
            }
            $correct = array_values(array_map(static fn($o) => $o['id'], array_filter($opts, static fn($o) => $o['_c'])));
            if ($type !== 'multi' && count($correct) > 1) {
                $errors[] = "$tag: jenis ini hanya boleh satu jawaban benar.";
                $correct = array_slice($correct, 0, 1);
            }
            if (!$correct && count($opts) >= 2) {
                $errors[] = "$tag: tandai jawaban yang benar.";
            }
            $opts = array_map(static fn($o) => ['id' => $o['id'], 'text' => $o['text']], $opts);
            $qid = clean_id($q['id'] ?? '');
            if ($qid === '' || isset($usedIds[$qid])) {
                $qid = new_id();
            }
            $usedIds[$qid] = true;
            $qs[] = [
                'id' => $qid, 'type' => $type, 'text' => $text, 'image' => $qimg, 'options' => $opts, 'correct' => $correct,
                'points' => popup_int($q['points'] ?? null, 1, 20, 1), 'partial' => $type === 'multi' && !empty($q['partial']),
            ];
            $qCount++;
        }
        if (!$qs) {
            $errors[] = "Kelompok $sn belum punya soal. Tambahkan soal atau hapus kelompoknya.";
            continue;
        }
        $sets[] = [
            'id' => $sid, 'sectionId' => $secId, 'title' => clean_text($s['title'] ?? '', 120),
            'passage' => clean_multiline($s['passage'] ?? '', 8000), 'image' => $simg, 'audio' => $audio, 'questions' => $qs,
        ];
    }
    if ($qCount > QUIZ_MAX_QUESTIONS) {
        $errors[] = 'Total soal maksimal ' . QUIZ_MAX_QUESTIONS . ".";
    }
    if (!$sets) {
        $errors[] = 'Kuis belum punya soal. Tambahkan minimal satu kelompok soal.';
    }
    $d['sets'] = $sets;
    $tot = quiz_totals($d);

    /* formulir data diri */
    $ld = is_array($in['lead'] ?? null) ? $in['lead'] : [];
    $lf = is_array($ld['fields'] ?? null) ? $ld['fields'] : [];
    $mode = static fn($v, string $def) => in_array($v, ['off', 'optional', 'required'], true) ? $v : $def;
    $d['lead'] = [
        'title' => clean_text($ld['title'] ?? '', 120),
        'intro' => clean_text($ld['intro'] ?? '', 300),
        'button' => clean_text($ld['button'] ?? '', 40) ?: 'Lihat hasil',
        'consent' => clean_text($ld['consent'] ?? '', 300),
        'fields' => ['name' => $mode($lf['name'] ?? '', 'required'), 'phone' => $mode($lf['phone'] ?? '', 'required'), 'email' => $mode($lf['email'] ?? '', 'optional')],
    ];

    /* variabel kustom */
    $vars = [];
    $vkeys = [];
    foreach (is_array($in['vars'] ?? null) ? array_values($in['vars']) : [] as $i => $v) {
        $v = is_array($v) ? $v : [];
        $k = strtolower(trim((string) ($v['key'] ?? '')));
        if ($k === '' && trim((string) ($v['label'] ?? '')) === '') {
            continue;
        }
        if (!preg_match('/^[a-z][a-z0-9_]{0,23}$/', $k)) {
            $errors[] = 'Variabel ' . ($i + 1) . ': nama hanya huruf kecil, angka, dan garis bawah, diawali huruf (mis. program).';
            continue;
        }
        if (in_array($k, QUIZ_RESERVED_VARS, true) || isset($vkeys[$k])) {
            $errors[] = "Variabel \"$k\" sudah dipakai sistem atau ganda. Pilih nama lain.";
            continue;
        }
        $vkeys[$k] = true;
        $vars[] = ['key' => $k, 'label' => clean_text($v['label'] ?? '', 60) ?: $k];
    }
    if (count($vars) > QUIZ_MAX_VARS) {
        $errors[] = 'Variabel kustom maksimal ' . QUIZ_MAX_VARS . '.';
        $vars = array_slice($vars, 0, QUIZ_MAX_VARS);
    }
    $d['vars'] = $vars;

    /* hasil per rentang skor */
    $resIn = is_array($in['results'] ?? null) ? array_values($in['results']) : [];
    if (count($resIn) > QUIZ_MAX_RESULTS) {
        $errors[] = 'Rentang hasil maksimal ' . QUIZ_MAX_RESULTS . '.';
        $resIn = array_slice($resIn, 0, QUIZ_MAX_RESULTS);
    }
    $byPct = $d['settings']['rangeBy'] === 'percent';
    $ceil = $byPct ? 100 : (int) ceil($tot['max']);
    $results = [];
    $rids = [];
    foreach ($resIn as $i => $r) {
        $n = $i + 1;
        $r = is_array($r) ? $r : [];
        $rid = clean_id($r['id'] ?? '');
        if ($rid === '' || isset($rids[$rid])) {
            $rid = new_id();
        }
        $rids[$rid] = true;
        $min = popup_int($r['min'] ?? null, 0, max(100, $ceil), 0);
        $max = popup_int($r['max'] ?? null, 0, max(100, $ceil), $ceil);
        if ($max < $min) {
            $errors[] = "Hasil $n: nilai akhir tidak boleh lebih kecil dari nilai awal.";
        }
        $rv = [];
        $rvIn = is_array($r['vars'] ?? null) ? $r['vars'] : [];
        foreach ($vars as $v) {
            $rv[$v['key']] = clean_text($rvIn[$v['key']] ?? '', 300);
        }
        [$blocks, $be] = popup_validate_blocks($r['blocks'] ?? [], is_admin($user), ['extra' => ['score', 'sections'], 'vars' => true, 'what' => 'halaman hasil', 'prior' => $priorHtml]);
        foreach ($be as $e) {
            $errors[] = "Hasil $n: " . $e;
        }
        if (!$blocks) {
            $errors[] = "Hasil $n: isi halaman hasil masih kosong. Tambahkan minimal satu blok.";
        }
        $results[] = [
            'id' => $rid, 'label' => clean_text($r['label'] ?? '', 60), 'min' => $min, 'max' => $max,
            'level' => clean_text($r['level'] ?? '', 40), 'vars' => $rv, 'blocks' => $blocks,
        ];
    }
    if (!$results) {
        $errors[] = 'Buat minimal satu hasil (rentang skor). Tanpa hasil, pengunjung tidak punya halaman hasil.';
    }
    usort($results, static fn($a, $b) => [$a['min'], $a['max']] <=> [$b['min'], $b['max']]);
    for ($i = 1; $i < count($results); $i++) {
        if ($results[$i]['min'] <= $results[$i - 1]['max']) {
            $errors[] = 'Rentang hasil saling tumpang tindih: "' . ($results[$i - 1]['label'] ?: $results[$i - 1]['level'] ?: ($results[$i - 1]['min'] . '–' . $results[$i - 1]['max'])) . '" dan "' . ($results[$i]['label'] ?: $results[$i]['level'] ?: ($results[$i]['min'] . '–' . $results[$i]['max'])) . '". Perbaiki angkanya.';
            break;
        }
    }
    $d['results'] = $results;

    return [['name' => $name, 'slug' => $slug, 'status' => $status, 'zapier_form_id' => $zfid, 'zapier_form_name' => $zname, 'cfg' => $d], $errors];
}

function quiz_save(array $d, int $id, int $userId): int
{
    quizzes_ensure();
    $pdo = db();
    $slug = $d['slug'];
    $base = $slug;
    $n = 1;
    while (true) {
        $st = $pdo->prepare('SELECT id FROM quizzes WHERE slug = ?' . ($id ? ' AND id <> ' . (int) $id : ''));
        $st->execute([$slug]);
        if (!$st->fetchColumn()) {
            break;
        }
        $slug = substr($base, 0, 70) . '-' . (++$n);
    }
    $cfg = json_encode($d['cfg'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $now = now_utc();
    if ($id > 0) {
        $pdo->prepare('UPDATE quizzes SET slug=?, name=?, status=?, zapier_form_id=?, zapier_form_name=?, config=?, updated_at=?, updated_by=? WHERE id=?')
            ->execute([$slug, $d['name'], $d['status'], $d['zapier_form_id'], $d['zapier_form_name'], $cfg, $now, $userId, $id]);
    } else {
        $pdo->prepare('INSERT INTO quizzes (slug, name, status, zapier_form_id, zapier_form_name, config, created_at, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?)')
            ->execute([$slug, $d['name'], $d['status'], $d['zapier_form_id'], $d['zapier_form_name'], $cfg, $now, $now, $userId]);
        $id = (int) $pdo->lastInsertId();
    }
    rev_snapshot('quiz', $id, quiz_to_editor(quiz_get($id)), $userId);
    return $id;
}

function quiz_delete(int $id): void
{
    quizzes_ensure();
    db()->prepare('DELETE FROM quiz_attempts WHERE quiz_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM quizzes WHERE id = ?')->execute([$id]);
    rev_purge('quiz', $id);
}

/** untuk editor di panel: kunci jawaban digabung ke pilihan (correct) supaya mudah disunting */
function quiz_to_editor(?array $q): array
{
    $cfg = $q ? $q['cfg'] : quiz_default_cfg();
    foreach ($cfg['sets'] as &$s) {
        foreach ($s['questions'] as &$qq) {
            $cor = $qq['correct'] ?? [];
            foreach ($qq['options'] as &$o) {
                $o['correct'] = in_array($o['id'], $cor, true);
            }
            unset($o, $qq['correct']);
        }
        unset($qq);
    }
    unset($s);
    return ['id' => $q ? $q['id'] : 0, 'name' => $q ? $q['name'] : '', 'slug' => $q ? $q['slug'] : '', 'status' => $q ? $q['status'] : 'draft',
        'zapierFormId' => $q ? $q['zapier_form_id'] : '', 'zapierFormName' => $q ? $q['zapier_form_name'] : ''] + $cfg;
}

/** definisi untuk pengunjung: TANPA kunci jawaban, skor, dan halaman hasil */
function quiz_public_def(array $q): array
{
    $c = $q['cfg'];
    $sets = [];
    foreach ($c['sets'] as $s) {
        $qs = [];
        foreach ($s['questions'] as $x) {
            $qs[] = ['id' => $x['id'], 'type' => $x['type'], 'text' => $x['text'], 'image' => $x['image'], 'options' => $x['options']];
        }
        $sets[] = ['id' => $s['id'], 'sectionId' => $s['sectionId'], 'title' => $s['title'], 'passage' => $s['passage'], 'image' => $s['image'], 'audio' => $s['audio'], 'questions' => $qs];
    }
    $lead = $c['lead'];
    $needs = $lead['fields']['name'] !== 'off' || $lead['fields']['phone'] !== 'off' || $lead['fields']['email'] !== 'off';
    return [
        'slug' => $q['slug'], 'name' => $q['name'], 'intro' => $c['intro'],
        'settings' => ['timeLimit' => $c['settings']['timeLimit'], 'shuffleOptions' => $c['settings']['shuffleOptions'], 'allowBack' => $c['settings']['allowBack'], 'showProgress' => $c['settings']['showProgress']],
        'sections' => array_map(static fn($s) => ['id' => $s['id'], 'name' => $s['name']], $c['sections']),
        'sets' => $sets, 'lead' => $lead + ['needed' => $needs],
    ];
}

/* ------------------------------------------------------------------ penilaian */

/**
 * @param array<string, mixed> $answers  id soal => [id pilihan, ...]
 * @return array{total: array, sections: array, perQuestion: array}
 */
function quiz_score(array $cfg, array $answers): array
{
    $secs = [];
    foreach ($cfg['sections'] as $s) {
        $secs[$s['id']] = ['id' => $s['id'], 'key' => $s['key'], 'name' => $s['name'], 'pts' => 0.0, 'max' => 0.0, 'correct' => 0, 'count' => 0];
    }
    $tot = ['pts' => 0.0, 'max' => 0.0, 'correct' => 0, 'count' => 0, 'answered' => 0];
    foreach ($cfg['sets'] as $set) {
        $sid = isset($secs[$set['sectionId']]) ? $set['sectionId'] : array_key_first($secs);
        foreach ($set['questions'] as $q) {
            $valid = array_column($q['options'], 'id');
            $raw = $answers[$q['id']] ?? [];
            $sel = [];
            foreach (is_array($raw) ? $raw : [$raw] as $o) {
                if (is_string($o) && in_array($o, $valid, true) && !in_array($o, $sel, true)) {
                    $sel[] = $o;
                }
            }
            $pts = (float) $q['points'];
            $cor = $q['correct'];
            $got = 0.0;
            $right = false;
            if ($q['type'] === 'multi') {
                $hit = count(array_intersect($sel, $cor));
                $bad = count(array_diff($sel, $cor));
                $right = $bad === 0 && $hit === count($cor) && $cor !== [];
                if ($right) {
                    $got = $pts;
                } elseif (!empty($q['partial']) && $cor) {
                    $got = max(0.0, ($hit - $bad) / count($cor)) * $pts;
                }
            } else {
                $right = count($sel) === 1 && isset($cor[0]) && $sel[0] === $cor[0];
                $got = $right ? $pts : 0.0;
            }
            $got = round($got, 2);
            $tot['pts'] += $got;
            $tot['max'] += $pts;
            $tot['count']++;
            $tot['correct'] += $right ? 1 : 0;
            $tot['answered'] += $sel ? 1 : 0;
            if ($sid !== null) {
                $secs[$sid]['pts'] += $got;
                $secs[$sid]['max'] += $pts;
                $secs[$sid]['count']++;
                $secs[$sid]['correct'] += $right ? 1 : 0;
            }
        }
    }
    $pct = static fn(float $p, float $m): int => $m > 0 ? (int) round($p / $m * 100) : 0;
    $tot['pts'] = round($tot['pts'], 2);
    $tot['pct'] = $pct($tot['pts'], $tot['max']);
    $outS = [];
    foreach ($secs as $s) {
        $s['pts'] = round($s['pts'], 2);
        $s['pct'] = $pct($s['pts'], $s['max']);
        if ($s['count'] > 0) {
            $outS[] = $s;
        }
    }
    return ['total' => $tot, 'sections' => $outS];
}

function quiz_pick_result(array $cfg, array $scores): ?array
{
    $res = $cfg['results'];
    if (!$res) {
        return null;
    }
    usort($res, static fn($a, $b) => $a['min'] <=> $b['min']);
    $v = $cfg['settings']['rangeBy'] === 'points' ? (int) round($scores['total']['pts']) : (int) $scores['total']['pct'];
    $pick = $res[0];
    foreach ($res as $r) {
        if ($v >= $r['min']) {
            $pick = $r;
        }
    }
    return $pick;
}

/* ------------------------------------------------------------------ variabel */

function quiz_vars_map(array $cfg, array $scores, array $range, array $lead): array
{
    $t = $scores['total'];
    $m = [
        'name' => (string) ($lead['name'] ?? ''), 'score' => quiz_num((float) $t['pts']), 'max' => quiz_num((float) $t['max']), 'percent' => (string) $t['pct'],
        'correct' => (string) $t['correct'], 'questions' => (string) $t['count'], 'level' => (string) ($range['level'] ?? ''),
    ];
    foreach ($scores['sections'] as $s) {
        $m['score.' . $s['key']] = quiz_num((float) $s['pts']);
        $m['max.' . $s['key']] = quiz_num((float) $s['max']);
        $m['percent.' . $s['key']] = (string) $s['pct'];
        $m['correct.' . $s['key']] = (string) $s['correct'];
    }
    foreach ($cfg['vars'] as $v) {
        $m[$v['key']] = (string) ($range['vars'][$v['key']] ?? '');
    }
    return $m;
}

/** {nama}, {nama|cadangan}; mode: text | html | url */
function quiz_subst(string $s, array $map, string $mode = 'text'): string
{
    if (!str_contains($s, '{')) {
        return $s;
    }
    return (string) preg_replace_callback('/\{([A-Za-z][A-Za-z0-9_.]{0,48})(?:\|([^{}]{0,40}))?\}/', static function (array $m) use ($map, $mode): string {
        $k = strtolower($m[1]);
        $v = $map[$k] ?? '';
        if ($v === '' && isset($m[2])) {
            $v = $m[2];
        }
        return $mode === 'html' ? htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : ($mode === 'url' ? rawurlencode($v) : $v);
    }, $s);
}

function quiz_subst_blocks(array $blocks, array $map): array
{
    $t = static fn($v): string => quiz_subst((string) $v, $map);
    $h = static fn($v): string => quiz_subst((string) $v, $map, 'html');
    $u = static fn($v): string => quiz_subst((string) $v, $map, 'url');
    $out = [];
    foreach ($blocks as $b) {
        switch ($b['t'] ?? '') {
            case 'h':
                $b['text'] = $t($b['text'] ?? '');
                break;
            case 'text':
            case 'p':
                $b['html'] = $h($b['html'] ?? '');
                break;
            case 'img':
                $b['alt'] = $t($b['alt'] ?? '');
                $b['caption'] = $t($b['caption'] ?? '');
                $b['link'] = $u($b['link'] ?? '');
                break;
            case 'video':
            case 'embed':
            case 'html':
                $b['caption'] = $t($b['caption'] ?? '');
                break;
            case 'button':
                $b['label'] = $t($b['label'] ?? '');
                $b['url'] = $u($b['url'] ?? '');
                break;
            case 'ul':
                $b['items'] = array_map($t, (array) ($b['items'] ?? []));
                break;
            case 'quote':
                $b['text'] = $t($b['text'] ?? '');
                $b['cite'] = $t($b['cite'] ?? '');
                break;
            case 'callout':
                $b['title'] = $t($b['title'] ?? '');
                $b['text'] = $t($b['text'] ?? '');
                break;
            case 'faq':
                $b['title'] = $t($b['title'] ?? '');
                $b['items'] = array_map(static fn($i) => ['q' => $t($i['q'] ?? ''), 'a' => $t($i['a'] ?? '')], (array) ($b['items'] ?? []));
                break;
            case 'cards':
                $b['items'] = array_map(static fn($i) => array_replace($i, [
                    'alt' => $t($i['alt'] ?? ''), 'title' => $t($i['title'] ?? ''), 'text' => $t($i['text'] ?? ''), 'label' => $t($i['label'] ?? ''), 'url' => $u($i['url'] ?? ''),
                ]), (array) ($b['items'] ?? []));
                break;
            case 'table':
                $b['caption'] = $t($b['caption'] ?? '');
                $b['rows'] = array_map(static fn($r) => array_map($h, (array) $r), (array) ($b['rows'] ?? []));
                break;
            case 'columns':
                $b['cols'] = array_map(static fn($c) => quiz_subst_blocks((array) $c, $map), (array) ($b['cols'] ?? []));
                break;
            case 'sections':
                $b['title'] = $t($b['title'] ?? '');
                break;
        }
        $out[] = $b;
    }
    return $out;
}

/** isi yang dikirim ke pengunjung setelah menyerahkan jawaban. $frame: fn(blockId, hash) => alamat bingkai untuk blok HTML (tanpa itu, blok HTML tidak dikirim) */
function quiz_result_payload(array $cfg, array $scores, array $range, array $lead, ?callable $frame = null): array
{
    $map = quiz_vars_map($cfg, $scores, $range, $lead);
    return [
        'id' => $range['id'], 'level' => $range['level'], 'width' => popup_width_css($cfg['settings']['resultWidth'] ?? ''),
        'blocks' => popup_public_blocks(quiz_subst_blocks($range['blocks'], $map), $frame),
        'scores' => [
            'pts' => quiz_num((float) $scores['total']['pts']), 'max' => quiz_num((float) $scores['total']['max']), 'pct' => (int) $scores['total']['pct'],
            'correct' => (int) $scores['total']['correct'], 'count' => (int) $scores['total']['count'],
            'sections' => array_map(static fn($s) => ['name' => $s['name'], 'pts' => quiz_num((float) $s['pts']), 'max' => quiz_num((float) $s['max']), 'pct' => (int) $s['pct']], $scores['sections']),
        ],
    ];
}

/* ------------------------------------------------------------------ blok HTML di halaman hasil */

/** kunci untuk tanda tangan alamat bingkai: diturunkan dari pengaturan server (tidak pernah keluar). Bisa diganti lewat 'frame_secret' di konfigurasi. */
function quiz_frame_key(): string
{
    return hash('sha256', 'enq-frame|' . (string) cfg('frame_secret', '') . '|' . (string) cfg('db_name', '') . '|' . (string) cfg('db_user', '') . '|' . (string) cfg('db_pass', ''));
}

function quiz_frame_mac(int $aid, string $bid): string
{
    return substr(hash_hmac('sha256', $aid . '|' . $bid, quiz_frame_key()), 0, 24);
}

/** alamat bingkai untuk pengunjung: hanya berlaku untuk satu hasil tes yang benar-benar tersimpan, jadi kode halaman hasil tidak bisa diambil tanpa mengerjakan tes */
function quiz_frame_public(int $aid): callable
{
    return static fn(string $bid, string $v): string => '/quiz/frame.php?a=' . $aid . '&b=' . rawurlencode($bid) . '&s=' . quiz_frame_mac($aid, $bid) . '&v=' . $v;
}

/** alamat bingkai untuk pratinjau di panel (butuh login): skor contoh di tengah rentang hasil */
function quiz_frame_preview(int $qid, string $rid, int $rev = 0): callable
{
    $panel = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/edizon/x.php'))), '/');
    return static fn(string $bid, string $v): string => $panel . '/quiz-preview.php?id=' . $qid . '&frame=1&range=' . rawurlencode($rid) . '&b=' . rawurlencode($bid) . '&v=' . $v . ($rev > 0 ? '&rev=' . $rev : '');
}

/** data tes untuk kode di bingkai (window.ENQ) */
function quiz_enq(array $cfg, array $scores, array $range, array $lead): array
{
    $m = quiz_vars_map($cfg, $scores, $range, $lead);
    $t = $scores['total'];
    $e = ['name' => $m['name'], 'score' => (float) $t['pts'], 'max' => (float) $t['max'], 'percent' => (int) $t['pct'], 'correct' => (int) $t['correct'], 'questions' => (int) $t['count'], 'level' => $m['level']];
    foreach ($cfg['vars'] as $v) {
        $e[$v['key']] = $m[$v['key']];
    }
    $sec = [];
    foreach ($scores['sections'] as $s) {
        $sec[$s['key']] = ['name' => $s['name'], 'score' => (float) $s['pts'], 'max' => (float) $s['max'], 'percent' => (int) $s['pct'], 'correct' => (int) $s['correct']];
    }
    $e['sections'] = $sec;
    return $e;
}

/**
 * Kode blok HTML (satu blok di satu hasil) siap disajikan: {nama}, {skor}… di luar <script> diganti nilainya (aman: diberi tanda HTML), dan data yang sama tersedia sebagai window.ENQ.
 * Hanya nama variabel yang dikenal yang diganti, jadi kurung kurawal di CSS/JavaScript tidak tersentuh.
 * @return ?array{code: string, scripts: bool, enq: array}
 */
function quiz_frame_render(array $cfg, array $range, array $scores, array $lead, string $bid): ?array
{
    $b = popup_find_html_block((array) ($range['blocks'] ?? []), $bid);
    if ($b === null) {
        return null;
    }
    $map = quiz_vars_map($cfg, $scores, $range, $lead);
    $known = static function (string $seg) use ($map): string {
        return (string) preg_replace_callback('/\{([A-Za-z][A-Za-z0-9_.]{0,48})(?:\|([^{}]{0,40}))?\}/', static function (array $m) use ($map): string {
            $k = strtolower($m[1]);
            if (!array_key_exists($k, $map)) {
                return $m[0];
            }
            $v = $map[$k];
            if ($v === '' && isset($m[2])) {
                $v = $m[2];
            }
            return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }, $seg);
    };
    $parts = preg_split('#(<script\b[^>]*>.*?</script\s*>)#is', (string) $b['code'], -1, PREG_SPLIT_DELIM_CAPTURE) ?: [(string) $b['code']];
    $code = '';
    foreach ($parts as $i => $seg) {
        $code .= $i % 2 === 1 ? $seg : $known($seg);
    }
    return ['code' => $code, 'scripts' => !empty($b['scripts']), 'enq' => quiz_enq($cfg, $scores, $range, $lead)];
}

/** skor contoh untuk pratinjau satu hasil: di tengah rentangnya */
function quiz_fake_scores(array $cfg, array $range): array
{
    $tot = quiz_totals($cfg);
    $byPct = $cfg['settings']['rangeBy'] === 'percent';
    $target = ($range['min'] + $range['max']) / 2;
    $ratio = $byPct ? $target / 100 : ($tot['max'] > 0 ? $target / $tot['max'] : 0);
    $ratio = max(0.0, min(1.0, $ratio));
    $answers = [];
    $acc = 0.0;
    foreach ($cfg['sets'] as $set) {
        foreach ($set['questions'] as $q) {
            $acc += $ratio;
            if ($acc >= 1.0 - 1e-9) {
                $acc -= 1.0;
                $answers[$q['id']] = $q['correct'];
            }
        }
    }
    return quiz_score($cfg, $answers);
}

/* ------------------------------------------------------------------ hasil pengunjung */

/** @return array{values: array, errors: string[]} */
function quiz_collect_lead(array $cfg, mixed $raw): array
{
    $raw = is_array($raw) ? $raw : [];
    $f = $cfg['lead']['fields'];
    $v = [];
    $e = [];
    $name = clean_text($raw['name'] ?? '', 100);
    if ($f['name'] !== 'off') {
        if ($name === '' && $f['name'] === 'required') {
            $e[] = 'Nama wajib diisi.';
        }
        if ($name !== '') {
            $v['name'] = $name;
        }
    }
    if ($f['phone'] !== 'off') {
        $p = preg_replace('/[^\d+]/', '', clean_text($raw['phone'] ?? '', 30)) ?? '';
        if ($p === '') {
            if ($f['phone'] === 'required') {
                $e[] = 'Nomor WhatsApp wajib diisi.';
            }
        } elseif (strlen(preg_replace('/\D/', '', $p) ?? '') < 9 || strlen($p) > 18) {
            $e[] = 'Nomor WhatsApp sepertinya belum lengkap.';
        } else {
            $v['phone'] = $p;
        }
    }
    if ($f['email'] !== 'off') {
        $m = clean_text($raw['email'] ?? '', 120);
        if ($m === '') {
            if ($f['email'] === 'required') {
                $e[] = 'Email wajib diisi.';
            }
        } elseif (!filter_var($m, FILTER_VALIDATE_EMAIL)) {
            $e[] = 'Alamat email tidak valid.';
        } else {
            $v['email'] = $m;
        }
    }
    if ($cfg['lead']['consent'] !== '' && !in_array((string) ($raw['consent'] ?? ''), ['1', 'true', 'on'], true) && empty($raw['consent'])) {
        $e[] = 'Persetujuan harus dicentang.';
    }
    return ['values' => $v, 'errors' => $e];
}

function quiz_attempt_store(array $quiz, array $lead, array $answers, array $scores, array $range, string $aud, string $qs, string $page, int $elapsed): int
{
    quizzes_ensure();
    $clean = [];
    foreach ($answers as $k => $v) {
        if (is_string($k) && preg_match('/^[A-Za-z0-9_-]{1,24}$/', $k) && is_array($v)) {
            $clean[$k] = array_values(array_filter($v, static fn($x) => is_string($x) && preg_match('/^[A-Za-z0-9_-]{1,24}$/', $x)));
        }
    }
    db()->prepare('INSERT INTO quiz_attempts (quiz_id, lead, answers, scores, result_id, level, percent, points, audience, query_string, page, elapsed, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
            $quiz['id'], json_encode($lead, JSON_UNESCAPED_UNICODE), json_encode($clean, JSON_UNESCAPED_UNICODE), json_encode($scores, JSON_UNESCAPED_UNICODE),
            $range['id'], mb_substr((string) $range['level'], 0, 60), (int) $scores['total']['pct'], (float) $scores['total']['pts'], $aud,
            mb_substr($qs, 0, 300), mb_substr($page, 0, 300), max(0, min(86400, $elapsed)), now_utc(),
        ]);
    return (int) db()->lastInsertId();
}

function quiz_webhook(array $quiz): ?string
{
    $fid = (string) $quiz['zapier_form_id'];
    return $fid !== '' ? zapier_hook_for($fid) : null;
}

/** @return array{0: bool|null, 1: int} [ok|null (tidak ada webhook), status] */
function quiz_forward(array $quiz, int $aid, array $lead, array $scores, array $range, string $aud, string $qs, string $page): array
{
    $hook = quiz_webhook($quiz);
    if ($hook === null) {
        return [null, 0];
    }
    $t = $scores['total'];
    $p = [
        'Nama' => (string) ($lead['name'] ?? ''), 'WhatsApp' => (string) ($lead['phone'] ?? ''), 'Email' => (string) ($lead['email'] ?? ''),
        'Skor' => quiz_num((float) $t['pts']), 'Skor Maksimal' => quiz_num((float) $t['max']), 'Persen' => (string) $t['pct'],
        'Level' => (string) $range['level'], 'Hasil' => (string) ($range['label'] ?: $range['level']),
        'Soal Benar' => (string) $t['correct'], 'Jumlah Soal' => (string) $t['count'],
    ];
    foreach ($scores['sections'] as $s) {
        $p['Skor ' . $s['name']] = quiz_num((float) $s['pts']) . '/' . quiz_num((float) $s['max']);
        $p['Persen ' . $s['name']] = (string) $s['pct'];
    }
    foreach ($range['vars'] ?? [] as $k => $v) {
        $p['Var ' . $k] = (string) $v;
    }
    $p['form_id'] = $quiz['zapier_form_id'];
    $p['form_name'] = $quiz['zapier_form_name'] !== '' ? $quiz['zapier_form_name'] : $quiz['name'];
    $p['quiz_slug'] = $quiz['slug'];
    $p['submission_id'] = 'quiz-' . $aid;
    $p['querystring'] = $qs;
    $p['Audience'] = $aud === 'adult' ? 'Dewasa & Bisnis' : 'Anak & Remaja';
    $p['Page'] = $page;
    $p['Source'] = 'website-baru-kuis';
    $ch = curl_init($hook);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($p), CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false,
    ]);
    $out = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $ok = $out !== false && $status >= 200 && $status < 300;
    try {
        db()->prepare('UPDATE quiz_attempts SET zapier_ok = ?, zapier_status = ? WHERE id = ?')->execute([$ok ? 1 : 0, max(0, min(32000, $status)), $aid]);
    } catch (Throwable $e) {
        error_log('quiz zapier flag: ' . $e->getMessage());
    }
    if (!$ok) {
        @file_put_contents(storage_dir() . '/failed-forms.log', json_encode(['time' => date('c'), 'status' => $status, 'quiz' => $quiz['slug'], 'attempt' => $aid], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    }
    return [$ok, $status];
}
