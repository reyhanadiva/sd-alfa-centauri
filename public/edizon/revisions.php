<?php
/**
 * Riwayat versi (JSON, hanya baca) untuk editor artikel, pop-up, dan kuis.
 *  - GET ?kind=article|popup|quiz&id=N          : daftar versi (terbaru dulu), tanpa isi.
 *  - GET ?kind=...&id=N&rev=R                    : isi satu versi (bentuk data editor), untuk pratinjau dan "Kembalikan".
 * Mengembalikan versi tidak ditulis di sini: editor memuat isinya sebagai perubahan yang belum disimpan, dan baru jadi versi baru saat Simpan.
 */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
header('Cache-Control: no-store');

$kind = (string) ($_GET['kind'] ?? '');
$id = (int) ($_GET['id'] ?? 0);
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || !isset(REV_KINDS[$kind]) || $id < 1) {
    json_out(['ok' => false, 'errors' => ['Permintaan tidak valid.']], 400);
}

try {
    $rid = (int) ($_GET['rev'] ?? 0);
    if ($rid > 0) {
        $data = rev_get($kind, $id, $rid);
        if ($data === null) {
            json_out(['ok' => false, 'errors' => ['Versi tidak ditemukan. Mungkin sudah terhapus karena hanya ' . REV_KEEP . ' versi terakhir yang disimpan.']], 404);
        }
        json_out(['ok' => true, 'data' => $data]);
    }
    $revs = [];
    foreach (rev_list($kind, $id) as $r) {
        $revs[] = ['id' => $r['id'], 'at' => fmt_time($r['saved_at']), 'by' => $r['saved_by_name'] ?? 'Sistem', 'title' => $r['title'], 'summary' => $r['summary']];
    }
    json_out(['ok' => true, 'revs' => $revs, 'keep' => REV_KEEP]);
} catch (Throwable $e) {
    error_log('revisions: ' . $e->getMessage());
    json_out(['ok' => false, 'errors' => ['Riwayat tidak bisa dibaca. Periksa koneksi database.']], 500);
}
