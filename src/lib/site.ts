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
};

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
    href: "#info-orang-tua",
    children: [
      { label: "Fasilitas", href: "#fasilitas", desc: "Ruang belajar dan penunjang" },
      { label: "Keamanan & Kesehatan", href: "#keamanan", desc: "Jemput, UKS, CCTV" },
      { label: "Layanan Harian", href: "#info-orang-tua", desc: "Jam sekolah, katering, dll." },
      { label: "FAQ", href: "#faq", desc: "Pertanyaan umum" },
    ],
  },
  { label: "Berita", href: "#berita" },
  { label: "SPMB", href: "#spmb" },
];

// Chip di hero. Sengaja tidak mengulang "Terakreditasi A" / "Sejak 2009" (sudah ada di stiker foto).
export const heroHighlights = [
  "Kurikulum Nasional + Gakko Tosho",
  "Pendidikan Karakter 7 Pilar",
  "Tahfidz & Munaqosyah",
];

const FOUNDED = 2009;

// null = data belum ada, tampil "XXX+" sampai diisi. Jangan isi angka karangan.
export type Stat = {
  label: string;
  note?: string;
  text?: string; // ditampilkan apa adanya
  count?: number | null; // dianimasikan count-up
  suffix?: string;
};

export const stats: Stat[] = [
  { text: "A", label: "Terakreditasi", note: "BAN-S/M" },
  { count: new Date().getFullYear() - FOUNDED, suffix: "+", label: "Tahun berpengalaman", note: `Sejak ${FOUNDED}` },
  { count: 7, label: "Pilar karakter", note: "Dari Jujur sampai Bermanfaat" },
  // TODO(data real): jumlah siswa dari sekolah
  { count: null, suffix: "+", label: "Siswa aktif", note: "Data menyusul" },
];

// TODO(verifikasi dengan sekolah): poin 3 dan alur 3 langkah belum dikonfirmasi.
export const inklusi = {
  points: [
    "Pengawasan Psikolog Profesional",
    "Program Pendampingan Individual (PPI)",
    "Layanan Terapi Terintegrasi",
  ],
  steps: [
    { title: "Asesmen", desc: "Psikolog dan guru memahami kebutuhan belajar anak." },
    { title: "Rencana pendampingan", desc: "Program disusun khusus sesuai hasil asesmen." },
    { title: "Evaluasi bersama orang tua", desc: "Perkembangan ditinjau berkala bersama keluarga." },
  ],
  activities: [
    "Menyusun Manik-manik",
    "Yoga",
    "Puzzle",
    "Latihan Keseimbangan",
    "Menggambar",
    "Mengancing",
  ],
};

// ---------- Tentang Kami ----------

// Isi `mp4` (file di /public/video) ATAU `youtubeId`. Kosong semua = tampil poster saja.
export const profileVideo: { mp4?: string; youtubeId?: string; poster: string; title: string } = {
  mp4: undefined,
  youtubeId: undefined,
  poster: "/images/gedung-sd.jpg",
  title: "Video profil SD Alfa Centauri",
};

export const about = {
  founding:
    "Didirikan pada tahun 2009 oleh Sony Sugema (alm.), SD Alfa Centauri berdedikasi menjawab tantangan pendidikan berkualitas sejak usia dini dengan memadukan sains dan spiritualitas.",
};

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

// ---------- 7 Pilar Karakter ----------
// TODO(verifikasi dengan sekolah): arti dan perilaku di bawah ini DRAF, belum dari sekolah.

export const pilar = [
  { name: "Jujur", meaning: "Berkata dan bertindak sesuai kebenaran.", behaviors: ["Berani mengakui kesalahan", "Mengerjakan tugas dengan usaha sendiri"] },
  { name: "Bersih & Rapi", meaning: "Menjaga diri dan lingkungan tetap nyaman.", behaviors: ["Merapikan perlengkapan sendiri", "Menjaga kebersihan kelas"] },
  { name: "Mandiri", meaning: "Percaya diri mengurus kebutuhannya sendiri.", behaviors: ["Menyiapkan perlengkapan sekolah sendiri", "Mencoba dulu sebelum meminta bantuan"] },
  { name: "Disiplin", meaning: "Taat pada waktu dan aturan bersama.", behaviors: ["Hadir tepat waktu", "Menyelesaikan tugas sesuai jadwal"] },
  { name: "Tangguh", meaning: "Tidak mudah menyerah saat menghadapi kesulitan.", behaviors: ["Mau mencoba lagi setelah gagal", "Tetap berusaha saat tugas terasa sulit"] },
  { name: "Sopan & Santun", meaning: "Menghormati orang lain dalam kata dan sikap.", behaviors: ["Menyapa dan mengucap salam", "Berbicara santun kepada guru dan teman"] },
  { name: "Bermanfaat", meaning: "Hadir untuk menolong dan memberi kebaikan.", behaviors: ["Membantu teman yang kesulitan", "Peduli pada lingkungan sekitar"] },
];

export const bintangKembar =
  "Dua bintang yang saling melambangkan keseimbangan tujuan kami: mengantarkan ananda meraih kesuksesan di dunia dan akhirat.";
