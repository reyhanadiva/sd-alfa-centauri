<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = current_user();
if (!$u) {
    json_out(['ok' => false, 'error' => 'Sesi berakhir. Masuk lagi.'], 401);
}
if (!can_edit_content($u)) {
    json_out(['ok' => false, 'error' => 'Tidak punya izin untuk mengunggah gambar.'], 403);
}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_out(['ok' => true, 'items' => media_list()]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'error' => 'Metode tidak didukung.'], 405);
}
$sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
    json_out(['ok' => false, 'error' => 'Sesi formulir kedaluwarsa. Muat ulang halaman.'], 403);
}
if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
    json_out(['ok' => false, 'error' => 'Tidak ada file.'], 400);
}
$r = process_upload($_FILES['file'], (int) $u['id']);
if ($r['ok']) {
    audit((int) $u['id'], 'upload', (string) $r['path']);
    json_out(['ok' => true, 'path' => $r['path'], 'format' => $r['format'] ?? '', 'bytes' => $r['bytes'] ?? 0]);
}
json_out(['ok' => false, 'error' => (string) $r['error']], 422);
