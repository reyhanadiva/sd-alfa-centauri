<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';
$s = seo_settings();
$base = art_base_url();
$out = seo_cached('robots', static function (string $tok) use ($s): string {
    if (empty($s['allowIndexing'])) {
        return "# Situs ini belum dibuka untuk mesin pencari.\nUser-agent: *\nDisallow: /\n";
    }
    // Sengaja tanpa baris Disallow untuk folder panel/api: robots.txt bersifat publik dan tidak melindungi apa pun.
    // Panel dilindungi login dan header noindex; halaman yang tidak boleh muncul memakai noindex (bukan Disallow),
    // karena halaman yang diblokir tidak bisa dibaca crawler sehingga noindex-nya tidak terlihat.
    $o = "# robots.txt dibuat otomatis (panel > SEO & AI)\nUser-agent: *\nAllow: /\n\n";
    foreach (seo_ai_bots() as $cat => $bots) {
        $flag = ['search' => 'aiSearch', 'user' => 'aiUser', 'training' => 'aiTraining'][$cat];
        foreach ($bots as $bot) {
            $o .= "User-agent: $bot\n" . ($s[$flag] ? "Allow: /\n" : "Disallow: /\n") . "\n";
        }
    }
    return $o . "Sitemap: $tok/sitemap.xml\n";
}, 300);
if ($base === '') {
    $out = preg_replace('/^Sitemap: .*\n/m', '', $out);
}
seo_text(str_replace('__BASE__', $base, $out), 'text/plain');
