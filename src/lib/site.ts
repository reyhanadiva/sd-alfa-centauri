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

const FOUNDED = 2009;

export const yearsActive = new Date().getFullYear() - FOUNDED;

// Foto stock (Unsplash, hotlink) sementara. Ganti dengan foto asli sekolah di Photo `src`.
// Semuanya perlu dicek tampilannya saat live; kalau gagal dimuat, otomatis jadi placeholder.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=900`;
export const stock = {
  teacher: u("1758685733907-42e9651721f5"),
  beads: u("1646070107254-3713cec279c1"),
  drawing: u("1646617747566-b7e784435a48"),
  puzzle: u("1650420600515-7b5dd9e6e83d"),
  reading: u("1532789339108-2ebc484efbf1"),
  play: u("1502086223501-7ea6ecd79368"),
};

// Kartu LSU (strip bergaya galeri). Sumber: transkrip video profil + website lama. Verifikasi dengan sekolah.
export const lsuCards: {
  title: string;
  caption: string;
  photo?: string;
  icon?: "psikolog" | "terapi";
  tone?: "blue" | "sky";
}[] = [
  { title: "Melatih motorik", caption: "Manik-manik, mengancing, yoga, latihan keseimbangan.", photo: stock.beads },
  { title: "Diawasi psikolog", caption: "Setiap program dirancang dan dipantau tenaga ahli.", icon: "psikolog", tone: "blue" },
  // Kartu ke-3 jadi kartu tengah saat pertama tampil
  { title: "Pendampingan individual", caption: "Akademik dan perilaku, sesuai kebutuhan ananda.", photo: stock.teacher },
  { title: "Layanan terapi", caption: "Terintegrasi dengan kegiatan belajar.", icon: "terapi", tone: "sky" },
  { title: "Berekspresi", caption: "Menggambar dengan bebas dan penuh warna.", photo: stock.drawing },
  { title: "Melatih fokus", caption: "Puzzle dan permainan berpikir.", photo: stock.puzzle },
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

// Dua poin ringkas di bawah video. Sumber: website lama + transkrip video profil (auto-generated, verifikasi).
export const about = {
  founded: { label: "Berdiri 12 Juli 2009", desc: "Di bawah naungan Yayasan Taqwa Cerdas Kreatif." },
  star: {
    label: "Bintang kembar Alpha Centauri",
    desc: "Lambang kami: sekolah, guru, dan orang tua jadi partner mengantar ananda sukses di dunia dan akhirat.",
  },
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
