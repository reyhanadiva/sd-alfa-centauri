<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_admin();
$key = 'site';
$admin = is_admin($u);

/* ---- simpan (AJAX, JSON) ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
        json_out(['ok' => false, 'errors' => ['Sesi formulir kedaluwarsa. Muat ulang halaman.']], 403);
    }
    $body = json_decode((string) file_get_contents('php://input', false, null, 0, 200000), true);
    if (!is_array($body) || !is_array($body['data'] ?? null)) {
        json_out(['ok' => false, 'errors' => ['Data tidak valid.']], 400);
    }
    $part = (string) ($_GET['part'] ?? 'site');
    if ($part === 'zapier') {
        if (!$admin) {
            json_out(['ok' => false, 'errors' => ['Hanya Admin yang boleh mengubah webhook Zapier.']], 403);
        }
        [$clean, $errs] = validate_zapier($body['data']);
        if ($errs) {
            json_out(['ok' => false, 'errors' => $errs], 422);
        }
        try {
            zapier_save($clean);
        } catch (Throwable $e) {
            error_log('zapier save: ' . $e->getMessage());
            json_out(['ok' => false, 'errors' => ['Gagal menyimpan. Periksa koneksi database.']], 500);
        }
        audit((int) $u['id'], 'zapier_save', (string) count($clean));
        json_out(['ok' => true, 'data' => ['hooks' => zapier_hooks()], 'savedAt' => fmt_time(now_utc())]);
    }
    [$clean, $errs] = validate_site($body['data']);
    if ($errs) {
        json_out(['ok' => false, 'errors' => $errs], 422);
    }
    try {
        doc_save($key, $clean, (int) $u['id'], 'Disimpan lewat panel');
        publish_content();
    } catch (Throwable $e) {
        error_log('site save: ' . $e->getMessage());
        json_out(['ok' => false, 'errors' => ['Gagal menyimpan. Periksa izin folder data di server.']], 500);
    }
    audit((int) $u['id'], 'content_save', $key);
    json_out(['ok' => true, 'data' => $clean, 'savedAt' => fmt_time(now_utc())]);
}

$data = array_merge(seed_doc($key), doc_get($key) ?? []);
$meta = doc_meta($key);
$boot = [
    'csrf' => csrf_token(), 'admin' => $admin, 'data' => $data, 'defaults' => seed_doc($key),
    'hooks' => $admin ? zapier_hooks() : [],
];
page_head('Pengaturan situs', $u, 'wide');
?>
<div class="bar">
  <h1>Pengaturan situs</h1>
</div>
<div id="errors" class="flash err" hidden></div>
<div id="editor" aria-live="polite"><noscript>Aktifkan JavaScript untuk menggunakan editor ini.</noscript></div>
<div class="savebar">
  <span id="dirty" class="muted" hidden>Ada perubahan yang belum disimpan</span>
  <button class="btn" id="save" type="button">Simpan &amp; terbitkan</button>
</div>
<script type="application/json" id="boot"><?= json_for_html($boot) ?></script>
<p class="muted" id="last-saved">Terakhir disimpan: <?= $meta && $meta['updated_by_name'] ? h(fmt_time($meta['updated_at'])) . ' oleh ' . h($meta['updated_by_name']) : 'belum pernah' ?></p>
<?php page_foot(['picker.js', 'ed.js', 'settings.js']);
