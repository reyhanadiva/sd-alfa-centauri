<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    try {
        $f = $id > 0 ? form_get($id) : null;
        if ($action === 'delete' && $f) {
            if ($f['slug'] === 'free-trial') {
                flash_set('err', 'Formulir Free Trial adalah formulir bawaan dan tidak bisa dihapus. Anda bisa mengubah isinya atau menyembunyikannya (Draf).');
            } elseif (!is_admin($u)) {
                flash_set('err', 'Hanya Admin yang boleh menghapus formulir, karena data pendaftar ikut terhapus.');
            } else {
                $link = site_trial_link();
                if ($link['mode'] === 'form' && $link['form'] === $f['slug']) {
                    flash_set('err', 'Formulir ini sedang dipakai tombol Free Trial seluruh situs. Ganti dulu tujuannya di menu Coba gratis.');
                } else {
                    form_delete($id);
                    audit((int) $u['id'], 'form_delete', $f['slug']);
                    flash_set('ok', 'Formulir dan seluruh kirimannya dihapus.');
                }
            }
        } elseif ($action === 'duplicate' && $f) {
            $d = $f['cfg'];
            $new = form_save([
                'name' => $f['name'] . ' (salinan)', 'slug' => $f['slug'] . '-salinan', 'layout' => $f['layout'], 'status' => 'draft',
                'zapier_form_id' => $f['zapier_form_id'], 'zapier_form_name' => $f['zapier_form_name'], 'cfg' => $d,
            ], 0, (int) $u['id']);
            audit((int) $u['id'], 'form_create', (string) $new);
            flash_set('ok', 'Salinan dibuat sebagai draf.');
            redirect('form.php?id=' . $new);
        }
    } catch (Throwable $e) {
        error_log('forms action: ' . $e->getMessage());
        flash_set('err', 'Gagal. Coba lagi.');
    }
    redirect('forms.php');
}

$rows = forms_all();
page_head('Formulir', $u, 'wide');
?>
<div class="bar">
  <h1>Formulir</h1>
  <a class="btn" href="form.php">Buat formulir baru</a>
</div>
<p class="muted">Setiap formulir punya alamat, terhubung ke Zapier, dan kirimannya tersimpan di database (lihat menu Pendaftar). Pop-up bisa dibuka dari tombol mana pun dengan tautan <code>#form:alamat</code>, atau dari teks artikel dengan <code>[form:alamat]</code>. Formulir bertipe Halaman tampil di <code>/form/alamat</code>.</p>
<div class="card">
<?php if (!$rows): ?>
  <p class="muted">Belum ada formulir.</p>
<?php else: ?>
  <table class="tbl">
    <thead><tr><th>Formulir</th><th>Tipe</th><th>Shortcode / alamat</th><th>Zapier</th><th>Status</th><th>Kiriman</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
      <tr class="<?= $r['status'] === 'draft' ? 'off' : '' ?>">
        <td><a href="form.php?id=<?= (int) $r['id'] ?>"><strong><?= h($r['name']) ?></strong></a><br><small class="muted">Diubah <?= h(fmt_time($r['updated_at'])) ?></small></td>
        <td><?= $r['layout'] === 'page' ? 'Halaman' : 'Pop-up' ?></td>
        <td><code>[form:<?= h($r['slug']) ?>]</code><br><code>#form:<?= h($r['slug']) ?></code><?php if ($r['layout'] === 'page'): ?><br><code>/form/<?= h($r['slug']) ?></code><?php endif; ?></td>
        <td><?= $r['zapier_form_id'] !== '' ? '<code>' . h($r['zapier_form_id']) . '</code>' : '<span class="muted">tidak terhubung</span>' ?></td>
        <td><?= $r['status'] === 'published' ? 'Terbit' : 'Draf' ?></td>
        <td><?php if (can_view_leads($u)): ?><a href="submissions.php?form=<?= (int) $r['id'] ?>"><?= (int) $r['n'] ?></a><?php else: ?><?= (int) $r['n'] ?><?php endif; ?></td>
        <td class="acts">
          <a class="btn ghost sm" href="form-preview.php?id=<?= (int) $r['id'] ?>" target="_blank" rel="noopener">Pratinjau</a>
          <form method="post" action="forms.php"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="duplicate"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><button class="link" type="submit">Duplikat</button></form>
          <?php if ($r['slug'] !== 'free-trial' && is_admin($u)): ?>
          <form method="post" action="forms.php" data-confirm="Hapus formulir ini beserta <?= (int) $r['n'] ?> kirimannya? Tindakan ini tidak bisa dibatalkan."><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><button class="link danger" type="submit">Hapus</button></form>
          <?php endif; ?>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>
</div>
<?php page_foot([]);
