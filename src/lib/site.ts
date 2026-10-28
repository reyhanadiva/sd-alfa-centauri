// Satu tempat untuk data yang sering berubah. Ganti nilai di sini, bukan di komponen.

export const site = {
  name: "SD Alfa Centauri",
  tagline: "To Be The Finest School In The World",
  phone: "022-7305453",
  phoneHref: "tel:+62227305453",
  email: "info@sdalfacentauri.sch.id",
  whatsapp: "6281223862294",
  whatsappDisplay: "0812-2386-2294",
  address: "Jl. Terate No. 10, Kota Bandung",
  instagram: "https://www.instagram.com/sdalfacentauri_official/",
  instagramHandle: "@sdalfacentauri_official",
  // TODO: isi dengan path/URL PDF brosur (mis. "/brosur-sd-alfa-centauri.pdf"). Kosong = tombol meminta brosur lewat WhatsApp.
  brosurHref: "" as string,
};

// Foto stok Pexels (lisensi bebas pakai), dimuat langsung dari CDN. HANYA penampung sementara agar tampilan terbayang:
// ganti dengan foto asli sekolah. Kalau gagal dimuat, komponen Photo menampilkan placeholder berlabel.
const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

export const waLink = (text = "Halo SD Alfa Centauri, saya ingin bertanya tentang SPMB.") =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

// TODO(data real): ganti tahun ajaran, gelombang, dan tanggal penutupan dari sekolah.
export const spmb = {
  academicYear: "2026/2027",
  wave: "Gelombang 1",
  // Placeholder, bukan tanggal resmi.
  closesAt: "2026-12-31T23:59:59+07:00",
  href: "#spmb",
};

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; desc?: string }[];
};

export const nav: NavItem[] = [
  {
    label: "Tentang",
    href: "#tentang",
    children: [
      { label: "Profil Sekolah", href: "#tentang", desc: "Sejarah dan visi" },
      { label: "7 Pilar Karakter", href: "#pilar", desc: "Nilai yang kami tanamkan" },
      { label: "Akreditasi", href: "#akreditasi", desc: "Terakreditasi A" },
    ],
  },
  {
    label: "Program",
    href: "#program",
    children: [
      { label: "Pendampingan Inklusi", href: "#inklusi", desc: "Learning Support Unit" },
      { label: "Gakko Tosho", href: "#program", desc: "Budaya literasi" },
      { label: "Tahfidz", href: "#program", desc: "Program hafalan Al-Qur'an" },
      { label: "Ekstrakurikuler", href: "#ekskul", desc: "Pilihan kegiatan siswa" },
    ],
  },
  {
    label: "Info Orang Tua",
    href: "#fasilitas",
    children: [
      { label: "Fasilitas", href: "#fasilitas", desc: "Ruang belajar dan penunjang" },
      { label: "FAQ", href: "#faq", desc: "Pertanyaan umum" },
    ],
  },
  { label: "Berita", href: "#berita" },
  { label: "SPMB", href: "#spmb" },
];

const FOUNDED = 2009;

export const yearsActive = new Date().getFullYear() - FOUNDED;
export const thisYear = new Date().getFullYear();

// Program Pendidikan Inklusif (LSU). Sumber: website lama + transkrip video. Verifikasi dengan sekolah.
export const lsuPoints = [
  { icon: "psikolog", title: "Pengawasan Psikolog Profesional", desc: "Program dirancang dan dipantau tenaga ahli." },
  { icon: "ppi", title: "Program Pendampingan Individual (PPI)", desc: "Pendampingan akademik dan perilaku per anak." },
  { icon: "terapi", title: "Layanan Terapi Terintegrasi", desc: "Terpadu dengan kegiatan belajar." },
] as const;

export const lsuActivities = [
  { icon: "manik", label: "Menyusun Manik-manik" },
  { icon: "yoga", label: "Yoga" },
  { icon: "puzzle", label: "Puzzle" },
  { icon: "seimbang", label: "Latihan Keseimbangan" },
  { icon: "gambar", label: "Menggambar" },
  { icon: "kancing", label: "Mengancing" },
] as const;

// ---------- Program (tiga ranah, dari transkrip video) ----------
export const ranah = [
  {
    key: "Taqwa",
    photo: px(11842681) as string | undefined,
    photoLabel: "Tahfidz dan shalat berjamaah",
    tagline: "Iman yang tumbuh lewat kebiasaan.",
    items: [
      { icon: "quran", title: "Tahfidz & Munaqosyah", desc: "Menghafal Al-Qur'an, diuji lewat munaqosyah" },
      { icon: "sun", title: "Shalat Dhuha", desc: "Dibiasakan bersama di sekolah" },
      { icon: "masjid", title: "Shalat wajib berjamaah", desc: "Dilaksanakan berjamaah di sekolah" },
    ],
  },
  {
    key: "Cerdas",
    photo: "/images/siswa-membaca.jpg" as string | undefined,
    photoLabel: "Siswa belajar dan membaca",
    tagline: "Numerasi, literasi, dan teknologi.",
    items: [
      { icon: "book", title: "Gakko Tosho", desc: "Budaya literasi" },
      { icon: "calc", title: "Surala", desc: "Belajar matematika lewat e-learning" },
      { icon: "read", title: "Reading Challenge", desc: "Tantangan membaca berkala" },
      { icon: "project", title: "Project Based Learning", desc: "Belajar lewat proyek nyata" },
      { icon: "trophy", title: "Pembinaan FLS2N & Olimpiade", desc: "Bimbingan menuju lomba dan olimpiade" },
    ],
  },
  {
    key: "Kreatif",
    photo: px(8612990) as string | undefined,
    photoLabel: "Pekan Kreativitas atau Expo",
    tagline: "Ruang untuk berkarya dan tampil.",
    items: [
      { icon: "reflect", title: "Pekan Refleksi", desc: "Waktu merefleksikan perjalanan belajar" },
      { icon: "parents", title: "Parents Day", desc: "Hari kebersamaan sekolah dan orang tua" },
      { icon: "palette", title: "Pekan Kreativitas", desc: "Pekan untuk berkarya dan berekspresi" },
      { icon: "expo", title: "Expo", desc: "Memamerkan hasil belajar siswa" },
      { icon: "trip", title: "Fieldtrip Edukatif", desc: "Belajar langsung di luar kelas" },
    ],
  },
] as const;

// Dari transkrip; "menari" kemungkinan terdengar sebagai "menarik" (verifikasi).
export const ekskul: { icon: string; label: string; photo?: string }[] = [
  { icon: "film", label: "Sinematografi", photo: px(18918155) },
  { icon: "drum", label: "Marching Band", photo: px(4720175) },
  { icon: "music", label: "Musik", photo: px(9643921) },
  { icon: "tent", label: "Pramuka", photo: px(9302795) },
  { icon: "swim", label: "Renang", photo: px(12615996) },
  { icon: "goal", label: "Futsal", photo: px(8813564) },
  { icon: "bot", label: "Robotik", photo: px(7868892) },
  { icon: "dance", label: "Menari", photo: px(35300570) },
  { icon: "medal", label: "Taekwondo", photo: px(7045594) },
];


// ---------- Tentang Kami ----------

// Isi `mp4` (file di /public/video) ATAU `youtubeId`. Kosong semua = tampil poster saja.
export const profileVideo: { mp4?: string; youtubeId?: string; poster: string; title: string } = {
  mp4: undefined,
  // Video lama (diunggah 26 Sep 2022). Ganti bila ada versi terbaru.
  youtubeId: "FFhuIIKqQnQ",
  poster: "/images/gedung-sd.jpg",
  title: "Video profil SD Alfa Centauri",
};

export const links = {
  yayasan: "https://alfacentauri.sch.id/yayasan/",
};

// Jaringan unit pendidikan (dari pengelola situs). Dipakai di footer.
export const jaringan = [
  { label: "Yayasan Alfa Centauri", href: "https://alfacentauri.sch.id/yayasan/" },
  { label: "TK Alfa Centauri", href: "https://alfacentauri.sch.id/tk/" },
  { label: "SMP Alfa Centauri", href: "https://smpalfacentauri.sch.id/" },
  { label: "SMA Alfa Centauri", href: "https://smaalfacentauri.sch.id/" },
  { label: "English Now", href: "http://englishnow.co.id/" },
  { label: "LCDU (Language Course for Da'wah dan Ummah)", href: "https://lcdu.org/" },
];

// Dua poin ringkas di bawah video. Sumber: website lama + transkrip video profil (auto-generated, verifikasi).
export const about = { founded: { label: "Berdiri 12 Juli 2009" } };

// ---------- Mengapa Memilih ----------

export const unggulanPills = [
  "Tahfidz & Munaqosyah",
  "Pembinaan FLS2N",
  "Reading Challenge",
  "Fieldtrip Edukatif",
  "Parents Day",
  "Lomba & Olimpiade",
];

// Tanpa logo SSC. Isi `href` kalau sudah ada tautan internal yang dimaksud.
export const ssc = { name: "Sony Sugema College (SSC)", href: undefined as string | undefined };

// ---------- 7 Pilar Karakter (tampil sebagai pills saja) ----------

export const pilarNames = [
  "Jujur",
  "Bersih & Rapi",
  "Mandiri",
  "Disiplin",
  "Tangguh",
  "Sopan & Santun",
  "Bermanfaat",
];

export const bintangKembar =
  "Dua bintang yang saling melambangkan keseimbangan tujuan kami: mengantarkan ananda meraih kesuksesan di dunia dan akhirat.";

// TODO: isi URL portal yang sebenarnya
export const portals = [
  { label: "Portal Orang Tua", href: "#" },
  { label: "Portal Guru", href: "#" },
];

// ---------- Fasilitas ----------
// Sumber: bagian "Fasilitas" di website lama (sdalfacentauri.sch.id). Hanya yang tertulis di sana.
// Tidak ada di website lama, jadi TIDAK dicantumkan: UKS, antar-jemput, seragam, katering, lapangan, taman, kantin.
// Perpustakaan hanya muncul sebagai tautan menu di website lama (tanpa keterangan), jadi belum dimasukkan.
// TODO(foto): semua kartu masih placeholder berlabel. Ganti dengan foto asli tiap fasilitas.
export const fasilitas: { title: string; caption?: string; photo?: string }[] = [
  { title: "Internet 24 jam", photo: px(11025019) },
  { title: "Proyektor", photo: px(15225230) },
  { title: "TV interaktif", photo: px(8141591) },
  { title: "AC", photo: px(8617956) },
  { title: "CCTV", photo: px(13156207) },
  { title: "Ruang multimedia", photo: px(5621945) },
  { title: "Mushola", photo: px(29832037) },
  { title: "Portal Orang Tua", caption: "Memantau perkembangan akademik dan karakter ananda.", photo: px(4624908) },
];

// Ringkasan di bawah judul Fasilitas: hanya yang tertulis "tiap kelas" di website lama.
export const perKelas = ["Proyektor", "AC", "CCTV", "Internet 24 jam"];

// ---------- Info Cepat Orang Tua ----------
// Semua kartu adalah tautan. Isi href asli: portal, kalender akademik (ada di website lama, tautannya belum diketahui).
export const infoCepat = [
  { icon: "portal", title: "Portal Orang Tua", desc: "Pantau perkembangan akademik dan karakter ananda.", href: portals[0].href },
  { icon: "kalender", title: "Kalender akademik", desc: "Jadwal kegiatan dan hari penting sekolah.", href: "#" },
  { icon: "spmb", title: "Info pendaftaran (SPMB)", desc: "Jadwal, syarat, dan cara mendaftar.", href: "#spmb" },
  { icon: "wa", title: "Tanya admin", desc: "Chat WhatsApp, kami bantu jawab.", href: "wa" },
  { icon: "telp", title: "Telepon sekolah", desc: "Hubungi kami di jam kerja.", href: "tel" },
  { icon: "map", title: "Petunjuk arah", desc: "Buka lokasi sekolah di Google Maps.", href: "map" },
] as const;

// ---------- Prestasi ----------
// TODO(data real): semua angka dan nama lomba di bawah placeholder. Isi dari sekolah.
export const prestasi = {
  total: 120, // placeholder
  since: 2009,
  categories: [
    { name: "Akademik", count: 40, items: [["Juara 1", "[Nama lomba], tingkat kota, 20XX"], ["Juara 2", "[Nama olimpiade], tingkat provinsi, 20XX"]] },
    { name: "Olahraga", count: 30, items: [["Juara 1", "[Cabang], tingkat kota, 20XX"], ["Juara 3", "[Cabang], tingkat provinsi, 20XX"]] },
    { name: "Seni & Kreativitas", count: 30, items: [["Juara 1", "[Lomba seni], tingkat kota, 20XX"], ["Finalis", "[FLS2N], tingkat provinsi, 20XX"]] },
    { name: "Tahfidz", count: 20, items: [["Juara 2", "[Lomba tahfidz], tingkat kota, 20XX"], ["Lulus", "Munaqosyah juz [X], 20XX"]] },
  ],
};

// ---------- Berita ----------
// MOCKUP: judul, tanggal, dan kategori di bawah hanya contoh agar tampilan terbayang. Foto memakai 3 foto asli
// yang tersedia (dipotong dari foto gedung dan siswa membaca), belum foto liputan. Ganti semuanya dengan berita asli.
export const berita = [
  { cat: "Kegiatan", date: "12 Okt 2026", title: "Reading Challenge: siswa berlomba menamatkan buku bulan ini", excerpt: "Siswa saling menantang diri menamatkan buku, ditemani guru dan perpustakaan kelas.", href: "#", photo: "/images/berita-baca.jpg" },
  { cat: "Pengumuman", date: "5 Okt 2026", title: "Pendaftaran SPMB 2026/2027 resmi dibuka", excerpt: "Jadwal, syarat, dan cara mendaftar kini bisa ditanyakan langsung ke admin.", href: "#", photo: "/images/berita-papan.jpg" },
  { cat: "Lingkungan", date: "28 Sep 2026", title: "River Clean Up: belajar peduli lingkungan lewat aksi nyata", excerpt: "Siswa terjun langsung merawat sungai dan belajar menjaga lingkungan sekitar.", href: "#", photo: "/images/berita-halaman.jpg" },
  { cat: "Parenting", date: "20 Sep 2026", title: "Tips mendampingi anak belajar di rumah agar tetap menyenangkan", excerpt: "Cara sederhana menjaga semangat belajar ananda di rumah tanpa tekanan.", href: "#", photo: "/images/gedung-sd.jpg" },
];

// ---------- FAQ ----------
// TODO(verifikasi): no. 1-4 dan 7 mengacu transkrip video; no. 5-6 jawaban umum (isi detail dari sekolah).
export const faqs = [
  { q: "Apakah SD Alfa Centauri menerima anak berkebutuhan khusus?", a: "Ya. Sebagai sekolah penyelenggara pendidikan inklusif, kami memiliki Learning Support Unit (LSU) di bawah pengawasan psikolog, dengan pendampingan individual untuk akademik dan perilaku serta layanan terapi." },
  { q: "Kurikulum apa yang digunakan?", a: "Kurikulum nasional Kemendikbud yang disesuaikan dengan kebutuhan siswa, supaya tiap anak bisa berkembang sesuai bakat dan keunikannya." },
  { q: "Bagaimana cara anak belajar di kelas?", a: "Pembelajaran berpusat pada siswa dan kolaboratif, memanfaatkan teknologi, serta dibarengi pembiasaan baik untuk menanamkan 7 karakter siswa." },
  { q: "Apa saja ekstrakurikulernya?", a: "Sinematografi, marching band, musik, Pramuka, renang, futsal, robotik, menari, dan taekwondo." },
  { q: "Kapan pendaftaran SPMB dibuka dan apa syaratnya?", a: "Jadwal dan syarat terbaru ada di bagian SPMB. Admin kami siap membantu lewat WhatsApp." },
  { q: "Berapa biaya pendidikan?", a: "Rincian biaya diinformasikan oleh admin sesuai jenjang kelas dan program. Silakan tanyakan lewat WhatsApp." },
  { q: "Apakah ada program tahfidz?", a: "Ada. Siswa mengikuti program Tahfidz dengan munaqosyah, serta shalat dhuha dan shalat wajib berjamaah." },
];

// ---------- Lokasi ----------
export const lokasi = {
  street: "Jl. Terate No. 10,",
  city: "Kota Bandung",
  mapEmbed: "https://www.google.com/maps?q=SD+Alfa+Centauri+Jl.+Terate+No.+10+Bandung&output=embed",
  mapLink: "https://www.google.com/maps/search/?api=1&query=SD+Alfa+Centauri+Jl.+Terate+No.+10+Bandung",
};

// ---------- Galeri Kegiatan ----------
// Nama kegiatan dari website lama. TODO(foto): hanya "Reading Challenge" memakai foto asli yang ada; sisanya placeholder.
export const galeri: { title: string; caption: string; photo?: string }[] = [
  { title: "Reading Challenge", caption: "Siswa menamatkan buku bersama.", photo: "/images/siswa-membaca.jpg" },
  { title: "River Clean Up", caption: "Belajar peduli lingkungan lewat aksi nyata.", photo: px(7656985) },
  { title: "Parents Day", caption: "Hari kebersamaan sekolah dan orang tua.", photo: px(4261270) },
  { title: "Munaqosyah", caption: "Ujian hafalan Al-Qur'an siswa.", photo: px(11929254) },
  { title: "Fieldtrip", caption: "Belajar langsung di luar kelas.", photo: px(34251808) },
  { title: "Pekan Kreativitas", caption: "Karya dan ide ananda tampil.", photo: px(8612992) },
  { title: "Expo", caption: "Pameran hasil belajar siswa.", photo: px(7868885) },
  { title: "Olimpiade", caption: "Menguji kemampuan lewat kompetisi.", photo: px(19520596) },
];

// ---------- Testimoni ----------
// CONTOH: nama, profesi/jabatan, dan kutipan hanya isian agar tampilan terbayang, BUKAN testimoni asli.
// Ganti dengan testimoni orang tua yang sudah memberi izin. `persona` = profesi/jabatan/status (tampil sebagai pil).
// `photo`: path foto orang tua (mis. "/images/testimoni/bu-sari.jpg", persegi 600x600), kosong = inisial.
export const testimoni: { quote: string; name: string; persona: string; note: string; photo?: string }[] = [
  { quote: "Anak saya jadi lebih percaya diri dan senang bercerita tentang sekolahnya setiap pulang.", name: "[Nama]", persona: "Dokter spesialis anak", note: "Orang tua siswa kelas 3" },
  { quote: "Guru-gurunya sabar dan terbuka berkomunikasi. Kami merasa dilibatkan dalam perkembangan ananda.", name: "[Nama]", persona: "Dosen perguruan tinggi", note: "Orang tua siswa kelas 5" },
  { quote: "Pembiasaan ibadah dan karakter berjalan beriringan dengan pelajaran. Itu yang kami cari.", name: "[Nama]", persona: "Pengusaha", note: "Orang tua siswa kelas 1" },
  { quote: "Anak kami berkebutuhan khusus, dan pendampingannya membuat ia berkembang dengan caranya sendiri.", name: "[Nama]", persona: "Ibu rumah tangga", note: "Orang tua siswa kelas 2" },
  { quote: "Sekolah yang menyeimbangkan prestasi dan akhlak. Anak berangkat dengan senang setiap pagi.", name: "[Nama]", persona: "Pejabat pemerintah daerah", note: "Orang tua siswa kelas 4" },
  { quote: "Informasi dari sekolah jelas dan cepat, jadi kami yang bekerja tetap tenang memantau ananda.", name: "[Nama]", persona: "Karyawan swasta", note: "Orang tua siswa kelas 6" },
];
