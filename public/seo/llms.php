<?php
/** llms.txt (ringkasan situs untuk asisten AI, format llmstxt.org) dan llms-full.txt (isi lengkap artikel). Hasil disimpan sementara (cache). */
declare(strict_types=1);
require __DIR__ . '/_boot.php';
$full = ($_GET['full'] ?? '') === '1';
$base = art_base_url();
if (!seo_index_allowed()) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Not found\n");
}
$o = seo_cached($full ? 'llms-full' : 'llms', static function (string $tok) use ($full): string {
    $s = seo_settings();
    $abs = static fn(string $u): string => preg_match('#^https?://#i', $u) ? $u : $tok . '/' . ltrim($u, '/');
    $name = art_site()['name'];
    $summary = $s['summary'] !== '' ? $s['summary'] : art_site()['tagline'];
    $o = "# $name\n\n" . ($summary !== '' ? "> $summary\n\n" : '');
    if (!$full) {
        $o .= "## Halaman utama\n\n- [Beranda]($tok/): program kursus, pengajar, harga, lokasi, dan cara mendaftar\n";
        foreach ($s['links'] as $l) {
            $o .= '- [' . $l['label'] . '](' . $abs($l['url']) . ')' . ($l['desc'] !== '' ? ': ' . $l['desc'] : '') . "\n";
        }
        $arts = seo_public_articles();
        if ($arts) {
            $o .= "\n## Artikel\n\n";
            foreach ($arts as $a) {
                $d = $a['seo']['description'] !== '' ? $a['seo']['description'] : ($a['excerpt'] !== '' ? $a['excerpt'] : $a['subtitle']);
                $o .= '- [' . $a['title'] . '](' . $tok . '/articles/' . $a['slug'] . ')' . ($d !== '' ? ': ' . str_replace("\n", ' ', $d) : '') . "\n";
            }
        }
        return $o . "\n## Opsional\n\n- [Seluruh isi artikel dalam satu berkas]($tok/llms-full.txt)\n";
    }
    foreach (seo_public_articles() as $a) {
        $blocks = json_decode((string) $a['body'], true);
        $o .= '## ' . $a['title'] . "\n\nSumber: $tok/articles/" . $a['slug'] . "\nPenulis: " . art_author($a) . ($a['published_at'] ? "\nDiterbitkan: " . gmdate('Y-m-d', (int) strtotime($a['published_at'] . ' UTC')) : '') . "\nDiperbarui: " . gmdate('Y-m-d', (int) strtotime($a['updated_at'] . ' UTC')) . "\n\n" . art_blocks_markdown(is_array($blocks) ? $blocks : []) . "\n\n---\n\n";
    }
    return $o;
});
seo_text(str_replace('__BASE__', $base, $o), 'text/plain');
