<?php
/**
 * Hanya untuk uji di komputer sendiri (XAMPP). Salin menjadi "en-config.php" (berkas itu di-gitignore).
 * Langkah: nyalakan MySQL di XAMPP, lalu isi di bawah. Database dibuat otomatis (db_autocreate).
 */
return [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'alfa_panel',
    'db_user' => 'root',
    'db_pass' => '',
    'db_autocreate' => true,
    'storage_dir' => '',
    'setup_token' => 'tuliskan-kode-acak-minimal-16-karakter',
    'frame_secret' => 'tuliskan-kode-acak-minimal-32-karakter-ya-oke',
    'site_url' => 'http://127.0.0.1:8080',
];
