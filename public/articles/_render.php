<?php
/** Kerangka halaman publik artikel: kepala halaman, footer, kartu artikel, dan pembantu tampilan. */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const ART_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function art_date(?string $utc): string
{
    if (!$utc) {
        return '';
    }
    try {
        $d = (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Asia/Jakarta'));
    } catch (Throwable) {
        return '';
    }
    return $d->format('j') . ' ' . ART_MONTHS[(int) $d->format('n') - 1] . ' ' . $d->format('Y');
}

function art_site_url(string $path = ''): string
{
    return $path;
}

function art_csp(): string
{
    return "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self'; script-src 'self'; frame-src 'self' https:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'";
}

/** @param string[]|null $only  jika diisi: artikel hanya untuk tampilan ini (tampilan dikunci) */
/** alamat dasar situs untuk tautan absolut (canonical, gambar berbagi). Bisa dipaksa lewat 'site_url' di konfigurasi. */
function ART_PREVIEW_ON(): bool
{
    return defined('ART_PREVIEW') && ART_PREVIEW === true;
}

function art_base_url(): string
{
    $c = rtrim((string) cfg('site_url', ''), '/');
    if (preg_match('#^https?://[A-Za-z0-9.-]+(:\d+)?$#', $c)) {
        return $c;
    }
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if (!preg_match('/^[A-Za-z0-9.-]+(:\d+)?$/', $host)) {
        return '';
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    return ($https ? 'https://' : 'http://') . $host;
}

function art_abs(string $path): string
{
    if ($path === '' || preg_match('#^https?://#i', $path)) {
        return $path;
    }
    return art_base_url() . '/' . ltrim($path, '/');
}

/**
 * @param array{canonical?:string,robots?:string,type?:string,image_alt?:string,jsonld?:array,published?:string,modified?:string} $meta
 */
function art_open(string $title, string $desc, string $image, ?array $only, string $bodyClass = '', array $meta = []): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Security-Policy: ' . art_csp());
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    if (ART_PREVIEW_ON() || !seo_index_allowed()) {
        header('X-Robots-Tag: noindex, nofollow');
    }
    $default = $only && count($only) === 1 ? $only[0] : '';
    $v = '12';
    ?>
<!doctype html>
<html lang="id" data-audience="<?= h($default ?: 'kids') ?>"<?= $default ? ' data-default="' . h($default) . '"' : '' ?>>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title) ?></title>
<meta name="description" content="<?= h($desc) ?>">
<?php $robots = ART_PREVIEW_ON() ? 'noindex,nofollow' : seo_robots((string) ($meta['robots'] ?? 'index,follow,max-image-preview:large')); ?>
<meta name="robots" content="<?= h($robots) ?>">
<?php if (!empty($meta['canonical'])): ?><link rel="canonical" href="<?= h($meta['canonical']) ?>">
<meta property="og:url" content="<?= h($meta['canonical']) ?>"><?php endif; ?>
<meta property="og:type" content="<?= h((string) ($meta['type'] ?? 'article')) ?>">
<meta property="og:site_name" content="<?= h(art_site()['name']) ?>">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="<?= h($title) ?>">
<meta property="og:description" content="<?= h($desc) ?>">
<?php if (!empty($meta['published'])): ?><meta property="article:published_time" content="<?= h($meta['published']) ?>"><?php endif; ?>
<?php if (!empty($meta['modified'])): ?><meta property="article:modified_time" content="<?= h($meta['modified']) ?>"><?php endif; ?>
<?php if ($image !== ''): ?><meta property="og:image" content="<?= h(art_abs($image)) ?>">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="<?= h(art_abs($image)) ?>"><?php else: ?><meta name="twitter:card" content="summary"><?php endif; ?>
<meta name="twitter:title" content="<?= h($title) ?>">
<meta name="twitter:description" content="<?= h($desc) ?>">
<?php if (!empty($meta['jsonld'])): ?><script type="application/ld+json"><?= json_encode($meta['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?></script><?php endif; ?>
<link rel="icon" href="<?= h(art_site()['favicon']) ?>">
<link rel="stylesheet" href="/articles/template-vars.css?v=<?= $v ?>">
<link rel="stylesheet" href="/articles/articles.css?v=<?= $v ?>">
<link rel="stylesheet" href="/forms/forms.css?v=<?= $v ?>">
<script src="/articles/articles.js?v=<?= $v ?>"></script>
<script src="/forms/popup.js?v=<?= $v ?>" defer></script>
<script src="/forms/popups.js?v=<?= $v ?>" defer></script>
<script src="/quiz/quiz.js?v=<?= $v ?>" defer></script>
</head>
<body class="<?= h($bodyClass) ?>">
<a class="skip" href="#main">Lewati ke isi</a>
<?php
    art_header($only);
    echo "<main id=\"main\">\n";
}

function art_close(): void
{
    echo "</main>\n";
    art_footer();
    echo "</body>\n</html>\n";
}

function art_header(?array $only): void
{
    $nav = art_seed_social()['nav'] ?? [];
    // menu dari panel (Navbar, set Anak): bagian beranda -> "/#bagian"; kalau dokumen belum ada, memakai bawaan
    try {
        $nb = doc_get('navbar');
        if (is_array($nb['kids']['links'] ?? null)) {
            $nav = [];
            foreach ($nb['kids']['links'] as $l) {
                if (!empty($l['show']) && is_string($l['label'] ?? null) && is_string($l['href'] ?? null) && $l['href'] !== '') {
                    $nav[] = ['label' => $l['label'], 'href' => $l['href']];
                }
            }
        }
    } catch (Throwable) {
    }
    ?>
<header class="top">
  <div class="top-in">
    <a class="logo" href="/" aria-label="<?= h(art_site()['name']) ?>, beranda"><img src="<?= h(art_site()['logoFull']) ?>" alt="<?= h(art_site()['name']) ?>" height="40"></a>
    <nav class="top-nav" aria-label="Navigasi utama">
      <?php foreach ($nav as $l): $hr = (string) $l['href']; $hr = ($hr !== '' && ($hr[0] === '#' && !str_starts_with($hr, '#form:') && !str_starts_with($hr, '#popup:') && !str_starts_with($hr, '#quiz:') || ($hr[0] !== '/' && !preg_match('#^(https?:|\#)#', $hr)))) ? '/' . $hr : $hr; ?><a href="<?= h($hr) ?>"><?= h((string) $l['label']) ?></a><?php endforeach; ?>
      <?php if (!array_filter($nav, static fn($l) => rtrim((string) $l['href'], '/') === '/articles')): ?><a href="/articles/" class="on">Artikel</a><?php endif; ?>
    </nav>
    <div class="top-r">
      <div class="aud" role="group" aria-label="Tampilan">
        <button type="button" data-set="kids">Anak</button><button type="button" data-set="adult">Dewasa</button>
      </div>
      <a class="cta" href="<?= h(trial_link_href(art_site()['waNumber'])) ?>">Free Trial Class</a>
    </div>
  </div>
</header>
<?php
}

/** identitas situs (Pengaturan di panel) dengan nilai bawaan */
function art_site(): array
{
    static $d = null;
    if ($d === null) {
        $d = ['name' => 'English Now', 'tagline' => '', 'waNumber' => '', 'logoFull' => '', 'logoWhite' => '', 'logoMark' => '', 'favicon' => ''];
        try {
            $stored = doc_get('site');
            if (is_array($stored)) {
                foreach ($d as $k => $v) {
                    if (isset($stored[$k]) && is_string($stored[$k]) && $stored[$k] !== '') {
                        $d[$k] = $stored[$k];
                    }
                }
            }
        } catch (Throwable) {
        }
        if ($d['waNumber'] === '') {
            $d['waNumber'] = (string) (art_seed_social()['wa'] ?? '');
        }
        $d['logoFull'] = $d['logoFull'] ?: '/brand/logo-full.png';
        $d['logoWhite'] = $d['logoWhite'] ?: '/brand/logo-full-white.png';
        $d['logoMark'] = $d['logoMark'] ?: '/brand/logo-mark.png';
        $d['favicon'] = $d['favicon'] ?: '/icon.png';
    }
    return $d;
}

function art_seed_social(): array
{
    static $d = null;
    if ($d === null) {
        $f = dirname(__DIR__) . '/edizon/lib/seed/social.json';
        $d = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
    }
    return $d;
}

function art_footer(): void
{
    $f = null;
    try {
        $f = doc_get('footer');
    } catch (Throwable) {
    }
    $f = is_array($f) ? $f : seed_doc('footer');
    $seed = art_seed_social();
    $icons = $seed['icons'] ?? [];
    $wa = 'https://wa.me/' . art_site()['waNumber'] . '?text=' . rawurlencode((string) ($f['waMessage'] ?? ''));
    $labels = [];
    foreach (EXPLORE_SECTIONS as $k => $v) {
        $labels[is_array($v) ? (string) $v['id'] : (string) $k] = true;
    }
    ?>
<footer class="foot">
  <div class="foot-in">
    <div class="foot-brand">
      <img src="<?= h(art_site()['logoWhite']) ?>" alt="<?= h(art_site()['name']) ?>" height="40">
      <p><?= h((string) ($f['blurb'] ?? '')) ?></p>
      <ul class="social">
        <?php foreach ((array) ($f['social'] ?? []) as $s):
            $kind = (string) ($s['kind'] ?? '');
            $url = (string) ($s['url'] ?? '');
            if ($url === '') { continue; } ?>
        <li><a href="<?= h($url) ?>" target="_blank" rel="noopener noreferrer" aria-label="<?= h((string) ($s['name'] ?? $kind)) ?>">
          <?php if ($kind === 'custom' && ($s['icon'] ?? '') !== ''): ?><img src="<?= h((string) $s['icon']) ?>" alt="" width="20" height="20">
          <?php elseif (isset($icons[$kind])): ?><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="<?= h((string) $icons[$kind]) ?>"/></svg>
          <?php else: ?><span><?= h(mb_substr((string) ($s['name'] ?? '?'), 0, 2)) ?></span><?php endif; ?></a></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <div>
      <h2><?= h((string) ($f['programTitle'] ?? 'Program')) ?></h2>
      <ul>
        <?php foreach ((array) ($f['program'] ?? []) as $p):
            $aud = (string) ($p['audience'] ?? 'keep');
            $q = $aud === 'kids' ? '?for=kids' : ($aud === 'adult' ? '?for=adult' : ''); ?>
        <li><a href="/<?= $q ?>#biaya"><?= h((string) ($p['label'] ?? '')) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <div>
      <h2><?= h((string) ($f['exploreTitle'] ?? 'Jelajahi')) ?></h2>
      <ul>
        <?php foreach ((array) ($f['explore'] ?? []) as $e):
            $id = (string) ($e['id'] ?? '');
            $lab = (string) ($e['label'] ?? '');
            if ($lab === '' || !isset($labels[$id])) { continue; } ?>
        <li><a href="/#<?= h($id) ?>"><?= h($lab) ?></a></li>
        <?php endforeach; ?>
        <li><a href="/articles/">Artikel</a></li>
      </ul>
    </div>
    <div>
      <h2><?= h((string) ($f['contactTitle'] ?? 'Kontak')) ?></h2>
      <ul>
        <li><a href="<?= h($wa) ?>" target="_blank" rel="noopener noreferrer"><?= h((string) ($f['waLabel'] ?? 'WhatsApp')) ?></a></li>
        <?php if (($f['email'] ?? '') !== ''): ?><li><a href="mailto:<?= h((string) $f['email']) ?>"><?= h((string) $f['email']) ?></a></li><?php endif; ?>
        <?php if (($f['addressLabel'] ?? '') !== ''): ?><li><?php if (($f['addressUrl'] ?? '') !== ''): ?><a href="<?= h((string) $f['addressUrl']) ?>" target="_blank" rel="noopener noreferrer"><?= h((string) $f['addressLabel']) ?></a><?php else: ?><?= h((string) $f['addressLabel']) ?><?php endif; ?></li><?php endif; ?>
        <?php if (($f['hours'] ?? '') !== ''): ?><li><?= h((string) $f['hours']) ?></li><?php endif; ?>
      </ul>
    </div>
  </div>
  <p class="copy">© <?= date('Y') ?> <?= h(art_site()['name']) ?></p>
</footer>
<?php
}

/** satu kartu artikel untuk daftar & saran */
function art_card(array $a, bool $big = false): void
{
    $aud = implode(' ', $a['audiences']);
    $url = '/articles/' . rawurlencode((string) $a['slug']);
    ?>
<article class="card<?= $big ? ' card-big' : '' ?>" data-aud="<?= h($aud) ?>">
  <a class="card-img" href="<?= h($url) ?>" tabindex="-1" aria-hidden="true"><img src="<?= h((string) $a['hero']) ?>" alt="" loading="lazy"></a>
  <div class="card-body">
    <?php if (!empty($a['category_name'])): ?><a class="chip" href="/articles/?category=<?= h((string) $a['category_slug']) ?>"><?= h((string) $a['category_name']) ?></a><?php endif; ?>
    <h3><a href="<?= h($url) ?>"><?= h((string) $a['title']) ?></a></h3>
    <?php if ($a['excerpt'] !== ''): ?><p><?= h((string) $a['excerpt']) ?></p><?php endif; ?>
    <p class="meta"><?= h(art_author($a)) ?> · <?= h(art_date($a['published_at'])) ?></p>
  </div>
</article>
<?php
}

/** saran artikel: per tampilan, 3 teratas (kategori/tag yang sama lebih dulu, lalu terbaru) */
function art_suggestions(array $cur): array
{
    $all = art_published(['exclude' => (int) $cur['id']], 200);
    $tagSet = array_column($cur['tags'], 'slug');
    $score = static function (array $a) use ($cur, $tagSet): int {
        $s = 0;
        if (!empty($cur['category_id']) && (int) $a['category_id'] === (int) $cur['category_id']) {
            $s += 3;
        }
        $s += count(array_intersect($tagSet, array_column($a['tags'], 'slug')));
        return $s;
    };
    $picked = [];
    foreach (['kids', 'adult'] as $aud) {
        $pool = array_values(array_filter($all, static fn($a) => in_array($aud, $a['audiences'], true)));
        usort($pool, static fn($x, $y) => [$score($y), $y['published_at']] <=> [$score($x), $x['published_at']]);
        foreach (array_slice($pool, 0, 3) as $a) {
            $picked[(int) $a['id']] = $a;
        }
    }
    return array_values($picked);
}
