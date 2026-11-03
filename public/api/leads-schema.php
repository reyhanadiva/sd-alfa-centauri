<?php
/**
 * Definisi tabel pendaftar free trial. Dipakai bersama oleh api/trial.php (menyimpan)
 * dan panel (membaca). File ini hanya berisi fungsi, tidak mencetak apa pun.
 */
declare(strict_types=1);

if (!function_exists('en_create_leads_table')) {
    function en_create_leads_table(PDO $pdo): void
    {
        $pdo->exec("CREATE TABLE IF NOT EXISTS trial_leads (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            created_at DATETIME NOT NULL,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            class_choice VARCHAR(100) NOT NULL,
            needs TEXT NOT NULL,
            audience ENUM('kids','adult') NOT NULL DEFAULT 'kids',
            query_string VARCHAR(300) NOT NULL DEFAULT '',
            zapier_ok TINYINT(1) NOT NULL DEFAULT 0,
            zapier_status SMALLINT NOT NULL DEFAULT 0,
            KEY ix_leads_time (created_at),
            KEY ix_leads_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
}
