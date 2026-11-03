<?php
/**
 * Pengaturan: daftar webhook Zapier (Form ID + URL webhook). Disimpan di database SAJA (tidak pernah masuk content.json),
 * dan hanya Admin yang bisa melihat/mengubahnya. Dipakai relay api/trial.php dan (nanti) pembuat formulir.
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

const ZAPIER_URL_RE = '#^https://hooks\.zapier\.com/hooks/catch/[\w/-]+/?$#';
const ZAPIER_MAX = 40;

function en_create_settings_tables(PDO $pdo): void
{
    $opt = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo->exec("CREATE TABLE IF NOT EXISTS zapier_hooks (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        form_id VARCHAR(60) NOT NULL,
        label VARCHAR(80) NOT NULL DEFAULT '',
        webhook VARCHAR(400) NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_zh_form (form_id)
    ) $opt");
    // sekali saja: bawa webhook dari berkas konfigurasi lama (api/config.php) ke daftar ini
    try {
        if ((int) $pdo->query('SELECT COUNT(*) FROM zapier_hooks')->fetchColumn() === 0) {
            $hook = (string) cfg('zapier_webhook', '');
            if (preg_match(ZAPIER_URL_RE, $hook)) {
                $fid = preg_replace('/[^A-Za-z0-9_-]/', '', (string) cfg('form_id', '5ac3e5e2')) ?: '5ac3e5e2';
                $pdo->prepare('INSERT INTO zapier_hooks (form_id, label, webhook, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$fid, 'Free Trial (dari konfigurasi lama)', $hook, now_utc(), now_utc()]);
            }
        }
    } catch (Throwable $e) {
        error_log('zapier import: ' . $e->getMessage());
    }
}

/** @return array<int, array{form_id:string,label:string,webhook:string}> */
function zapier_hooks(): array
{
    $rows = db()->query('SELECT form_id, label, webhook FROM zapier_hooks ORDER BY id')->fetchAll();
    return array_map(static fn($r) => ['form_id' => (string) $r['form_id'], 'label' => (string) $r['label'], 'webhook' => (string) $r['webhook']], $rows);
}

function zapier_hook_for(string $formId): ?string
{
    $st = db()->prepare('SELECT webhook FROM zapier_hooks WHERE form_id = ?');
    $st->execute([$formId]);
    $w = $st->fetchColumn();
    return is_string($w) && $w !== '' ? $w : null;
}

/** @return array{0: array, 1: string[]} */
function validate_zapier(array $in): array
{
    $errors = [];
    $rows = is_array($in['hooks'] ?? null) ? array_values($in['hooks']) : [];
    if (count($rows) > ZAPIER_MAX) {
        $errors[] = 'Maksimal ' . ZAPIER_MAX . ' webhook.';
        $rows = array_slice($rows, 0, ZAPIER_MAX);
    }
    $out = [];
    $seen = [];
    foreach ($rows as $i => $r) {
        $n = $i + 1;
        $r = is_array($r) ? $r : [];
        $fid = trim((string) ($r['form_id'] ?? ''));
        $label = clean_text($r['label'] ?? '', 80);
        $url = trim((string) ($r['webhook'] ?? ''));
        if ($fid === '' && $url === '' && $label === '') {
            continue;
        }
        if (!preg_match('/^[A-Za-z0-9_-]{2,60}$/', $fid)) {
            $errors[] = "Baris $n: Form ID harus 2 sampai 60 karakter (huruf, angka, tanda hubung atau garis bawah).";
            continue;
        }
        if (isset($seen[strtolower($fid)])) {
            $errors[] = "Baris $n: Form ID \"$fid\" sudah dipakai di baris lain.";
            continue;
        }
        $seen[strtolower($fid)] = true;
        if (!preg_match(ZAPIER_URL_RE, $url) || strlen($url) > 400) {
            $errors[] = "Baris $n (\"$fid\"): URL webhook harus berbentuk https://hooks.zapier.com/hooks/catch/…";
            continue;
        }
        $out[] = ['form_id' => $fid, 'label' => $label, 'webhook' => $url];
    }
    return [$out, $errors];
}

/** ganti seluruh daftar dengan yang baru (Form ID yang tidak ada lagi dihapus) */
function zapier_save(array $rows): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $now = now_utc();
        $keep = [];
        $up = $pdo->prepare('INSERT INTO zapier_hooks (form_id, label, webhook, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE label = VALUES(label), webhook = VALUES(webhook), updated_at = VALUES(updated_at)');
        foreach ($rows as $r) {
            $up->execute([$r['form_id'], $r['label'], $r['webhook'], $now, $now]);
            $keep[] = $r['form_id'];
        }
        if ($keep) {
            $in = implode(',', array_fill(0, count($keep), '?'));
            $pdo->prepare("DELETE FROM zapier_hooks WHERE form_id NOT IN ($in)")->execute($keep);
        } else {
            $pdo->exec('DELETE FROM zapier_hooks');
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
