<?php
/**
 * Bingkai blok HTML untuk pengguna panel yang sudah masuk (pratinjau di editor dan di halaman Pratinjau).
 *  - GET ?id=<id artikel>&b=<id blok> : blok yang tersimpan (termasuk artikel draf).
 *  - POST (_csrf, code, scripts)      : kode SAAT INI di editor, belum disimpan. Hanya Admin. Tidak ada yang ditulis.
 * Dokumen disajikan dengan kebijakan keamanan sendiri (art_frame_csp), jadi bukan bagian dari halaman panel.
 */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    if (!is_admin($u)) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Hanya Admin yang bisa memakai blok HTML.';
        exit;
    }
    [$code, $err] = art_html_code($_POST['code'] ?? '');
    if ($err !== null) {
        http_response_code(422);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Kode ' . $err . '.';
        exit;
    }
    art_frame_send($code, ($_POST['scripts'] ?? '') === '1');
}

$bid = (string) ($_GET['b'] ?? '');
$a = preg_match('/^[a-z0-9]{4,12}$/', $bid) === 1 ? art_get((int) ($_GET['id'] ?? 0)) : null;
$b = $a ? art_find_html_block($a, $bid) : null;
if ($b === null) {
    art_frame_missing();
}
art_frame_send((string) $b['code'], !empty($b['scripts']));
