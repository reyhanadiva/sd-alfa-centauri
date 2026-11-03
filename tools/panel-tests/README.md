# Tes browser panel (Playwright + Python)

Butuh: PHP, MySQL/MariaDB menyala, `pip install playwright` + browser Chromium, dan `en-config.php` di akar proyek.
Server: `npm run panel` (port 8081). Alamat di skrip: `http://127.0.0.1:8081/edizon/`.

- `e2e-core.py`: setup pertama, login, peran Super Admin vs Admin (Humas), pengaturan situs, SEO & AI, riwayat. Jalankan pada database KOSONG.
- `e2e-sections.py`: semua editor section (render, simpan isi bawaan, sunting ID+EN, validasi, reset, cermin daftar, akses Humas). Butuh akun dari `e2e-core.py`.

Tes PHP tanpa database: `cd tools/article-editor && npm run test:php` (termasuk `test/php/sections.php`).
