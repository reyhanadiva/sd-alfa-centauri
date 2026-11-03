# Panel Alfa Centauri SD

Panel admin (PHP 8.1+ / MySQL) di `/edizon/`, dibangun dari baseline English Now.
Baseline: `reyhanadiva/site-panel-baseline` commit `88440a8`, PANEL_VERSION 2.5 (lihat `PANEL_BASELINE`). Versi panel ini: `2.5-sd.1`.

## Peran
- **Super Admin**: semua menu (Site Settings, SEO & AI, User, Submission).
- **Admin (Humas)**: Homepage Content, Article, Form, Pop-Up, History. Saat menulis artikel, Humas melihat panduan SEO & kepatuhan yang diisi Super Admin (SEO & AI).

## Menu
Homepage Content (16 dokumen, lihat `docs/PANEL-MAPPING.md`) / Make Content (Article, Form, Pop-Up) / Submission / Setting (Site Settings, SEO & AI, History, User).

## Pasang di XAMPP (lokal)
1. Jalankan MySQL di XAMPP.
2. Salin `en-config.sample.php` menjadi `en-config.php`; isi `db_*` dan `setup_token` (>= 16 karakter acak). File ini tidak masuk Git.
3. `npm run panel` (PHP di port 8081), buka `http://sd-alfa-centauri.localhost:8081/edizon/setup.php`, masukkan setup_token, buat Super Admin. Buat user Humas di menu User.
4. Tabel dibuat otomatis; tidak perlu SQL manual.

## Alur konten ke website
Panel menulis `public/data/content.json` saat Publish. `npm run dev/build` menjalankan `scripts/sync-panel.mjs` yang menggabungkannya ke `src/content/panel.generated.json` (sumber: `PANEL_CONTENT_URL`, `PANEL_CONTENT_FILE`, atau file lokal). Tanpa data panel, situs tampil seperti semula. Perubahan baru tampil setelah rebuild/redeploy. `PANEL_IGNORE` menonaktifkan data panel.

## Checklist deploy
- Jangan commit/unggah: `en-config.php`, `public/api/config.php`, `storage/`, `public/uploads/`, `public/data/`.
- Di server: salin `public/api/config.sample.php` menjadi `config.php`, isi DB dan token; naikkan PANEL_VERSION bila aset panel berubah.
- Keputusan hosting masih terbuka (cPanel static export / server PHP terpisah / Vercel dengan PANEL_CONTENT_URL + deploy hook). Situs saat ini SSR di Vercel, belum static export.

## Dihapus / diadaptasi dari baseline
Dihapus: editor section English Now, chatbot, kuis & hasil kuis, tema Anak/Dewasa, form free-trial. Diadaptasi: `lib/content.php`, `lib/sections.php` (baru), `lib/view.php`, `lib/auth.php`, `lib/seo.php`, `lib/forms.php`, `lib/articles.php`, `panel.css`, templat publik `public/articles|forms|form`, editor artikel (`tools/article-editor`).

## Batas yang diketahui
- Toggle audiens Anak/Dewasa dinonaktifkan (hanya tema "dewasa"); `lib/quizzes.php` tetap ada karena dependensi.
- Suite `test:pop`, `test:builders`, `test:runtime` tidak berjalan (bergantung pada halaman kuis yang dihapus); suite PHP, harness artikel/form, dan e2e (`tools/panel-tests`) hijau.
- `public/index.php` (SEO beranda statis) tidak dipakai di Next.js.
- CSP gambar panel hanya mengizinkan Unsplash (gambar Pexels tidak tampil di pratinjau).
- Terjemahan Inggris di seed adalah draf, perlu ditinjau.
- Submission hanya untuk Super Admin.
- Fitur formulir/kiriman sudah ada tetapi belum dipakai.
