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
    photo: undefined as string | undefined,
    photoLabel: "Tahfidz dan shalat berjamaah",
    tagline: "Iman yang tumbuh lewat kebiasaan.",
    items: [
      { icon: "quran", title: "Tahfidz & Munaqosyah" },
      { icon: "sun", title: "Shalat Dhuha" },
      { icon: "masjid", title: "Shalat wajib berjamaah" },
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
      { icon: "project", title: "Project Based Learning" },
      { icon: "trophy", title: "Pembinaan FLS2N & Olimpiade" },
    ],
  },
  {
    key: "Kreatif",
    photo: undefined as string | undefined,
    photoLabel: "Pekan Kreativitas atau Expo",
    tagline: "Ruang untuk berkarya dan tampil.",
    items: [
      { icon: "reflect", title: "Pekan Refleksi" },
      { icon: "parents", title: "Parents Day" },
      { icon: "palette", title: "Pekan Kreativitas" },
      { icon: "expo", title: "Expo" },
      { icon: "trip", title: "Fieldtrip Edukatif" },
    ],
  },
] as const;

// Dari transkrip; "menari" kemungkinan terdengar sebagai "menarik" (verifikasi).
export const ekskul = [
  { icon: "film", label: "Sinematografi" },
  { icon: "drum", label: "Marching Band" },
  { icon: "music", label: "Musik" },
  { icon: "tent", label: "Pramuka" },
  { icon: "swim", label: "Renang" },
  { icon: "goal", label: "Futsal" },
  { icon: "bot", label: "Robotik" },
  { icon: "dance", label: "Menari" },
  { icon: "medal", label: "Taekwondo" },
] as const;


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

// ---------- Fasilitas & Keamanan ----------
// TODO(verifikasi): daftar fasilitas dan keamanan di bawah masih draf, cocokkan dengan website lama.
export const fasilitas: { title: string; caption: string; photo?: string }[] = [
  { title: "Gedung & ruang kelas", caption: "Nyaman dan tertata untuk belajar sehari-hari.", photo: "/images/gedung-sd.jpg" },
  { title: "Perpustakaan", caption: "Sudut baca untuk budaya literasi." },
  { title: "Tempat ibadah", caption: "Shalat dhuha dan berjamaah di sekolah." },
  { title: "Area bermain & olahraga", caption: "Ruang bergerak untuk futsal dan senam." },
  { title: "Ruang penunjang", caption: "Ruang kreativitas dan kegiatan khusus." },
];

export const keamanan = [
  { icon: "cctv", title: "CCTV", desc: "Area sekolah terpantau" },
  { icon: "uks", title: "UKS", desc: "Pertolongan pertama di sekolah" },
  { icon: "jemput", title: "Jemput aman", desc: "Penjemputan terkontrol" },
  { icon: "shield", title: "Anti-bullying", desc: "Lingkungan yang saling menghargai" },
] as const;
