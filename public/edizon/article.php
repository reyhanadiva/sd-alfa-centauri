<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
$id = (int) ($_GET['id'] ?? 0);
$art = $id > 0 ? art_get($id) : null;
if ($id > 0 && !$art) {
    flash_set('err', 'Artikel tidak ditemukan.');
    redirect('articles.php');
}

function art_site_name_safe(): string
{
    try {
        $d = doc_get('site');
        return is_array($d) && is_string($d['name'] ?? null) && $d['name'] !== '' ? $d['name'] : 'SD Alfa Centauri';
    } catch (Throwable) {
        return 'SD Alfa Centauri';
    }
}

/** kata kunci fokus artikel lain (untuk peringatan "sudah dipakai") */
function seo_used_keywords(int $exceptId): array
{
    $out = [];
    try {
        foreach (db()->query('SELECT s.article_id, s.data, a.title FROM article_seo s JOIN articles a ON a.id = s.article_id')->fetchAll() as $r) {
            $d = json_decode((string) $r['data'], true);
            if ((int) $r['article_id'] !== $exceptId && is_array($d) && trim((string) ($d['keyword'] ?? '')) !== '') {
                $out[] = ['id' => (int) $r['article_id'], 'keyword' => (string) $d['keyword'], 'title' => (string) $r['title']];
            }
        }
    } catch (Throwable) {
    }
    return $out;
}

function art_to_editor(?array $a, array $u): array
{
    if (!$a) {
        return ['id' => 0, 'title' => '', 'subtitle' => '', 'slug' => '', 'hero' => '', 'author' => '', 'category' => '', 'tags' => [],
            'audiences' => ['kids', 'adult'], 'status' => 'draft', 'publishedAt' => '', 'excerpt' => '', 'blocks' => [], 'seo' => art_seo_default(),
            'writer' => (string) $u['name'], 'url' => ''];
    }
    $pub = '';
    if ($a['published_at']) {
        $pub = (new DateTimeImmutable((string) $a['published_at'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Y-m-d\TH:i');
    }
    $blocks = json_decode((string) $a['body'], true);
    return ['id' => (int) $a['id'], 'title' => $a['title'], 'subtitle' => $a['subtitle'], 'slug' => $a['slug'], 'hero' => $a['hero'],
        'author' => $a['author'], 'category' => (string) ($a['category_name'] ?? ''), 'tags' => array_map(static fn($t) => $t['name'], $a['tags']),
        'audiences' => $a['audiences'], 'status' => $a['status'], 'publishedAt' => $pub, 'excerpt' => $a['excerpt'],
        'blocks' => is_array($blocks) ? $blocks : [], 'seo' => $a['seo'], 'writer' => (string) ($a['writer_name'] ?? $u['name']), 'url' => '/articles/' . $a['slug']];
}

/* ---- simpan (AJAX, JSON) ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
        json_out(['ok' => false, 'errors' => ['Sesi formulir kedaluwarsa. Muat ulang halaman.']], 403);
    }
    $body = json_decode((string) file_get_contents('php://input', false, null, 0, 3000000), true);
    if (!is_array($body) || !is_array($body['data'] ?? null)) {
        json_out(['ok' => false, 'errors' => ['Data tidak valid.']], 400);
    }
    $saveId = (int) ($body['data']['id'] ?? 0);
    if ($saveId > 0 && !art_get($saveId)) {
        json_out(['ok' => false, 'errors' => ['Artikel ini sudah dihapus.']], 404);
    }
    [$clean, $errs] = art_validate($body['data'], $u);
    if ($errs) {
        json_out(['ok' => false, 'errors' => $errs], 422);
    }
    try {
        $newId = art_save($clean, $saveId, (int) $u['id']);
    } catch (Throwable $e) {
        error_log('article save: ' . $e->getMessage());
        json_out(['ok' => false, 'errors' => ['Gagal menyimpan. Periksa koneksi database.']], 500);
    }
    audit((int) $u['id'], $saveId ? 'article_save' : 'article_create', (string) $newId);
    $fresh = art_to_editor(art_get($newId), $u);
    rev_snapshot('article', $newId, $fresh, (int) $u['id']);
    json_out(['ok' => true, 'data' => $fresh, 'savedAt' => fmt_time(now_utc())]);
}

$terms = art_terms();
$boot = [
    'csrf' => csrf_token(), 'isAdmin' => is_admin($u), 'data' => art_to_editor($art, $u),
    'terms' => ['categories' => array_map(static fn($c) => ['name' => $c['name'], 'n' => $c['n']], $terms['categories']), 'tags' => array_map(static fn($t) => ['name' => $t['name'], 'n' => $t['n']], $terms['tags'])],
    'embedHosts' => ART_EMBED_HOSTS,
    'seo' => [
        'siteName' => art_site_name_safe(),
        'aiSearch' => (bool) seo_settings()['aiSearch'],
        'used' => seo_used_keywords($id),
    ],
];
page_head($art ? 'Edit artikel' : 'Artikel baru', $u, 'wide');
?>
<link rel="stylesheet" href="../articles/template-vars.css?v=<?= h(PANEL_VERSION) ?>">
<link rel="stylesheet" href="assets/article-editor.css?v=<?= h(PANEL_VERSION) ?>">
<div class="bar">
  <h1><?= $art ? 'Edit artikel' : 'Artikel baru' ?></h1>
  <a class="btn ghost" href="articles.php">Semua artikel</a>
</div>
<details class="card guide" open>
  <summary><strong>Panduan SEO &amp; kepatuhan</strong> <small class="muted">(ditetapkan Super Admin; baca sebelum menerbitkan)</small></summary>
  <div class="guide-text"><?= nl2br(h(seo_author_guide())) ?></div>
</details>
<p class="muted" id="last-saved"><?= $art ? 'Terakhir diubah: ' . h(fmt_time($art['updated_at'])) : 'Belum disimpan.' ?></p>
<div id="errors" class="flash err" hidden></div>
<div id="editor" aria-live="polite"><noscript>Aktifkan JavaScript untuk menggunakan editor ini.</noscript></div>
<div class="savebar">
  <span id="dirty" class="muted" hidden>Ada perubahan yang belum disimpan</span>
  <button class="btn ghost" id="preview" type="button" title="Buka artikel seperti tampilan sebenarnya, termasuk perubahan yang belum disimpan">Pratinjau</button>
  <button class="btn" id="save" type="button">Simpan</button>
</div>
<script type="application/json" id="boot"><?= json_for_html($boot) ?></script>
<?php page_foot(['picker.js', 'ed.js', 'revisions.js', 'article-seo.js', 'article-editor.js', 'article.js']);
