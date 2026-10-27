# Checklist verifikasi data (data integrity)

Daftar hal yang **belum terkonfirmasi** dengan sekolah. Cek semuanya sebelum website live,
lalu hapus tanda TODO di kode.

## Wajib dikonfirmasi

- [ ] **Jumlah siswa aktif**: stat bar masih "XXX+" (`stats` di `src/lib/site.ts`)
- [ ] **Jadwal SPMB**: tanggal penutupan dan gelombang masih placeholder (`spmb` di `src/lib/site.ts`)
- [ ] **LSU, "Layanan Terapi Terintegrasi"**: apakah layanan ini benar ada?
- [ ] **LSU, alur 3 langkah** (asesmen, rencana pendampingan, evaluasi bersama orang tua): sesuai proses sebenarnya?
- [ ] **LSU, kuota dan asesmen masuk**: ada atau tidak? (akan ditanyakan orang tua, masuk FAQ)
- [ ] **Kemitraan Bimbel Sony Sugema College (SSC)**: kelas berapa, jadwal, termasuk biaya atau tidak, arti "eksklusif".
      Keputusan: **tanpa logo SSC**, hanya backlink internal.
- [ ] **Surala**: benar e-learning matematika?
- [ ] **Link Portal Orang Tua dan Portal Guru** (`src/components/TopBar.tsx`, masih `#`)
- [ ] **Nomor telepon, WhatsApp, email**: diambil dari website lama, pastikan masih aktif

- [ ] **7 Pilar Karakter**: sekarang hanya pills (nama saja), tidak ada penjabaran. Pastikan 7 nama sudah benar.
- [ ] **Video profil**: sementara memakai YouTube FFhuIIKqQnQ (diunggah 26 Sep 2022, kemungkinan sudah usang). Ganti `profileVideo` di `src/lib/site.ts` bila ada versi baru. Pastikan video boleh di-embed.
- [ ] **Isi video**: transcript belum terbaca. Cocokkan klaim/fakta di video dengan website setelah transcript ada.
- [ ] **Tautan SSC**: isi `ssc.href` kalau ada tautan internal yang dimaksud (sekarang teks biasa tanpa tautan)
- [ ] **Scan sertifikat akreditasi**: masih placeholder di dialog "Lihat sertifikat"
- [ ] Teks "Didirikan 2009 oleh Sony Sugema (alm.)": diambil dari website lama, pastikan masih akurat

## Konten yang masih placeholder

- [ ] Semua foto (slot `Photo` berlabel "Foto: ..."): ganti dengan foto asli
- [ ] Foto gedung hero hanya 565px lebar, minta versi resolusi tinggi
- [ ] Terjemahan EN belum ada (tombol ID/EN baru tampilan)
- [ ] Foto kegiatan LSU: jangan tampilkan wajah anak tanpa izin orang tua
