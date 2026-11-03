<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';
$base = art_base_url();
$x = static fn(string $s): string => htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$xml = seo_cached('sitemap', static function (string $tok) use ($x): string {
    $s = seo_settings();
    $sm = $s['sitemap'];
    $urls = [];
    if (!empty($s['allowIndexing'])) {
        if ($sm['home']) {
            $urls[] = [$tok . '/', null];
        }
        if ($sm['list']) {
            $urls[] = [$tok . '/articles/', null];
        }
        if ($sm['articles']) {
            foreach (seo_public_articles() as $a) {
                if (($a['seo']['canonical'] ?? '') === '') { // canonical ke situs lain: tidak dimasukkan
                    $urls[] = [$tok . '/articles/' . $a['slug'], gmdate('Y-m-d', (int) strtotime((string) $a['updated_at'] . ' UTC'))];
                }
            }
        }
        foreach (seo_public_forms() as $f) {
            if (in_array($f['slug'], $sm['forms'], true)) {
                $urls[] = [$tok . '/form/' . $f['slug'], gmdate('Y-m-d', (int) strtotime((string) $f['updated_at'] . ' UTC'))];
            }
        }
    }
    $o = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach ($urls as [$u, $m]) {
        $o .= '  <url><loc>' . $x($u) . '</loc>' . ($m ? '<lastmod>' . $m . '</lastmod>' : '') . "</url>\n";
    }
    return $o . "</urlset>\n";
});
seo_text(str_replace('__BASE__', $base, $xml), 'application/xml');
