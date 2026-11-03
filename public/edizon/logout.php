<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $u = current_user();
    if ($u) {
        audit((int) $u['id'], 'logout');
    }
    logout_session();
}
redirect('login.php');
