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
  // Brosur PDF (placeholder; ganti file di /public dengan brosur asli, nama file boleh tetap sama).
  brosur: { id: "/brosur-sd-alfa-centauri.pdf", en: "/brosur-sd-alfa-centauri-en.pdf" },
};

// Foto stok Pexels (lisensi bebas pakai), dimuat langsung dari CDN. HANYA penampung sementara agar tampilan terbayang:
// ganti dengan foto asli sekolah. Kalau gagal dimuat, komponen Photo menampilkan placeholder berlabel.
export const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

export const waLink = (text = "Halo SD Alfa Centauri, saya ingin bertanya tentang SPMB.") =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

// TODO(data real): ganti tahun ajaran, gelombang, dan tanggal penutupan dari sekolah.
export const spmb = {
  academicYear: "2026/2027",
  href: "#spmb",
};


const FOUNDED = 2009;
export const yearsActive = new Date().getFullYear() - FOUNDED;
export const thisYear = new Date().getFullYear();

export const links = { yayasan: "https://alfacentauri.sch.id/yayasan/" };

export const profileVideo: { mp4?: string; youtubeId?: string; poster: string } = {
  mp4: undefined,
  // Video lama (diunggah 26 Sep 2022). Ganti bila ada versi terbaru.
  youtubeId: "FFhuIIKqQnQ",
  poster: "/images/gedung-sd.jpg",
};

export const lokasi = {
  mapEmbed: "https://www.google.com/maps?q=SD+Alfa+Centauri+Jl.+Terate+No.+10+Bandung&output=embed",
  mapLink: "https://www.google.com/maps/search/?api=1&query=SD+Alfa+Centauri+Jl.+Terate+No.+10+Bandung",
};

// Tanpa logo SSC. Isi `href` kalau sudah ada tautan internal yang dimaksud.
export const ssc = { name: "Sony Sugema College (SSC)", href: undefined as string | undefined };
