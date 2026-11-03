<?php
declare(strict_types=1);
require __DIR__ . '/lib/init.php';
// Admin dan Customer Service saja. Editor ditolak (403).
$u = require_leads_access();
$pdo = db();

const SUB_PER_PAGE = 25;
const SUB_AUD = ['kids' => 'Anak & Remaja', 'adult' => 'Dewasa & Bisnis'];

$forms = forms_all();
$byId = [];
foreach ($forms as $f) {
    $byId[(int) $f['id']] = $f;
}
$fid = (int) ($_GET['form'] ?? 0);
if (!isset($byId[$fid])) {
    $fid = 0;
}
$q = clean_text($_GET['q'] ?? '', 60);
$aud = isset(SUB_AUD[(string) ($_GET['aud'] ?? '')]) ? (string) $_GET['aud'] : '';
$page = max(1, (int) ($_GET['page'] ?? 1));
$export = ($_GET['export'] ?? '') === '1';

$where = [];
$args = [];
if ($fid) {
    $where[] = 's.form_id = ?';
    $args[] = $fid;
}
if ($aud !== '') {
    $where[] = 's.audience = ?';
    $args[] = $aud;
}
if ($q !== '') {
    $where[] = 's.data LIKE ?';
    $args[] = '%' . addcslashes(json_encode($q, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ? trim((string) json_encode($q, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), '"') : $q, '\\%_') . '%';
}
$sqlWhere = $where ? ' WHERE ' . implode(' AND ', $where) : '';

function sub_value(mixed $v): string
{
    return is_array($v) ? implode(', ', array_map('strval', $v)) : (string) $v;
}

/** cegah rumus spreadsheet pada ekspor CSV */
function csv_safe(string $s): string
{
    return preg_match('/^[=+\-@\t\r]/', $s) ? "'" . $s : $s;
}

if ($export) {
    if (!$fid) {
        flash_set('err', 'Pilih satu formulir dulu sebelum mengunduh CSV, karena setiap formulir punya kolom berbeda.');
        redirect('submissions.php' . ($q !== '' || $aud !== '' ? '?' . http_build_query(array_filter(['q' => $q, 'aud' => $aud])) : ''));
    }
    $form = form_get($fid);
    $cols = $form['cfg']['fields'] ?? [];
    $st = $pdo->prepare('SELECT s.* FROM form_submissions s' . $sqlWhere . ' ORDER BY s.created_at DESC, s.id DESC LIMIT 20000');
    $st->execute($args);
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $form['slug'] . '-' . gmdate('Ymd') . '.csv"');
    header('X-Content-Type-Options: nosniff');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, array_merge(['Waktu', 'Audiens'], array_map(static fn($c) => $c['label'], $cols), ['Zapier', 'Halaman', 'Querystring']), ',', '"', '\\');
    foreach ($st->fetchAll() as $r) {
        $d = json_decode((string) $r['data'], true) ?: [];
        $row = [fmt_time($r['created_at']), SUB_AUD[$r['audience']] ?? (string) $r['audience']];
        foreach ($cols as $c) {
            $row[] = csv_safe(sub_value($d[$c['key']] ?? ''));
        }
        $row[] = $r['zapier_ok'] === null ? 'tidak ada webhook' : ((int) $r['zapier_ok'] === 1 ? 'terkirim' : 'belum terkirim');
        $row[] = csv_safe((string) $r['page']);
        $row[] = csv_safe((string) $r['query_string']);
        fputcsv($out, $row, ',', '"', '\\');
    }
    fclose($out);
    audit((int) $u['id'], 'form_export', $form['slug']);
    exit;
}

$error = '';
$total = 0;
$pages = 1;
$rows = [];
$files = [];
try {
    $c = $pdo->prepare('SELECT COUNT(*) FROM form_submissions s' . $sqlWhere);
    $c->execute($args);
    $total = (int) $c->fetchColumn();
    $pages = max(1, (int) ceil($total / SUB_PER_PAGE));
    $page = min($page, $pages);
    $st = $pdo->prepare('SELECT s.* FROM form_submissions s' . $sqlWhere . ' ORDER BY s.created_at DESC, s.id DESC LIMIT ' . SUB_PER_PAGE . ' OFFSET ' . (($page - 1) * SUB_PER_PAGE));
    $st->execute($args);
    $rows = $st->fetchAll();
    if ($rows) {
        $ids = array_map(static fn($r) => (int) $r['id'], $rows);
        $fs = $pdo->query('SELECT id, submission_id, field_key, original, bytes FROM form_files WHERE submission_id IN (' . implode(',', $ids) . ')');
        foreach ($fs->fetchAll() as $f) {
            $files[(int) $f['submission_id']][] = $f;
        }
    }
} catch (Throwable $e) {
    error_log('submissions list: ' . $e->getMessage());
    $error = 'Data kiriman belum bisa dibaca. Pastikan database sudah diperbarui.';
}

function wa_number(string $phone): string
{
    $d = preg_replace('/\D/', '', $phone) ?? '';
    return str_starts_with($d, '0') ? '62' . substr($d, 1) : $d;
}
function sub_url(array $extra): string
{
    global $q, $aud, $fid;
    $p = array_filter(['form' => $fid, 'q' => $q, 'aud' => $aud] + $extra, fn ($v) => $v !== '' && $v !== null && $v !== 0 && $v !== 1);
    return 'submissions.php' . ($p ? '?' . http_build_query($p) : '');
}

page_head('Pendaftar', $u, 'wide');
?>
<div class="bar">
  <h1>Pendaftar</h1>
  <?php if ($fid): ?><a class="btn ghost" href="<?= h(sub_url(['export' => '1'])) ?>">Unduh CSV</a><?php endif; ?>
</div>
<p class="muted">Kiriman dari semua formulir di website. Waktu dalam WIB. Data berisi informasi pribadi: gunakan hanya untuk menindaklanjuti pendaftar. <strong>Belum terkirim</strong> berarti notifikasi ke Zapier gagal; pendaftar itu tetap perlu dihubungi bila belum ada pesan masuk.</p>
<?php if ($error): ?><div class="flash err"><?= h($error) ?></div><?php endif; ?>
<form class="filters" method="get" action="submissions.php">
  <label><span class="fl">Formulir</span>
    <select name="form"><option value="">Semua</option><?php foreach ($forms as $f): ?><option value="<?= (int) $f['id'] ?>"<?= $fid === (int) $f['id'] ? ' selected' : '' ?>><?= h($f['name']) ?> (<?= (int) $f['n'] ?>)</option><?php endforeach; ?></select></label>
  <label><span class="fl">Cari</span><input type="text" name="q" maxlength="60" value="<?= h($q) ?>" placeholder="Nama, nomor, sekolah…"></label>
  <label><span class="fl">Audiens</span>
    <select name="aud"><option value="">Semua</option><?php foreach (SUB_AUD as $k => $label): ?><option value="<?= h($k) ?>"<?= $aud === $k ? ' selected' : '' ?>><?= h($label) ?></option><?php endforeach; ?></select></label>
  <button class="btn" type="submit">Terapkan</button>
  <?php if ($q !== '' || $aud !== '' || $fid): ?><a class="btn ghost" href="submissions.php">Hapus filter</a><?php endif; ?>
</form>
<div class="card">
<?php if (!$rows): ?>
  <p class="muted"><?= $error ? '' : 'Belum ada kiriman' . ($q !== '' || $aud !== '' || $fid ? ' yang cocok' : '') . '.' ?></p>
<?php else: ?>
  <div class="scroll"><table class="tbl leads">
    <thead><tr><th>Waktu</th><th>Formulir</th><th>Isi</th><th>Audiens</th><th>Zapier</th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r):
        $fm = $byId[(int) $r['form_id']] ?? null;
        $d = json_decode((string) $r['data'], true) ?: [];
        $labels = [];
        if ($fm) {
            $full = form_get((int) $fm['id']);
            foreach ($full['cfg']['fields'] ?? [] as $fl) {
                $labels[$fl['key']] = [$fl['label'], $fl['type']];
            }
        }
        ?>
      <tr>
        <td><?= h(fmt_time($r['created_at'])) ?><?= (int) $r['imported'] === 1 ? '<br><small class="muted">dari data lama</small>' : '' ?></td>
        <td><?= h($fm['name'] ?? '(formulir dihapus)') ?></td>
        <td>
          <?php foreach ($d as $k => $v): $lab = $labels[$k] ?? [$k, 'text']; $sv = sub_value($v); if ($sv === '') { continue; } ?>
            <div><small class="muted"><?= h($lab[0]) ?>:</small> <?= h($sv) ?>
              <?php if ($lab[1] === 'phone' && wa_number($sv) !== ''): ?> <a href="https://wa.me/<?= h(wa_number($sv)) ?>" target="_blank" rel="noopener noreferrer">WhatsApp</a><?php endif; ?></div>
          <?php endforeach; ?>
          <?php foreach ($files[(int) $r['id']] ?? [] as $f): ?>
            <div><small class="muted">Berkas:</small> <a href="form-file.php?id=<?= (int) $f['id'] ?>"><?= h($f['original']) ?></a> <small class="muted">(<?= h(number_format(((int) $f['bytes']) / 1024, 0)) ?> KB)</small></div>
          <?php endforeach; ?>
        </td>
        <td><?= h(SUB_AUD[$r['audience']] ?? (string) $r['audience']) ?></td>
        <td><?= $r['zapier_ok'] === null ? '<span class="muted">tidak terhubung</span>' : ((int) $r['zapier_ok'] === 1 ? '<span class="lead-ok">Terkirim</span>' : '<span class="lead-bad">Belum terkirim</span>') ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
  <div class="pager">
    <span class="muted"><?= h((string) $total) ?> kiriman · halaman <?= h((string) $page) ?> dari <?= h((string) $pages) ?></span>
    <span>
      <?php if ($page > 1): ?><a class="btn ghost sm" href="<?= h(sub_url(['page' => $page - 1])) ?>">&larr; Lebih baru</a><?php endif; ?>
      <?php if ($page < $pages): ?><a class="btn ghost sm" href="<?= h(sub_url(['page' => $page + 1])) ?>">Lebih lama &rarr;</a><?php endif; ?>
    </span>
  </div>
<?php endif; ?>
</div>
<?php page_foot();
