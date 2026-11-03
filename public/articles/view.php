<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_view.php';

$slug = (string) ($_GET['slug'] ?? '');
$a = preg_match('/^[A-Za-z0-9][A-Za-z0-9-]{0,119}$/', $slug) ? art_get_by_slug(strtolower($slug)) : null;
if (!$a) {
    art_not_found();
    exit;
}
art_view_page($a, false);
