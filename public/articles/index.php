<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$slugOk = static fn(string $s): string => preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $s) ? $s : '';
$catSlug = $slugOk((string) ($_GET['category'] ?? ''));
$tagSlug = $slugOk((string) ($_GET['tag'] ?? ''));
$items = art_published(['category' => $catSlug, 'tag' => $tagSlug], 300);
$terms = art_terms();
$curCat = $curTag = null;
foreach ($terms['categories'] as $c) { if ($c['slug'] === $catSlug && $catSlug !== '') { $curCat = $c; } }
foreach ($terms['tags'] as $t) { if ($t['slug'] === $tagSlug && $tagSlug !== '') { $curTag = $t; } }
/* hanya kategori/tag yang punya artikel terbit yang ditampilkan sebagai pilihan */
$pubAll = art_published([], 500);
$catN = [];
$tagN = [];
foreach ($pubAll as $a) {
    if (!empty($a['category_slug'])) { $catN[$a['category_slug']] = ($catN[$a['category_slug']] ?? 0) + 1; }
    foreach ($a['tags'] as $t) { $tagN[$t['slug']] = ($tagN[$t['slug']] ?? 0) + 1; }
}
$cats = array_values(array_filter($terms['categories'], static fn($c) => isset($catN[$c['slug']])));
$tags = array_values(array_filter($terms['tags'], static fn($t) => isset($tagN[$t['slug']])));

$filterLabel = $curCat ? 'Kategori: ' . $curCat['name'] : ($curTag ? 'Tag: #' . $curTag['name'] : '');
art_open('Artikel · ' . art_site()['name'], 'Tips belajar bahasa Inggris, panduan memilih program, dan cerita dari ' . art_site()['name'] . '.', '', null, 'page-list', ['type' => 'website', 'canonical' => art_base_url() !== '' ? art_base_url() . '/articles/' : '']);
?>
<section class="hero-list">
  <p class="eyebrow only-kids">Cerita &amp; tips seru</p><p class="eyebrow only-adult">Wawasan &amp; panduan</p>
  <h1>Artikel</h1>
  <p class="lead only-kids">Ide belajar yang menyenangkan untuk anak dan remaja, plus tips untuk orang tua.</p>
  <p class="lead only-adult">Panduan praktis untuk karier, ujian, dan percaya diri berbahasa Inggris.</p>
</section>

<section class="filters" aria-label="Saring artikel">
  <ul class="chips">
    <li><a class="chip<?= $catSlug === '' && $tagSlug === '' ? ' on' : '' ?>" href="/articles/">Semua</a></li>
    <?php foreach ($cats as $c): ?><li><a class="chip<?= $catSlug === $c['slug'] ? ' on' : '' ?>" href="/articles/?category=<?= h($c['slug']) ?>"><?= h($c['name']) ?></a></li><?php endforeach; ?>
  </ul>
  <?php if ($tags): ?>
  <ul class="chips chips-tags" aria-label="Tag">
    <?php foreach ($tags as $t): ?><li><a class="tag<?= $tagSlug === $t['slug'] ? ' on' : '' ?>" href="/articles/?tag=<?= h($t['slug']) ?>">#<?= h($t['name']) ?></a></li><?php endforeach; ?>
  </ul>
  <?php endif; ?>
  <?php if ($filterLabel !== ''): ?><p class="filter-now"><?= h($filterLabel) ?> · <a href="/articles/">Hapus filter</a></p><?php endif; ?>
</section>

<section class="list">
  <?php if (!$items): ?>
    <p class="empty-note">Belum ada artikel<?= $filterLabel !== '' ? ' untuk filter ini' : '' ?>.</p>
  <?php else: ?>
  <div class="grid grid-3" id="list" data-page="9">
    <?php foreach ($items as $a) { art_card($a); } ?>
  </div>
  <p class="empty-note" id="list-empty" hidden>Belum ada artikel untuk tampilan ini.</p>
  <p class="more-btn"><button class="btn" type="button" id="show-more" hidden>Tampilkan lebih banyak</button></p>
  <?php endif; ?>
</section>
<?php art_close();
