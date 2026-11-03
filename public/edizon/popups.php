<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
popups_ensure();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    try {
        $p = $id > 0 ? popup_get($id) : null;
        if ($action === 'delete' && $p) {
            popup_delete($id);
            audit((int) $u['id'], 'popup_delete', $p['slug']);
            flash_set('ok', 'Pop-up dihapus.');
        } elseif ($action === 'duplicate' && $p) {
            $new = popup_save(['name' => $p['name'] . ' (salinan)', 'slug' => $p['slug'] . '-salinan', 'status' => 'draft', 'cfg' => $p['cfg']], 0, (int) $u['id']);
            audit((int) $u['id'], 'popup_create', (string) $new);
            flash_set('ok', 'Salinan dibuat sebagai draf.');
            redirect('popup.php?id=' . $new);
        } elseif ($action === 'toggle' && $p) {
            popup_save(['name' => $p['name'], 'slug' => $p['slug'], 'status' => $p['status'] === 'published' ? 'draft' : 'published', 'cfg' => $p['cfg']], $id, (int) $u['id']);
            audit((int) $u['id'], 'popup_save', (string) $id);
            flash_set('ok', $p['status'] === 'published' ? 'Pop-up disembunyikan (draf).' : 'Pop-up diterbitkan.');
        }
    } catch (Throwable $e) {
        error_log('popups action: ' . $e->getMessage());
        flash_set('err', 'Gagal. Periksa izin folder data di server.');
    }
    redirect('popups.php');
}

$rows = popups_all();
page_head('Pop-up', $u, 'wide');
?>
<div class="bar">
  <h1>Pop-up</h1>
  <a class="btn" href="popup.php">Buat pop-up baru</a>
</div>
<p class="muted">Pop-up adalah jendela di atas halaman: promo, pengumuman, atau formulir. Bisa muncul otomatis (saat halaman dibuka, menggulir, atau mau keluar) dan/atau dibuka dari tombol mana pun dengan tautan <code>#popup:alamat</code>, atau dari teks artikel dengan <code>[popup:alamat]</code>. Hanya pop-up berstatus <strong>Terbit</strong> yang terlihat pengunjung.</p>
<div class="card">
<?php if (!$rows): ?>
  <p class="muted">Belum ada pop-up.</p>
<?php else: ?>
  <table class="tbl">
    <thead><tr><th>Pop-up</th><th>Shortcode / tautan</th><th>Pemicu</th><th>Status</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): $cfg = array_replace_recursive(popup_default_cfg(), json_decode((string) $r['config'], true) ?: []); ?>
      <tr class="<?= $r['status'] === 'draft' ? 'off' : '' ?>">
        <td><a href="popup.php?id=<?= (int) $r['id'] ?>"><strong><?= h($r['name']) ?></strong></a><br><small class="muted">Diubah <?= h(fmt_time($r['updated_at'])) ?></small></td>
        <td><code>[popup:<?= h($r['slug']) ?>]</code><br><code>#popup:<?= h($r['slug']) ?></code></td>
        <td><small><?= h(popup_trigger_summary($cfg)) ?></small></td>
        <td><?= $r['status'] === 'published' ? 'Terbit' : 'Draf' ?></td>
        <td class="acts">
          <a class="btn ghost sm" href="popup-preview.php?id=<?= (int) $r['id'] ?>" target="_blank" rel="noopener">Pratinjau</a>
          <form method="post" action="popups.php"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><button class="link" type="submit"><?= $r['status'] === 'published' ? 'Jadikan draf' : 'Terbitkan' ?></button></form>
          <form method="post" action="popups.php"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="duplicate"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><button class="link" type="submit">Duplikat</button></form>
          <form method="post" action="popups.php" data-confirm="Hapus pop-up ini? Tombol atau tautan yang memakainya tidak akan membuka apa-apa lagi."><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><button class="link danger" type="submit">Hapus</button></form>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>
</div>
<?php page_foot([]);
