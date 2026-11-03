<?php
declare(strict_types=1);
// Halaman lama: pendaftar kini ada di submissions.php (formulir Free Trial bawaan).
require __DIR__ . '/lib/init.php';
require_leads_access();
$st = db()->prepare("SELECT id FROM forms WHERE slug = 'free-trial'");
$st->execute();
$id = (int) $st->fetchColumn();
redirect('submissions.php' . ($id ? '?form=' . $id : ''));
