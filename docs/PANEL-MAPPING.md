# Pemetaan panel ↔ beranda (SD Alfa Centauri)

Sumber teks bawaan: `src/content/id.ts` dan `en.ts` (+ `src/lib/site.ts` untuk kontak). Panel menyimpan tiap section sebagai dokumen
`{ id: {...}, en: {...}, shared: {...} }`; `id` dan `en` berbentuk sama dengan objek konten website, `shared` = nilai yang sama untuk kedua bahasa.
Definisi kolom: `public/edizon/lib/sections.php` (skema), editor umum: `section.php` + `assets/section.js`.
Alur: panel simpan → `content.json` → `scripts/sync-panel.mjs` → `src/content/panel.generated.json` → `src/lib/panel.ts` menggabungkannya di atas teks bawaan saat build.

| Urutan di beranda | Editor panel (`section.php?s=`) | Komponen | Kolom yang bisa diedit | Bahasa |
|---|---|---|---|---|
| (meta halaman) | `seo` Judul & SEO beranda | `metaFor()` | judul, deskripsi, judul/deskripsi saat dibagikan | ID+EN |
| 1 | `navbar` Navbar | Navbar | menu + submenu (tulisan, tautan, keterangan), tombol daftar, daftar portal | ID+EN (tautan tersinkron) |
| 2 | `hero` Hero | Hero, CertificateDialog | kalimat utama (rich), tombol, label akreditasi, teks sertifikat; gambar sertifikat | ID+EN, gambar umum |
| 3 | `about` Tentang | About | visi, tahun berdiri, yayasan, bintang kembar | ID+EN |
| 4 | `why` Mengapa memilih & Angka | WhyChoose, Angka | 4 kartu (teks, label program), keterangan angka; 4 angka (kosong = XX+) | ID+EN, angka umum |
| 5 | `program` Program & Ekskul | Program, EkskulPanel | 3 ranah (nama, kalimat, foto, kegiatan+ikon), ekskul (nama, ikon, foto) | ID+EN (foto/ikon tersinkron) |
| 6 | `fasilitas` Fasilitas | Fasilitas | judul, fasilitas per kelas, daftar fasilitas + foto | ID+EN |
| 7 | `inklusi` Inklusi (LSU) | Inklusi | poin layanan, kegiatan pendampingan (ikon) | ID+EN |
| 8 | `prestasi` Prestasi | Prestasi | kategori, contoh prestasi; total & tahun mulai | ID+EN, angka umum |
| 9 | `galeri` Galeri | Galeri | kartu (judul, keterangan, foto, album foto tambahan) | ID+EN |
| 10 | `testimoni` Testimoni | Testimoni | kutipan lengkap, kalimat sorotan, nama, profesi, keterangan, foto | ID+EN |
| 11 | `berita` Berita | Berita | 4 kartu (kategori, tanggal, judul ≤100, ringkasan ≤180, tautan, foto) | ID+EN |
| 12 | `faq` FAQ | Faq | pertanyaan & jawaban, kotak bantuan (formal) | ID+EN |
| 13 | `lokasi` Lokasi & Kontak | Lokasi, Navbar, Closing | label alamat; telepon, email, WhatsApp tampil, Instagram, alamat, peta | ID+EN, kontak umum |
| 14 | `closing` Penutup & Footer | Closing | ajakan, tombol, tautan jelajah; berkas brosur PDF (ID & EN) | ID+EN, brosur umum |
| (melayang) | `assistant` Asisten | AskWidget | pertanyaan pemancing, sapaan, jawaban kata kunci + tautan | ID+EN |
| Setting | `settings.php` Pengaturan Situs | semua | nama, tagline, nomor WhatsApp, logo | umum |

Tetap di kode (desain / bukan teks): animasi, bintang, doodle, warna, ikon dengan nama baru (daftar ikon di `components/icons.tsx` dan `sections.php`),
`profileVideo` (video profil) dan tautan jaringan pendidikan di `src/content/shared.ts`, teks label aksesibilitas (aria).
