<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
$id = (int) ($_GET['id'] ?? 0);
$form = $id > 0 ? form_get($id) : null;
if ($id > 0 && !$form) {
    flash_set('err', 'Formulir tidak ditemukan.');
    redirect('forms.php');
}

function form_to_editor(?array $f): array
{
    if (!$f) {
        $kids = ['eyebrow' => '', 'title' => '', 'intro' => '', 'submit' => 'Kirim', 'note' => '', 'successTitle' => 'Terima kasih!', 'successMsg' => 'Data Anda sudah kami terima. Tim kami akan segera menghubungi Anda.'];
        $adult = ['eyebrow' => '', 'title' => '', 'intro' => '', 'submit' => '', 'note' => '', 'successTitle' => '', 'successMsg' => ''];
        return ['id' => 0, 'name' => '', 'slug' => '', 'layout' => 'popup', 'status' => 'draft', 'zapierFormId' => '', 'zapierFormName' => '', 'waFallback' => true, 'photo' => '',
            'texts' => ['kids' => $kids, 'adult' => $adult], 'drafts' => true, 'steps' => [['id' => 's1', 'name' => '', 'items' => []]], 'fields' => []];
    }
    $cfg = $f['cfg'];
    $texts = [];
    foreach (['kids', 'adult'] as $a) {
        foreach (FORM_TEXT_KEYS as $k) {
            $texts[$a][$k] = (string) ($cfg['texts'][$a][$k] ?? '');
        }
    }
    return ['id' => $f['id'], 'name' => $f['name'], 'slug' => $f['slug'], 'layout' => $f['layout'], 'status' => $f['status'], 'zapierFormId' => $f['zapier_form_id'],
        'zapierFormName' => $f['zapier_form_name'], 'waFallback' => !empty($cfg['waFallback']), 'photo' => (string) ($cfg['photo'] ?? ''), 'texts' => $texts, 'drafts' => (bool) ($cfg['drafts'] ?? true), 'steps' => form_cfg_steps($cfg), 'fields' => array_values($cfg['fields'] ?? []),
        'url' => $f['layout'] === 'page' ? '/form/' . $f['slug'] : ''];
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
    $old = $saveId > 0 ? form_get($saveId) : null;
    if ($saveId > 0 && !$old) {
        json_out(['ok' => false, 'errors' => ['Formulir ini sudah dihapus.']], 404);
    }
    [$clean, $errs] = validate_form_def($body['data'], $u, $saveId);
    if ($old && $old['slug'] === 'free-trial') {
        $clean['slug'] = 'free-trial';          // alamat formulir bawaan tidak boleh berubah
        $errs = array_values(array_filter($errs, static fn($e) => !str_contains($e, 'dicadangkan')));
        if ($clean['status'] !== 'published') {
            $link = site_trial_link();
            if ($link['mode'] === 'form' && $link['form'] === 'free-trial') {
                $errs[] = 'Formulir Free Trial sedang dipakai tombol Free Trial seluruh situs, jadi harus berstatus Terbit. Ganti dulu tujuan tombolnya di menu Coba gratis.';
            }
        }
    }
    if ($old && $clean['slug'] !== $old['slug']) {
        $link = site_trial_link();
        if ($link['mode'] === 'form' && $link['form'] === $old['slug']) {
            $errs[] = 'Alamat formulir ini dipakai tombol Free Trial seluruh situs. Ganti dulu tujuan tombolnya di menu Coba gratis.';
        }
    }
    if ($errs) {
        json_out(['ok' => false, 'errors' => $errs], 422);
    }
    try {
        $newId = form_save($clean, $saveId, (int) $u['id']);
    } catch (Throwable $e) {
        error_log('form save: ' . $e->getMessage());
        json_out(['ok' => false, 'errors' => ['Gagal menyimpan. Periksa koneksi database.']], 500);
    }
    audit((int) $u['id'], $saveId ? 'form_save' : 'form_create', (string) $newId);
    json_out(['ok' => true, 'data' => form_to_editor(form_get($newId)), 'savedAt' => fmt_time(now_utc())]);
}

$hooks = [];
try {
    $hooks = array_map(static fn($h) => ['formId' => $h['form_id'], 'label' => $h['label']], zapier_hooks());
} catch (Throwable $e) {
    error_log('form hooks: ' . $e->getMessage());
}
$boot = ['csrf' => csrf_token(), 'data' => form_to_editor($form), 'hooks' => $hooks, 'isAdmin' => is_admin($u), 'lists' => array_map(static fn($l) => ['slug' => $l['slug'], 'name' => $l['name'], 'n' => count($l['items'])], suggest_lists_all()), 'builtin' => $form && $form['slug'] === 'free-trial'];
page_head($form ? 'Edit formulir' : 'Formulir baru', $u, 'wide');
?>
<div class="bar">
  <h1><?= $form ? 'Edit formulir' : 'Formulir baru' ?></h1>
  <a class="btn ghost" href="forms.php">Semua formulir</a>
</div>
<p class="muted" id="last-saved"><?= $form ? 'Terakhir diubah: ' . h(fmt_time($form['updated_at'])) : 'Belum disimpan.' ?></p>
<link rel="stylesheet" href="assets/form-editor.css?v=<?= h(PANEL_VERSION) ?>">
<div id="errors" class="flash err" hidden></div>
<div id="editor" aria-live="polite"><noscript>Aktifkan JavaScript untuk menggunakan editor ini.</noscript></div>
<div class="savebar">
  <span id="dirty" class="muted" hidden>Ada perubahan yang belum disimpan</span>
  <a id="viewlink" class="btn ghost" href="<?= $form ? 'form-preview.php?id=' . (int) $form['id'] : '#' ?>" target="_blank" rel="noopener"<?= $form ? '' : ' hidden' ?>>Pratinjau</a>
  <button class="btn" id="save" type="button">Simpan</button>
</div>
<script type="application/json" id="boot"><?= json_for_html($boot) ?></script>
<?php page_foot(['ed.js', 'form-editor.js', 'form-builder.js']);
