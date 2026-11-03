<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
popups_ensure();
$id = (int) ($_GET['id'] ?? 0);
$popup = $id > 0 ? popup_get($id) : null;
if ($id > 0 && !$popup) {
    flash_set('err', 'Pop-up tidak ditemukan.');
    redirect('popups.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
        json_out(['ok' => false, 'errors' => ['Sesi formulir kedaluwarsa. Muat ulang halaman.']], 403);
    }
    $body = json_decode((string) file_get_contents('php://input', false, null, 0, 1000000), true);
    if (!is_array($body) || !is_array($body['data'] ?? null)) {
        json_out(['ok' => false, 'errors' => ['Data tidak valid.']], 400);
    }
    $saveId = (int) ($body['data']['id'] ?? 0);
    if ($saveId > 0 && !popup_get($saveId)) {
        json_out(['ok' => false, 'errors' => ['Pop-up ini sudah dihapus.']], 404);
    }
    [$clean, $errs] = validate_popup($body['data'], $u, $saveId);
    if ($errs) {
        json_out(['ok' => false, 'errors' => $errs], 422);
    }
    try {
        $newId = popup_save($clean, $saveId, (int) $u['id']);
    } catch (Throwable $e) {
        error_log('popup save: ' . $e->getMessage());
        json_out(['ok' => false, 'errors' => ['Gagal menyimpan. Periksa koneksi database dan izin folder data.']], 500);
    }
    audit((int) $u['id'], $saveId ? 'popup_save' : 'popup_create', (string) $newId);
    json_out(['ok' => true, 'data' => popup_to_editor(popup_get($newId)), 'savedAt' => fmt_time(now_utc())]);
}

$forms = [];
try {
    foreach (forms_all() as $f) {
        $forms[] = ['slug' => $f['slug'], 'name' => $f['name'], 'status' => $f['status'], 'layout' => $f['layout']];
    }
} catch (Throwable $e) {
    error_log('popup forms: ' . $e->getMessage());
}
$others = [];
foreach (popups_all() as $o) {
    if (!$popup || (int) $o['id'] !== (int) $popup['id']) {
        $others[] = ['slug' => $o['slug'], 'name' => $o['name']];
    }
}
$quizzesList = [];
try {
    foreach (quizzes_all() as $qz) {
        $quizzesList[] = ['slug' => $qz['slug'], 'name' => $qz['name']];
    }
} catch (Throwable $e) {
    error_log('popup quizzes: ' . $e->getMessage());
}
$boot = ['csrf' => csrf_token(), 'data' => popup_to_editor($popup), 'forms' => $forms, 'popups' => $others, 'quizzes' => $quizzesList, 'isAdmin' => is_admin($u)];
page_head($popup ? 'Edit pop-up' : 'Pop-up baru', $u, 'wide');
?>
<link rel="stylesheet" href="assets/article-editor.css?v=<?= h(PANEL_VERSION) ?>">
<div class="bar">
  <h1><?= $popup ? 'Edit pop-up' : 'Pop-up baru' ?></h1>
  <a class="btn ghost" href="popups.php">Semua pop-up</a>
</div>
<p class="muted" id="last-saved"><?= $popup ? 'Terakhir diubah: ' . h(fmt_time($popup['updated_at'])) : 'Belum disimpan.' ?></p>
<div id="errors" class="flash err" hidden></div>
<div id="editor" aria-live="polite"><noscript>Aktifkan JavaScript untuk menggunakan editor ini.</noscript></div>
<div class="savebar">
  <span id="dirty" class="muted" hidden>Ada perubahan yang belum disimpan</span>
  <a id="viewlink" class="btn ghost" href="<?= $popup ? 'popup-preview.php?id=' . (int) $popup['id'] : '#' ?>" target="_blank" rel="noopener"<?= $popup ? '' : ' hidden' ?>>Pratinjau</a>
  <button class="btn" id="save" type="button">Simpan</button>
</div>
<script type="application/json" id="boot"><?= json_for_html($boot) ?></script>
<?php page_foot(['picker.js', 'ed.js', 'revisions.js', 'article-editor.js', 'popup-builder.js']);
