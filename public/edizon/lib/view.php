<?php
/** Kerangka halaman panel (header, menu, notifikasi). */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

/** daftar formulir untuk menu Submission (gagal = kosong, menu tetap jalan) */
function side_forms(): array
{
    try {
        return forms_all();
    } catch (Throwable) {
        return [];
    }
}

function page_head(string $title, ?array $user = null, string $bodyClass = ''): void
{
    header('Content-Type: text/html; charset=utf-8');
    $flash = flash_get();
    $self = basename((string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    ?>
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= h($title) ?> · Panel SD Alfa Centauri</title>
<link rel="stylesheet" href="assets/panel.css?v=<?= h(PANEL_VERSION) ?>">
</head>
<body class="<?= h(trim($bodyClass . ($user ? ' has-side' : ''))) ?>">
<?php if ($user): panel_shell(true); ?>
<div class="shell">
<aside class="side">
  <a class="brand" href="index.php">SD Alfa Centauri <span>Panel</span></a>
  <nav aria-label="Menu panel">
    <a href="index.php"<?= $self === 'index.php' ? ' class="on"' : '' ?>>Beranda</a>
    <?php if (can_edit_content($user)): ?>
    <span class="sec">Homepage content</span>
    <?php foreach (sections_titles() as $sk => $label): ?><a href="section.php?s=<?= h($sk) ?>"<?= $self === 'section.php' && (string) ($_GET['s'] ?? '') === $sk ? ' class="on"' : '' ?>><?= h($label) ?></a>
    <?php endforeach; ?>
    <span class="sec">Make Content</span>
    <a href="articles.php"<?= in_array($self, ['articles.php', 'article.php'], true) ? ' class="on"' : '' ?>>Artikel</a>
    <a href="forms.php"<?= in_array($self, ['forms.php', 'form.php'], true) ? ' class="on"' : '' ?>>Formulir</a>
    <a href="popups.php"<?= in_array($self, ['popups.php', 'popup.php'], true) ? ' class="on"' : '' ?>>Pop-up</a>
    <?php endif; ?>
    <?php if (can_view_leads($user)): ?>
    <span class="sec">Submission</span>
    <a href="submissions.php"<?= in_array($self, ['submissions.php', 'leads.php'], true) && (int) ($_GET['form'] ?? 0) === 0 ? ' class="on"' : '' ?>>Semua Kiriman</a>
    <?php foreach (side_forms() as $sf): ?><a class="sub" href="submissions.php?form=<?= (int) $sf['id'] ?>"<?= in_array($self, ['submissions.php', 'leads.php'], true) && (int) ($_GET['form'] ?? 0) === (int) $sf['id'] ? ' class="on"' : '' ?> title="<?= h($sf['name']) ?>"><?= h($sf['name']) ?> <small><?= (int) $sf['n'] ?></small></a><?php endforeach; ?>
    <?php endif; ?>
    <?php if (can_edit_content($user)): ?>
    <span class="sec">Setting</span>
    <?php if (is_admin($user)): ?>
    <a href="settings.php"<?= $self === 'settings.php' ? ' class="on"' : '' ?>>Pengaturan Situs</a>
    <a href="seo.php"<?= $self === 'seo.php' ? ' class="on"' : '' ?>>SEO &amp; AI</a>
    <?php endif; ?>
    <a href="history.php"<?= $self === 'history.php' ? ' class="on"' : '' ?>>Riwayat</a>
    <?php if (is_admin($user)): ?>
    <a href="users.php"<?= $self === 'users.php' ? ' class="on"' : '' ?>>Pengguna</a>
    <?php endif; ?>
    <?php endif; ?>
  </nav>
  <div class="who">
    <a href="account.php"<?= $self === 'account.php' ? ' class="on"' : '' ?>><?= h($user['name']) ?></a>
    <span class="role"><?= h(role_label((string) $user['role'])) ?></span>
    <form method="post" action="logout.php"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><button class="link" type="submit">Keluar</button></form>
  </div>
</aside>
<div class="content">
<?php endif; ?>
<main>
<?php if ($flash): ?><div class="flash <?= h($flash['type']) ?>" role="status"><?= h($flash['msg']) ?></div><?php endif; ?>
<?php
}

/** menandai bahwa kerangka sidebar sedang terbuka (supaya page_foot menutupnya) */
function panel_shell(?bool $set = null): bool
{
    static $open = false;
    if ($set !== null) {
        $open = $set;
    }
    return $open;
}

/** @param string|string[] $script nama file di assets/ (boleh beberapa, dimuat berurutan) */
function page_foot(string|array $script = ''): void
{
    ?>
</main>
<?php if (panel_shell()): ?>
</div>
</div>
<?php endif; ?>
<?php foreach ((array) $script as $js): if ($js !== ''): ?><script src="assets/<?= h($js) ?>?v=<?= h(PANEL_VERSION) ?>" defer></script><?php endif; endforeach; ?>
</body>
</html>
<?php
}
