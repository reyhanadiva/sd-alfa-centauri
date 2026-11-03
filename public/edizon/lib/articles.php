<?php
/**
 * Artikel: tabel, validasi, pembersih teks, pembuat HTML artikel, kueri.
 * Dipakai bersama oleh panel (edizon/) dan halaman publik (articles/).
 * Isi artikel disimpan sebagai daftar BLOK (JSON), bukan HTML mentah, jadi tampilannya selalu sesuai desain situs
 * dan tidak ada skrip yang bisa diselipkan. SATU pengecualian: blok html (kode buatan Admin). Kodenya TIDAK pernah ditulis ke halaman artikel;
 * ia disajikan oleh halaman tersendiri (articles/frame.php, edizon/article-frame.php) dengan kebijakan keamanan sendiri dan hanya tampil
 * lewat <iframe sandbox> tanpa allow-same-origin, jadi tidak bisa membaca halaman artikel, sesi login, atau data situs.
 *
 * Jenis blok: h, text (teks kaya dari editor), img, columns (berisi daftar blok, satu tingkat), cards (2-4 kartu per baris),
 * table (tabel sederhana), button, quote, callout, faq, video, embed, html (HANYA Admin), hr.
 * Jenis lama p (paragraf) dan ul (daftar) tetap bisa dibaca dan ditampilkan; editor mengubahnya jadi "text".
 * Setiap blok punya id pendek. Teks kaya hanya boleh: p, h2-h4, ul, ol, li, strong, em, u, s, a, br, dan span/p/h dengan
 * nama kelas dari daftar resmi (ukuran fs-*, huruf ff-*, rata ta-*). Tidak ada atribut style.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const ART_MAX_BLOCKS = 250; // termasuk blok di dalam kolom
const ART_RICH_MAX = 20000;  // huruf (tanpa tag) per blok teks
const ART_IMG_RATIOS = ['4:3', '1:1', '16:9', '3:4', '3:2'];
const ART_COL_RATIOS = ['1-1', '1-2', '2-1'];
/** kelas yang boleh ada di teks kaya (harus sama dengan editor dan articles.css) */
const ART_FONT_SIZES = ['sm', 'lg', 'xl', 'display'];
const ART_FONT_KEYS = ['jakarta', 'lilita', 'kite', 'nunito', 'poppins', 'montserrat', 'fredoka', 'lora', 'playfair'];
const ART_ALIGNS = ['center', 'right', 'justify'];
/** blok kartu dan tabel (batas harus sama dengan editor) */
const ART_CARDS_MAX = 12;           // kartu per blok
const ART_CARDS_PER = [2, 3, 4];    // kartu per baris
const ART_TABLE_COLS = 8;
const ART_TABLE_ROWS = 30;
const ART_CELL_MAX = 300;           // huruf per sel
const ART_TABLE_ALIGNS = ['left', 'center', 'right'];
const ART_MAX_TAGS = 8;
/** blok html: kode buatan Admin yang tampil di bingkai terisolasi (batas harus sama dengan editor) */
const ART_HTML_MAX = 300000;         // huruf kode per blok (satu halaman web utuh biasanya 50.000 sampai 150.000)
const ART_HTML_HEIGHTS = ['auto', 'm', 'l', 'xl', 'vh']; // vh = setinggi layar (untuk halaman yang memakai 100vh)
/** domain yang boleh dipasang sebagai "embed" oleh Editor; Admin boleh domain apa pun (https) */
const ART_EMBED_HOSTS = [
    'youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'google.com', 'docs.google.com', 'drive.google.com', 'forms.gle',
    'open.spotify.com', 'spotify.com', 'soundcloud.com', 'canva.com', 'figma.com', 'padlet.com', 'wordwall.net', 'quizlet.com',
    'kahoot.it', 'genial.ly', 'view.genially.com', 'codepen.io', 'openstreetmap.org', 'instagram.com', 'tiktok.com', 'facebook.com',
];

/* ------------------------------------------------------------------ */
/* Tabel                                                               */
/* ------------------------------------------------------------------ */

function en_create_articles_tables(PDO $pdo): void
{
    $opt = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo->exec("CREATE TABLE IF NOT EXISTS article_categories (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(60) NOT NULL,
        slug VARCHAR(80) NOT NULL,
        UNIQUE KEY uq_acat_name (name),
        UNIQUE KEY uq_acat_slug (slug)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS article_tags (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(40) NOT NULL,
        slug VARCHAR(60) NOT NULL,
        UNIQUE KEY uq_atag_name (name),
        UNIQUE KEY uq_atag_slug (slug)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS articles (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(120) NOT NULL,
        title VARCHAR(160) NOT NULL,
        subtitle VARCHAR(300) NOT NULL DEFAULT '',
        excerpt VARCHAR(220) NOT NULL DEFAULT '',
        hero VARCHAR(300) NOT NULL DEFAULT '',
        author VARCHAR(80) NOT NULL DEFAULT '',
        category_id INT UNSIGNED NULL,
        audiences VARCHAR(20) NOT NULL DEFAULT 'kids,adult',
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        is_sample TINYINT(1) NOT NULL DEFAULT 0,
        body MEDIUMTEXT NOT NULL,
        published_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        created_by INT UNSIGNED NULL,
        updated_by INT UNSIGNED NULL,
        UNIQUE KEY uq_art_slug (slug),
        KEY ix_art_pub (status, published_at),
        KEY ix_art_cat (category_id)
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS article_seo (
        article_id INT UNSIGNED NOT NULL PRIMARY KEY,
        data TEXT NOT NULL
    ) $opt");
    $pdo->exec("CREATE TABLE IF NOT EXISTS article_tag_map (
        article_id INT UNSIGNED NOT NULL,
        tag_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (article_id, tag_id),
        KEY ix_atm_tag (tag_id)
    ) $opt");
}

/* ------------------------------------------------------------------ */
/* Pembantu teks                                                       */
/* ------------------------------------------------------------------ */

function art_slugify(string $s, int $max = 80): string
{
    $s = trim($s);
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if (is_string($t) && $t !== '') {
            $s = $t;
        }
    }
    $s = strtolower($s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    $s = trim($s, '-');
    if (strlen($s) > $max) {
        $s = rtrim(substr($s, 0, $max), '-');
        $cut = strrpos($s, '-');
        if ($cut !== false && $cut > $max * 0.6) {
            $s = substr($s, 0, $cut);
        }
    }
    return $s;
}

function art_plain_len(string $html): int
{
    return mb_strlen(html_entity_decode(strip_tags(str_replace('<br>', ' ', $html)), ENT_QUOTES, 'UTF-8'));
}

/** teks paragraf: hanya tebal, miring, garis bawah, coret, kode, tautan, dan baris baru yang dipertahankan */
function art_inline(string $html, int $max = 3000): string
{
    $html = trim($html);
    if ($html === '' || strlen($html) > $max * 6) {
        return '';
    }
    $doc = new DOMDocument('1.0', 'UTF-8');
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8"><div id="r">' . $html . '</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    $root = $doc->getElementById('r');
    if (!$root) {
        return '';
    }
    $out = art_inline_walk($root);
    $out = preg_replace('/(<br>\s*){3,}/', '<br><br>', $out) ?? $out;
    $out = preg_replace('/^(\s*<br>)+|(<br>\s*)+$/', '', $out) ?? $out;
    $out = trim($out);
    return art_plain_len($out) > $max ? '' : $out;
}

function art_inline_walk(DOMNode $n, bool $rich = false): string
{
    $out = '';
    foreach ($n->childNodes as $c) {
        $out .= art_inline_node($c, $rich);
    }
    return $out;
}

/** satu simpul teks/inline. $rich = true: <span> dengan kelas ukuran/huruf resmi dipertahankan (teks kaya dari editor) */
function art_inline_node(DOMNode $c, bool $rich = false): string
{
    if ($c->nodeType === XML_TEXT_NODE) {
        return htmlspecialchars(str_replace("\u{00A0}", ' ', (string) $c->nodeValue), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
    if ($c->nodeType !== XML_ELEMENT_NODE) {
        return '';
    }
    $tag = strtolower($c->nodeName);
    if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'head', 'title'], true)) {
        return '';
    }
    $inner = art_inline_walk($c, $rich);
    switch ($tag) {
        case 'b':
        case 'strong':
            return trim($inner) === '' ? $inner : "<strong>$inner</strong>";
        case 'i':
        case 'em':
            return trim($inner) === '' ? $inner : "<em>$inner</em>";
        case 'u':
            return trim($inner) === '' ? $inner : "<u>$inner</u>";
        case 's':
        case 'strike':
        case 'del':
            return trim($inner) === '' ? $inner : "<s>$inner</s>";
        case 'code':
            return trim($inner) === '' ? $inner : "<code>$inner</code>";
        case 'br':
            return '<br>';
        case 'a':
            $href = safe_url((string) ($c instanceof DOMElement ? $c->getAttribute('href') : ''));
            if ($href !== null && trim($inner) !== '') {
                $ext = (bool) preg_match('#^(https?:)?//#i', $href);
                return '<a href="' . htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '"' . ($ext ? ' target="_blank" rel="noopener noreferrer"' : '') . '>' . $inner . '</a>';
            }
            return $inner;
        case 'span':
            if ($rich) {
                $cls = art_rich_classes($c, ['fs', 'ff']);
                return ($cls !== '' && trim($inner) !== '') ? '<span class="' . $cls . '">' . $inner . '</span>' : $inner;
            }
            return $inner;
        case 'div':
        case 'p':
        case 'li':
            return $inner . '<br>';
        default:
            return $inner;
    }
}

/**
 * isi sel tabel: teks biasa dengan tebal, miring, tautan, dan baris baru saja (tanpa garis bawah, coret, atau kode).
 * Hasilnya stabil: dibersihkan dua kali sama dengan sekali. Batas huruf diperiksa oleh pemanggil.
 */
function art_cell(string $html): string
{
    $s = art_inline($html, ART_CELL_MAX * 4);
    return trim(preg_replace('#</?(?:u|s|code)>#', '', $s) ?? $s);
}

/** isi sel (HTML hasil art_cell) sebagai Markdown satu baris: **tebal**, *miring*, [teks](alamat) */
function art_cell_md(string $html): string
{
    $s = str_replace('<br>', ' ', $html);
    $s = preg_replace('#<strong>(.*?)</strong>#s', '**$1**', $s) ?? $s;
    $s = preg_replace('#<em>(.*?)</em>#s', '*$1*', $s) ?? $s;
    $s = preg_replace_callback('#<a href="([^"]*)"[^>]*>(.*?)</a>#s', static fn(array $m): string => '[' . $m[2] . '](' . html_entity_decode($m[1], ENT_QUOTES, 'UTF-8') . ')', $s) ?? $s;
    return trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($s), ENT_QUOTES, 'UTF-8')));
}

/** kelas resmi pada sebuah elemen: kinds = fs (ukuran), ff (huruf), ta (rata). Kelas lain dibuang. */
function art_rich_classes(DOMNode $el, array $kinds): string
{
    if (!($el instanceof DOMElement)) {
        return '';
    }
    $have = preg_split('/\s+/', trim($el->getAttribute('class'))) ?: [];
    $out = [];
    foreach ($kinds as $k) {
        $allowed = match ($k) {
            'fs' => ART_FONT_SIZES,
            'ff' => ART_FONT_KEYS,
            default => ART_ALIGNS,
        };
        foreach ($have as $cl) {
            if (str_starts_with($cl, $k . '-') && in_array(substr($cl, strlen($k) + 1), $allowed, true)) {
                $out[] = $cl;
                break;
            }
        }
    }
    return implode(' ', $out);
}

/**
 * Teks kaya dari editor (blok "text"): paragraf, judul H2-H4, daftar poin/nomor (boleh bersarang), dan teks bergaya.
 * Semua yang lain dibuang atau diubah jadi paragraf. Hasilnya stabil: membersihkan hasil pembersihan tidak mengubah apa pun.
 */
function art_rich(string $html): string
{
    $html = trim($html);
    if ($html === '') {
        return '';
    }
    $doc = new DOMDocument('1.0', 'UTF-8');
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8"><div id="r">' . $html . '</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    $root = $doc->getElementById('r');
    return $root ? trim(art_rich_blocks($root, 0)) : '';
}

function art_rich_inner(string $inner): string
{
    $inner = preg_replace('/(<br>\s*){3,}/', '<br><br>', $inner) ?? $inner;
    $inner = preg_replace('/^(\s*<br>)+|(<br>\s*)+$/', '', $inner) ?? $inner;
    return trim($inner);
}

function art_rich_blocks(DOMNode $parent, int $depth): string
{
    $out = '';
    $loose = '';
    $flush = static function () use (&$out, &$loose): void {
        $t = art_rich_inner($loose);
        if ($t !== '' && art_plain_len($t) > 0) {
            $out .= '<p>' . $t . '</p>';
        }
        $loose = '';
    };
    foreach ($parent->childNodes as $c) {
        if ($c->nodeType === XML_TEXT_NODE) {
            $loose .= art_inline_node($c, true);
            continue;
        }
        if ($c->nodeType !== XML_ELEMENT_NODE) {
            continue;
        }
        $tag = strtolower($c->nodeName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'head', 'title'], true)) {
            continue;
        }
        switch ($tag) {
            case 'p':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                $flush();
                $inner = art_rich_inner(art_inline_walk($c, true));
                if ($inner === '' || art_plain_len($inner) === 0) {
                    break;
                }
                $name = $tag === 'p' ? 'p' : ($tag === 'h1' ? 'h2' : (in_array($tag, ['h5', 'h6'], true) ? 'h4' : $tag));
                if ($parent->nodeName === 'li' && $name !== 'p') {
                    $name = 'p'; // titik daftar tidak berisi judul
                }
                $cls = art_rich_classes($c, ['ta']);
                $out .= "<$name" . ($cls !== '' ? " class=\"$cls\"" : '') . ">$inner</$name>";
                break;
            case 'ul':
            case 'ol':
                if ($depth >= 3) {
                    $flush();
                    $out .= art_rich_blocks($c, $depth); // terlalu dalam: jadikan paragraf biasa
                    break;
                }
                $flush();
                $items = '';
                foreach ($c->childNodes as $li) {
                    if ($li->nodeType === XML_ELEMENT_NODE && strtolower($li->nodeName) === 'li') {
                        $x = art_rich_blocks($li, $depth + 1);
                        if ($x !== '') {
                            $items .= "<li>$x</li>";
                        }
                    } elseif ($li->nodeType === XML_TEXT_NODE && trim((string) $li->nodeValue) !== '') {
                        $items .= '<li><p>' . art_inline_node($li, true) . '</p></li>';
                    }
                }
                if ($items !== '') {
                    $out .= "<$tag>$items</$tag>";
                }
                break;
            case 'div':
            case 'li':
            case 'blockquote':
            case 'section':
            case 'article':
            case 'header':
            case 'footer':
            case 'figure':
            case 'figcaption':
            case 'pre':
            case 'table':
            case 'thead':
            case 'tbody':
            case 'tr':
            case 'td':
            case 'th':
                $flush();
                $out .= art_rich_blocks($c, $depth);
                break;
            default:
                $loose .= art_inline_node($c, true);
        }
    }
    $flush();
    return $out;
}

/* ------------------------------------------------------------------ */
/* Video & embed                                                       */
/* ------------------------------------------------------------------ */

/** @return array{kind:string, src:string}|null  kind: youtube|vimeo|file */
function art_video_info(string $url): ?array
{
    $url = trim($url);
    if (!preg_match('#^https://#i', $url) || preg_match('/\s/', $url) || strlen($url) > 300) {
        return null;
    }
    $p = parse_url($url);
    if (!$p || empty($p['host'])) {
        return null;
    }
    $host = strtolower(preg_replace('/^www\./', '', (string) $p['host']) ?? '');
    $path = (string) ($p['path'] ?? '');
    parse_str((string) ($p['query'] ?? ''), $q);
    $yt = null;
    if ($host === 'youtu.be') {
        $yt = trim($path, '/');
    } elseif (in_array($host, ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'], true)) {
        if ($path === '/watch') {
            $yt = (string) ($q['v'] ?? '');
        } elseif (preg_match('#^/(?:embed|shorts|live)/([A-Za-z0-9_-]{6,20})#', $path, $m)) {
            $yt = $m[1];
        }
    }
    if ($yt !== null && preg_match('/^[A-Za-z0-9_-]{6,20}$/', $yt)) {
        return ['kind' => 'youtube', 'src' => 'https://www.youtube-nocookie.com/embed/' . $yt];
    }
    if (in_array($host, ['vimeo.com', 'player.vimeo.com'], true) && preg_match('#/(\d{5,12})(?:/|$)#', $path, $m)) {
        return ['kind' => 'vimeo', 'src' => 'https://player.vimeo.com/video/' . $m[1]];
    }
    if (preg_match('#\.(mp4|webm)$#i', $path)) {
        return ['kind' => 'file', 'src' => $url];
    }
    return null;
}

function art_embed_allowed(string $url, bool $admin): bool
{
    $p = parse_url($url);
    if (!$p || empty($p['host']) || strtolower((string) ($p['scheme'] ?? '')) !== 'https') {
        return false;
    }
    if ($admin) {
        return true;
    }
    $host = strtolower((string) $p['host']);
    foreach (ART_EMBED_HOSTS as $h) {
        if ($host === $h || str_ends_with($host, '.' . $h)) {
            return true;
        }
    }
    return false;
}

/* ------------------------------------------------------------------ */
/* Validasi blok & artikel                                             */
/* ------------------------------------------------------------------ */

/** {variabel} diganti "x", supaya tujuan tombol yang memuat variabel tetap bisa diperiksa bentuknya */
function art_swap_vars(string $u): string
{
    return (string) preg_replace('/\{[A-Za-z][A-Za-z0-9_.]{0,48}(?:\|[^{}]{0,40})?\}/', 'x', $u);
}

/** id blok: huruf kecil/angka 4-12 karakter dan unik; kalau tidak valid dibuatkan yang baru */
function art_block_id(mixed $v, array &$used): string
{
    $id = is_string($v) && preg_match('/^[a-z0-9]{4,12}$/', $v) ? $v : '';
    while ($id === '' || isset($used[$id])) {
        $id = substr(bin2hex(random_bytes(4)), 0, 6);
    }
    $used[$id] = true;
    return $id;
}

/**
 * Memeriksa daftar blok (termasuk blok di dalam kolom). Blok kosong dibuang diam-diam; kesalahan nyata dilaporkan.
 * @return array{0: array, 1: string[]}
 */
/**
 * @param array<string,string> $prior  id blok html yang SUDAH tersimpan => sidik jari kodenya (supaya Editor boleh membiarkannya apa adanya)
 * @param array<string,mixed>  $o      pilihan untuk pemakai lain (pop-up dan halaman hasil kuis memakai himpunan blok yang sama):
 *   max   jumlah blok maksimal (bawaan ART_MAX_BLOCKS)     what  kata untuk pesan ("artikel", "pop-up", "halaman hasil")
 *   popup rata/ukuran/lebar tombol khusus pop-up           vars  tujuan tautan boleh memuat {variabel}
 *   link  fn(string): ?string, pemeriksa tujuan tombol (bawaan safe_url)
 *   hook  fn(string $t, array $b, string $id, string $lab, int $depth, array &$errors): ?array  dipanggil lebih dulu untuk tiap blok;
 *         null = lanjutkan seperti biasa, array = blok hasil (boleh kosong)
 */
function art_validate_blocks(mixed $raw, bool $admin, array $prior = [], array $o = []): array
{
    $errors = [];
    $count = 0;
    $used = [];
    $out = art_validate_list($raw, $admin, 0, $count, $used, $errors, '', $prior, $o);
    return [$out, $errors];
}

function art_validate_list(mixed $raw, bool $admin, int $depth, int &$count, array &$used, array &$errors, string $where, array $prior = [], array $o = []): array
{
    $rows = is_array($raw) ? array_values($raw) : [];
    $out = [];
    $max = (int) ($o['max'] ?? ART_MAX_BLOCKS);
    $popup = !empty($o['popup']);
    $vars = !empty($o['vars']);
    $link = isset($o['link']) && is_callable($o['link']) ? $o['link'] : 'safe_url';
    $hook = isset($o['hook']) && is_callable($o['hook']) ? $o['hook'] : null;
    $alignOf = static fn(array $b): string => in_array($b['align'] ?? '', ['left', 'center', 'right'], true) ? (string) $b['align'] : 'left';
    foreach ($rows as $i => $b) {
        if (++$count > $max) {
            $msg = 'Isi ' . ($o['what'] ?? 'artikel') . ' maksimal ' . $max . ' blok (blok di dalam kolom ikut dihitung).';
            if (!in_array($msg, $errors, true)) {
                $errors[] = $msg;
            }
            break;
        }
        $lab = $where === '' ? 'Blok ' . ($i + 1) : $where . ', blok ' . ($i + 1);
        $b = is_array($b) ? $b : [];
        $t = (string) ($b['t'] ?? '');
        $id = art_block_id($b['id'] ?? '', $used);
        if ($hook !== null) {
            $made = $hook($t, $b, $id, $lab, $depth, $errors);
            if (is_array($made)) {
                foreach ($made as $x) {
                    $out[] = $x;
                }
                continue;
            }
        }
        switch ($t) {
            case 'h':
                $text = clean_text($b['text'] ?? '', 150);
                if ($text === '') {
                    break;
                }
                $lv = (int) ($b['level'] ?? 2);
                $hb = ['id' => $id, 't' => 'h', 'level' => $lv >= 2 && $lv <= 4 ? $lv : 2, 'text' => $text];
                if ($popup) {
                    $hb['align'] = $alignOf($b);
                }
                $out[] = $hb;
                break;
            case 'text':
                $rawHtml = (string) ($b['html'] ?? '');
                if (strlen($rawHtml) > ART_RICH_MAX * 10) {
                    $errors[] = "$lab (teks): terlalu panjang. Pecah menjadi beberapa blok teks.";
                    break;
                }
                $html = art_rich($rawHtml);
                if ($html === '') {
                    break;
                }
                if (art_plain_len($html) > ART_RICH_MAX) {
                    $errors[] = "$lab (teks): terlalu panjang (maksimal " . ART_RICH_MAX . ' huruf per blok). Pecah menjadi beberapa blok teks.';
                    break;
                }
                $out[] = ['id' => $id, 't' => 'text', 'html' => $html];
                break;
            case 'p':
                $html = art_inline((string) ($b['html'] ?? ''));
                if ($html !== '') {
                    $out[] = ['id' => $id, 't' => 'p', 'html' => $html];
                }
                break;
            case 'ul':
                $items = [];
                foreach (is_array($b['items'] ?? null) ? $b['items'] : [] as $it) {
                    $s = clean_text($it, 300);
                    if ($s !== '') {
                        $items[] = $s;
                    }
                }
                $items = array_slice($items, 0, 30);
                if ($items) {
                    $out[] = ['id' => $id, 't' => 'ul', 'style' => ($b['style'] ?? '') === 'numbers' ? 'numbers' : 'bullets', 'items' => $items];
                }
                break;
            case 'quote':
                $text = clean_multiline($b['text'] ?? '', 500);
                if ($text !== '') {
                    $out[] = ['id' => $id, 't' => 'quote', 'text' => $text, 'cite' => clean_text($b['cite'] ?? '', 100)];
                }
                break;
            case 'img':
                $src = teacher_photo($b['src'] ?? '');
                if ($src === null) {
                    $errors[] = "$lab (gambar): alamat gambar tidak valid. Unggah lewat panel.";
                } elseif ($src === '') {
                    $errors[] = "$lab (gambar): gambar belum dipilih. Pilih gambar atau hapus bloknya.";
                } else {
                    $size = $popup ? (in_array($b['size'] ?? '', ['wide', 'small'], true) ? $b['size'] : 'normal') : (($b['size'] ?? '') === 'wide' ? 'wide' : 'normal');
                    $img = ['id' => $id, 't' => 'img', 'src' => $src, 'alt' => clean_text($b['alt'] ?? '', 150), 'caption' => clean_text($b['caption'] ?? '', 200), 'size' => $size];
                    if (in_array($b['ratio'] ?? '', ART_IMG_RATIOS, true)) {
                        $img['ratio'] = $b['ratio']; // tanpa ratio = gambar lama, tampil dengan tinggi aslinya
                    }
                    if ($popup) {
                        $img['align'] = $alignOf($b);
                        $lk = trim((string) ($b['link'] ?? ''));
                        $lu = $lk === '' ? '' : $link($vars ? art_swap_vars($lk) : $lk);
                        if ($lu === null) {
                            $errors[] = "$lab (gambar): tautan gambar tidak valid.";
                            $lu = '';
                        } elseif ($vars && $lk !== '' && art_swap_vars($lk) !== $lk) {
                            $lu = $lk;
                        }
                        $img['link'] = (string) $lu;
                    }
                    $out[] = $img;
                }
                break;
            case 'video':
                $url = trim((string) ($b['url'] ?? ''));
                if ($url === '') {
                    $errors[] = "$lab (video): alamat video belum diisi. Isi atau hapus bloknya.";
                } elseif (art_video_info($url) === null) {
                    $errors[] = "$lab (video): alamat tidak dikenali. Pakai tautan YouTube, Vimeo, atau file .mp4/.webm (https).";
                } else {
                    $out[] = ['id' => $id, 't' => 'video', 'url' => $url, 'caption' => clean_text($b['caption'] ?? '', 200)];
                }
                break;
            case 'embed':
                $url = trim((string) ($b['url'] ?? ''));
                $h = in_array($b['height'] ?? '', ['m', 'l', 'xl'], true) ? $b['height'] : 'l';
                if ($url === '') {
                    $errors[] = "$lab (embed): alamat belum diisi. Isi atau hapus bloknya.";
                } elseif (!art_embed_allowed($url, $admin)) {
                    $errors[] = "$lab (embed): alamat harus https dan dari situs yang diizinkan (YouTube, Vimeo, Google Docs/Maps/Forms/Drive, Spotify, Canva, Figma, Padlet, Wordwall, Quizlet, dll). Domain lain hanya bisa dipasang oleh Admin.";
                } else {
                    $out[] = ['id' => $id, 't' => 'embed', 'url' => $url, 'height' => $h, 'caption' => clean_text($b['caption'] ?? '', 200)];
                }
                break;
            case 'html':
                if ($depth > 0) {
                    $errors[] = "$lab (HTML): blok HTML tidak bisa berada di dalam kolom. Pindahkan ke luar kolom.";
                    break;
                }
                [$code, $cerr] = art_html_code($b['code'] ?? '');
                if ($cerr !== null) {
                    $errors[] = "$lab (HTML): kode $cerr.";
                    break;
                }
                if (trim($code) === '') {
                    break;
                }
                $scripts = ($b['scripts'] ?? false) === true;
                if (!$admin && ($prior[$id] ?? '') !== art_html_fp($code, $scripts)) {
                    $errors[] = "$lab (HTML): hanya Admin yang bisa menambah atau mengubah blok HTML. Hapus blok ini, atau minta Admin yang mengubahnya.";
                    break;
                }
                $out[] = ['id' => $id, 't' => 'html', 'code' => $code, 'scripts' => $scripts,
                    'h' => in_array($b['h'] ?? '', ART_HTML_HEIGHTS, true) ? $b['h'] : 'auto',
                    'size' => ($b['size'] ?? '') === 'wide' ? 'wide' : 'normal', 'caption' => clean_text($b['caption'] ?? '', 200)];
                break;
            case 'callout':
                $text = clean_multiline($b['text'] ?? '', 800);
                if ($text !== '') {
                    $tone = in_array($b['tone'] ?? '', ['info', 'tip', 'warning'], true) ? $b['tone'] : 'info';
                    $out[] = ['id' => $id, 't' => 'callout', 'tone' => $tone, 'title' => clean_text($b['title'] ?? '', 80), 'text' => $text];
                }
                break;
            case 'faq':
                $items = [];
                foreach (is_array($b['items'] ?? null) ? $b['items'] : [] as $it) {
                    $it = is_array($it) ? $it : [];
                    $q = clean_text($it['q'] ?? '', 200);
                    $a = clean_multiline($it['a'] ?? '', 1200);
                    if ($q === '' && $a === '') {
                        continue;
                    }
                    if ($q === '' || $a === '') {
                        $errors[] = "$lab (tanya jawab): setiap butir harus punya pertanyaan DAN jawaban.";
                        continue;
                    }
                    $items[] = ['q' => $q, 'a' => $a];
                }
                if (count($items) > 15) {
                    $errors[] = "$lab (tanya jawab): maksimal 15 butir.";
                    $items = array_slice($items, 0, 15);
                }
                if ($items) {
                    $out[] = ['id' => $id, 't' => 'faq', 'title' => clean_text($b['title'] ?? '', 120), 'items' => $items];
                }
                break;
            case 'button':
                $label = clean_text($b['label'] ?? '', $vars ? 80 : 60);
                $rawUrl = trim((string) ($b['url'] ?? ''));
                $url = $link($vars ? art_swap_vars($rawUrl) : $rawUrl);
                if ($url !== null && $vars && art_swap_vars($rawUrl) !== $rawUrl) {
                    $url = $rawUrl; // memuat {variabel}: nilainya baru dikenal setelah tes selesai
                }
                if ($label === '' || $url === null) {
                    $errors[] = $popup
                        ? "$lab (tombol): tulisan dan tujuan wajib diisi. Tujuan: alamat https://…, jalur seperti /articles/, #form:alamat, #popup:alamat, #quiz:alamat, atau #close untuk menutup."
                        : "$lab (tombol): tulisan dan alamat tujuan wajib diisi (alamat http(s):// atau jalur seperti /articles/).";
                } else {
                    $btn = ['id' => $id, 't' => 'button', 'label' => $label, 'url' => $url, 'style' => ($b['style'] ?? '') === 'outline' ? 'outline' : 'solid'];
                    if ($popup) {
                        $btn['align'] = $alignOf($b);
                        $btn['full'] = !empty($b['full']);
                    }
                    $out[] = $btn;
                }
                break;
            case 'cards':
                $rawItems = is_array($b['items'] ?? null) ? array_values($b['items']) : [];
                if (count($rawItems) > ART_CARDS_MAX) {
                    $errors[] = "$lab (kartu): maksimal " . ART_CARDS_MAX . ' kartu dalam satu blok. Pecah menjadi dua blok kartu.';
                    $rawItems = array_slice($rawItems, 0, ART_CARDS_MAX);
                }
                $items = [];
                foreach ($rawItems as $ci => $it) {
                    $it = is_array($it) ? $it : [];
                    $cl = "$lab (kartu " . ($ci + 1) . ')';
                    $src = teacher_photo($it['src'] ?? '');
                    if ($src === null) {
                        $errors[] = "$cl: alamat gambar tidak valid. Unggah lewat panel.";
                        $src = '';
                    }
                    $title = clean_text($it['title'] ?? '', 80);
                    $text = clean_multiline($it['text'] ?? '', 300);
                    $label = clean_text($it['label'] ?? '', 40);
                    $urlIn = trim((string) ($it['url'] ?? ''));
                    $url = '';
                    if ($label !== '' || $urlIn !== '') {
                        $safe = $urlIn === '' ? null : $link($vars ? art_swap_vars($urlIn) : $urlIn);
                        if ($safe !== null && $vars && art_swap_vars($urlIn) !== $urlIn) {
                            $safe = $urlIn;
                        }
                        if ($label === '' || $safe === null) {
                            $errors[] = "$cl: tombol butuh tulisan DAN tujuan yang valid (https://…, jalur seperti /articles/, atau #form:nama). Isi keduanya atau kosongkan keduanya.";
                            $label = '';
                        } else {
                            $url = $safe;
                        }
                    }
                    if ($src === '' && $title === '' && $text === '' && $label === '') {
                        continue; // kartu kosong dibuang diam-diam
                    }
                    $items[] = ['src' => $src, 'alt' => clean_text($it['alt'] ?? '', 150), 'title' => $title, 'text' => $text, 'label' => $label, 'url' => $url];
                }
                if ($items) {
                    $per = (int) ($b['per'] ?? 3);
                    $out[] = [
                        'id' => $id, 't' => 'cards',
                        'per' => in_array($per, ART_CARDS_PER, true) ? $per : 3,
                        'ratio' => in_array($b['ratio'] ?? '', ART_IMG_RATIOS, true) ? $b['ratio'] : '4:3',
                        'btn' => ($b['btn'] ?? '') === 'outline' ? 'outline' : 'solid',
                        'items' => $items,
                    ];
                }
                break;
            case 'table':
                $rawRows = is_array($b['rows'] ?? null) ? array_values($b['rows']) : [];
                if (count($rawRows) > ART_TABLE_ROWS) {
                    $errors[] = "$lab (tabel): maksimal " . ART_TABLE_ROWS . ' baris.';
                    $rawRows = array_slice($rawRows, 0, ART_TABLE_ROWS);
                }
                $rows = [];
                $nCols = 0;
                $tooWide = false;
                foreach ($rawRows as $ri => $r) {
                    $r = is_array($r) ? array_values($r) : [];
                    if (count($r) > ART_TABLE_COLS) {
                        $tooWide = true;
                        $r = array_slice($r, 0, ART_TABLE_COLS);
                    }
                    $row = [];
                    foreach ($r as $ci => $cell) {
                        $rawCell = is_string($cell) ? $cell : '';
                        $c = strlen($rawCell) > ART_CELL_MAX * 24 ? '' : art_cell($rawCell);
                        // art_inline() mengosongkan teks yang jauh terlalu panjang; itu juga dianggap kelebihan huruf, bukan sel kosong
                        $over = art_plain_len($c) > ART_CELL_MAX || ($c === '' && art_plain_len($rawCell) > ART_CELL_MAX);
                        if ($over) {
                            $errors[] = "$lab (tabel): baris " . ($ri + 1) . ', kolom ' . ($ci + 1) . ' terlalu panjang (maksimal ' . ART_CELL_MAX . ' huruf per sel).';
                            $c = '';
                        }
                        $row[] = $c;
                    }
                    $nCols = max($nCols, count($row));
                    $rows[] = $row;
                }
                if ($tooWide) {
                    $errors[] = "$lab (tabel): maksimal " . ART_TABLE_COLS . ' kolom.';
                }
                // baris kosong di akhir dibuang; sisanya dilengkapi agar semua baris sama lebar
                while ($rows && implode('', $rows[count($rows) - 1]) === '') {
                    array_pop($rows);
                }
                if (!$rows || $nCols < 1) {
                    break;
                }
                $any = false;
                foreach ($rows as $k => $row) {
                    $rows[$k] = array_pad($row, $nCols, '');
                    $any = $any || implode('', $row) !== '';
                }
                if (!$any) {
                    break;
                }
                $aligns = [];
                $alIn = is_array($b['aligns'] ?? null) ? array_values($b['aligns']) : [];
                for ($k = 0; $k < $nCols; $k++) {
                    $aligns[] = in_array($alIn[$k] ?? '', ART_TABLE_ALIGNS, true) ? $alIn[$k] : 'left';
                }
                $out[] = ['id' => $id, 't' => 'table', 'header' => !empty($b['header']), 'caption' => clean_text($b['caption'] ?? '', 150), 'aligns' => $aligns, 'rows' => $rows];
                break;
            case 'columns':
                if ($depth >= 1) {
                    $errors[] = "$lab (kolom): kolom tidak bisa diletakkan di dalam kolom lain.";
                    break;
                }
                $cols = is_array($b['cols'] ?? null) ? array_values($b['cols']) : [];
                if (count($cols) > 3) {
                    $errors[] = "$lab (kolom): maksimal 3 kolom.";
                    $cols = array_slice($cols, 0, 3);
                }
                while (count($cols) < 2) {
                    $cols[] = [];
                }
                $ratio = count($cols) === 3 ? '1-1-1' : (in_array($b['ratio'] ?? '', ART_COL_RATIOS, true) ? $b['ratio'] : '1-1');
                $outCols = [];
                $any = false;
                foreach ($cols as $ci => $col) {
                    $list = art_validate_list($col, $admin, $depth + 1, $count, $used, $errors, $lab . ' (kolom ' . ($ci + 1) . ')', $prior, $o);
                    $any = $any || $list !== [];
                    $outCols[] = $list;
                }
                if ($any) {
                    $out[] = ['id' => $id, 't' => 'columns', 'ratio' => $ratio, 'cols' => $outCols];
                }
                break;
            case 'hr':
                $out[] = ['id' => $id, 't' => 'hr'];
                break;
            default:
                break;
        }
    }
    return $out;
}

/** @return array{0: array, 1: string[]} data siap simpan (tanpa id) */
function art_validate(array $in, array $user): array
{
    $errors = [];
    $admin = is_admin($user);
    $title = clean_text($in['title'] ?? '', 160);
    if ($title === '') {
        $errors[] = 'Judul wajib diisi.';
    }
    $status = ($in['status'] ?? '') === 'published' ? 'published' : 'draft';
    $audiences = array_values(array_intersect(['kids', 'adult'], is_array($in['audiences'] ?? null) ? $in['audiences'] : []));
    $hero = teacher_photo($in['hero'] ?? '');
    if ($hero === null) {
        $errors[] = 'Gambar utama tidak valid. Unggah lewat panel.';
        $hero = '';
    }
    $prior = [];
    if (!$admin && (int) ($in['id'] ?? 0) > 0) {
        try {
            $old = art_get((int) $in['id']);
            $ob = $old ? json_decode((string) $old['body'], true) : null;
            foreach (is_array($ob) ? $ob : [] as $x) {
                if (is_array($x) && ($x['t'] ?? '') === 'html' && is_string($x['id'] ?? null)) {
                    $prior[$x['id']] = art_html_fp((string) ($x['code'] ?? ''), ($x['scripts'] ?? false) === true);
                }
            }
        } catch (Throwable) {
        }
    }
    [$blocks, $berr] = art_validate_blocks($in['blocks'] ?? [], $admin, $prior);
    $errors = array_merge($errors, $berr);
    if ($status === 'published') {
        if (!$audiences) {
            $errors[] = 'Centang minimal satu tampilan (Anak & Remaja dan/atau Dewasa & Bisnis) agar artikel bisa terbit.';
        }
        if ($hero === '') {
            $errors[] = 'Gambar utama wajib diisi agar artikel bisa terbit.';
        }
        if (!$blocks) {
            $errors[] = 'Isi artikel masih kosong.';
        }
    }
    $slug = art_slugify(is_string($in['slug'] ?? null) && trim($in['slug']) !== '' ? $in['slug'] : $title);
    if ($slug === '') {
        $slug = 'artikel';
    }
    $cat = clean_text($in['category'] ?? '', 60);
    $tags = [];
    foreach (is_array($in['tags'] ?? null) ? $in['tags'] : [] as $t) {
        $t = ltrim(clean_text($t, 40), "# \t");
        if ($t === '') {
            continue;
        }
        $dupe = false;
        foreach ($tags as $x) {
            if (mb_strtolower($x) === mb_strtolower($t)) {
                $dupe = true;
            }
        }
        if (!$dupe) {
            $tags[] = $t;
        }
    }
    if (count($tags) > ART_MAX_TAGS) {
        $errors[] = 'Tag maksimal ' . ART_MAX_TAGS . '.';
        $tags = array_slice($tags, 0, ART_MAX_TAGS);
    }
    $pub = null;
    $pubIn = trim((string) ($in['publishedAt'] ?? ''));
    if ($pubIn !== '') {
        try {
            $d = new DateTimeImmutable($pubIn, new DateTimeZone('Asia/Jakarta'));
            $pub = $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (Throwable) {
            $errors[] = 'Tanggal terbit tidak valid.';
        }
    }
    $excerpt = clean_text($in['excerpt'] ?? '', 220);
    if ($excerpt === '') {
        $excerpt = art_first_plain($blocks);
    }
    $si = is_array($in['seo'] ?? null) ? $in['seo'] : [];
    $seoImg = teacher_photo($si['image'] ?? '');
    if ($seoImg === null) {
        $errors[] = 'Gambar untuk berbagi (SEO) tidak valid. Pilih atau unggah lewat panel.';
        $seoImg = '';
    }
    $canon = trim((string) ($si['canonical'] ?? ''));
    if ($canon !== '') {
        $canon = clean_link($canon) ?? '';
        if ($canon === '' || str_starts_with($canon, '#')) {
            $errors[] = 'Canonical URL harus berupa alamat lengkap https://…';
        }
    }
    $related = [];
    foreach (is_array($si['related'] ?? null) ? $si['related'] : [] as $rk) {
        $rk = clean_text($rk, 60);
        if ($rk !== '' && !in_array($rk, $related, true)) {
            $related[] = $rk;
        }
    }
    $seo = ['related' => array_slice($related, 0, 5), 'title' => clean_text($si['title'] ?? '', 120), 'description' => clean_text($si['description'] ?? '', 300), 'keyword' => clean_text($si['keyword'] ?? '', 60),
        'image' => $seoImg, 'canonical' => $canon, 'noindex' => !empty($si['noindex']),
        'layout' => ($si['layout'] ?? '') === 'full' ? 'full' : '']; // 'full' = isi artikel selebar layar browser (disimpan bersama data SEO, tanpa kolom baru di database)
    return [[
        'seo' => $seo,
        'title' => $title, 'subtitle' => clean_text($in['subtitle'] ?? '', 300), 'slug' => $slug, 'hero' => $hero,
        'author' => clean_text($in['author'] ?? '', 80), 'category' => $cat, 'tags' => $tags, 'audiences' => $audiences,
        'status' => $status, 'published_at' => $pub, 'excerpt' => $excerpt, 'blocks' => $blocks,
    ], $errors];
}

/* ------------------------------------------------------------------ */
/* Penyimpanan                                                         */
/* ------------------------------------------------------------------ */

function art_unique_slug(string $table, string $col, string $slug, int $ignoreId = 0): string
{
    $base = $slug;
    $n = 1;
    while (true) {
        $st = db()->prepare("SELECT id FROM $table WHERE $col = ?" . ($ignoreId ? ' AND id <> ' . (int) $ignoreId : ''));
        $st->execute([$slug]);
        if (!$st->fetchColumn()) {
            return $slug;
        }
        $n++;
        $slug = substr($base, 0, 110) . '-' . $n;
    }
}

function art_term_id(string $table, string $name, int $slugMax): int
{
    $st = db()->prepare("SELECT id FROM $table WHERE name = ?");
    $st->execute([$name]);
    $id = $st->fetchColumn();
    if ($id) {
        return (int) $id;
    }
    $slug = art_unique_slug($table, 'slug', art_slugify($name, $slugMax) ?: 'x');
    db()->prepare("INSERT INTO $table (name, slug) VALUES (?, ?)")->execute([$name, $slug]);
    return (int) db()->lastInsertId();
}

function art_cleanup_terms(): void
{
    db()->exec('DELETE FROM article_tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM article_tag_map)');
    db()->exec('DELETE FROM article_categories WHERE id NOT IN (SELECT DISTINCT category_id FROM articles WHERE category_id IS NOT NULL)');
}

/** simpan (id = 0 untuk baru). Mengembalikan id. */
function art_save(array $d, int $id, int $userId, bool $sample = false): int
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $now = now_utc();
        $catId = $d['category'] !== '' ? art_term_id('article_categories', $d['category'], 60) : null;
        $slug = art_unique_slug('articles', 'slug', $d['slug'], $id);
        $pub = $d['published_at'];
        if ($d['status'] === 'published' && $pub === null) {
            $pub = $now;
        }
        $aud = implode(',', $d['audiences']);
        $body = json_encode($d['blocks'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($id > 0) {
            $pdo->prepare('UPDATE articles SET slug=?, title=?, subtitle=?, excerpt=?, hero=?, author=?, category_id=?, audiences=?, status=?, body=?, published_at=?, updated_at=?, updated_by=? WHERE id=?')
                ->execute([$slug, $d['title'], $d['subtitle'], $d['excerpt'], $d['hero'], $d['author'], $catId, $aud, $d['status'], $body, $pub, $now, $userId, $id]);
        } else {
            $pdo->prepare('INSERT INTO articles (slug, title, subtitle, excerpt, hero, author, category_id, audiences, status, is_sample, body, published_at, created_at, updated_at, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$slug, $d['title'], $d['subtitle'], $d['excerpt'], $d['hero'], $d['author'], $catId, $aud, $d['status'], $sample ? 1 : 0, $body, $pub, $now, $now, $userId, $userId]);
            $id = (int) $pdo->lastInsertId();
        }
        $seoJson = json_encode($d['seo'] ?? art_seo_default(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $pdo->prepare('INSERT INTO article_seo (article_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)')->execute([$id, $seoJson]);
        $pdo->prepare('DELETE FROM article_tag_map WHERE article_id = ?')->execute([$id]);
        $ins = $pdo->prepare('INSERT IGNORE INTO article_tag_map (article_id, tag_id) VALUES (?, ?)');
        foreach ($d['tags'] as $t) {
            $ins->execute([$id, art_term_id('article_tags', $t, 60)]);
        }
        art_cleanup_terms();
        $pdo->commit();
        return $id;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function art_delete(int $id): void
{
    db()->prepare('DELETE FROM article_tag_map WHERE article_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM article_seo WHERE article_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM articles WHERE id = ?')->execute([$id]);
    rev_purge('article', $id);
    art_cleanup_terms();
}

/** hapus SEMUA artikel (beserta tag, kategori yang tidak terpakai, dan data SEO). Gambar di pustaka media tidak disentuh. Mengembalikan jumlah artikel. */
function art_delete_all(): int
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $n = (int) $pdo->query('SELECT COUNT(*) FROM articles')->fetchColumn();
        $pdo->exec('DELETE FROM article_tag_map');
        $pdo->exec('DELETE FROM article_seo');
        $pdo->exec('DELETE FROM articles');
        art_cleanup_terms();
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    rev_purge('article');
    return $n;
}

/**
 * Baris artikel "seolah-olah tersimpan" dari data yang sudah divalidasi, untuk pratinjau draf yang belum disimpan.
 * Bentuknya sama dengan art_get(), tetapi tidak ada yang ditulis ke database.
 * @param array $clean hasil art_validate()
 */
function art_draft_row(array $clean, array $user, int $id): array
{
    $now = now_utc();
    $catId = null;
    if ($clean['category'] !== '') {
        $st = db()->prepare('SELECT id FROM article_categories WHERE name = ?');
        $st->execute([$clean['category']]);
        $found = $st->fetchColumn();
        $catId = $found ? (int) $found : null;
    }
    $tags = array_map(static fn($t) => ['name' => $t, 'slug' => art_slugify($t, 60) ?: 'x'], $clean['tags']);
    return [
        'id' => $id, 'slug' => $clean['slug'], 'title' => $clean['title'], 'subtitle' => $clean['subtitle'], 'excerpt' => $clean['excerpt'],
        'hero' => $clean['hero'], 'author' => $clean['author'], 'category_id' => $catId, 'category_name' => $clean['category'] !== '' ? $clean['category'] : null,
        'category_slug' => $clean['category'] !== '' ? art_slugify($clean['category'], 60) : null,
        'audiences' => $clean['audiences'] ?: ['kids', 'adult'], 'status' => 'draft', 'is_sample' => 0,
        'body' => json_encode($clean['blocks'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'published_at' => $clean['published_at'], 'created_at' => $now, 'updated_at' => $now, 'writer_name' => (string) ($user['name'] ?? ''),
        'tags' => $tags, 'seo' => $clean['seo'],
    ];
}

/* ------------------------------------------------------------------ */
/* Kueri                                                               */
/* ------------------------------------------------------------------ */

function art_seo_default(): array
{
    return ['related' => [], 'title' => '', 'description' => '', 'keyword' => '', 'image' => '', 'canonical' => '', 'noindex' => false, 'layout' => ''];
}

function art_row_extra(array $r): array
{
    $r['audiences'] = array_values(array_filter(explode(',', (string) $r['audiences'])));
    $r['tags'] = [];
    return $r;
}

/** @return array<int, array> */
function art_attach_tags(array $rows): array
{
    if (!$rows) {
        return $rows;
    }
    $ids = array_map(static fn($r) => (int) $r['id'], $rows);
    $in = implode(',', $ids);
    $q = db()->query("SELECT m.article_id, t.name, t.slug FROM article_tag_map m JOIN article_tags t ON t.id = m.tag_id WHERE m.article_id IN ($in) ORDER BY t.name");
    $by = [];
    foreach ($q->fetchAll() as $t) {
        $by[(int) $t['article_id']][] = ['name' => $t['name'], 'slug' => $t['slug']];
    }
    $seo = [];
    try {
        foreach (db()->query("SELECT article_id, data FROM article_seo WHERE article_id IN ($in)")->fetchAll() as $x) {
            $d = json_decode((string) $x['data'], true);
            $seo[(int) $x['article_id']] = is_array($d) ? $d : [];
        }
    } catch (Throwable) {
        // tabel belum ada (database lama): SEO kosong sampai panel dibuka sekali
    }
    foreach ($rows as &$r) {
        $r['tags'] = $by[(int) $r['id']] ?? [];
        $r['seo'] = array_merge(art_seo_default(), array_intersect_key($seo[(int) $r['id']] ?? [], art_seo_default()));
    }
    return $rows;
}

const ART_SELECT = 'SELECT a.*, c.name AS category_name, c.slug AS category_slug, u.name AS writer_name
    FROM articles a LEFT JOIN article_categories c ON c.id = a.category_id LEFT JOIN users u ON u.id = a.created_by';

function art_get(int $id): ?array
{
    $st = db()->prepare(ART_SELECT . ' WHERE a.id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ? art_attach_tags([art_row_extra($r)])[0] : null;
}

function art_get_by_slug(string $slug, bool $publishedOnly = true): ?array
{
    $st = db()->prepare(ART_SELECT . ' WHERE a.slug = ?' . ($publishedOnly ? " AND a.status = 'published' AND a.published_at <= UTC_TIMESTAMP()" : ''));
    $st->execute([$slug]);
    $r = $st->fetch();
    return $r ? art_attach_tags([art_row_extra($r)])[0] : null;
}

/** @return array<int, array> artikel terbit (terbaru dulu) */
function art_published(array $f = [], int $limit = 500): array
{
    $where = ["a.status = 'published'", 'a.published_at <= UTC_TIMESTAMP()'];
    $args = [];
    if (!empty($f['category'])) {
        $where[] = 'c.slug = ?';
        $args[] = $f['category'];
    }
    if (!empty($f['tag'])) {
        $where[] = 'EXISTS (SELECT 1 FROM article_tag_map m JOIN article_tags t ON t.id = m.tag_id WHERE m.article_id = a.id AND t.slug = ?)';
        $args[] = $f['tag'];
    }
    if (!empty($f['exclude'])) {
        $where[] = 'a.id <> ?';
        $args[] = (int) $f['exclude'];
    }
    $st = db()->prepare(ART_SELECT . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY a.published_at DESC, a.id DESC LIMIT ' . (int) $limit);
    $st->execute($args);
    return art_attach_tags(array_map('art_row_extra', $st->fetchAll()));
}

/** semua artikel untuk daftar di panel */
function art_all(array $f = []): array
{
    $where = ['1=1'];
    $args = [];
    if (($f['status'] ?? '') === 'draft' || ($f['status'] ?? '') === 'published') {
        $where[] = 'a.status = ?';
        $args[] = $f['status'];
    }
    if (!empty($f['category'])) {
        $where[] = 'c.slug = ?';
        $args[] = $f['category'];
    }
    if (!empty($f['tag'])) {
        $where[] = 'EXISTS (SELECT 1 FROM article_tag_map m JOIN article_tags t ON t.id = m.tag_id WHERE m.article_id = a.id AND t.slug = ?)';
        $args[] = $f['tag'];
    }
    if (!empty($f['q'])) {
        $where[] = '(a.title LIKE ? OR a.subtitle LIKE ?)';
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], (string) $f['q']) . '%';
        $args[] = $like;
        $args[] = $like;
    }
    $st = db()->prepare(ART_SELECT . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY a.updated_at DESC, a.id DESC LIMIT 500');
    $st->execute($args);
    return art_attach_tags(array_map('art_row_extra', $st->fetchAll()));
}

/** @return array{categories: array, tags: array} untuk saran otomatis (jumlah artikel per istilah) */
function art_terms(): array
{
    $cats = db()->query('SELECT c.name, c.slug, COUNT(a.id) AS n FROM article_categories c LEFT JOIN articles a ON a.category_id = c.id GROUP BY c.id ORDER BY n DESC, c.name')->fetchAll();
    $tags = db()->query('SELECT t.name, t.slug, COUNT(m.article_id) AS n FROM article_tags t LEFT JOIN article_tag_map m ON m.tag_id = t.id GROUP BY t.id ORDER BY n DESC, t.name')->fetchAll();
    foreach ($cats as &$c) {
        $c['n'] = (int) $c['n'];
    }
    foreach ($tags as &$t) {
        $t['n'] = (int) $t['n'];
    }
    return ['categories' => $cats, 'tags' => $tags];
}

/** penulis: diisi di panel, kalau kosong memakai nama akun penulisnya */
function art_author(array $a): string
{
    $s = trim((string) ($a['author'] ?? ''));
    return $s !== '' ? $s : (string) ($a['writer_name'] ?? 'English Now');
}

/** semua blok, termasuk yang di dalam kolom, berurutan */
function art_walk_blocks(array $blocks, callable $fn): void
{
    foreach ($blocks as $b) {
        if (!is_array($b)) {
            continue;
        }
        $fn($b);
        if (($b['t'] ?? '') === 'columns') {
            foreach ((array) ($b['cols'] ?? []) as $col) {
                art_walk_blocks((array) $col, $fn);
            }
        }
    }
}

/** teks biasa dari HTML sederhana (akhir paragraf/judul/butir jadi spasi) */
function art_plain(string $html): string
{
    $t = preg_replace('#<br\s*/?>|</(p|h[1-6]|li|div)>#i', ' ', $html) ?? $html;
    $t = html_entity_decode(strip_tags($t), ENT_QUOTES, 'UTF-8');
    return trim(preg_replace('/\s+/u', ' ', $t) ?? $t);
}

/** kalimat pembuka artikel (paragraf pertama), untuk ringkasan otomatis */
function art_first_plain(array $blocks): string
{
    foreach ($blocks as $b) {
        $t = (string) ($b['t'] ?? '');
        if ($t === 'p') {
            return mb_substr(art_plain((string) $b['html']), 0, 200);
        }
        if ($t === 'text' && preg_match('#<p(?:\s[^>]*)?>(.*?)</p>#s', (string) $b['html'], $m)) {
            $s = art_plain($m[1]);
            if ($s !== '') {
                return mb_substr($s, 0, 200);
            }
        }
        if ($t === 'columns') {
            foreach ((array) $b['cols'] as $col) {
                $s = art_first_plain((array) $col);
                if ($s !== '') {
                    return $s;
                }
            }
        }
    }
    return '';
}

function art_reading_minutes(array $blocks): int
{
    $words = 0;
    art_walk_blocks($blocks, static function (array $b) use (&$words): void {
        $t = (string) ($b['t'] ?? '');
        $txt = match ($t) {
            'h' => (string) ($b['text'] ?? ''),
            'p', 'text' => art_plain((string) ($b['html'] ?? '')),
            'ul' => implode(' ', (array) ($b['items'] ?? [])),
            'quote' => (string) ($b['text'] ?? ''),
            'callout' => (string) ($b['title'] ?? '') . ' ' . (string) ($b['text'] ?? ''),
            'faq' => implode(' ', array_map(static fn($i) => ($i['q'] ?? '') . ' ' . ($i['a'] ?? ''), (array) ($b['items'] ?? []))),
            'cards' => implode(' ', array_map(static fn($i) => ($i['title'] ?? '') . ' ' . ($i['text'] ?? '') . ' ' . ($i['label'] ?? ''), (array) ($b['items'] ?? []))),
            'table' => (string) ($b['caption'] ?? '') . ' ' . implode(' ', array_map(static fn($r) => implode(' ', array_map(static fn($c) => art_plain((string) $c), (array) $r)), (array) ($b['rows'] ?? []))),
            default => '',
        };
        $words += str_word_count(preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $txt) ?? '') ?: count(array_filter(preg_split('/\s+/u', trim($txt)) ?: []));
    });
    return max(1, (int) ceil($words / 200));
}

/* ------------------------------------------------------------------ */
/* HTML isi artikel                                                    */
/* ------------------------------------------------------------------ */

function art_e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** [form:slug] atau [form:slug|Tulisan tombol] di dalam teks -> tombol yang membuka formulir */
function art_form_shortcodes(string $html): string
{
    if (!str_contains($html, '[form:')) {
        return $html;
    }
    return (string) preg_replace_callback('/\[form:([A-Za-z0-9-]{1,60})(?:\|([^\]]{1,60}))?\]/', static function (array $m): string {
        $slug = strtolower($m[1]);
        $label = trim((string) ($m[2] ?? ''));
        $href = '#form:' . $slug;
        try {
            $f = function_exists('form_get_by_slug') ? form_get_by_slug($slug) : null;
        } catch (Throwable) {
            $f = null;
        }
        if (!$f) {
            return '';
        }
        if ($f['layout'] === 'page') {
            $href = '/form/' . $slug;
        }
        return '<a class="a-btn btn" href="' . htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">' . ($label !== '' ? $label : htmlspecialchars((string) $f['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')) . '</a>';
    }, $html);
}

/** [popup:slug] atau [popup:slug|Tulisan tombol] di dalam teks -> tombol yang membuka pop-up */
function art_quiz_shortcodes(string $html): string
{
    if (!str_contains($html, '[quiz:')) {
        return $html;
    }
    return (string) preg_replace_callback('/\[quiz:([A-Za-z0-9-]{1,60})(?:\|([^\]]{1,60}))?\]/', static function (array $m): string {
        $slug = strtolower($m[1]);
        $label = trim((string) ($m[2] ?? ''));
        try {
            $q = function_exists('quiz_get_by_slug') ? quiz_get_by_slug($slug) : null;
        } catch (Throwable) {
            $q = null;
        }
        if (!$q) {
            return '';
        }
        return '<a class="a-btn btn" href="#quiz:' . htmlspecialchars($slug, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">' . ($label !== '' ? htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : htmlspecialchars((string) $q['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')) . '</a>';
    }, $html);
}

/** [popup:slug] atau [popup:slug|Tulisan tombol] di dalam teks -> tombol yang membuka pop-up */
function art_popup_shortcodes(string $html): string
{
    if (!str_contains($html, '[popup:')) {
        return $html;
    }
    return (string) preg_replace_callback('/\[popup:([A-Za-z0-9-]{1,60})(?:\|([^\]]{1,60}))?\]/', static function (array $m): string {
        $slug = strtolower($m[1]);
        $label = trim((string) ($m[2] ?? ''));
        try {
            $p = function_exists('popup_get_by_slug') ? popup_get_by_slug($slug) : null;
        } catch (Throwable) {
            $p = null;
        }
        if (!$p || $p['status'] !== 'published') {
            return '';
        }
        return '<a class="a-btn btn" href="#popup:' . htmlspecialchars($slug, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">' . ($label !== '' ? htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : htmlspecialchars((string) $p['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')) . '</a>';
    }, $html);
}

/** @param bool $nested true bila blok ada di dalam kolom (tidak boleh melebar keluar kolom) */
/** @param array<string,mixed> $ctx  untuk blok html: ['frames' => 'public'|'panel-get'|'panel-post', 'id' => id artikel, 'panel' => '/edizon', 'csrf' => token] (lihat art_frame_ctx) */
function art_render_blocks(array $blocks, bool $nested = false, array $ctx = []): string
{
    $o = '';
    $wide = $nested ? '' : ' a-wide';
    foreach ($blocks as $b) {
        switch ($b['t'] ?? '') {
            case 'h':
                $l = (int) ($b['level'] ?? 2);
                $l = $l >= 2 && $l <= 4 ? $l : 2;
                $o .= "<h$l class=\"a-h$l\">" . art_e((string) $b['text']) . "</h$l>\n";
                break;
            case 'text':
                $o .= art_quiz_shortcodes(art_popup_shortcodes(art_form_shortcodes(art_rich((string) $b['html'])))) . "\n";
                break;
            case 'p':
                $o .= '<p>' . art_quiz_shortcodes(art_popup_shortcodes(art_form_shortcodes(art_inline((string) $b['html'])))) . "</p>\n";
                break;
            case 'ul':
                $tag = ($b['style'] ?? '') === 'numbers' ? 'ol' : 'ul';
                $o .= "<$tag class=\"a-list\">";
                foreach ($b['items'] as $it) {
                    $o .= '<li>' . art_e((string) $it) . '</li>';
                }
                $o .= "</$tag>\n";
                break;
            case 'quote':
                $o .= '<blockquote class="a-quote"><p>' . nl2br(art_e((string) $b['text']), false) . '</p>' . (($b['cite'] ?? '') !== '' ? '<cite>' . art_e((string) $b['cite']) . '</cite>' : '') . "</blockquote>\n";
                break;
            case 'img':
                $ratio = in_array($b['ratio'] ?? '', ART_IMG_RATIOS, true) ? ' ar-' . str_replace(':', '-', (string) $b['ratio']) : '';
                $o .= '<figure class="a-fig' . $ratio . (($b['size'] ?? '') === 'wide' ? $wide : '') . '"><img src="' . art_e((string) $b['src']) . '" alt="' . art_e((string) ($b['alt'] ?? '')) . '" loading="lazy">'
                    . (($b['caption'] ?? '') !== '' ? '<figcaption>' . art_e((string) $b['caption']) . '</figcaption>' : '') . "</figure>\n";
                break;
            case 'video':
                $v = art_video_info((string) $b['url']);
                if ($v) {
                    $inner = $v['kind'] === 'file'
                        ? '<video controls preload="metadata" src="' . art_e($v['src']) . '"></video>'
                        : '<iframe src="' . art_e($v['src']) . '" title="Video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
                    $o .= '<figure class="a-fig' . $wide . '"><div class="a-ar">' . $inner . '</div>' . (($b['caption'] ?? '') !== '' ? '<figcaption>' . art_e((string) $b['caption']) . '</figcaption>' : '') . "</figure>\n";
                }
                break;
            case 'embed':
                $h = in_array($b['height'] ?? '', ['m', 'l', 'xl'], true) ? $b['height'] : 'l';
                $o .= '<figure class="a-fig' . $wide . '"><div class="a-embed a-h-' . $h . '"><iframe src="' . art_e((string) $b['url']) . '" title="Konten tertanam" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>'
                    . (($b['caption'] ?? '') !== '' ? '<figcaption>' . art_e((string) $b['caption']) . '</figcaption>' : '') . "</figure>\n";
                break;
            case 'html':
                if (!$nested) {
                    $o .= art_html_figure($b, $ctx, $wide);
                }
                break;
            case 'faq':
                $o .= '<section class="a-faq">' . (($b['title'] ?? '') !== '' ? '<h2 class="a-h2">' . art_e((string) $b['title']) . '</h2>' : '');
                foreach ($b['items'] as $it) {
                    $o .= '<div class="a-faq-item"><h3 class="a-h3">' . art_e((string) $it['q']) . '</h3><p>' . nl2br(art_e((string) $it['a']), false) . '</p></div>';
                }
                $o .= "</section>\n";
                break;
            case 'callout':
                $tone = in_array($b['tone'] ?? '', ['info', 'tip', 'warning'], true) ? $b['tone'] : 'info';
                $o .= '<aside class="a-callout a-tone-' . $tone . '">' . (($b['title'] ?? '') !== '' ? '<strong>' . art_e((string) $b['title']) . '</strong>' : '') . '<p>' . nl2br(art_e((string) $b['text']), false) . "</p></aside>\n";
                break;
            case 'button':
                $u = safe_url((string) ($b['url'] ?? ''));
                if ($u !== null) {
                    $ext = (bool) preg_match('#^(https?:)?//#i', $u);
                    $o .= '<p class="a-btnrow"><a class="a-btn' . (($b['style'] ?? '') === 'outline' ? ' a-btn-outline' : '') . '" href="' . art_e($u) . '"' . ($ext ? ' target="_blank" rel="noopener noreferrer"' : '') . '>' . art_e((string) $b['label']) . "</a></p>\n";
                }
                break;
            case 'cards':
                $items = array_values(array_filter((array) ($b['items'] ?? []), 'is_array'));
                if (!$items) {
                    break;
                }
                $per = (int) ($b['per'] ?? 3);
                $per = in_array($per, ART_CARDS_PER, true) ? $per : 3;
                $ratio = in_array($b['ratio'] ?? '', ART_IMG_RATIOS, true) ? (string) $b['ratio'] : '4:3';
                $outline = ($b['btn'] ?? '') === 'outline' ? ' a-btn-outline' : '';
                $o .= '<div class="a-cardsw' . $wide . '"><div class="a-cards a-cards-' . $per . '">';
                foreach (array_slice($items, 0, ART_CARDS_MAX) as $it) {
                    $o .= '<article class="a-card">';
                    if (preg_match('#^(/|https://)#', (string) ($it['src'] ?? '')) === 1) { // only our own uploads or https pictures
                        $o .= '<div class="a-card-img ar-' . str_replace(':', '-', $ratio) . '"><img src="' . art_e((string) $it['src']) . '" alt="' . art_e((string) ($it['alt'] ?? '')) . '" loading="lazy"></div>';
                    }
                    $o .= '<div class="a-card-body">';
                    if (($it['title'] ?? '') !== '') {
                        $o .= '<h3 class="a-card-t">' . art_e((string) $it['title']) . '</h3>';
                    }
                    if (($it['text'] ?? '') !== '') {
                        $o .= '<p class="a-card-p">' . nl2br(art_e((string) $it['text']), false) . '</p>';
                    }
                    $u = ($it['label'] ?? '') !== '' ? safe_url((string) ($it['url'] ?? '')) : null;
                    if ($u !== null) {
                        $ext = (bool) preg_match('#^(https?:)?//#i', $u);
                        $o .= '<p class="a-card-act"><a class="a-btn' . $outline . '" href="' . art_e($u) . '"' . ($ext ? ' target="_blank" rel="noopener noreferrer"' : '') . '>' . art_e((string) $it['label']) . '</a></p>';
                    }
                    $o .= '</div></article>';
                }
                $o .= "</div></div>\n";
                break;
            case 'table':
                $rows = array_values(array_filter((array) ($b['rows'] ?? []), 'is_array'));
                if (!$rows) {
                    break;
                }
                $rows = array_slice($rows, 0, ART_TABLE_ROWS);
                $nc = max(1, min(ART_TABLE_COLS, count($rows[0])));
                $al = array_values((array) ($b['aligns'] ?? []));
                $cap = trim((string) ($b['caption'] ?? ''));
                $head = !empty($b['header']);
                $cell = static function (array $row, int $ri, string $tag) use ($nc, $al): string {
                    $s = '';
                    for ($ci = 0; $ci < $nc; $ci++) {
                        $a = $al[$ci] ?? 'left';
                        $cls = $a === 'center' ? ' class="ta-center"' : ($a === 'right' ? ' class="ta-right"' : '');
                        $s .= '<' . $tag . ($tag === 'th' ? ' scope="col"' : '') . $cls . '>' . art_cell((string) ($row[$ci] ?? '')) . '</' . $tag . '>';
                    }
                    return '<tr>' . $s . '</tr>';
                };
                $o .= '<div class="a-tablewrap" role="region" tabindex="0" aria-label="' . art_e($cap !== '' ? $cap : 'Tabel') . '"><table class="a-table">';
                if ($cap !== '') {
                    $o .= '<caption>' . art_e($cap) . '</caption>';
                }
                if ($head) {
                    $o .= '<thead>' . $cell(array_shift($rows), 0, 'th') . '</thead>';
                }
                if ($rows) {
                    $o .= '<tbody>';
                    foreach ($rows as $ri => $row) {
                        $o .= $cell($row, $ri, 'td');
                    }
                    $o .= '</tbody>';
                }
                $o .= "</table></div>\n";
                break;
            case 'columns':
                if ($nested) {
                    break; // kolom di dalam kolom tidak didukung
                }
                $cols = array_values((array) ($b['cols'] ?? []));
                $n = count($cols);
                if ($n < 2 || $n > 3) {
                    break;
                }
                $ratio = $n === 3 ? '1-1-1' : (in_array($b['ratio'] ?? '', ART_COL_RATIOS, true) ? $b['ratio'] : '1-1');
                $o .= '<div class="a-cols a-cols-' . $n . ' a-r-' . $ratio . '">';
                foreach ($cols as $col) {
                    $o .= '<div class="a-col">' . art_render_blocks((array) $col, true) . '</div>';
                }
                $o .= "</div>\n";
                break;
            case 'hr':
                $o .= "<hr class=\"a-hr\">\n";
                break;
        }
    }
    return $o;
}

/* ------------------------------------------------------------------ */
/* Artikel contoh (untuk uji coba)                                     */
/* ------------------------------------------------------------------ */

function art_sample_data(): array
{
    $p = static fn(string $h) => ['t' => 'p', 'html' => $h];
    $h = static fn(string $t, int $l = 2) => ['t' => 'h', 'level' => $l, 'text' => $t];
    $img = static fn(string $s, string $alt, string $cap = '', string $size = 'normal') => ['t' => 'img', 'src' => $s, 'alt' => $alt, 'caption' => $cap, 'size' => $size];
    $both = ['kids', 'adult'];
    $osm = 'https://www.openstreetmap.org/export/embed.html?bbox=106.80%2C-6.26%2C106.86%2C-6.20&layer=mapnik';
    return [
        ['title' => 'Contoh: Membiasakan Anak Mandiri dari Rumah', 'subtitle' => 'Tiga kebiasaan kecil yang bisa dimulai malam ini.', 'cat' => 'Parenting', 'tags' => ['karakter', 'mandiri', 'di rumah'],
         'aud' => $both, 'hero' => '/images/pembiasaan-bersih.jpg', 'author' => 'Tim Humas SD Alfa Centauri',
         'blocks' => [$p('Ini artikel <strong>contoh</strong> untuk mencoba editor. Hapus atau ganti dengan artikel asli dari sekolah.'), $h('1. Rapikan perlengkapan sendiri'), $p('Biarkan ananda menyiapkan tas dan seragam malam hari. Mulai dari yang paling mudah, lalu tambah tanggung jawabnya pelan-pelan.'), $h('2. Beri pilihan terbatas'), $p('Pilihan yang jelas melatih ananda mengambil keputusan tanpa kewalahan.'), $img('/images/pembiasaan-bersih.jpg', 'Siswa membiasakan kebersihan di sekolah', 'Pembiasaan karakter di sekolah (contoh).')]],
        ['title' => 'Contoh: Mengenal Learning Support Unit (LSU)', 'subtitle' => 'Pendampingan yang membuat setiap anak belajar dengan caranya.', 'cat' => 'Inklusi', 'tags' => ['inklusi', 'lsu'],
         'aud' => $both, 'hero' => '/images/siswa-membaca.jpg', 'author' => 'Tim Humas SD Alfa Centauri',
         'blocks' => [$p('Artikel <strong>contoh</strong>. Isi sebenarnya perlu ditulis dan ditinjau tim LSU dan psikolog sekolah.'), $h('Apa itu LSU?'), $p('Learning Support Unit adalah layanan pendampingan di bawah pengawasan psikolog untuk akademik dan perilaku.'), ['t' => 'ul', 'style' => 'bullets', 'items' => ['Program Pendampingan Individual (PPI)', 'Layanan terapi terintegrasi', 'Kegiatan penguatan motorik dan fokus']]]],
        ['title' => 'Contoh: Berita Prestasi Siswa', 'subtitle' => 'Cara menulis kabar prestasi yang menginspirasi tanpa membandingkan anak.', 'cat' => 'Berita', 'tags' => ['prestasi', 'lomba'],
         'aud' => $both, 'hero' => '/images/siswa-olahraga.jpg', 'author' => 'Tim Humas SD Alfa Centauri',
         'blocks' => [$p('Artikel <strong>contoh</strong>. Pastikan ada izin orang tua sebelum memuat foto atau nama siswa, dan pakai inisial bila perlu.'), $h('Yang perlu ada'), ['t' => 'ul', 'style' => 'numbers', 'items' => ['Nama lomba, tingkat, dan tanggal', 'Apa yang dipelajari ananda dari prosesnya', 'Ucapan terima kasih untuk guru pembina dan orang tua']]]],
    ];
}

function art_seed_samples(int $userId): int
{
    $n = 0;
    $base = time() - 86400;
    foreach (art_sample_data() as $i => $s) {
        [$d, $err] = art_validate([
            'title' => $s['title'], 'subtitle' => $s['subtitle'], 'hero' => $s['hero'], 'author' => $s['author'], 'category' => $s['cat'],
            'tags' => $s['tags'], 'audiences' => $s['aud'], 'status' => 'published', 'blocks' => $s['blocks'],
        ], ['role' => 'admin']);
        if ($err) {
            error_log('art sample: ' . implode('; ', $err));
            continue;
        }
        $d['published_at'] = gmdate('Y-m-d H:i:s', $base - $i * 86400 * 3);
        art_save($d, 0, $userId, true);
        $n++;
    }
    return $n;
}

function art_purge_samples(): int
{
    $ids = db()->query('SELECT id FROM articles WHERE is_sample = 1')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $id) {
        art_delete((int) $id);
    }
    return count($ids);
}


/** blok "text" sebagai Markdown: judul (##, ###, ####), paragraf, dan daftar */
function art_rich_markdown(string $html): string
{
    $doc = new DOMDocument('1.0', 'UTF-8');
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8"><div id="r">' . $html . '</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    $root = $doc->getElementById('r');
    if (!$root) {
        return '';
    }
    $lines = [];
    $isList = static fn(DOMNode $x): bool => $x instanceof DOMElement && in_array(strtolower($x->nodeName), ['ul', 'ol'], true);
    $list = static function (DOMElement $l, int $depth) use (&$list, &$lines, $doc, $isList): void {
        $i = 0;
        foreach ($l->childNodes as $li) {
            if (!($li instanceof DOMElement) || strtolower($li->nodeName) !== 'li') {
                continue;
            }
            $i++;
            $own = '';
            foreach ($li->childNodes as $x) {
                if (!$isList($x)) {
                    $own .= $doc->saveHTML($x);
                }
            }
            $txt = art_plain($own);
            if ($txt !== '') {
                $lines[] = str_repeat('  ', $depth) . (strtolower($l->nodeName) === 'ol' ? $i . '. ' : '- ') . $txt;
            }
            foreach ($li->childNodes as $x) {
                if ($isList($x)) {
                    $list($x, $depth + 1);
                }
            }
        }
    };
    foreach ($root->childNodes as $c) {
        if (!($c instanceof DOMElement)) {
            continue;
        }
        $tag = strtolower($c->nodeName);
        if (in_array($tag, ['h2', 'h3', 'h4'], true)) {
            $lines[] = str_repeat('#', (int) $tag[1]) . ' ' . art_plain($doc->saveHTML($c) ?: '');
        } elseif ($tag === 'p') {
            $lines[] = art_plain($doc->saveHTML($c) ?: '');
        } elseif ($isList($c)) {
            $list($c, 0);
        }
    }
    return implode("\n", array_filter($lines, static fn($l) => trim((string) $l) !== ''));
}

/** isi artikel sebagai Markdown (untuk llms-full.txt) */
function art_blocks_markdown(array $blocks): string
{
    $o = [];
    $t = static fn(string $h): string => trim(html_entity_decode(strip_tags(str_replace(['<br>', '</p>'], ' ', $h)), ENT_QUOTES, 'UTF-8'));
    foreach ($blocks as $b) {
        switch ($b['t'] ?? '') {
            case 'h':
                $lv = (int) ($b['level'] ?? 2);
                $o[] = str_repeat('#', $lv >= 2 && $lv <= 4 ? $lv : 2) . ' ' . $t((string) $b['text']);
                break;
            case 'text':
                $o[] = art_rich_markdown((string) $b['html']);
                break;
            case 'p':
                $o[] = $t((string) $b['html']);
                break;
            case 'ul':
                $n = 0;
                $o[] = implode("\n", array_map(static fn($i) => (($b['style'] ?? '') === 'numbers' ? (++$n) . '. ' : '- ') . $i, (array) $b['items']));
                break;
            case 'quote':
                $o[] = '> ' . str_replace("\n", "\n> ", (string) $b['text']) . (($b['cite'] ?? '') !== '' ? ' (' . $b['cite'] . ')' : '');
                break;
            case 'img':
                if (($b['alt'] ?? '') !== '' || ($b['caption'] ?? '') !== '') {
                    $o[] = '[Gambar: ' . trim(($b['alt'] ?? '') . ' ' . ($b['caption'] ?? '')) . ']';
                }
                break;
            case 'callout':
                $o[] = '> ' . trim((($b['title'] ?? '') !== '' ? $b['title'] . ': ' : '') . $b['text']);
                break;
            case 'faq':
                foreach ($b['items'] as $it) {
                    $o[] = '**' . $it['q'] . '**' . "\n" . $it['a'];
                }
                break;
            case 'cards':
                foreach ((array) ($b['items'] ?? []) as $it) {
                    $it = (array) $it;
                    $lines = [];
                    if (($it['title'] ?? '') !== '') {
                        $lines[] = '**' . $it['title'] . '**';
                    }
                    if (($it['text'] ?? '') !== '') {
                        $lines[] = str_replace("\n", ' ', (string) $it['text']);
                    }
                    if (($it['label'] ?? '') !== '' && ($it['url'] ?? '') !== '') {
                        $lines[] = '[' . $it['label'] . '](' . $it['url'] . ')';
                    }
                    if ($lines) {
                        $o[] = implode("\n", $lines);
                    }
                }
                break;
            case 'table':
                $o[] = art_table_markdown($b);
                break;
            case 'columns':
                foreach ((array) ($b['cols'] ?? []) as $col) {
                    $o[] = art_blocks_markdown((array) $col);
                }
                break;
        }
    }
    return implode("\n\n", array_filter($o, static fn($x) => trim((string) $x) !== ''));
}

/** blok "table" sebagai tabel Markdown (GFM). Tanpa baris judul, baris judul Markdown dibiarkan kosong. */
function art_table_markdown(array $b): string
{
    $rows = array_values(array_filter((array) ($b['rows'] ?? []), 'is_array'));
    if (!$rows) {
        return '';
    }
    $n = max(1, count($rows[0]));
    $al = array_values((array) ($b['aligns'] ?? []));
    $line = static function (array $cells) use ($n): string {
        $c = [];
        for ($i = 0; $i < $n; $i++) {
            $c[] = str_replace('|', '\|', art_cell_md((string) ($cells[$i] ?? '')));
        }
        return '| ' . implode(' | ', $c) . ' |';
    };
    $mark = [];
    for ($i = 0; $i < $n; $i++) {
        $a = $al[$i] ?? 'left';
        $mark[] = $a === 'center' ? ':---:' : ($a === 'right' ? '---:' : '---');
    }
    $head = !empty($b['header']) ? array_shift($rows) : array_fill(0, $n, '');
    $o = [];
    if (($b['caption'] ?? '') !== '') {
        $o[] = '**' . $b['caption'] . '**' . "\n";
    }
    $o[] = $line($head);
    $o[] = '| ' . implode(' | ', $mark) . ' |';
    foreach ($rows as $r) {
        $o[] = $line((array) $r);
    }
    return implode("\n", $o);
}

/* ------------------------------------------------------------------ */
/* Blok HTML: kode buatan Admin di bingkai terisolasi                  */
/* ------------------------------------------------------------------ */

/** @return array{0:string,1:?string}  [kode yang sudah dirapikan, pesan masalah atau null] */
function art_html_code(mixed $v): array
{
    $s = is_string($v) ? $v : '';
    if (strlen($s) > ART_HTML_MAX * 4) {
        return ['', 'terlalu panjang (maksimal ' . number_format(ART_HTML_MAX, 0, ',', '.') . ' huruf)'];
    }
    $s = str_replace(["\r\n", "\r", "\0"], ["\n", "\n", ''], $s);
    if (!mb_check_encoding($s, 'UTF-8')) {
        return ['', 'bukan teks UTF-8 yang valid'];
    }
    if (mb_strlen($s) > ART_HTML_MAX) {
        return ['', 'terlalu panjang (maksimal ' . number_format(ART_HTML_MAX, 0, ',', '.') . ' huruf)'];
    }
    return [$s, null];
}

/** sidik jari kode + izin skrip: Editor hanya boleh menyimpan blok html yang sama persis dengan yang sudah tersimpan */
function art_html_fp(string $code, bool $scripts): string
{
    return hash('sha256', $code . "\0" . ($scripts ? '1' : '0'));
}

/** blok html tingkat atas dengan id tertentu dari artikel (baris dari art_get / art_get_published) */
function art_find_html_block(array $article, string $bid): ?array
{
    $blocks = json_decode((string) ($article['body'] ?? ''), true);
    foreach (is_array($blocks) ? $blocks : [] as $b) {
        if (is_array($b) && ($b['t'] ?? '') === 'html' && ($b['id'] ?? null) === $bid && is_string($b['code'] ?? null)) {
            return $b;
        }
    }
    return null;
}

/** artikel yang sudah terbit (dan waktunya sudah lewat), menurut id */
function art_get_published(int $id): ?array
{
    $st = db()->prepare(ART_SELECT . " WHERE a.id = ? AND a.status = 'published' AND a.published_at <= UTC_TIMESTAMP()");
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ? art_attach_tags([art_row_extra($r)])[0] : null;
}

/**
 * Cara blok html ditampilkan di sebuah halaman:
 *  - 'public'     : halaman terbit. Bingkai memuat /articles/frame.php?id=&b= (hanya artikel yang sudah terbit).
 *  - 'panel-get'  : pratinjau artikel tersimpan di panel. Bingkai memuat <panel>/article-frame.php?id=&b= (butuh login).
 *  - 'panel-post' : pratinjau isi editor yang BELUM disimpan (hanya Admin). Kode dikirim lewat formulir ke <panel>/article-frame.php.
 * @return array<string,mixed>
 */
function art_frame_ctx(array $a, bool $preview): array
{
    $id = (int) ($a['id'] ?? 0);
    if (!$preview) {
        return ['frames' => 'public', 'id' => $id];
    }
    $panel = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/edizon/x.php'))), '/');
    if (defined('ART_DRAFT_PREVIEW') && ART_DRAFT_PREVIEW === true) {
        $u = function_exists('current_user') ? current_user() : null;
        if (is_array($u) && is_admin($u)) {
            return ['frames' => 'panel-post', 'id' => $id, 'panel' => $panel, 'csrf' => csrf_token()];
        }
    }
    return ['frames' => 'panel-get', 'id' => $id, 'panel' => $panel];
}

function art_html_figure(array $b, array $ctx, string $wide): string
{
    $bid = (string) ($b['id'] ?? '');
    $mode = (string) ($ctx['frames'] ?? '');
    $id = (int) ($ctx['id'] ?? 0);
    $h = in_array($b['h'] ?? '', ART_HTML_HEIGHTS, true) ? (string) $b['h'] : 'auto';
    $cap = (string) ($b['caption'] ?? '');
    $attrs = 'class="a-hf a-hf-' . $h . '" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" title="'
        . art_e($cap !== '' ? $cap : 'Konten HTML') . '"' . ($h === 'auto' ? ' data-auto="1"' : '');
    $okId = preg_match('/^[a-z0-9]{4,12}$/', $bid) === 1;
    $v = substr(hash('sha256', (string) ($b['code'] ?? '') . (!empty($b['scripts']) ? '1' : '0')), 0, 8);
    if ($mode === 'public' && $id > 0 && $okId) {
        $url = art_e('/articles/frame.php?id=' . $id . '&b=' . $bid . '&v=' . $v);
        // dengan JavaScript: articles.js memberi bingkai data localStorage pengunjung (lewat nama jendela) sebelum bingkai dimuat, jadi alamatnya baru dipasang di sana
        $inner = !empty($b['scripts'])
            ? '<iframe ' . $attrs . ' loading="lazy" data-ls="' . $id . ':' . $bid . '" data-src="' . $url . '"></iframe>'
            : '<iframe ' . $attrs . ' loading="lazy" src="' . $url . '"></iframe>';
    } elseif ($mode === 'panel-get' && $id > 0 && $okId) {
        $inner = '<iframe ' . $attrs . ' src="' . art_e(((string) ($ctx['panel'] ?? '/edizon')) . '/article-frame.php?id=' . $id . '&b=' . $bid . '&v=' . $v) . '"></iframe>';
    } elseif ($mode === 'panel-post' && $okId) {
        $inner = '<iframe ' . $attrs . ' name="hf-' . $bid . '"></iframe>'
            . '<form class="a-hf-post" method="post" action="' . art_e(((string) ($ctx['panel'] ?? '/edizon')) . '/article-frame.php') . '" target="hf-' . $bid . '" hidden>'
            . '<input type="hidden" name="_csrf" value="' . art_e((string) ($ctx['csrf'] ?? '')) . '"><input type="hidden" name="scripts" value="' . (!empty($b['scripts']) ? '1' : '0') . '">'
            . "<textarea name=\"code\" hidden>\n" . art_e((string) ($b['code'] ?? '')) . '</textarea></form>';
    } else {
        $inner = '<p class="a-note">Blok HTML ditampilkan di halaman terbit setelah artikel disimpan.</p>';
    }
    return '<figure class="a-fig a-html' . (($b['size'] ?? '') === 'wide' ? $wide : '') . '">' . $inner
        . ($cap !== '' ? '<figcaption>' . art_e($cap) . '</figcaption>' : '') . "</figure>\n";
}

/**
 * Kebijakan keamanan untuk dokumen bingkai. "sandbox" ada di sini juga: kalau halaman bingkai dibuka langsung di tab, ia tetap
 * berasal dari asal "opaque" (bukan situs ini) dan tidak bisa membaca cookie atau data situs.
 */
function art_frame_csp(bool $scripts, string $nonce): string
{
    return "default-src 'none'; sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; "
        . 'script-src ' . ($scripts ? "'unsafe-inline' https:" : "'nonce-" . $nonce . "'") . '; '
        . "style-src 'unsafe-inline' https:; img-src 'self' https: data:; font-src 'self' https: data:; media-src 'self' https:; frame-src https:; "
        . 'connect-src ' . ($scripts ? 'https:' : "'none'") . "; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'self'";
}

/** dokumen bingkai: kode Admin di dalam #en-root, ditambah skrip kecil yang melaporkan tinggi isi ke halaman induk */
function art_frame_doc(string $code, string $nonce, bool $scripts = false, ?array $enq = null): string
{
    $report = '(function(){var r=document.getElementById("en-root"),last=0,t=0;'
        . 'function send(){t=0;var h=Math.ceil(r.getBoundingClientRect().height);if(h!==last){last=h;try{parent.postMessage({enFrame:1,h:h},"*");}catch(e){}}}'
        . 'function soon(){if(!t){t=setTimeout(send,30);}}'
        . 'if(window.ResizeObserver){new ResizeObserver(soon).observe(r);}'
        . 'window.addEventListener("load",soon);window.addEventListener("resize",soon);soon();setTimeout(send,400);setTimeout(send,1600);})();';
    // Bingkai tanpa allow-same-origin tidak boleh memakai localStorage / sessionStorage (error SecurityError). Dengan JavaScript menyala, kode mendapat penyimpanan
    // pengganti: localStorage dimuat dari nama jendela yang diisi halaman terbit (articles.js menyimpannya di browser pengunjung, terpisah untuk tiap blok) dan
    // perubahannya dikirim balik lewat postMessage; sessionStorage hanya di memori. Di pratinjau panel tidak ada yang disimpan.
    $store = '(function(){var H=Object.prototype.hasOwnProperty;function mk(d,ch){var a={getItem:function(k){k=String(k);return H.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v);ch()},'
        . 'removeItem:function(k){delete d[String(k)];ch()},clear:function(){for(var k in d)delete d[k];ch()},key:function(i){var x=Object.keys(d);return i>=0&&i<x.length?x[i]:null}};'
        . 'return new Proxy({},{get:function(_,p){if(typeof p!=="string")return undefined;if(H.call(a,p))return a[p];if(p==="length")return Object.keys(d).length;return H.call(d,p)?d[p]:undefined},'
        . 'set:function(_,p,v){if(typeof p==="string"&&!H.call(a,p)&&p!=="length")a.setItem(p,v);return true},'
        . 'deleteProperty:function(_,p){if(typeof p==="string")a.removeItem(p);return true},'
        . 'has:function(_,p){return typeof p==="string"&&(H.call(a,p)||p==="length"||H.call(d,p))},'
        . 'ownKeys:function(){return Object.keys(d)},'
        . 'getOwnPropertyDescriptor:function(_,p){return typeof p==="string"&&H.call(d,p)?{value:d[p],writable:true,enumerable:true,configurable:true}:undefined}})}'
        . 'var d=Object.create(null),n=window.name,t=0,ls=mk(d,function(){if(t)return;t=setTimeout(function(){t=0;try{parent.postMessage({enFrame:2,ls:JSON.parse(JSON.stringify(d))},"*")}catch(e){}},300)}),ss=mk(Object.create(null),function(){});'
        . 'if(typeof n==="string"&&n.indexOf("enls:")===0){try{var o=JSON.parse(n.slice(5));if(o&&typeof o==="object"){for(var k in o)if(typeof o[k]==="string")d[k]=o[k]}}catch(e){}window.name=""}'
        . 'try{Object.defineProperty(window,"localStorage",{configurable:true,get:function(){return ls}})}catch(e){}'
        . 'try{Object.defineProperty(window,"sessionStorage",{configurable:true,get:function(){return ss}})}catch(e){}})();';
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex, nofollow"><base target="_blank">'
        . '<style>html,body{margin:0;padding:0}body{font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937}#en-root{display:flow-root}img,video,iframe{max-width:100%}</style>'
        . ($scripts ? '<script>' . $store . '</script>' : '')
        // halaman hasil kuis: data tes (nama, skor, level, variabel) tersedia sebagai window.ENQ, juga untuk kode tanpa izin JavaScript sendiri (skrip ini diberi nonce)
        . ($enq !== null ? '<script nonce="' . $nonce . '">window.ENQ=Object.freeze(' . json_encode($enq, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_FORCE_OBJECT) . ');</script>' : '')
        . '</head><body><div id="en-root">' . $code . '</div><script nonce="' . $nonce . '">' . $report . '</script></body></html>';
}

/** kirim dokumen bingkai (dengan header sendiri, menggantikan header panel) lalu berhenti */
function art_frame_send(string $code, bool $scripts, string $cache = 'no-store', ?array $enq = null): never
{
    $nonce = rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
    foreach (['Content-Security-Policy', 'X-Frame-Options', 'Cache-Control', 'Referrer-Policy', 'X-Robots-Tag', 'X-Content-Type-Options', 'Content-Type'] as $hn) {
        header_remove($hn);
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Security-Policy: ' . art_frame_csp($scripts, $nonce));
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: ' . $cache);
    echo art_frame_doc($code, $nonce, $scripts, $enq);
    exit;
}

function art_frame_missing(): never
{
    foreach (['Content-Security-Policy', 'X-Frame-Options', 'Cache-Control', 'Content-Type'] as $hn) {
        header_remove($hn);
    }
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'none'; sandbox; frame-ancestors 'self'");
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo '<!doctype html><meta charset="utf-8"><p>Konten tidak tersedia.</p>';
    exit;
}
