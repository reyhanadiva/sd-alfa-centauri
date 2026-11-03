<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$u = require_login();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $cur = (string) ($_POST['current'] ?? '');
    $new = (string) ($_POST['password'] ?? '');
    $st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
    $st->execute([$u['id']]);
    if (!password_verify($cur, (string) $st->fetchColumn())) {
        $errors[] = 'Kata sandi saat ini salah.';
    }
    if (($p = password_problem($new)) !== null) {
        $errors[] = $p;
    }
    if ($new !== (string) ($_POST['password2'] ?? '')) {
        $errors[] = 'Kedua kata sandi baru tidak sama.';
    }
    if (!$errors) {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
        session_regenerate_id(true);
        audit((int) $u['id'], 'password_change');
        flash_set('ok', 'Kata sandi diganti.');
        redirect('account.php');
    }
}
page_head('Akun saya', $u);
?>
<section class="card narrow">
  <h1>Akun saya</h1>
  <p class="muted"><?= h($u['email']) ?> · <?= h(role_label((string) $u['role'])) ?></p>
  <?php foreach ($errors as $e): ?><div class="flash err"><?= h($e) ?></div><?php endforeach; ?>
  <form method="post" autocomplete="off">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <label>Kata sandi saat ini<input type="password" name="current" required autocomplete="current-password"></label>
    <label>Kata sandi baru <small>(minimal 10 karakter, huruf dan angka)</small><input type="password" name="password" required autocomplete="new-password"></label>
    <label>Ulangi kata sandi baru<input type="password" name="password2" required autocomplete="new-password"></label>
    <button class="btn" type="submit">Ganti kata sandi</button>
  </form>
</section>
<?php page_foot();
