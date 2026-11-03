<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
$docs = is_admin($u) ? doc_titles_all() : SECTION_TITLES; // dokumen 'site' (pengaturan situs) hanya untuk Super Admin
$key = (string) ($_GET['doc'] ?? $_POST['doc'] ?? 'why.kids');
if (!isset($docs[$key])) {
    $key = 'why.kids';
}
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $rid = (int) ($_POST['rev'] ?? 0);
    $rev = doc_revision_data($rid, $key);
    if ($rev === null) {
        $errors[] = 'Versi tidak ditemukan.';
    } else {
        $validate = doc_validator($key);
        if ($validate === null) {
            $clean = [];
            $errs = ['Dokumen ini belum bisa dikembalikan dari Riwayat.'];
        } else {
            [$clean, $errs] = $validate($rev);
        }
        if ($errs) {
            $errors = $errs;
        } else {
            try {
                doc_save($key, $clean, (int) $u['id'], 'Dikembalikan ke versi #' . $rid);
                publish_content();
                audit((int) $u['id'], 'restore', "$key #$rid");
                flash_set('ok', 'Versi dikembalikan dan diterbitkan.');
                redirect('history.php?doc=' . urlencode($key));
            } catch (Throwable $e) {
                error_log('restore: ' . $e->getMessage());
                $errors[] = 'Gagal mengembalikan versi.';
            }
        }
    }
}

$revs = doc_revisions($key, 30);
page_head('Riwayat', $u);
?>
<h1>Riwayat perubahan</h1>
<p class="tabs">
<?php foreach ($docs as $k => $t): ?><a href="history.php?doc=<?= h($k) ?>"<?= $k === $key ? ' class="on"' : '' ?>><?= h($t) ?></a><?php endforeach; ?>
</p>
<?php foreach ($errors as $e): ?><div class="flash err"><?= h($e) ?></div><?php endforeach; ?>
<div class="card">
<?php if (!$revs): ?><p class="muted">Belum ada riwayat.</p><?php else: ?>
<table class="tbl">
  <thead><tr><th>Waktu</th><th>Oleh</th><th>Catatan</th><th></th></tr></thead>
  <tbody>
  <?php foreach ($revs as $i => $r): ?>
    <tr>
      <td><?= h(fmt_time($r['saved_at'])) ?></td>
      <td><?= h((string) ($r['saved_by_name'] ?? 'Sistem')) ?></td>
      <td><?= h($r['note']) ?><?= $i === 0 ? ' <small>(versi tayang)</small>' : '' ?></td>
      <td><?php if ($i > 0): ?>
        <form method="post"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="doc" value="<?= h($key) ?>"><input type="hidden" name="rev" value="<?= (int) $r['id'] ?>">
        <button class="link" type="submit">Kembalikan ke versi ini</button></form>
      <?php endif; ?></td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>
<?php endif; ?>
</div>
<?php page_foot();
