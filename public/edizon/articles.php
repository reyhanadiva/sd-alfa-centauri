<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $action = (string) ($_POST['action'] ?? '');
    try {
        if ($action === 'delete') {
            $id = (int) ($_POST['id'] ?? 0);
            if (art_get($id)) {
                art_delete($id);
                audit((int) $u['id'], 'article_delete', (string) $id);
                flash_set('ok', 'Artikel dihapus.');
            }
        } elseif ($action === 'seed' && is_admin($u)) {
            $n = art_seed_samples((int) $u['id']);
            audit((int) $u['id'], 'article_seed', (string) $n);
            flash_set('ok', "$n artikel contoh dibuat.");
        } elseif ($action === 'purge' && is_admin($u)) {
            $n = art_purge_samples();
            audit((int) $u['id'], 'article_purge', (string) $n);
            flash_set('ok', "$n artikel contoh dihapus.");
        } elseif ($action === 'delete_all' && is_admin($u)) {
            if (trim((string) ($_POST['confirm_text'] ?? '')) !== 'HAPUS') {
                flash_set('err', 'Tidak ada yang dihapus: kata konfirmasi harus HAPUS (huruf besar).');
            } else {
                $n = art_delete_all();
                audit((int) $u['id'], 'article_delete_all', (string) $n);
                flash_set('ok', "$n artikel dihapus.");
            }
        }
    } catch (Throwable $e) {
        error_log('articles action: ' . $e->getMessage());
        flash_set('err', 'Gagal. Coba lagi.');
    }
    redirect('articles.php');
}

$f = [
    'status' => (string) ($_GET['status'] ?? ''),
    'category' => (string) ($_GET['category'] ?? ''),
    'tag' => (string) ($_GET['tag'] ?? ''),
    'q' => trim((string) ($_GET['q'] ?? '')),
];
$rows = art_all($f);
$terms = art_terms();
$hasSample = (int) db()->query('SELECT COUNT(*) FROM articles WHERE is_sample = 1')->fetchColumn();
$total = (int) db()->query('SELECT COUNT(*) FROM articles')->fetchColumn();
$audLabel = ['kids' => 'Anak & Remaja', 'adult' => 'Dewasa & Bisnis'];

page_head('Artikel', $u, 'wide');
?>
<div class="bar">
  <h1>Artikel</h1>
  <a class="btn" href="article.php">Tulis artikel baru</a>
</div>
<p class="muted">Halaman publik ada di <code>/articles/</code>. Belum ditautkan dari beranda; tautkan nanti saat siap.</p>

<form class="filters" method="get" action="articles.php">
  <label><span class="fl">Cari judul</span><input type="search" name="q" value="<?= h($f['q']) ?>"></label>
  <label><span class="fl">Status</span>
    <select name="status"><option value="">Semua</option><option value="published"<?= $f['status'] === 'published' ? ' selected' : '' ?>>Terbit</option><option value="draft"<?= $f['status'] === 'draft' ? ' selected' : '' ?>>Draf</option></select></label>
  <label><span class="fl">Kategori</span>
    <select name="category"><option value="">Semua</option><?php foreach ($terms['categories'] as $c): ?><option value="<?= h($c['slug']) ?>"<?= $f['category'] === $c['slug'] ? ' selected' : '' ?>><?= h($c['name']) ?> (<?= (int) $c['n'] ?>)</option><?php endforeach; ?></select></label>
  <label><span class="fl">Tag</span>
    <select name="tag"><option value="">Semua</option><?php foreach ($terms['tags'] as $t): ?><option value="<?= h($t['slug']) ?>"<?= $f['tag'] === $t['slug'] ? ' selected' : '' ?>><?= h($t['name']) ?> (<?= (int) $t['n'] ?>)</option><?php endforeach; ?></select></label>
  <button class="btn ghost" type="submit">Terapkan</button>
</form>

<div class="card">
<?php if (!$rows): ?>
  <p class="muted">Belum ada artikel<?= array_filter($f) ? ' yang cocok dengan filter' : '' ?>.</p>
<?php else: ?>
  <table class="tbl">
    <thead><tr><th>Judul</th><th>Kategori</th><th>Tampil di</th><th>Status</th><th>Diubah</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $a): ?>
      <tr class="<?= $a['status'] === 'draft' ? 'off' : '' ?>">
        <td><a href="article.php?id=<?= (int) $a['id'] ?>"><strong><?= h($a['title']) ?></strong></a><?= $a['is_sample'] ? ' <small class="muted">(contoh)</small>' : '' ?>
          <br><small class="muted"><?= h(art_author($a)) ?><?php if ($a['tags']): ?> · <?= h(implode(', ', array_map(static fn($t) => '#' . $t['name'], $a['tags']))) ?><?php endif; ?></small></td>
        <td><?= h((string) ($a['category_name'] ?? '-')) ?></td>
        <td><?= h(implode(' + ', array_map(static fn($x) => $audLabel[$x] ?? $x, $a['audiences'])) ?: '-') ?></td>
        <td><?= $a['status'] === 'published' ? 'Terbit' : 'Draf' ?><?php if ($a['status'] === 'published' && $a['published_at']): ?><br><small class="muted"><?= h(fmt_time($a['published_at'])) ?></small><?php endif; ?></td>
        <td><small><?= h(fmt_time($a['updated_at'])) ?></small></td>
        <td class="acts">
          <a class="btn ghost sm" href="article-preview.php?id=<?= (int) $a['id'] ?>" target="_blank" rel="noopener">Lihat</a>
          <form method="post" action="articles.php" data-confirm="Hapus artikel ini? Tindakan ini tidak bisa dibatalkan.">
            <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int) $a['id'] ?>">
            <button class="link danger" type="submit">Hapus</button></form>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>
</div>

<?php if (is_admin($u)): ?>
<div class="card">
  <strong>Artikel contoh (untuk uji coba)</strong>
  <p class="muted">Membuat 10 artikel contoh berisi gambar, video, peta, kutipan, dan daftar. Dapat dihapus sekaligus tanpa menyentuh artikel asli.</p>
  <form method="post" action="articles.php" class="inline">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <button class="btn ghost" name="action" value="seed" type="submit">Buat 10 artikel contoh</button>
  </form>
  <?php if ($hasSample): ?>
  <form method="post" action="articles.php" class="inline" data-confirm="Hapus <?= $hasSample ?> artikel contoh?">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <button class="btn ghost" name="action" value="purge" type="submit">Hapus <?= $hasSample ?> artikel contoh</button>
  </form>
  <?php endif; ?>
</div>
<?php if ($total > 0): ?>
<div class="card">
  <strong>Hapus semua artikel</strong>
  <p class="muted">Menghapus SEMUA <?= $total ?> artikel (terbit maupun draf) beserta tag, kategori yang tidak terpakai, dan data SEO-nya. Tidak bisa dibatalkan. Gambar di pustaka media tidak ikut terhapus.</p>
  <form method="post" action="articles.php" class="inline" data-confirm="Hapus SEMUA <?= $total ?> artikel? Tindakan ini tidak bisa dibatalkan.">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <input type="hidden" name="action" value="delete_all">
    <label><span class="fl">Ketik HAPUS untuk melanjutkan</span><input type="text" name="confirm_text" autocomplete="off" required placeholder="HAPUS"></label>
    <button class="btn ghost" type="submit">Hapus semua artikel</button>
  </form>
</div>
<?php endif; ?>
<?php endif; ?>
<?php page_foot(['articles.js']);
