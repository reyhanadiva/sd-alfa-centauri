<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';

try {
    $n = (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
} catch (Throwable) {
    $n = 0;
}
if ($n === 0) {
    redirect('setup.php');
}
if (current_user()) {
    redirect('index.php');
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $r = attempt_login((string) ($_POST['email'] ?? ''), (string) ($_POST['password'] ?? ''));
    if ($r['ok']) {
        redirect('index.php');
    }
    $error = (string) ($r['error'] ?? 'Gagal masuk.');
}

page_head('Masuk');
?>
<section class="card narrow">
  <h1>Masuk</h1>
  <?php if ($error): ?><div class="flash err"><?= h($error) ?></div><?php endif; ?>
  <form method="post" autocomplete="on">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <label>Email<input type="email" name="email" required autofocus autocomplete="username" value="<?= h((string) ($_POST['email'] ?? '')) ?>"></label>
    <label>Kata sandi<input type="password" name="password" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Masuk</button>
  </form>
</section>
<?php page_foot();
