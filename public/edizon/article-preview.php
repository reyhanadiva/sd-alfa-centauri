<?php
/**
 * Pratinjau artikel untuk pengguna panel yang sudah masuk.
 *  - GET ?id=N : versi yang tersimpan (termasuk draf).
 *  - GET ?id=N&rev=R : satu versi lama dari riwayat (pratinjau saja).
 *  - POST (dari tombol Pratinjau di editor): isi editor SAAT INI, termasuk perubahan yang belum disimpan. Tidak ada yang ditulis ke database.
 */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
define('ART_PREVIEW', true);
require dirname(__DIR__) . '/articles/_boot.php';
require dirname(__DIR__) . '/articles/_view.php';
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $in = json_decode((string) ($_POST['data'] ?? ''), true);
    if (!is_array($in)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Data pratinjau tidak valid. Tutup tab ini dan coba lagi dari editor.';
        exit;
    }
    $in['status'] = 'draft'; // pratinjau tidak mensyaratkan gambar utama dan sebagainya
    [$clean, $errs] = art_validate($in, $u);
    define('ART_DRAFT_PREVIEW', true);
    art_view_page(art_draft_row($clean, $u, (int) ($in['id'] ?? 0)), true, $errs);
    exit;
}

$rev = (int) ($_GET['rev'] ?? 0);
if ($rev > 0) { // satu versi lama dari riwayat: ditampilkan seperti pratinjau draf, tidak ada yang diubah
    $aid = (int) ($_GET['id'] ?? 0);
    $in = art_get($aid) ? rev_get('article', $aid, $rev) : null;
    if ($in === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Versi tidak ditemukan.';
        exit;
    }
    $in['status'] = 'draft';
    [$clean, $errs] = art_validate($in, $u);
    define('ART_DRAFT_PREVIEW', true);
    art_view_page(art_draft_row($clean, $u, $aid), true, array_merge(['Ini versi lama #' . $rev . ' dari riwayat. Belum dikembalikan ke editor.'], $errs));
    exit;
}

$a = art_get((int) ($_GET['id'] ?? 0));
if (!$a) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Artikel tidak ditemukan.';
    exit;
}
art_view_page($a, true);
