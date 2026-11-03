<?php
/**
 * Terima kiriman formulir. Urutan: periksa → simpan ke database → teruskan SEMUA isian ke Zapier.
 * Bila Zapier tidak terjangkau, data tetap tersimpan dan balasan "upstream" membuat formulir menawarkan jalur WhatsApp.
 */
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    forms_json(['ok' => false, 'error' => 'method'], 405);
}
// hanya dari halaman situs sendiri
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')) ?? '')) {
    forms_json(['ok' => false, 'error' => 'origin'], 403);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 12 * 1024 * 1024) {
    forms_json(['ok' => false, 'error' => 'too_large'], 413);
}
// kolom jebakan spam
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    forms_json(['ok' => true]);
}
$slug = strtolower((string) ($_POST['form'] ?? ''));
$form = preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $slug) ? form_get_by_slug($slug) : null;
if (!$form) {
    forms_json(['ok' => false, 'error' => 'not_found'], 404);
}
$aud = ($_POST['audience'] ?? '') === 'adult' ? 'adult' : 'kids';

$r = form_collect($form, $_POST, $_FILES, $aud);
if ($r['errors']) {
    forms_json(['ok' => false, 'error' => 'invalid', 'errors' => $r['errors']], 422);
}

// batas kiriman: maksimal 8 per 10 menit untuk satu alamat IP
$rateFile = storage_dir() . '/rate-forms-' . hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown')) . '.json';
$now = time();
$stamps = [];
if (is_file($rateFile)) {
    $s = json_decode((string) @file_get_contents($rateFile), true);
    $stamps = is_array($s) ? array_values(array_filter($s, static fn($t) => is_int($t) && $t > $now - 600)) : [];
}
if (count($stamps) >= 8) {
    forms_json(['ok' => false, 'error' => 'rate_limited'], 429);
}
$stamps[] = $now;
@file_put_contents($rateFile, json_encode($stamps), LOCK_EX);

$qs = mb_substr((string) ($_POST['qs'] ?? ''), 0, 300);
$page = mb_substr((string) ($_POST['page'] ?? ''), 0, 300);
try {
    $sid = form_store($form, $r['values'], $r['files'], $aud, $qs, $page);
} catch (Throwable $e) {
    error_log('form store: ' . $e->getMessage());
    forms_json(['ok' => false, 'error' => 'store'], 500);
}
[$ok] = form_forward($form, $sid, $r['values'], $aud, $qs, $page);
if ($ok === false) {
    forms_json(['ok' => false, 'error' => 'upstream', 'saved' => true], 502);
}
forms_json(['ok' => true]);
