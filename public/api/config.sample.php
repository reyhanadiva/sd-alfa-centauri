<?php
/**
 * Salin menjadi "config.php" (di folder yang sama, DI SERVER) lalu isi nilainya.
 * Jangan commit config.php dan jangan kirim isinya lewat chat/email (sudah masuk .gitignore).
 *
 * Untuk uji di komputer sendiri (XAMPP) pakai berkas "en-config.php" di folder proyek:
 * salin "en-config.sample.php" di akar proyek.
 */
return [
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'NAMA_DATABASE',
    'db_user' => 'USER_DATABASE',
    'db_pass' => 'KATA_SANDI_DATABASE',
    'db_autocreate' => false,          // true hanya untuk XAMPP lokal (membuat database otomatis)

    // Tempat gambar unggahan & content.json. Kosong = di dalam folder situs.
    // Di hosting, sebaiknya folder di luar folder yang diunggah ulang, mis. '/home/USER/panel-storage'
    'storage_dir' => '',

    // Kode sekali pakai untuk membuat akun Super Admin pertama di /edizon/setup.php (>= 16 karakter acak)
    'setup_token' => 'GANTI_DENGAN_16_KARAKTER_ATAU_LEBIH_ACAK',

    // Rahasia untuk pratinjau (frame) artikel/formulir/pop-up (>= 32 karakter acak)
    'frame_secret' => 'GANTI_DENGAN_32_KARAKTER_ATAU_LEBIH_ACAK',

    // Alamat situs (untuk sitemap, canonical). Boleh dikosongkan di lokal.
    'site_url' => '',
];
