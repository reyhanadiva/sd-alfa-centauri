<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$slug = strtolower((string) ($_GET['slug'] ?? ''));
if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $slug)) {
    forms_json(['ok' => false, 'error' => 'not_found'], 404);
}
$f = form_get_by_slug($slug);
if (!$f) {
    forms_json(['ok' => false, 'error' => 'not_found'], 404);
}
$def = form_public_def($f);
$def['wa'] = forms_site_wa();
forms_json(['ok' => true, 'form' => $def]);
