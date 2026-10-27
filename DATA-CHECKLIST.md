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
- [ ] **Link Portal Orang Tua dan Portal Guru** (`portals` di `src/lib/site.ts`, masih `#`)
- [ ] **Nomor telepon, WhatsApp, email**: diambil dari website lama, pastikan masih aktif

- [ ] **7 Pilar Karakter**: sekarang hanya pills (nama saja), tidak ada penjabaran. Pastikan 7 nama sudah benar.
- [ ] **Video profil**: sementara memakai YouTube FFhuIIKqQnQ (diunggah 26 Sep 2022, kemungkinan sudah usang). Ganti `profileVideo` di `src/lib/site.ts` bila ada versi baru. Pastikan video boleh di-embed.
- [ ] **Tautan SSC**: isi `ssc.href` kalau ada tautan internal yang dimaksud (sekarang teks biasa tanpa tautan)
- [ ] **Scan sertifikat akreditasi**: masih placeholder di dialog "Lihat sertifikat"
- [ ] Teks "Didirikan 2009 oleh Sony Sugema (alm.)": diambil dari website lama, pastikan masih akurat

## Konten yang masih placeholder

- [ ] Semua foto (slot `Photo` berlabel "Foto: ..."): ganti dengan foto asli
- [ ] Terjemahan EN belum ada (tombol ID/EN baru tampilan)
- [ ] Foto kegiatan LSU: jangan tampilkan wajah anak tanpa izin orang tua

## Dari transkrip video profil (auto-generated, banyak salah dengar: verifikasi)

- [ ] Tanggal berdiri **12 Juli 2009** dan "di bawah naungan Yayasan Taqwa Cerdas Kreatif" (dipakai di kartu Tentang Kami)
- [ ] Asal nama: **bintang kembar Alfa Centauri**, "gugus bintang ketiga yang paling terang" (klaim astronomi di video; kartu hanya memakai "bintang kembar")
- [ ] LSU: "di bawah pengawasan psikolog", "pendampingan individual akademik dan perilaku", "layanan terapi" (sudah dipakai di kartu LSU)
- [ ] Kemitraan internasional: transkrip menyebut "Bridge" dan "The Hills ... Australia sejak 2018" (nama tertulis rusak). **Belum dipakai di website.** Pastikan nama sekolah/organisasinya.
- [ ] Program Surala (e-learning matematika asal Jepang), Reading Challenge, LMS/Zoom, Project Based Learning, pekan refleksi, Parents Day, pekan kreativitas, Expo (belum dipakai kecuali yang ada di pills)
- [ ] Pembiasaan pagi: upacara, olahraga, murojaah, Yunda Jumat, bersih, berkisah (untuk section Program)
- [ ] Ekskul di video: sinematografi, marching band, musik, Pramuka, renang, futsal, robotik, taekwondo (untuk explorer Ekskul)
- [ ] Pengembangan guru: seminar, workshop, kelas bahasa Inggris, penguasaan teknologi

## Foto

- [ ] Foto stock di strip LSU masih **Unsplash hotlink** (`stock` di `src/lib/site.ts`). Isinya belum bisa saya lihat langsung; cek semuanya, dan ganti dengan foto asli sekolah (tanpa wajah anak LSU kecuali izin orang tua). Kalau gagal dimuat, otomatis jadi placeholder.
- [ ] Foto asli yang sudah dipakai: `gedung-sd.jpg` (hero), `siswa-membaca.jpg` (bento Program Unggulan). Foto siswa itu tampak siswa SMP; ganti dengan siswa SD bila ada.
- [ ] Banner "Tahun Ajaran 2022/2023" di kiri bawah foto gedung sudah usang; minta foto baru atau crop.
