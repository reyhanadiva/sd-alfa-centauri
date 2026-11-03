<?php
/**
 * Templat blok (JSON) untuk editor artikel, pop-up, dan halaman hasil kuis.
 *  - GET                : daftar templat (tanpa isi).
 *  - GET ?id=N          : isi satu templat, siap disisipkan (blok HTML dibuang bila bukan Admin).
 *  - POST {action:'save', name, mode, blocks}   : simpan templat baru (blok dicuci seperti saat menyimpan halaman).
 *  - POST {action:'rename', id, name}           : ganti nama (pembuat atau Admin).
 *  - POST {action:'delete', id}                 : hapus (pembuat atau Admin).
 * POST memakai header X-CSRF-Token.
 */
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_content_editor();
header('Cache-Control: no-store');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($sent === '' || !hash_equals(csrf_token(), $sent)) {
            json_out(['ok' => false, 'errors' => ['Sesi formulir kedaluwarsa. Muat ulang halaman.']], 403);
        }
        $body = json_decode((string) file_get_contents('php://input', false, null, 0, 1000000), true);
        if (!is_array($body)) {
            json_out(['ok' => false, 'errors' => ['Data tidak valid.']], 400);
        }
        $action = (string) ($body['action'] ?? '');
        $id = (int) ($body['id'] ?? 0);
        if ($action === 'save') {
            [$row, $errs, $info] = tpl_save($body, $u);
            if ($errs) {
                json_out(['ok' => false, 'errors' => $errs], 422);
            }
            audit((int) $u['id'], 'template_save', (string) $row['id']);
            json_out(['ok' => true, 'item' => $row] + $info);
        }
        if ($action === 'rename') {
            [$row, $errs] = tpl_rename($id, (string) ($body['name'] ?? ''), $u);
            if ($errs) {
                json_out(['ok' => false, 'errors' => $errs], 422);
            }
            audit((int) $u['id'], 'template_rename', (string) $id);
            json_out(['ok' => true, 'item' => $row]);
        }
        if ($action === 'delete') {
            $errs = tpl_delete($id, $u);
            if ($errs) {
                json_out(['ok' => false, 'errors' => $errs], 422);
            }
            audit((int) $u['id'], 'template_delete', (string) $id);
            json_out(['ok' => true]);
        }
        json_out(['ok' => false, 'errors' => ['Permintaan tidak valid.']], 400);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        json_out(['ok' => false, 'errors' => ['Permintaan tidak valid.']], 405);
    }
    $id = (int) ($_GET['id'] ?? 0);
    if ($id > 0) {
        $t = tpl_get($id, $u);
        if ($t === null) {
            json_out(['ok' => false, 'errors' => ['Templat tidak ditemukan. Mungkin sudah dihapus.']], 404);
        }
        json_out(['ok' => true, 'template' => $t]);
    }
    json_out(['ok' => true, 'items' => tpl_list($u), 'max' => TPL_MAX]);
} catch (Throwable $e) {
    error_log('templates: ' . $e->getMessage());
    json_out(['ok' => false, 'errors' => ['Templat tidak bisa diproses. Periksa koneksi database.']], 500);
}
