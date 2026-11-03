<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_login();

page_head('Beranda', $u);
?>
<h1>Halo, <?= h($u['name']) ?></h1>
<?php if (can_edit_content($u)): ?>
<p class="muted">Pilih bagian website yang ingin diubah. Perubahan langsung tampil di website setelah Anda menekan <strong>Simpan &amp; terbitkan</strong>.</p>
<?php else: ?>
<p class="muted">Akun ini belum punya akses ke bagian mana pun.</p>
<?php endif; ?>
<div class="grid">
<?php if (can_edit_content($u)):
    /* urutan kartu = urutan section di website */
    $tiles = [];
    foreach (SECTION_PAGES as $file => $label) {
        $tiles[] = [(string) (SECTION_KEYS[$file] ?? ''), $label, $file];
    }
    if (is_admin($u)) {
        $tiles[] = ['site', 'Pengaturan situs', 'settings.php'];
    }
    foreach ($tiles as [$k, $t, $href]):
        $m = $k !== '' ? doc_meta($k) : null; ?>
  <a class="card tile" href="<?= h($href) ?>">
    <h2><?= h($t) ?></h2>
    <p class="muted">Terakhir diubah: <?= $m && $m['updated_by_name'] ? h(fmt_time($m['updated_at'])) . ' oleh ' . h($m['updated_by_name']) : 'belum pernah' ?></p>
  </a>
<?php endforeach; ?>
<?php endif; ?>
<?php if (can_edit_content($u)): ?>
  <a class="card tile" href="forms.php"><h2>Formulir</h2><p class="muted">Buat formulir pop-up atau halaman, sambungkan ke Zapier.</p></a>
<?php endif; ?>
<?php if (can_view_leads($u)):
    $leadCount = null;
    $leadLast = null;
    try {
        $r = db()->query('SELECT COUNT(*) AS n, MAX(created_at) AS last FROM form_submissions')->fetch();
        $leadCount = (int) $r['n'];
        $leadLast = $r['last'];
    } catch (Throwable $e) {
        error_log('beranda leads: ' . $e->getMessage());
    } ?>
  <a class="card tile" href="submissions.php">
    <h2>Kiriman formulir</h2>
    <p class="muted"><?= $leadCount === null ? 'Data belum bisa dibaca.' : h((string) $leadCount) . ' kiriman · terakhir: ' . ($leadLast ? h(fmt_time($leadLast)) : 'belum ada') ?></p>
  </a>
<?php endif; ?>
</div>
<?php page_foot();
