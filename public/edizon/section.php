<?php
/** Editor section beranda (umum, digerakkan skema di lib/sections.php): ID + EN, simpan, kembali ke bawaan. */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
$key = (string) ($_GET['s'] ?? '');
$def = section_def($key);
if ($def === null) {
    redirect('index.php');
}

/* ---- simpan (AJAX, JSON) ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
        json_out(['ok' => false, 'errors' => ['Sesi formulir kedaluwarsa. Muat ulang halaman.']], 403);
    }
    $body = json_decode((string) file_get_contents('php://input', false, null, 0, 600000), true);
    if (!is_array($body) || !is_array($body['data'] ?? null)) {
        json_out(['ok' => false, 'errors' => ['Data tidak valid.']], 400);
    }
    [$clean, $errs] = validate_section($key, $body['data']);
    if ($errs) {
        json_out(['ok' => false, 'errors' => $errs], 422);
    }
    try {
        doc_save($key, $clean, (int) $u['id'], (string) ($body['note'] ?? '') === 'reset' ? 'Dikembalikan ke isi bawaan' : 'Disimpan lewat panel');
        publish_content();
    } catch (Throwable $e) {
        error_log('section save ' . $key . ': ' . $e->getMessage());
        json_out(['ok' => false, 'errors' => ['Gagal menyimpan. Periksa izin folder data di server.']], 500);
    }
    audit((int) $u['id'], 'content_save', $key);
    json_out(['ok' => true, 'data' => $clean, 'savedAt' => fmt_time(now_utc())]);
}

$defaults = seed_doc($key);
$data = doc_get($key) ?? $defaults;
$meta = doc_meta($key);
$boot = [
    'csrf' => csrf_token(), 'key' => $key, 'schema' => section_schema_for_js($key), 'data' => $data, 'defaults' => $defaults,
    'hasDefaults' => (bool) $defaults,
];
page_head($def['title'], $u, 'wide');
?>
<div class="bar">
  <h1><?= h($def['title']) ?></h1>
  <p class="tabs" id="langtabs" role="tablist" aria-label="Bahasa"></p>
</div>
<p class="muted"><?= h($def['intro']) ?></p>
<p class="muted" id="last-saved">Terakhir disimpan: <?= $meta && $meta['updated_by_name'] ? h(fmt_time($meta['updated_at'])) . ' oleh ' . h($meta['updated_by_name']) : 'belum pernah (menampilkan isi bawaan website)' ?>. <a href="history.php?doc=<?= h($key) ?>">Riwayat</a></p>
<div id="errors" class="flash err" hidden></div>
<div id="editor" aria-live="polite"><noscript>Aktifkan JavaScript untuk menggunakan editor ini.</noscript></div>
<div class="savebar">
  <span id="dirty" class="muted" hidden>Ada perubahan yang belum disimpan</span>
  <button class="btn ghost" id="reset" type="button">Kembalikan ke isi bawaan</button>
  <button class="btn" id="save" type="button">Simpan &amp; terbitkan</button>
</div>
<script type="application/json" id="boot"><?= json_for_html($boot) ?></script>
<?php page_foot(['picker.js', 'ed.js', 'section.js']);
