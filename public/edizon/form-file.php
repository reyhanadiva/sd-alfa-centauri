<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_leads_access();
$id = (int) ($_GET['id'] ?? 0);
$st = db()->prepare('SELECT original, stored, mime FROM form_files WHERE id = ?');
$st->execute([$id]);
$f = $st->fetch();
$path = $f ? form_files_dir() . '/' . basename((string) $f['stored']) : '';
if (!$f || !is_file($path)) {
    http_response_code(404);
    echo 'Berkas tidak ditemukan.';
    exit;
}
$name = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) $f['original']) ?: 'berkas';
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $name . '"');
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . filesize($path));
audit((int) $u['id'], 'form_file', (string) $id);
readfile($path);
