<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
$me = require_admin();
$errors = [];
$pdo = db();

function active_admin_count(PDO $pdo): int
{
    return (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role='admin' AND active=1")->fetchColumn();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    if ($action === 'add') {
        $name = clean_text($_POST['name'] ?? '', 100);
        $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
        $role = array_key_exists((string) ($_POST['role'] ?? ''), ROLES) ? (string) $_POST['role'] : 'editor';
        $pw = (string) ($_POST['password'] ?? '');
        if ($name === '') { $errors[] = 'Nama wajib diisi.'; }
        if (!valid_email($email)) { $errors[] = 'Email tidak valid.'; }
        if (($p = password_problem($pw)) !== null) { $errors[] = $p; }
        if (!$errors) {
            $ex = $pdo->prepare('SELECT 1 FROM users WHERE email = ?');
            $ex->execute([$email]);
            if ($ex->fetchColumn()) {
                $errors[] = 'Email itu sudah terdaftar.';
            }
        }
        if (!$errors) {
            try {
                $pdo->prepare('INSERT INTO users (email, name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
                    ->execute([$email, $name, $role, password_hash($pw, PASSWORD_DEFAULT), now_utc()]);
                audit((int) $me['id'], 'user_add', "$email/$role");
                flash_set('ok', 'Pengguna ditambahkan.');
                redirect('users.php');
            } catch (PDOException $e) {
                error_log('user add: ' . $e->getMessage());
                $errors[] = 'Pengguna tidak bisa disimpan. Periksa koneksi dan hak akses pengguna database.';
            }
        }
    } elseif (in_array($action, ['toggle', 'role', 'reset'], true) && $id > 0) {
        $st = $pdo->prepare('SELECT id, email, role, active FROM users WHERE id = ?');
        $st->execute([$id]);
        $t = $st->fetch();
        if (!$t) {
            $errors[] = 'Pengguna tidak ditemukan.';
        } elseif ($action === 'toggle') {
            $newActive = (int) $t['active'] === 1 ? 0 : 1;
            if ($newActive === 0 && ((int) $t['id'] === (int) $me['id'] || ($t['role'] === 'admin' && active_admin_count($pdo) <= 1))) {
                $errors[] = 'Tidak bisa menonaktifkan diri sendiri atau Admin terakhir.';
            } else {
                $pdo->prepare('UPDATE users SET active = ? WHERE id = ?')->execute([$newActive, $id]);
                audit((int) $me['id'], $newActive ? 'user_enable' : 'user_disable', (string) $t['email']);
                flash_set('ok', $newActive ? 'Pengguna diaktifkan.' : 'Pengguna dinonaktifkan.');
                redirect('users.php');
            }
        } elseif ($action === 'role') {
            $newRole = (string) ($_POST['role'] ?? '');
            if (!array_key_exists($newRole, ROLES)) {
                $errors[] = 'Peran tidak dikenal.';
            } elseif ($newRole === $t['role']) {
                redirect('users.php');
            } elseif ($t['role'] === 'admin' && ((int) $t['id'] === (int) $me['id'] || active_admin_count($pdo) <= 1)) {
                $errors[] = 'Tidak bisa menurunkan diri sendiri atau Admin terakhir.';
            } else {
                try {
                    $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$newRole, $id]);
                    audit((int) $me['id'], 'user_role', $t['email'] . '→' . $newRole);
                    flash_set('ok', 'Peran diubah.');
                    redirect('users.php');
                } catch (PDOException $e) {
                    error_log('user role: ' . $e->getMessage());
                    $errors[] = 'Peran tidak bisa diubah. Database mungkin belum diperbarui: periksa hak akses ALTER pada pengguna database.';
                }
            }
        } else {
            $pw = (string) ($_POST['password'] ?? '');
            if (($p = password_problem($pw)) !== null) {
                $errors[] = $p;
            } else {
                $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $id]);
                audit((int) $me['id'], 'user_reset', (string) $t['email']);
                flash_set('ok', 'Kata sandi diatur ulang.');
                redirect('users.php');
            }
        }
    }
}

$users = $pdo->query('SELECT id, email, name, role, active, last_login_at FROM users ORDER BY id')->fetchAll();
page_head('Pengguna', $me);
?>
<h1>Pengguna</h1>
<p class="muted"><strong>Super Admin</strong> mengubah semuanya: konten beranda, artikel, formulir, pop-up, kiriman formulir, pengaturan situs, SEO &amp; AI, dan pengguna. <strong>Admin (Humas)</strong> mengubah konten beranda, menulis artikel, serta membuat formulir dan pop-up; tidak bisa mengelola pengguna, pengaturan situs, SEO &amp; AI, maupun melihat data kiriman formulir.</p>
<?php foreach ($errors as $e): ?><div class="flash err"><?= h($e) ?></div><?php endforeach; ?>
<div class="card">
<table class="tbl">
  <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Terakhir masuk</th><th>Tindakan</th></tr></thead>
  <tbody>
  <?php foreach ($users as $r): ?>
    <tr class="<?= (int) $r['active'] ? '' : 'off' ?>">
      <td><?= h($r['name']) ?><?= (int) $r['id'] === (int) $me['id'] ? ' <small>(Anda)</small>' : '' ?></td>
      <td><?= h($r['email']) ?></td>
      <td><?= h(role_label((string) $r['role'])) ?><?= (int) $r['active'] ? '' : ' · nonaktif' ?></td>
      <td><?= h(fmt_time($r['last_login_at'])) ?></td>
      <td class="acts">
        <form method="post"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
          <select name="role" aria-label="Peran untuk <?= h($r['name']) ?>">
            <?php foreach (ROLES as $rk => $rl): ?><option value="<?= h($rk) ?>"<?= $r['role'] === $rk ? ' selected' : '' ?>><?= h($rl) ?></option><?php endforeach; ?>
          </select>
          <button class="link" name="action" value="role" type="submit">Ubah peran</button>
          <button class="link" name="action" value="toggle" type="submit"><?= (int) $r['active'] ? 'Nonaktifkan' : 'Aktifkan' ?></button>
        </form>
        <form method="post" class="inline"><input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><input type="hidden" name="action" value="reset">
          <input type="password" name="password" placeholder="Kata sandi baru" autocomplete="new-password" required><button class="link" type="submit">Atur ulang</button>
        </form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>
</div>
<section class="card narrow">
  <h2>Tambah pengguna</h2>
  <form method="post" autocomplete="off">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="add">
    <label>Nama<input type="text" name="name" maxlength="100" required></label>
    <label>Email<input type="email" name="email" maxlength="190" required></label>
    <label>Peran<select name="role"><?php foreach (ROLES as $rk => $rl): ?><option value="<?= h($rk) ?>"<?= $rk === 'editor' ? ' selected' : '' ?>><?= h($rl) ?></option><?php endforeach; ?></select></label>
    <label>Kata sandi awal <small>(minimal 10 karakter, huruf dan angka)</small><input type="password" name="password" required autocomplete="new-password"></label>
    <button class="btn" type="submit">Tambah</button>
  </form>
</section>
<?php page_foot();
