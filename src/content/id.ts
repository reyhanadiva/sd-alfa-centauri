// Semua teks tampilan (Bahasa Indonesia) ada di sini. Versi Inggris: en.ts (bentuk datanya harus sama).
// Ini juga bentuk data yang kelak diisi dari panel admin. Isi non-teks (foto, ikon, tautan) ikut di sini
// supaya satu entri = satu objek utuh. TODO(data real) / TODO(foto) menandai isian yang masih contoh.
import { jaringan as _j } from "./shared";
import { lokasi, px, site, spmb, waLink, ssc } from "@/lib/site";

const wa = (text: string) => waLink(`Halo SD Alfa Centauri, ${text}`);
const waLabel = "Lanjut ke admin (WhatsApp)";

const faqItems = [
  { q: "Apakah SD Alfa Centauri menerima anak berkebutuhan khusus?", a: "Ya. Sebagai sekolah penyelenggara pendidikan inklusif, kami memiliki Learning Support Unit (LSU) di bawah pengawasan psikolog, dengan pendampingan individual untuk akademik dan perilaku serta layanan terapi." },
  { q: "Kurikulum apa yang digunakan?", a: "Kurikulum nasional Kemendikbud yang disesuaikan dengan kebutuhan siswa, supaya tiap anak bisa berkembang sesuai bakat dan keunikannya." },
  { q: "Bagaimana cara anak belajar di kelas?", a: "Pembelajaran berpusat pada siswa dan kolaboratif, memanfaatkan teknologi, serta dibarengi pembiasaan baik untuk menanamkan 7 karakter siswa." },
  { q: "Apa saja ekstrakurikulernya?", a: "Sinematografi, marching band, musik, Pramuka, renang, futsal, robotik, menari, dan taekwondo." },
  { q: "Kapan pendaftaran SPMB dibuka dan apa syaratnya?", a: "Jadwal dan syarat terbaru ada di bagian SPMB. Admin kami siap membantu lewat WhatsApp." },
  { q: "Berapa biaya pendidikan?", a: "Rincian biaya diinformasikan oleh admin sesuai jenjang kelas dan program. Silakan tanyakan lewat WhatsApp." },
  { q: "Apakah ada program tahfidz?", a: "Ada. Siswa mengikuti program Tahfidz dengan munaqosyah, serta shalat dhuha dan shalat wajib berjamaah." },
];
const pilar = ["Jujur", "Bersih & Rapi", "Mandiri", "Disiplin", "Tangguh", "Sopan & Santun", "Bermanfaat"];

export const id = {
  lang: "id" as "id" | "en",
  htmlLang: "id",
  ogLocale: "id_ID",
  path: "/",
  meta: {
    title: "SD Alfa Centauri Bandung | Sekolah Dasar Inklusif & Berkarakter",
    // TODO(tanya): kalimat "integrasi nilai keislaman" dipertahankan dulu; sekolah menyatakan bukan "SD Islam".
    description:
      "SD Alfa Centauri, Bandung. Terakreditasi A. Mencetak generasi Taqwa, Cerdas, dan Kreatif dengan pendampingan inklusi, pendidikan karakter, dan integrasi nilai keislaman dengan sains teknologi.",
    ogTitle: "SD Alfa Centauri Bandung",
    ogDescription: "To Be The Finest School In The World.",
  },

  nav: [
    { label: "Tentang", href: "#tentang", children: [
      { label: "Profil Sekolah", href: "#tentang", desc: "Sejarah dan visi" },
      { label: "7 Pilar Karakter", href: "#pilar", desc: "Nilai yang kami tanamkan" },
      { label: "Akreditasi", href: "#akreditasi", desc: "Terakreditasi A" },
    ] },
    { label: "Program", href: "#program", children: [
      { label: "Pendampingan Inklusi", href: "#inklusi", desc: "Learning Support Unit" },
      { label: "Gakko Tosho", href: "#program", desc: "Budaya literasi" },
      { label: "Tahfidz", href: "#program", desc: "Program hafalan Al-Qur'an" },
      { label: "Ekstrakurikuler", href: "#ekskul", desc: "Pilihan kegiatan siswa" },
    ] },
    { label: "Info Orang Tua", href: "#fasilitas", children: [
      { label: "Fasilitas", href: "#fasilitas", desc: "Ruang belajar dan penunjang" },
      { label: "FAQ", href: "#faq", desc: "Pertanyaan umum" },
    ] },
    { label: "Berita", href: "#berita" },
    { label: "SPMB", href: "#spmb" },
  ] as { label: string; href: string; children?: { label: string; href: string; desc?: string }[] }[],
  ui: {
    mainMenu: "Menu utama", openMenu: "Buka menu", closeMenu: "Tutup menu", mobileMenu: "Menu seluler",
    portal: "Portal", register: "Daftar SPMB", registerOnline: "Daftar SPMB Online",
    home: "SD Alfa Centauri, ke beranda", language: "Bahasa",
  },
  portals: [
    { label: "Portal Orang Tua", href: "#" }, // TODO: isi URL portal sebenarnya
    { label: "Portal Guru", href: "#" },
  ],

  hero: {
    alt: "Gedung SD Alfa Centauri di Jalan Terate No. 10, Bandung",
    sub: "Menumbuhkan anak yang **Taqwa**, **Cerdas**, dan **Kreatif**.",
    register: "Daftar SPMB",
    accredited: "Terakreditasi BAN-S/M",
  },
  cert: {
    open: "Lihat sertifikat", title: "Sertifikat Akreditasi A", aria: "Sertifikat akreditasi", close: "Tutup",
    alt: "Sertifikat akreditasi A dari BAN-S/M untuk SD Alfa Centauri", label: "Sertifikat akreditasi (BAN-S/M)",
    img: "/images/sertifikat-akreditasi.jpg", info: "Terakreditasi A (Unggul), nilai 95. Berlaku sampai 31 Desember 2028.",
  },
  about: {
    lead: "SD Alfa Centauri berkomitmen mewujudkan visi",
    quote: "To Be The Finest School In The World",
    tail: "melalui misi membentuk generasi yang",
    link: "Taqwa, Cerdas, dan Kreatif",
    founded: "Berdiri 12 Juli 2009",
    under: "Di bawah naungan",
    foundation: "Yayasan Taqwa Cerdas Kreatif",
    twinTitle: "Bintang kembar Alfa Centauri",
    twinText: "Dua bintang melambangkan keseimbangan tujuan kami: mengantar ananda sukses di **dunia & akhirat**.",
  },
  video: {
    title: "Video profil SD Alfa Centauri", pause: "Jeda video", play: "Putar video",
    unmute: "Nyalakan suara", mute: "Matikan suara", soon: "Video profil menyusul",
  },

  why: {
    title: ["Mengapa memilih ", "SD Alfa Centauri?"],
    aria: "Alasan memilih",
    acc: { title: "Terakreditasi A", text: "Standar mutu pendidikan yang diakui BAN-S/M." },
    prog: {
      title: "Program Unggulan Terpadu", text: "Mengembangkan potensi, minat, dan bakat setiap siswa.",
      alt: "Siswa SD Alfa Centauri membaca buku di luar kelas", label: "Kegiatan siswa",
      pills: ["Tahfidz & Munaqosyah", "Pembinaan FLS2N", "Reading Challenge", "Fieldtrip Edukatif", "Parents Day", "Lomba & Olimpiade"],
    },
    bimbel: { title: "Kemitraan Bimbel", text: `Jam belajar tambahan bersama ${ssc.name}.`, more: "Selengkapnya" },
    ask: { title: "Bisa kami bantu?", cta: "Chat admin", wa: wa("saya ingin bertanya tentang SPMB.") },
    more: "+{n} lainnya", close: "Tutup",
  },
  stats: {
    aria: "Alfa Centauri dalam angka",
    labels: ["tahun melayani pendidikan", "siswa aktif", "guru dan tenaga pendidik", "alumni"], // TODO(data real): angka XX+
  },

  program: {
    title: ["Program yang menumbuhkan ", "Taqwa, Cerdas, dan Kreatif"],
    tabsAria: "Ranah program",
    ranah: [
      { key: "Taqwa", photo: "/images/munaqosyah.jpg" as string | undefined, photoLabel: "Tahfidz dan shalat berjamaah", tagline: "Iman yang tumbuh lewat kebiasaan.",
        items: [
          { icon: "quran", title: "Tahfidz & Munaqosyah", desc: "Menghafal Al-Qur'an, diuji lewat munaqosyah" },
          { icon: "sun", title: "Shalat Dhuha", desc: "Dibiasakan bersama di sekolah" },
          { icon: "masjid", title: "Shalat wajib berjamaah", desc: "Dilaksanakan berjamaah di sekolah" },
        ] },
      { key: "Cerdas", photo: "/images/kelas-komputer.jpg" as string | undefined, photoLabel: "Siswa belajar dan membaca", tagline: "Numerasi, literasi, dan teknologi.",
        items: [
          { icon: "book", title: "Gakko Tosho", desc: "Budaya literasi" },
          { icon: "calc", title: "Surala", desc: "Belajar matematika lewat e-learning" },
          { icon: "read", title: "Reading Challenge", desc: "Tantangan membaca berkala" },
          { icon: "project", title: "Project Based Learning", desc: "Belajar lewat proyek nyata" },
          { icon: "trophy", title: "Pembinaan FLS2N & Olimpiade", desc: "Bimbingan menuju lomba dan olimpiade" },
        ] },
      { key: "Kreatif", photo: "/images/pentas-siswa.jpg" as string | undefined, photoLabel: "Pekan Kreativitas atau Expo", tagline: "Ruang untuk berkarya dan tampil.",
        items: [
          { icon: "reflect", title: "Pekan Refleksi", desc: "Waktu merefleksikan perjalanan belajar" },
          { icon: "parents", title: "Parents Day", desc: "Hari kebersamaan sekolah dan orang tua" },
          { icon: "palette", title: "Pekan Kreativitas", desc: "Pekan untuk berkarya dan berekspresi" },
          { icon: "expo", title: "Expo", desc: "Memamerkan hasil belajar siswa" },
          { icon: "trip", title: "Fieldtrip Edukatif", desc: "Belajar langsung di luar kelas" },
        ] },
    ],
    ekskul: {
      title: "Ekstrakurikuler", sub: "Beragam kegiatan sesuai minat ananda.", view: "Tampilan", viewLabel: "Tampilan {x}",
      grid: "Kisi", photo: "Foto", see: "Lihat foto {x}", prev: "Sebelumnya", next: "Berikutnya",
      items: [
        { icon: "film", label: "Sinematografi", photo: px(18918155) },
        { icon: "drum", label: "Marching Band", photo: px(4720175) },
        { icon: "music", label: "Musik", photo: px(9643921) },
        { icon: "tent", label: "Pramuka", photo: px(9302795) },
        { icon: "swim", label: "Renang", photo: px(12615996) },
        { icon: "goal", label: "Futsal", photo: px(8813564) },
        { icon: "bot", label: "Robotik", photo: px(7868892) },
        { icon: "dance", label: "Menari", photo: "/images/tari-fls2n.jpg" },
        { icon: "medal", label: "Taekwondo", photo: px(7045594) },
      ] as { icon: string; label: string; photo?: string }[],
    },
  },

  fasilitas: {
    title: ["Fasilitas yang ", "lengkap"],
    perKelasLabel: "Di setiap kelas",
    perKelas: ["Proyektor", "AC", "CCTV", "Internet 24 jam"],
    listAria: "Daftar fasilitas",
    // Sumber: website lama. Hanya yang tertulis di sana. TODO(foto): ganti dengan foto asli tiap fasilitas.
    items: [
      { title: "Internet 24 jam", photo: px(11025019) },
      { title: "Proyektor", photo: px(15225230) },
      { title: "TV interaktif", photo: px(8141591) },
      { title: "AC", photo: px(8617956) },
      { title: "CCTV", photo: px(13156207) },
      { title: "Ruang multimedia", photo: "/images/kelas-komputer.jpg" },
      { title: "Mushola", photo: px(29832037) },
      { title: "Portal Orang Tua", caption: "Memantau perkembangan akademik dan karakter ananda.", photo: px(4624908) },
    ] as { title: string; caption?: string; photo?: string }[],
  },

  inklusi: {
    badge: "Learning Support Unit (LSU)",
    title: ["Program Pendidikan ", "Inklusif"],
    sub: "Setiap anak belajar dengan caranya.",
    points: [
      { icon: "psikolog", title: "Pengawasan Psikolog Profesional", desc: "Program dirancang dan dipantau tenaga ahli." },
      { icon: "ppi", title: "Program Pendampingan Individual (PPI)", desc: "Pendampingan akademik dan perilaku per anak." },
      { icon: "terapi", title: "Layanan Terapi Terintegrasi", desc: "Terpadu dengan kegiatan belajar." },
    ],
    activitiesLabel: "Kegiatan pendampingan",
    activities: [
      { icon: "manik", label: "Menyusun Manik-manik" },
      { icon: "yoga", label: "Yoga" },
      { icon: "puzzle", label: "Puzzle" },
      { icon: "seimbang", label: "Latihan Keseimbangan" },
      { icon: "gambar", label: "Menggambar" },
      { icon: "kancing", label: "Mengancing" },
    ],
  },

  prestasi: {
    title: ["Prestasi yang ", "membanggakan"],
    totalLabel: "Total prestasi", sinceText: "sejak {y}, di tingkat kota hingga nasional", aria: "Prestasi per kategori",
    total: 120, since: 2009, // placeholder
    categories: [
      { name: "Akademik", count: 40, items: [["Juara 1", "[Nama lomba], tingkat kota, 20XX"], ["Juara 2", "[Nama olimpiade], tingkat provinsi, 20XX"]] },
      { name: "Olahraga", count: 30, items: [["Juara 1", "[Cabang], tingkat kota, 20XX"], ["Juara 3", "[Cabang], tingkat provinsi, 20XX"]] },
      { name: "Seni & Kreativitas", count: 30, items: [["Juara 1", "[Lomba seni], tingkat kota, 20XX"], ["Finalis", "[FLS2N], tingkat provinsi, 20XX"]] },
      { name: "Tahfidz", count: 20, items: [["Juara 2", "[Lomba tahfidz], tingkat kota, 20XX"], ["Lulus", "Munaqosyah juz [X], 20XX"]] },
    ] as { name: string; count: number; items: string[][] }[],
  },

  galeri: {
    title: ["Galeri ", "kegiatan"], aria: "Galeri kegiatan", zoom: "Perbesar: {x}",
    items: [
      { title: "Reading Challenge", caption: "Siswa menamatkan buku bersama.", photo: "/images/perpustakaan.jpg" },
      { title: "River Clean Up", caption: "Belajar peduli lingkungan lewat aksi nyata.", photo: px(7656985) },
      { title: "Parents Day", caption: "Hari kebersamaan sekolah dan orang tua.", photo: px(4261270) },
      { title: "Munaqosyah", caption: "Ujian hafalan Al-Qur'an siswa.", photo: "/images/munaqosyah.jpg" },
      { title: "Fieldtrip", caption: "Belajar langsung di luar kelas.", photo: px(34251808) },
      { title: "Pekan Kreativitas", caption: "Karya dan ide ananda tampil.", photo: "/images/tari-fls2n.jpg" },
      { title: "Expo", caption: "Pameran hasil belajar siswa.", photo: px(7868885) },
      { title: "Olimpiade", caption: "Menguji kemampuan lewat kompetisi.", photo: "/images/siswa-olahraga.jpg" },
      { title: "Pembiasaan Karakter", caption: "Mandiri dan bersih lewat kebiasaan sehari-hari.", photo: "/images/pembiasaan-bersih.jpg" },
    ] as { title: string; caption: string; photo?: string }[],
  },

  // Testimoni asli dari orang tua (dikirim Mas Reyhan, 29 Okt 2026). Pastikan sudah ada izin tertulis untuk dimuat.
  // `photo`: foto orang tua (mis. "/images/testimoni/bu-sari.jpg", persegi 600x600), kosong = inisial.
  testimoni: {
    title: ["Kata ", "orang tua"], readMore: "Baca selengkapnya", close: "Tutup", prev: "Sebelumnya", next: "Berikutnya", pick: "Pilih testimoni", item: "Testimoni {n}: {p}", photoAlt: "Foto {x}", photoLabel: "orang tua",
    items: [
      { quote: "Kami dengan yakin memilih SD Alfa Centauri sebagai langkah awal putri kami untuk bertumbuh. SD Alfa Centauri memiliki banyak poin yang kami harapkan, di antaranya pembentukan & penanaman karakter, pendidikan agama yang menyeluruh, tenaga pengajar yang berkualitas, komunikasi antara guru & orang tua yang intens, penerapan adab dan kebiasaan baik yang diterapkan juga di rumah, dan selalu mendapatkan motivasi yang terarah. SD Alfa Centauri membuat kami merasakan telah menemukan partner yang tepat untuk pendidikan putri kami.", name: "Arzhusinta Kumala Dewi", highlight: "SD Alfa Centauri membuat kami merasakan telah menemukan partner yang tepat untuk pendidikan putri kami.", tags: ["Pembentukan karakter", "Pendidikan agama menyeluruh", "Komunikasi guru dan orang tua"], persona: "Ibu Rumah Tangga", note: "Orang tua siswa kelas 1", photo: "/images/testimoni/arzhusinta.jpg" },
      { quote: "Hasil riset tentang sekolah, jatuh cinta sama Misi SD Alfa Centauri: “Menciptakan suasana lingkungan sekolah yang aman dan ramah untuk seluruh siswa dengan karakteristiknya masing-masing”. Tenaga ahli sekolah dalam hal ini Psikolog dan siapa saja gurunya, rupanya orang-orang yang saya kenal dan tahu persis etos kerja. Sehingga makin yakin untuk berkolaborasi dengan SD Alfa Centauri untuk mendidik anak saya di sekolah ini.", name: "Dr. M. Zein Permana, S.Psi., M.Si.", highlight: "Jatuh cinta sama Misi SD Alfa Centauri: suasana sekolah yang aman dan ramah untuk seluruh siswa dengan karakteristiknya masing-masing.", tags: ["Lingkungan aman dan ramah", "Psikolog dan guru berkualitas"], persona: "Akademisi Psikologi, dosen UNJANI, Founder & BOC sintesawellness.com", note: "Orang tua siswa kelas 3", photo: "/images/testimoni/zein-permana.jpg" },
      { quote: "Menyekolahkan di Alfa Centauri merupakan keputusan yang tepat. Pengembangan karakter berbasis nilai keagamaan yang diterapkan di sekolah, serta atmosfer kekeluargaan, memberikan kenyamanan untuk tumbuh dan berkembang, baik secara akademis maupun kepribadian. Kami juga sangat menghargai pendekatan para guru dan staf yang suportif dalam mendidik serta mendampingi keseharian. Lingkungan inilah yang menjadikan sekolah sebagai rumah kedua bagi putri kami.", name: "dr. Fathy Fathini, SpJP, FIHA", highlight: "Lingkungan inilah yang menjadikan sekolah sebagai rumah kedua bagi putri kami.", tags: ["Karakter berbasis nilai agama", "Atmosfer kekeluargaan", "Guru dan staf suportif"], persona: "Dokter Spesialis Jantung", note: "Orang tua siswa kelas 2", photo: "/images/testimoni/fathy-fathini.jpg" },
      // TODO(konfirmasi): kalimat terakhir pada pesan asli terpotong ("beberapa potensi yang tidak ..."); di sini dipotong sampai kalimat yang utuh.
      { quote: "Kedua anak kami merupakan siswa pindahan. Penerimaan yang baik dari guru, teman, dan warga sekolah lainnya membuat anak kami berangkat ke sekolah setiap hari dengan penuh semangat. Selain menunjukkan motivasi belajar dan capaian akademik yang baik, mereka juga cenderung membawa kedamaian dan mau membantu teman yang kesulitan belajar.", name: "Muhamad Luthfi Imam Nurhakim, ST., M.T.", highlight: "Penerimaan yang baik dari guru, teman, dan warga sekolah membuat anak kami berangkat ke sekolah dengan penuh semangat.", tags: ["Penerimaan siswa pindahan", "Motivasi belajar"], persona: "Dosen FTMD ITB", note: "Orang tua siswa kelas 2, 5 & 6", photo: "/images/testimoni/luthfi-imam.jpg" },
    ] as { quote: string; highlight: string; tags: string[]; name: string; persona: string; note: string; photo?: string }[],
  },

  // MOCKUP: 3 berita pertama diambil dari judul di website lama (poster dipotong dari tangkapan layar, resolusi rendah); ringkasan dan tanggal saya tulis ulang. Ganti dengan berita asli + foto resolusi penuh.
  berita: {
    title: ["Berita ", "terbaru"], sub: "Kabar kegiatan, prestasi, dan pengumuman dari sekolah.", all: "Semua berita", featured: "Sorotan", aria: "Berita terbaru", photoLabel: "Foto berita",
    items: [
      { cat: "Karakter", date: "Sep 2026", title: "Duta Karakter Bersih dan Rapi: Ternyata, Hal Sederhana Ini Diperhatikan Sekolah", excerpt: "Menjaga kebersihan dan kerapian mungkin terlihat seperti hal sederhana dalam keseharian, tetapi dibiasakan dan diapresiasi sekolah.", href: "#", photo: "/images/berita-karakter-bersih.jpg" },
      { cat: "Karakter", date: "Sep 2026", title: "Duta Karakter Disiplin: Tumbuh dari Kebiasaan Kecil", excerpt: "Apresiasi untuk siswa yang menunjukkan pembiasaan karakter disiplin dalam keseharian di sekolah.", href: "#", photo: "/images/berita-karakter-disiplin.jpg" },
      { cat: "Kegiatan", date: "Sep 2026", title: "SD Alfa Centauri Laksanakan Studi Tiru ke SD Muhammadiyah Sapen dan SDIT LHI", excerpt: "Bagian dari upaya terus mengembangkan kualitas program pendidikan.", href: "#", photo: "/images/berita-studi-tiru.jpg" },
      { cat: "Pengumuman", date: "5 Okt 2026", title: "Pendaftaran SPMB 2026/2027 resmi dibuka", excerpt: "Jadwal, syarat, dan cara mendaftar kini bisa ditanyakan langsung ke admin.", href: "#", photo: "/images/berita-papan.jpg" },
    ],
  },

  faq: {
    title: ["Pertanyaan yang ", "sering diajukan"],
    photoAlt: "Siswa SD Alfa Centauri membaca bersama", photoLabel: "Suasana kelas",
    noAnswer: "Membutuhkan informasi lebih lanjut?", help: "Tim admin kami siap membantu menjawab pertanyaan Anda melalui WhatsApp.", ask: "Hubungi admin via WhatsApp",
    askWa: wa("saya ingin bertanya tentang: "),
    items: faqItems,
  },

  lokasi: {
    label: "Lokasi", street: "Jl. Terate No. 10,", city: "Kota Bandung",
    phoneLabel: "Telepon sekolah", phoneCta: "Telepon", waLabel: "WhatsApp admin", waCta: "Chat",
    waText: wa("saya ingin bertanya tentang SPMB."), directions: "Petunjuk arah", mapTitle: "Peta lokasi SD Alfa Centauri",
  },

  closing: {
    title: ["Siap bertumbuh bersama ", "Alfa Centauri?"],
    text: "Tanyakan jadwal, syarat, dan cara mendaftar. Admin kami siap membantu lewat WhatsApp.",
    register: "Daftar SPMB", registerWa: wa(`saya ingin mendaftar SPMB ${spmb.academicYear}.`),
    ask: "Tanya admin", askWa: wa("saya ingin bertanya."),
    brosur: "Unduh brosur",
    about: "Sekolah dasar inklusif di Bandung, terakreditasi A.",
    explore: "Jelajahi", visit: "Kunjungi kami", network: "Jaringan pendidikan",
    explorer: [["Tentang", "#tentang"], ["Program", "#program"], ["Fasilitas", "#fasilitas"], ["Berita", "#berita"], ["FAQ", "#faq"], ["Lokasi", "#lokasi"]] as string[][],
    wa: "(WhatsApp)", rights: "Seluruh hak cipta dilindungi.",
    jaringan: _j("Language Course for Da'wah dan Ummah"),
  },

  assistant: {
    name: "Asisten SD Alfa Centauri",
    tagline: "Kami bantu jawab pertanyaanmu",
    bubbles: ["Bingung soal pendaftaran?", "Kesulitan menemukan informasi?", "Ingin tahu biaya dan program?"],
    bubbleClose: "Tutup sapaan",
    fab: "Buka asisten, kami bisa bantu menjawab",
    fabClose: "Tutup asisten",
    close: "Tutup", dialog: "Asisten SD Alfa Centauri",
    greeting: "Halo! Kami siap membantu. Pilih topik di bawah atau tulis pertanyaanmu.",
    placeholder: "Tulis pertanyaan…", question: "Pertanyaan", send: "Kirim", typing: "Mengetik",
    fallback: "Maaf, kami belum punya jawaban untuk itu. Pilih topik di bawah, atau tanyakan langsung ke admin kami.",
    waLabel,
    waAsk: (q: string) => wa(`saya ingin bertanya: ${q}`),
    // Cara kerja: tiap entri punya kata kunci. Pertanyaan dibersihkan lalu diberi skor per entri (jumlah kata kunci
    // yang muncul, kata panjang bernilai lebih). Skor tertinggi menjawab; 0 = alihkan ke admin. Bukan AI, tanpa server.
    kb: [
      { chip: "Cara daftar SPMB", keys: ["daftar", "spmb", "syarat", "pendaftaran", "masuk sd", "penerimaan"], text: faqItems[4].a, links: [{ label: waLabel, href: wa("saya ingin bertanya: cara dan jadwal pendaftaran SPMB") }] },
      { chip: "Biaya pendidikan", keys: ["biaya", "spp", "uang", "bayar", "harga", "tarif", "gratis"], text: faqItems[5].a, links: [{ label: waLabel, href: wa("saya ingin bertanya: biaya pendidikan") }] },
      { chip: "Anak berkebutuhan khusus", keys: ["khusus", "abk", "inklusi", "inklusif", "lsu", "psikolog", "terapi", "autis", "adhd", "disleksia"], text: faqItems[0].a },
      { chip: "Ekstrakurikuler", keys: ["ekskul", "ekstra", "futsal", "renang", "pramuka", "robotik", "musik", "marching", "taekwondo", "menari", "sinematografi"], text: faqItems[3].a },
      { chip: "Tahun berdiri", keys: ["berdiri", "didirikan", "sejarah", "tahun berapa", "sejak kapan", "dibuka tahun", "usia sekolah", "umur sekolah"], text: "SD Alfa Centauri berdiri pada 12 Juli 2009." },
      { keys: ["akreditasi", "terakreditasi", "sertifikat", "ban "], text: "SD Alfa Centauri terakreditasi A oleh BAN-S/M." },
      { keys: ["motto", "visi", "slogan", "tagline", "finest"], text: `Motto kami: "${site.tagline}".` },
      { keys: ["karakter", "pilar", "akhlak", "adab"], text: `Kami menanamkan 7 karakter siswa: ${pilar.join(", ")}.` },
      { keys: ["kurikulum", "mapel", "mata pelajaran"], text: faqItems[1].a },
      { keys: ["cara belajar", "metode", "pembelajaran", "belajar di kelas", "student centered"], text: faqItems[2].a },
      { keys: ["tahfidz", "quran", "qur'an", "hafal", "hafalan", "munaqosyah", "dhuha", "shalat", "sholat"], text: faqItems[6].a },
      { keys: ["gakko", "tosho", "surala", "literasi", "membaca", "reading", "matematika"], text: "Kami memiliki budaya literasi Gakko Tosho, Surala untuk belajar matematika lewat e-learning, dan Reading Challenge." },
      { keys: ["bimbel", "ssc", "sony", "les ", "kelas 5", "kelas lima"], text: "Tersedia bimbel kelas 5 bersama Sony Sugema College (SSC)." },
      { keys: ["portal", "rapor", "raport", "nilai anak", "perkembangan anak"], text: "Portal Orang Tua memungkinkan orang tua memantau perkembangan akademik dan karakter ananda." },
      { chip: "Fasilitas", keys: ["fasilitas", "cctv", "proyektor", "internet", "wifi", "mushola", "musholla", "multimedia", "ruang kelas", "tv interaktif"], text: "Di setiap kelas ada proyektor, AC, CCTV, dan internet 24 jam. Tersedia juga TV interaktif, ruang multimedia, mushola, dan Portal Orang Tua." },
      { chip: "Lokasi sekolah", keys: ["lokasi", "alamat", "dimana", "di mana", "maps", "peta", "arah", "letak"], text: `${site.name} berada di ${site.address}.`, links: [{ label: "Buka di Google Maps", href: lokasi.mapLink }] },
      { keys: ["telepon", "telpon", "kontak", "hubungi", "nomor", "email", "whatsapp", "nomer"], text: `Telepon sekolah ${site.phone}, WhatsApp ${site.whatsappDisplay}, email ${site.email}.`, links: [{ label: "Chat WhatsApp", href: waLink() }, { label: "Telepon", href: site.phoneHref }] },
      { keys: ["instagram", "sosmed", "media sosial", "sosial media"], text: `Ikuti kami di Instagram ${site.instagramHandle}.`, links: [{ label: "Buka Instagram", href: site.instagram }] },
      { keys: ["smp", "sma", "tk ", "taman kanak", "lanjut", "jenjang", "yayasan", "english now", "lcdu"], text: "Alfa Centauri juga memiliki TK, SMP, dan SMA. Daftar lengkapnya ada di bagian bawah halaman ini.", links: _j("").slice(1, 4).map((j) => ({ label: j.label, href: j.href })) },
      { chip: "Brosur", keys: ["brosur", "brochure", "unduh", "download", "profil sekolah"], text: "Brosur sekolah bisa diunduh di sini.", links: [{ label: "Unduh brosur", href: site.brosur.id }] },
    ] as { chip?: string; keys: string[]; text: string; links?: { label: string; href: string }[] }[],
  },
};

export type Content = typeof id;
