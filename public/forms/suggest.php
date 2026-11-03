<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$slug = strtolower((string) ($_GET['slug'] ?? ''));
$key = (string) ($_GET['field'] ?? '');
$q = mb_substr((string) ($_GET['q'] ?? ''), 0, 60);
if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $slug) || !preg_match('/^[a-z][a-z0-9_]{1,30}$/', $key)) {
    forms_json(['ok' => true, 'items' => []]);
}
$f = form_get_by_slug($slug);
if (!$f) {
    forms_json(['ok' => true, 'items' => []]);
}
try {
    forms_json(['ok' => true, 'items' => form_suggest($f, $key, $q)]);
} catch (Throwable $e) {
    error_log('form suggest: ' . $e->getMessage());
    forms_json(['ok' => true, 'items' => []]);
}
