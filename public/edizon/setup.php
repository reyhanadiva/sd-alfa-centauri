<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';

$token = (string) cfg('setup_token', '');
$errors = [];

$done = false;
try {
    $done = (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;
} catch (Throwable) {
    $done = false; // tabel belum ada
}

if ($done) {
    flash_set('ok', 'Pengaturan awal sudah selesai. Silakan masuk.');
    redirect('login.php');
}

if ($token === '' || strlen($token) < 16) {
    page_head('Pengaturan awal');
    echo '<section class="card narrow"><h1>Pengaturan awal</h1><p>Tambahkan baris <code>setup_token</code> (minimal 16 karakter acak) di file konfigurasi, lalu muat ulang halaman ini.</p></section>';
    page_foot();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $pdo = db();
    $since = gmdate('Y-m-d H:i:s', time() - 900);
    try {
        create_tables($pdo);
    } catch (Throwable $e) {
        error_log('setup tables: ' . $e->getMessage());
        $errors[] = 'Tabel database tidak bisa dibuat. Periksa hak akses pengguna database.';
    }
    if (!$errors) {
        $c = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND email = '__setup__' AND attempted_at > ?");
        $c->execute([client_ip(), $since]);
        if ((int) $c->fetchColumn() >= 10) {
            $errors[] = 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.';
        } elseif (!hash_equals($token, (string) ($_POST['token'] ?? ''))) {
            $pdo->prepare("INSERT INTO login_attempts (ip, email, attempted_at) VALUES (?, '__setup__', ?)")->execute([client_ip(), now_utc()]);
            $errors[] = 'Kode pengaturan salah.';
        }
    }
    $name = clean_text($_POST['name'] ?? '', 100);
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $pw = (string) ($_POST['password'] ?? '');
    if (!$errors) {
        if ($name === '') {
            $errors[] = 'Nama wajib diisi.';
        }
        if (!valid_email($email)) {
            $errors[] = 'Email tidak valid.';
        }
        if (($p = password_problem($pw)) !== null) {
            $errors[] = $p;
        }
        if ($pw !== (string) ($_POST['password2'] ?? '')) {
            $errors[] = 'Kedua kata sandi tidak sama.';
        }
    }
    if (!$errors) {
        $pdo->prepare('INSERT INTO users (email, name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
            ->execute([$email, $name, 'admin', password_hash($pw, PASSWORD_DEFAULT), now_utc()]);
        $seeded = seed_defaults($pdo);
        try {
            publish_content();
        } catch (Throwable $e) {
            error_log('setup publish: ' . $e->getMessage());
        }
        audit((int) $pdo->lastInsertId(), 'setup', "seed=$seeded");
        flash_set('ok', 'Super Admin pertama dibuat. Silakan masuk.');
        redirect('login.php');
    }
}

page_head('Pengaturan awal');
?>
<section class="card narrow">
  <h1>Pengaturan awal</h1>
  <p class="muted">Langkah sekali saja: membuat tabel database dan akun Super Admin pertama.</p>
  <?php foreach ($errors as $e): ?><div class="flash err"><?= h($e) ?></div><?php endforeach; ?>
  <form method="post" autocomplete="off">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <label>Kode pengaturan <small>(setup_token di file konfigurasi)</small><input type="password" name="token" required></label>
    <label>Nama Anda<input type="text" name="name" maxlength="100" required value="<?= h((string) ($_POST['name'] ?? '')) ?>"></label>
    <label>Email<input type="email" name="email" maxlength="190" required value="<?= h((string) ($_POST['email'] ?? '')) ?>"></label>
    <label>Kata sandi <small>(minimal 10 karakter, huruf dan angka)</small><input type="password" name="password" required></label>
    <label>Ulangi kata sandi<input type="password" name="password2" required></label>
    <button class="btn" type="submit">Buat Super Admin &amp; mulai</button>
  </form>
</section>
<?php page_foot();
