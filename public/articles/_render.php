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
<html lang="id" data-audience="adult">
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
    // menu dari panel (Navbar, Bahasa Indonesia); bagian beranda "#program" -> "/#program". Dokumen belum ada = isi bawaan.
    $nav = [];
    $nb = art_doc('navbar');
    foreach ((array) ($nb['id']['nav'] ?? []) as $l) {
        if (is_string($l['label'] ?? null) && is_string($l['href'] ?? null) && $l['href'] !== '') {
            $nav[] = ['label' => $l['label'], 'href' => $l['href']];
        }
    }
    [$ctaLabel, $ctaHref] = art_cta();
    ?>
<header class="top">
  <div class="top-in">
    <a class="logo" href="/" aria-label="<?= h(art_site()['name']) ?>, beranda"><img src="<?= h(art_site()['logoFull']) ?>" alt="<?= h(art_site()['name']) ?>" height="40"></a>
    <nav class="top-nav" aria-label="Navigasi utama">
      <?php foreach ($nav as $l): $hr = (string) $l['href']; $hr = ($hr[0] === '#' && !preg_match('/^#(form|popup|quiz):/', $hr)) ? '/' . $hr : $hr; ?><a href="<?= h($hr) ?>"><?= h((string) $l['label']) ?></a><?php endforeach; ?>
      <a href="/articles/" class="on">Artikel</a>
    </nav>
    <div class="top-r">
      <a class="cta" href="<?= h($ctaHref) ?>"><?= h($ctaLabel) ?></a>
    </div>
  </div>
</header>
<?php
}

/** dokumen panel dengan cadangan isi bawaan (seed) */
function art_doc(string $key): array
{
    $d = null;
    try {
        $d = doc_get($key);
    } catch (Throwable) {
    }
    return is_array($d) ? $d : seed_doc($key);
}

/** tombol ajakan di kepala halaman: [tulisan, tujuan] */
function art_cta(): array
{
    $nb = art_doc('navbar');
    $label = (string) ($nb['id']['ui']['register'] ?? 'Daftar SPMB');
    $wa = art_site()['waNumber'];
    $href = $wa !== '' ? 'https://wa.me/' . $wa . '?text=' . rawurlencode('Halo ' . art_site()['name'] . ', saya ingin bertanya tentang SPMB.') : '/';
    return [$label, $href];
}

/** identitas situs (Pengaturan di panel) dengan nilai bawaan */
function art_site(): array
{
    static $d = null;
    if ($d === null) {
        $d = ['name' => 'SD Alfa Centauri', 'tagline' => '', 'waNumber' => '', 'logoFull' => '', 'logoWhite' => '', 'logoMark' => '', 'favicon' => ''];
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
            $d['waNumber'] = (string) (seed_doc('site')['waNumber'] ?? '');
        }
        $d['logoFull'] = $d['logoFull'] ?: '/images/logo-horizontal.png';
        $d['logoWhite'] = $d['logoWhite'] ?: '/images/logo-horizontal-white.png';
        $d['logoMark'] = $d['logoMark'] ?: '/images/logo-star.png';
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
    $site = art_site();
    $lok = art_doc('lokasi');
    $cl = art_doc('closing');
    $info = (array) ($lok['shared']['site'] ?? []);
    $c = (array) ($cl['id']['closing'] ?? []);
    $wa = $site['waNumber'] !== '' ? 'https://wa.me/' . $site['waNumber'] : '';
    ?>
<footer class="foot">
  <div class="foot-in">
    <div class="foot-brand">
      <img src="<?= h($site['logoWhite']) ?>" alt="<?= h($site['name']) ?>" height="40">
      <p><?= h((string) ($c['about'] ?? $site['tagline'])) ?></p>
      <?php if (!empty($info['instagram'])): ?>
      <ul class="social">
        <li><a href="<?= h((string) $info['instagram']) ?>" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/></svg></a></li>
      </ul>
      <?php endif; ?>
    </div>
    <div>
      <h2><?= h((string) ($c['explore'] ?? 'Jelajahi')) ?></h2>
      <ul>
        <?php foreach ((array) ($c['explorer'] ?? []) as $e):
            $lab = (string) ($e[0] ?? '');
            $hr = (string) ($e[1] ?? '');
            if ($lab === '' || $hr === '') { continue; }
            $hr = $hr[0] === '#' ? '/' . $hr : $hr; ?>
        <li><a href="<?= h($hr) ?>"><?= h($lab) ?></a></li>
        <?php endforeach; ?>
        <li><a href="/articles/">Artikel</a></li>
      </ul>
    </div>
    <div>
      <h2><?= h((string) ($c['visit'] ?? 'Kontak')) ?></h2>
      <ul>
        <?php if (!empty($info['phone'])): ?><li><a href="<?= h((string) ($info['phoneHref'] ?? '#')) ?>"><?= h((string) $info['phone']) ?></a></li><?php endif; ?>
        <?php if ($wa !== ''): ?><li><a href="<?= h($wa) ?>" target="_blank" rel="noopener noreferrer">WhatsApp <?= h((string) ($info['whatsappDisplay'] ?? '')) ?></a></li><?php endif; ?>
        <?php if (!empty($info['email'])): ?><li><a href="mailto:<?= h((string) $info['email']) ?>"><?= h((string) $info['email']) ?></a></li><?php endif; ?>
        <?php if (!empty($info['address'])): ?><li><?= h((string) $info['address']) ?></li><?php endif; ?>
      </ul>
    </div>
  </div>
  <p class="copy">© <?= date('Y') ?> <?= h($site['name']) ?></p>
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
