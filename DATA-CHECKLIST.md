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

## Fasilitas, Program

- [x] **Daftar fasilitas** sudah dikoreksi: hanya yang tertulis di website lama (internet 24 jam, proyektor, TV interaktif, AC, CCTV, ruang multimedia, mushola, Portal Orang Tua). Draf awal saya (perpustakaan, ruang kreativitas, lapangan, taman, UKS, kantin) dihapus karena tidak ada di data.
- [ ] Tambahkan fasilitas lain yang benar-benar ada (mis. perpustakaan, hanya muncul sebagai menu di website lama tanpa keterangan) + keterangan singkat.
- [ ] Baris "Di setiap kelas: Proyektor, AC, CCTV, Internet 24 jam" (`perKelas`): konfirmasi TV interaktif juga di setiap kelas atau tidak.
- [ ] **Foto fasilitas**: semua kartu placeholder berlabel; minta foto asli tiap fasilitas.
- [x] Fasilitas memakai gaya Daftar. Gaya Kipas dipindah jadi Galeri Kegiatan.
- [ ] **Program per ranah**: nama program dari transkrip + salinan Mas Reyhan. Kalimat tagline per tab ("Iman yang tumbuh lewat kebiasaan", dst.) dan deskripsi pendek (Surala, Reading Challenge) adalah tulisan saya.
- [ ] Foto tab Taqwa dan Kreatif masih placeholder; tab Cerdas memakai foto siswa membaca.
- [ ] Ekskul: daftar dari transkrip ("Menari" kemungkinan salah dengar); foto per kegiatan diisi lewat `photo` di `ekskul`

## Info Orang Tua (akses cepat) — DIKELUARKAN dari page

Komponen `Praktis.tsx` dan data `infoCepat` masih ada tapi tidak ditampilkan. Pakai lagi bila sudah ada portal/kalender, atau sebarkan ke section lain.

- [ ] Kartu Portal Orang Tua dan Kalender akademik: isi `href` asli (sekarang "#"). Kalender akademik ada di website lama, tautannya belum diketahui.
- [x] Jam sekolah, antar-jemput, katering, seragam, UKS: dihapus karena tidak ada di data. Tambahkan lagi bila sekolah memberi datanya.

## Prestasi (semua placeholder)

- [ ] Total prestasi (120+), jumlah per kategori, dan sorotan juara di `prestasi` (site.ts) adalah contoh. Isi dari sekolah (nama lomba, tingkat, tahun). Kategori (Akademik, Olahraga, Seni & Kreativitas, Tahfidz) juga usulan.

## Berita, FAQ, Lokasi

- [ ] Berita: MOCKUP. Judul, kategori, tanggal di `berita` (site.ts) hanya contoh (topik mengacu program di website lama); foto memakai potongan foto gedung dan siswa membaca. Ganti dengan berita dan foto liputan asli. Halaman artikel belum ada.
- [ ] FAQ: no. 1-4 dan 7 mengacu transkrip video; no. 5-6 (jadwal/syarat SPMB, biaya) jawaban umum, isi detailnya. Tambah pertanyaan nyata yang sering masuk ke admin.
- [ ] Peta: memakai embed Google Maps berdasarkan nama + alamat. Pastikan pin tepat; kalau meleset, ganti `mapEmbed` dengan link "Share > Embed" dari lokasi sebenarnya.
- [ ] Berita: kartu pertama (Sorotan) memakai `excerpt` mockup.
- [ ] Hero: subtitle "Menumbuhkan anak yang bertakwa, cerdas, dan kreatif." adalah tulisan saya; ganti bila punya tagline resmi.
- [ ] FAQ "Tanya admin" hanya membuka WhatsApp dengan pesan template (tanpa backend).
- [ ] Footer/CTA kini satu adegan (Closing.tsx): siluet sekolah hanya ilustrasi generik, bukan gambar gedung asli.
- [ ] Footer: deskripsi singkat adalah tulisan saya; tautan jaringan dari Mas Reyhan (Yayasan, TK, SMP, SMA, English Now, LCDU). Instagram/sosmed belum ada, tambahkan bila ada.
- [ ] CTA penutup: tombol Daftar SPMB membuka WhatsApp (belum ada halaman pendaftaran). Tahun ajaran 2026/2027 masih placeholder.

## Galeri, Testimoni, penutup

- [ ] Galeri Kegiatan: nama kegiatan dari website lama; hanya Reading Challenge memakai foto asli. Minta foto kegiatan lain (dan izin memuat wajah anak).
- [ ] Testimoni: 6 CONTOH (nama "[Nama]", profesi/jabatan, kutipan semuanya isian, label "contoh" sudah dihapus dari halaman). Ganti dengan testimoni nyata + foto + persetujuan tertulis. Foto: simpan persegi/portrait 4:5 di public/images/testimoni/, isi `photo`.
- [ ] Asisten "Tanya Alfa" (kanan bawah): jawabannya dari `faqs` (site.ts) dan fasilitas; ikut berubah bila FAQ diisi data asli. Bukan AI, tanpa backend.
- [ ] Section Angka (tahun, ranah, ekskul, pilar) dan Jenjang (TK-SD-SMP-SMA) memakai data yang ada; cek kebenaran klaim jenjang.
- [ ] LCDU di footer ditulis "Language Course for Da'wah dan Ummah" sesuai halaman lcdu.org; konfirmasi nama yang dipakai.
- [ ] Instagram footer: @sdalfacentauri_official (dari Mas Reyhan).

## Putaran 7 (foto stok, asisten, angka)

- [ ] **Foto stok Pexels** (26 foto: ekskul, ranah Taqwa/Kreatif, fasilitas, galeri) di `site.ts` lewat `px(id)`. Hanya penampung agar tampilan terbayang; ID diambil dari URL halaman Pexels (lisensi bebas pakai), tapi saya tidak bisa melihat gambarnya langsung. Sebagian kurang cocok (Proyektor = orang dewasa presentasi; Taekwondo = karate; Parents Day dan River Clean Up kurang pas; Marching Band pemainnya kemungkinan dewasa). Ganti semuanya dengan foto asli sekolah (izin wajah anak).
- [ ] Subtitle tiap poin Program (mis. "Dibiasakan bersama di sekolah") adalah rumusan saya; cocokkan dengan kegiatan sebenarnya.
- [ ] Angka di bawah "Mengapa memilih": hanya "17 tahun" yang pasti; siswa aktif, guru, alumni masih "XX+".
- [ ] "Bukan SD Islam": kata "Islam" dihapus dari footer dan judul tab browser. Deskripsi meta di layout.tsx masih menyebut "integrasi nilai keislaman" (dari website lama): putuskan dipakai atau tidak. Cek juga bagian lain yang menyebut keislaman (Tahfidz, shalat, mushola adalah fakta program, bukan label sekolah).
- [ ] Brosur: `site.brosurHref` kosong, tombol di CTA/asisten sementara meminta brosur via WhatsApp. Isi path PDF bila sudah ada.
- [ ] Asisten "Bintang": basis pengetahuan (`kb` di AskWidget.tsx) hanya berisi fakta yang ada di data. Tambahkan entri saat ada data baru (jam sekolah, seragam, antar-jemput, katering, UKS belum ada datanya).
- [x] Section "Jenjang" dihapus; tautan unit tetap di footer.

## Putaran 8 (versi English, brosur, asisten)

- [ ] **Teks sekarang ada di `src/content/id.ts` dan `src/content/en.ts`** (bukan lagi di `site.ts`; `site.ts` hanya kontak, tautan, angka). Semua file dan data di checklist di atas yang menyebut `site.ts` untuk teks (berita, FAQ, prestasi, testimoni, fasilitas, galeri, portal) kini ada di file `content`. Satu entri = satu objek utuh (teks + foto + ikon), bentuk yang kelak mudah diisi dari panel admin.
- [ ] **Terjemahan English adalah tulisan saya** (bukan penutur asli/sekolah). Minta guru bahasa Inggris atau tim English Now membaca ulang, terutama: hero ("Taqwa (devout), Cerdas (smart), Kreatif (creative)"), nama program, FAQ, dan deskripsi meta.
- [ ] Toggle ID/EN di navbar pindah halaman: `/` (Indonesia) dan `/en` (English). Tautan hreflang sudah dipasang di metadata. Domain dasar: `NEXT_PUBLIC_SITE_URL` (default https://sdalfacentauri.sch.id); isi di Vercel bila domain berbeda.
- [ ] **Brosur**: tombol CTA sekarang "Unduh brosur" langsung ke PDF. `public/brosur-sd-alfa-centauri.pdf` dan `-en.pdf` adalah placeholder; timpa dengan brosur asli (nama file sama, atau ubah `site.brosur`).
- [ ] **Foto kosong**: foto Pexels kadang tidak termuat (blok jaringan/hotlink). Jalankan `npm run fetch-stock` di komputer berinternet untuk mengunduh semuanya ke `public/images/stock/` lalu commit; situs memakai berkas lokal lebih dulu. Itu pun hanya penampung: ganti dengan foto asli sekolah. Placeholder yang gagal termuat kini lebih rapi (label kegiatan di atas gradien).
- [ ] Asisten: nama "Bintang" dihapus. Tombol kanan bawah memakai logo bintang dengan balon sapaan kecil ("Halo! Ada yang bisa kami bantu?" / "Hi! How can we help?"). Basis jawaban: `assistant.kb` di `src/content/*.ts`, bukan baca dari tampilan halaman.
- [ ] Deskripsi meta (`meta.description` di id.ts) masih menyebut "integrasi nilai keislaman": pertahankan atau hapus? (sekolah bukan "SD Islam")

## Putaran 9 (testimoni asli, sertifikat, foto sekolah)

- [ ] **Testimoni**: 4 testimoni asli dengan foto. Teks Pak Zein sudah sesuai kiriman terbaru. Teks Pak Luthfi: kalimat terakhir di sumbernya masih janggal ("beberapa potensi yang tidak saat berinteraksi..."), jadi saya ringkas; minta kalimat utuhnya. Pastikan ada izin tertulis. Terjemahan English tulisan saya.
- [ ] **Sertifikat akreditasi**: sudah dipasang (`public/images/sertifikat-akreditasi.jpg`); keterangan "Terakreditasi A (Unggul), nilai 95, berlaku sampai 31 Desember 2028" diambil dari sertifikat.
- [ ] **Berita**: 3 berita pertama memakai judul dari website lama dan poster dipotong dari tangkapan layar (resolusi rendah, ±430px); ringkasan dan tanggal ("Sep 2026") saya tulis. Ganti dengan berita asli + foto resolusi penuh.
- [ ] **Foto sekolah baru** menggantikan sebagian foto stok: kelas komputer (Ranah Cerdas, Ruang multimedia), pentas siswa (Ranah Kreatif, Pekan Kreativitas), perpustakaan (Reading Challenge), siswa olahraga (Olimpiade, pemetaan sementara), pembiasaan cuci piring (kartu galeri baru "Pembiasaan Karakter"). Pemetaan foto ke kegiatan adalah tebakan saya.
- [ ] Foto munaqosyah dan prestasi belum teridentifikasi di lampiran; Munaqosyah di galeri masih foto stok. Prestasi belum memakai foto.
