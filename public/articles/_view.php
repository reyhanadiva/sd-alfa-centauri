<?php
/** Satu halaman artikel (dipakai view.php dan pratinjau di panel). */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

/** @param string[] $notes  catatan untuk pratinjau draf (mis. blok yang belum lengkap dan belum tampil) */
function art_view_page(array $a, bool $preview = false, array $notes = []): void
{
    $draft = defined('ART_DRAFT_PREVIEW') && ART_DRAFT_PREVIEW === true;
    $blocks = json_decode((string) $a['body'], true);
    $blocks = is_array($blocks) ? $blocks : [];
    $only = $a['audiences'] ?: ['kids', 'adult'];
    $seo = $a['seo'] ?? art_seo_default();
    $desc = $seo['description'] !== '' ? $seo['description'] : ($a['excerpt'] !== '' ? $a['excerpt'] : ($a['subtitle'] !== '' ? $a['subtitle'] : $a['title']));
    $title = $seo['title'] !== '' ? $seo['title'] : $a['title'] . ' · ' . art_site()['name'];
    $image = $seo['image'] !== '' ? $seo['image'] : (string) $a['hero'];
    $canonical = $seo['canonical'] !== '' ? $seo['canonical'] : (art_base_url() !== '' ? art_base_url() . '/articles/' . $a['slug'] : '');
    $iso = static fn($d) => $d ? gmdate('c', (int) strtotime((string) $d . ' UTC')) : '';
    $base = art_base_url();
    $site = art_site();
    $same = [];
    try {
        $ft = doc_get('footer');
        foreach (is_array($ft['social'] ?? null) ? $ft['social'] : [] as $so) {
            if (is_string($so['url'] ?? null) && preg_match('#^https?://#i', $so['url'])) {
                $same[] = $so['url'];
            }
        }
    } catch (Throwable) {
    }
    $orgId = ($base !== '' ? $base : '') . '/#organization';
    $org = ['@type' => 'Organization', '@id' => $orgId, 'name' => $site['name'], 'url' => $base . '/', 'logo' => ['@type' => 'ImageObject', 'url' => art_abs($site['logoFull'])]];
    if ($same) {
        $org['sameAs'] = $same;
    }
    $words = str_word_count(strip_tags(art_blocks_markdown($blocks))) ?: 0;
    $article = ['@type' => 'Article', '@id' => $canonical . '#article', 'headline' => mb_substr((string) $a['title'], 0, 110), 'description' => $desc, 'inLanguage' => 'id-ID',
        'author' => ['@type' => 'Person', 'name' => art_author($a)], 'publisher' => ['@id' => $orgId], 'wordCount' => $words];
    if ($image !== '') {
        $article['image'] = [art_abs($image)];
    }
    if ($a['published_at']) {
        $article['datePublished'] = $iso($a['published_at']);
    }
    $article['dateModified'] = $iso($a['updated_at']) ?: $iso($a['published_at']);
    if ($canonical !== '') {
        $article['mainEntityOfPage'] = ['@type' => 'WebPage', '@id' => $canonical];
    }
    if (!empty($a['category_name'])) {
        $article['articleSection'] = $a['category_name'];
    }
    $kw = array_values(array_filter(array_merge([$seo['keyword']], array_map(static fn($t) => $t['name'], $a['tags']))));
    if ($kw) {
        $article['keywords'] = implode(', ', $kw);
    }
    $crumbs = [['Beranda', $base . '/'], ['Artikel', $base . '/articles/']];
    if (!empty($a['category_name'])) {
        $crumbs[] = [(string) $a['category_name'], $base . '/articles/?category=' . $a['category_slug']];
    }
    $crumbs[] = [(string) $a['title'], $canonical];
    $graph = [$org, $article, ['@type' => 'BreadcrumbList', 'itemListElement' => array_map(static fn($c, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => $c[1]], $crumbs, array_keys($crumbs))]];
    $faq = [];
    art_walk_blocks($blocks, static function (array $bl) use (&$faq): void {
        if (($bl['t'] ?? '') === 'faq') {
            foreach ($bl['items'] as $it) {
                $faq[] = ['@type' => 'Question', 'name' => $it['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $it['a']]];
            }
        }
    });
    if ($faq) {
        $graph[] = ['@type' => 'FAQPage', 'mainEntity' => $faq];
    }
    $ld = ['@context' => 'https://schema.org', '@graph' => $graph];
    $sugg = art_suggestions($a);
    art_open($title, $desc, $image, $only, 'page-article', [
        'canonical' => $canonical, 'robots' => !empty($seo['noindex']) ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
        'published' => $iso($a['published_at']), 'modified' => $iso($a['updated_at']), 'jsonld' => $ld,
    ]);
    ?>
<?php if ($preview): ?><div class="previewbar"><?php if ($draft): ?>Pratinjau perubahan yang belum disimpan · tutup tab ini untuk kembali ke editor<?php else: ?>Pratinjau<?= $a['status'] === 'draft' ? ' (draf, belum terlihat publik)' : '' ?><?= $a['status'] === 'published' && $a['published_at'] && $a['published_at'] > gmdate('Y-m-d H:i:s') ? ' (terjadwal)' : '' ?> · <a href="/edizon/article.php?id=<?= (int) $a['id'] ?>">Kembali ke editor</a><?php endif; ?>
<?php if ($notes): ?><ul class="previewnotes"><?php foreach ($notes as $n): ?><li><?= h($n) ?></li><?php endforeach; ?></ul><?php endif; ?></div><?php endif; ?>
<article class="art<?= ($seo['layout'] ?? '') === 'full' ? ' art-full' : '' ?>" data-aud="<?= h(implode(' ', $only)) ?>">
  <header class="art-head">
    <?php if (!empty($a['category_name'])): ?><a class="chip" href="/articles/?category=<?= h((string) $a['category_slug']) ?>"><?= h((string) $a['category_name']) ?></a><?php endif; ?>
    <h1><?= h((string) $a['title']) ?></h1>
    <?php if ($a['subtitle'] !== ''): ?><p class="art-sub"><?= h((string) $a['subtitle']) ?></p><?php endif; ?>
    <p class="art-meta"><span><?= h(art_author($a)) ?></span><?php if ($a['published_at']): ?> · <time datetime="<?= h(substr((string) $a['published_at'], 0, 10)) ?>"><?= h(art_date($a['published_at'])) ?></time><?php endif; ?> · <span><?= art_reading_minutes($blocks) ?> menit baca</span><?php if ($a['published_at'] && strtotime((string) $a['updated_at'] . ' UTC') - strtotime((string) $a['published_at'] . ' UTC') > 86400): ?> · <span>Diperbarui <time datetime="<?= h(substr((string) $a['updated_at'], 0, 10)) ?>"><?= h(art_date($a['updated_at'])) ?></time></span><?php endif; ?></p>
  </header>
  <?php if ($a['hero'] !== ''): ?><figure class="art-hero"><img src="<?= h((string) $a['hero']) ?>" alt=""></figure><?php endif; ?>
  <div class="prose">
<?= art_render_blocks($blocks, false, art_frame_ctx($a, $preview)) ?>
  </div>
  <?php if ($a['tags']): ?>
  <ul class="art-tags" aria-label="Tag"><?php foreach ($a['tags'] as $t): ?><li><a href="/articles/?tag=<?= h((string) $t['slug']) ?>">#<?= h((string) $t['name']) ?></a></li><?php endforeach; ?></ul>
  <?php endif; ?>
</article>

<?php if ($sugg): ?>
<section class="more" aria-labelledby="more-h">
  <h2 id="more-h">Baca juga</h2>
  <div class="grid grid-3" data-limit="3">
    <?php foreach ($sugg as $s) { art_card($s); } ?>
  </div>
  <p class="more-btn"><a class="btn" href="/articles/">Lihat semua artikel</a></p>
</section>
<?php else: ?>
<section class="more"><p class="more-btn"><a class="btn" href="/articles/">Lihat semua artikel</a></p></section>
<?php endif; ?>
<?php
    art_close();
}

function art_not_found(): void
{
    http_response_code(404);
    art_open('Artikel tidak ditemukan · ' . art_site()['name'], 'Artikel tidak ditemukan.', '', null, '', ['robots' => 'noindex,follow']);
    ?>
<section class="empty">
  <h1>Artikel tidak ditemukan</h1>
  <p>Alamatnya mungkin salah atau artikelnya belum terbit.</p>
  <p><a class="btn" href="/articles/">Lihat semua artikel</a></p>
</section>
<?php
    art_close();
}
