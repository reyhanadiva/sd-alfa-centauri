<?php
/**
 * Section beranda yang bisa diedit di panel (khusus situs SD Alfa Centauri).
 *
 * Satu editor umum (section.php + assets/section.js) digerakkan oleh skema di bawah, jadi menambah/mengubah kolom
 * cukup mengubah skema. Bentuk dokumen tersimpan:
 *   { "id": {...}, "en": {...}, "shared": {...} }
 * "id" dan "en" berbentuk SAMA dengan objek konten website (src/content/id.ts, en.ts) sehingga website cukup
 * menggabungkannya di atas teks bawaan. "shared" = nilai yang sama untuk kedua bahasa (angka, tautan, gambar tunggal).
 *
 * Jenis simpul skema ('t'):
 *   text, area, rich (teks dengan **tebal**), link, image, num, select, title2 (judul dua bagian),
 *   strs (daftar teks), imgs (daftar gambar), nums (angka tetap), pairs (daftar pasangan teks),
 *   group (objek, 'fields'), list (daftar objek, 'fields').
 * Opsi umum: k kunci, l label, h petunjuk, max panjang, req wajib, min/mx jumlah item, mirror (daftar yang
 * strukturnya diikuti bahasa lain), s (nilai non-teks yang ikut tersalin ke bahasa lain).
 */
declare(strict_types=1);

if (!defined('EN_PANEL')) {
    http_response_code(404);
    exit;
}

/* ---------------------------- pembuat simpul skema ---------------------------- */
function sn(string $t, string $k, string $l, array $o = []): array
{
    return ['t' => $t, 'k' => $k, 'l' => $l] + $o;
}
function s_text(string $k, string $l, int $max = 120, array $o = []): array { return sn('text', $k, $l, $o + ['max' => $max]); }
function s_area(string $k, string $l, int $max = 400, array $o = []): array { return sn('area', $k, $l, $o + ['max' => $max, 'rows' => 3]); }
function s_rich(string $k, string $l, int $max = 200, array $o = []): array { return sn('rich', $k, $l, $o + ['max' => $max, 'h' => 'Tulis **kata** di antara dua bintang untuk menebalkan dan mewarnai.']); }
function s_link(string $k, string $l, array $o = []): array { return sn('link', $k, $l, $o + ['max' => 300, 'h' => 'Contoh: #program, /halaman, https://…, tel:+62…']); }
function s_image(string $k, string $l, float $ratio, string $rl, array $o = []): array { return sn('image', $k, $l, $o + ['ratio' => $ratio, 'rl' => $rl, 'w' => 1200]); }
function s_num(string $k, string $l, array $o = []): array { return sn('num', $k, $l, $o); }
function s_select(string $k, string $l, array $opts, array $o = []): array { return sn('select', $k, $l, $o + ['opts' => $opts]); }
function s_title2(string $k = 'title', string $l = 'Judul (dua bagian)'): array { return sn('title2', $k, $l, ['max' => 60, 'h' => 'Bagian kedua tampil dengan huruf miring berwarna.']); }
function s_strs(string $k, string $l, int $mx, int $max = 60, array $o = []): array { return sn('strs', $k, $l, $o + ['mx' => $mx, 'max' => $max]); }
function s_imgs(string $k, string $l, int $mx, array $o = []): array { return sn('imgs', $k, $l, $o + ['mx' => $mx]); }
function s_pairs(string $k, string $l, string $la, string $lb, int $mx, int $maxa = 40, int $maxb = 120): array
{
    return sn('pairs', $k, $l, ['la' => $la, 'lb' => $lb, 'mx' => $mx, 'maxa' => $maxa, 'maxb' => $maxb]);
}
function s_group(string $k, string $l, array $fields, array $o = []): array { return sn('group', $k, $l, $o + ['fields' => $fields]); }
function s_list(string $k, string $l, array $fields, int $mx, array $o = []): array
{
    return sn('list', $k, $l, $o + ['fields' => $fields, 'mx' => $mx, 'min' => 1, 'it' => 'item']);
}

/** ikon bawaan website (components/icons.tsx): kunci => nama tampilan */
function section_icons(): array
{
    return [
        'psikolog' => 'Psikolog', 'ppi' => 'Pendampingan individual', 'terapi' => 'Terapi', 'manik' => 'Manik-manik', 'yoga' => 'Yoga',
        'puzzle' => 'Puzzle', 'seimbang' => 'Keseimbangan', 'gambar' => 'Menggambar', 'kancing' => 'Mengancing', 'quran' => 'Al-Qur\'an',
        'sun' => 'Matahari (dhuha)', 'masjid' => 'Masjid', 'book' => 'Buku', 'calc' => 'Kalkulator', 'read' => 'Membaca', 'project' => 'Proyek (lampu)',
        'trophy' => 'Piala', 'reflect' => 'Kompas (refleksi)', 'parents' => 'Orang tua', 'palette' => 'Palet warna', 'expo' => 'Presentasi (expo)',
        'trip' => 'Roket (fieldtrip)', 'film' => 'Film', 'drum' => 'Drum', 'music' => 'Musik', 'tent' => 'Tenda (pramuka)', 'swim' => 'Renang',
        'goal' => 'Gawang (futsal)', 'bot' => 'Robot', 'dance' => 'Menari', 'medal' => 'Medali', 'cctv' => 'CCTV', 'uks' => 'UKS', 'jemput' => 'Antar jemput',
        'shield' => 'Perisai',
    ];
}

/* ---------------------------- definisi section ---------------------------- */

/** @return array<string, array{title:string, intro:string, fields:array, shared:array}> urutan = urutan di panel & di beranda */
function sections_all(): array
{
    static $all = null;
    if ($all !== null) {
        return $all;
    }
    $icons = section_icons();
    $all = [
        'seo' => [
            'title' => 'Judul & SEO beranda',
            'intro' => 'Judul tab, deskripsi untuk Google, dan teks saat tautan dibagikan. Ideal: judul 30-60 huruf, deskripsi 120-160 huruf.',
            'fields' => [s_group('meta', 'Judul & deskripsi halaman', [
                s_text('title', 'Judul halaman', 90, ['req' => true]),
                s_area('description', 'Deskripsi (meta description)', 300, ['req' => true, 'rows' => 3]),
                s_text('ogTitle', 'Judul saat dibagikan', 90),
                s_text('ogDescription', 'Deskripsi saat dibagikan', 200),
            ])],
            'shared' => [],
        ],
        'navbar' => [
            'title' => 'Navbar',
            'intro' => 'Menu di bagian atas halaman: tulisan, tujuan tautan, dan submenu. Tautan seperti #program menuju bagian di halaman yang sama.',
            'fields' => [
                s_list('nav', 'Menu utama', [
                    s_text('label', 'Tulisan menu', 30, ['req' => true]),
                    s_link('href', 'Tujuan tautan', ['req' => true, 's' => true]),
                    s_list('children', 'Submenu (opsional)', [
                        s_text('label', 'Tulisan submenu', 40, ['req' => true]),
                        s_link('href', 'Tujuan tautan', ['req' => true]),
                        s_text('desc', 'Keterangan singkat', 60),
                    ], 8, ['min' => 0, 'it' => 'submenu']),
                ], 8, ['mirror' => true, 'it' => 'menu']),
                s_group('ui', 'Tombol di navbar', [
                    s_text('register', 'Tombol daftar', 30, ['req' => true]),
                    s_text('registerOnline', 'Tombol daftar (di menu HP)', 40, ['req' => true]),
                    s_text('portal', 'Tulisan "Portal"', 20, ['req' => true]),
                ]),
                s_list('portals', 'Daftar portal', [
                    s_text('label', 'Nama portal', 40, ['req' => true]),
                    s_link('href', 'Alamat portal', ['req' => true, 's' => true]),
                ], 4, ['mirror' => true, 'min' => 0, 'it' => 'portal']),
            ],
            'shared' => [],
        ],
        'hero' => [
            'title' => 'Hero',
            'intro' => 'Bagian paling atas beranda: kalimat utama, tombol daftar, dan sertifikat akreditasi.',
            'fields' => [
                s_group('hero', 'Hero', [
                    s_rich('sub', 'Kalimat utama', 200, ['req' => true]),
                    s_text('register', 'Tombol daftar', 30, ['req' => true]),
                    s_text('accredited', 'Label akreditasi', 40, ['req' => true]),
                    s_text('alt', 'Deskripsi foto gedung (untuk tunanetra)', 160),
                ]),
                s_group('cert', 'Sertifikat akreditasi', [
                    s_text('open', 'Tulisan tombol', 30, ['req' => true]),
                    s_text('title', 'Judul jendela', 40, ['req' => true]),
                    s_text('info', 'Keterangan di bawah gambar', 200),
                    s_text('alt', 'Deskripsi gambar sertifikat', 160),
                ]),
            ],
            'shared' => [s_group('cert', 'Sertifikat akreditasi', [
                s_image('img', 'Gambar sertifikat', 0.72, '± 5:7 (potret)', ['w' => 1400, 'req' => true]),
            ])],
        ],
        'about' => [
            'title' => 'Tentang',
            'intro' => 'Kalimat visi, tahun berdiri, yayasan, dan penjelasan "bintang kembar".',
            'fields' => [s_group('about', 'Tentang sekolah', [
                s_text('lead', 'Kalimat pembuka', 100, ['req' => true]),
                s_text('quote', 'Visi (kutipan besar)', 80, ['req' => true]),
                s_text('tail', 'Kalimat sambungan', 80, ['req' => true]),
                s_text('link', 'Tiga nilai (tautan ke Program)', 60, ['req' => true]),
                s_text('founded', 'Tahun berdiri', 40, ['req' => true]),
                s_text('under', 'Teks "Di bawah naungan"', 40),
                s_text('foundation', 'Nama yayasan', 60, ['req' => true]),
                s_text('twinTitle', 'Judul bintang kembar', 60, ['req' => true]),
                s_rich('twinText', 'Penjelasan bintang kembar', 220, ['req' => true]),
            ])],
            'shared' => [],
        ],
        'why' => [
            'title' => 'Mengapa memilih & Angka',
            'intro' => 'Kartu "Mengapa memilih SD Alfa Centauri?" dan deretan angka di bawahnya (kosongkan angka yang belum ada data; tampil "XX+").',
            'fields' => [
                s_group('why', 'Mengapa memilih', [
                    s_title2(),
                    s_group('acc', 'Kartu akreditasi', [s_text('title', 'Judul', 40, ['req' => true]), s_text('text', 'Teks', 120, ['req' => true])]),
                    s_group('prog', 'Kartu program unggulan', [
                        s_text('title', 'Judul', 50, ['req' => true]),
                        s_text('text', 'Teks', 120, ['req' => true]),
                        s_strs('pills', 'Label program (maks 12)', 12, 40),
                    ]),
                    s_group('bimbel', 'Kartu kemitraan bimbel', [
                        s_text('title', 'Judul', 40, ['req' => true]),
                        s_text('text', 'Teks', 120, ['req' => true]),
                        s_text('more', 'Tulisan tautan', 30),
                    ]),
                    s_group('ask', 'Kartu bantuan', [s_text('title', 'Judul', 40, ['req' => true]), s_text('cta', 'Tulisan tombol', 30, ['req' => true])]),
                ]),
                s_group('stats', 'Angka', [s_strs('labels', 'Keterangan tiap angka (4)', 4, 50, ['exact' => 4])]),
            ],
            'shared' => [s_group('stats', 'Angka', [sn('nums', 'numbers', 'Angka (kosong = tampil XX+)', ['exact' => 4, 'labels' => ['Tahun melayani (otomatis dari 2009 bila kosong)', 'Siswa aktif', 'Guru dan tenaga pendidik', 'Alumni']])])],
        ],
        'program' => [
            'title' => 'Program & Ekstrakurikuler',
            'intro' => 'Tiga ranah program (Taqwa, Cerdas, Kreatif) dan daftar ekstrakurikuler.',
            'fields' => [s_group('program', 'Program', [
                s_title2(),
                s_list('ranah', 'Ranah program', [
                    s_text('key', 'Nama ranah (tulisan tab)', 20, ['req' => true]),
                    s_text('tagline', 'Kalimat singkat', 80, ['req' => true]),
                    s_image('photo', 'Foto ranah', 4 / 3, '4:3', ['s' => true]),
                    s_text('photoLabel', 'Keterangan foto', 60),
                    s_list('items', 'Kegiatan', [
                        s_select('icon', 'Ikon', $icons),
                        s_text('title', 'Nama kegiatan', 50, ['req' => true]),
                        s_text('desc', 'Keterangan', 100),
                    ], 10, ['it' => 'kegiatan']),
                ], 3, ['mirror' => true, 'fixed' => true, 'it' => 'ranah']),
                s_group('ekskul', 'Ekstrakurikuler', [
                    s_text('title', 'Judul', 40, ['req' => true]),
                    s_text('sub', 'Kalimat pendamping', 100),
                    s_list('items', 'Daftar ekstrakurikuler', [
                        s_select('icon', 'Ikon', $icons, ['s' => true]),
                        s_text('label', 'Nama', 40, ['req' => true]),
                        s_image('photo', 'Foto', 4 / 3, '4:3', ['s' => true]),
                    ], 16, ['mirror' => true, 'it' => 'ekskul']),
                ]),
            ])],
            'shared' => [],
        ],
        'fasilitas' => [
            'title' => 'Fasilitas',
            'intro' => 'Daftar fasilitas dengan foto, dan fasilitas yang ada di setiap kelas.',
            'fields' => [s_group('fasilitas', 'Fasilitas', [
                s_title2(),
                s_text('perKelasLabel', 'Judul "di setiap kelas"', 40, ['req' => true]),
                s_strs('perKelas', 'Fasilitas di setiap kelas (maks 8)', 8, 40),
                s_list('items', 'Daftar fasilitas', [
                    s_text('title', 'Nama fasilitas', 50, ['req' => true]),
                    s_text('caption', 'Keterangan (opsional)', 120),
                    s_image('photo', 'Foto', 4 / 3, '4:3', ['s' => true]),
                ], 16, ['mirror' => true, 'it' => 'fasilitas']),
            ])],
            'shared' => [],
        ],
        'inklusi' => [
            'title' => 'Inklusi (LSU)',
            'intro' => 'Learning Support Unit: tiga poin layanan dan kegiatan pendampingan. Tidak memuat foto anak.',
            'fields' => [s_group('inklusi', 'Pendidikan inklusif', [
                s_text('badge', 'Label kecil', 50, ['req' => true]),
                s_title2(),
                s_text('sub', 'Kalimat pendamping', 100),
                s_list('points', 'Poin layanan', [
                    s_select('icon', 'Ikon', $icons, ['s' => true]),
                    s_text('title', 'Judul', 60, ['req' => true]),
                    s_text('desc', 'Keterangan', 120),
                ], 6, ['mirror' => true, 'it' => 'poin']),
                s_text('activitiesLabel', 'Judul kegiatan', 50),
                s_list('activities', 'Kegiatan pendampingan', [
                    s_select('icon', 'Ikon', $icons, ['s' => true]),
                    s_text('label', 'Nama kegiatan', 40, ['req' => true]),
                ], 12, ['mirror' => true, 'it' => 'kegiatan']),
            ])],
            'shared' => [],
        ],
        'prestasi' => [
            'title' => 'Prestasi',
            'intro' => 'Total prestasi dan rincian per kategori. Data di sini masih contoh: isi dengan data resmi dari sekolah.',
            'fields' => [s_group('prestasi', 'Prestasi', [
                s_title2(),
                s_text('totalLabel', 'Tulisan "Total prestasi"', 40, ['req' => true]),
                s_text('sinceText', 'Kalimat di bawah total', 80, ['h' => 'Pakai {y} untuk tahun mulai.']),
                s_list('categories', 'Kategori', [
                    s_text('name', 'Nama kategori', 40, ['req' => true]),
                    s_num('count', 'Jumlah prestasi', ['min' => 0, 'maxv' => 9999, 'req' => true, 's' => true]),
                    s_pairs('items', 'Contoh prestasi', 'Peringkat', 'Keterangan', 6, 30, 120),
                ], 8, ['mirror' => true, 'it' => 'kategori']),
            ])],
            'shared' => [s_group('prestasi', 'Prestasi', [
                s_num('total', 'Total prestasi', ['min' => 0, 'maxv' => 99999, 'req' => true]),
                s_num('since', 'Sejak tahun', ['min' => 1900, 'maxv' => 2100, 'req' => true]),
            ])],
        ],
        'galeri' => [
            'title' => 'Galeri',
            'intro' => 'Foto kegiatan. Foto tambahan membuat kartu bisa dibuka sebagai album yang digeser kanan-kiri.',
            'fields' => [s_group('galeri', 'Galeri kegiatan', [
                s_title2(),
                s_list('items', 'Kartu galeri', [
                    s_text('title', 'Nama kegiatan', 40, ['req' => true]),
                    s_text('caption', 'Keterangan', 100),
                    s_image('photo', 'Foto utama', 4 / 5, '4:5 (potret)', ['s' => true]),
                    s_imgs('more', 'Foto tambahan (album, maks 12)', 12, ['s' => true]),
                ], 20, ['mirror' => true, 'it' => 'kartu']),
            ])],
            'shared' => [],
        ],
        'testimoni' => [
            'title' => 'Testimoni',
            'intro' => 'Kata orang tua. Pastikan setiap testimoni sudah ada izin tertulis. "Kalimat sorotan" adalah kutipan singkat yang tampil tebal.',
            'fields' => [s_group('testimoni', 'Testimoni', [
                s_title2(),
                s_list('items', 'Testimoni', [
                    s_area('quote', 'Isi testimoni (lengkap)', 900, ['req' => true, 'rows' => 6]),
                    s_rich('highlight', 'Kalimat sorotan (singkat)', 90, ['req' => true]),
                    s_text('name', 'Nama', 80, ['req' => true, 's' => true]),
                    s_text('persona', 'Profesi / keterangan', 120),
                    s_text('note', 'Keterangan anak (mis. Orang tua siswa kelas 1)', 80),
                    s_image('photo', 'Foto (persegi, opsional)', 1, '1:1', ['s' => true, 'w' => 600]),
                ], 12, ['mirror' => true, 'it' => 'testimoni']),
            ])],
            'shared' => [],
        ],
        'berita' => [
            'title' => 'Berita',
            'intro' => 'Empat kartu berita di beranda (yang pertama jadi sorotan). Judul dibatasi agar tidak terpotong.',
            'fields' => [s_group('berita', 'Berita', [
                s_title2(),
                s_text('sub', 'Kalimat pendamping', 100),
                s_list('items', 'Berita', [
                    s_text('cat', 'Kategori', 20, ['req' => true, 's' => true]),
                    s_text('date', 'Tanggal tampil (mis. Sep 2026)', 20, ['req' => true]),
                    s_text('title', 'Judul', 100, ['req' => true]),
                    s_area('excerpt', 'Ringkasan', 180, ['req' => true, 'rows' => 3]),
                    s_link('href', 'Tautan berita', ['req' => true, 's' => true]),
                    s_image('photo', 'Foto sampul', 4 / 3, '4:3', ['s' => true]),
                ], 4, ['mirror' => true, 'fixed' => true, 'it' => 'berita']),
            ])],
            'shared' => [],
        ],
        'faq' => [
            'title' => 'FAQ',
            'intro' => 'Pertanyaan yang sering diajukan dan kotak bantuan di sebelahnya. Gaya bahasa kotak bantuan: formal.',
            'fields' => [s_group('faq', 'FAQ', [
                s_title2(),
                s_text('noAnswer', 'Judul kotak bantuan', 60, ['req' => true]),
                s_area('help', 'Teks kotak bantuan', 200, ['req' => true, 'rows' => 2]),
                s_text('ask', 'Tulisan tombol', 40, ['req' => true]),
                s_list('items', 'Pertanyaan & jawaban', [
                    s_text('q', 'Pertanyaan', 160, ['req' => true]),
                    s_area('a', 'Jawaban', 800, ['req' => true, 'rows' => 4]),
                ], 30, ['it' => 'pertanyaan']),
            ])],
            'shared' => [],
        ],
        'lokasi' => [
            'title' => 'Lokasi & Kontak',
            'intro' => 'Alamat, kontak sekolah, dan peta. Nomor telepon, email, dan Instagram dipakai juga di navbar dan footer.',
            'fields' => [s_group('lokasi', 'Lokasi', [
                s_text('label', 'Label', 30, ['req' => true]),
                s_text('street', 'Alamat (baris 1)', 80, ['req' => true]),
                s_text('city', 'Kota', 40, ['req' => true]),
                s_text('phoneLabel', 'Label telepon', 40),
                s_text('phoneCta', 'Tombol telepon', 20),
                s_text('waLabel', 'Label WhatsApp', 40),
                s_text('waCta', 'Tombol WhatsApp', 20),
                s_text('directions', 'Tombol petunjuk arah', 30),
            ])],
            'shared' => [
                s_group('site', 'Kontak sekolah', [
                    s_text('phone', 'Telepon (tampil)', 30, ['req' => true]),
                    s_link('phoneHref', 'Telepon (tautan tel:)', ['req' => true]),
                    s_text('whatsappDisplay', 'WhatsApp (tampil)', 30, ['req' => true]),
                    s_text('email', 'Email', 100, ['req' => true]),
                    s_text('address', 'Alamat lengkap', 120, ['req' => true]),
                    s_link('instagram', 'Tautan Instagram', ['req' => true]),
                    s_text('instagramHandle', 'Nama akun Instagram', 40, ['req' => true]),
                ]),
                s_group('lokasiMap', 'Peta', [
                    s_link('mapEmbed', 'Tautan peta tertanam (Google Maps embed)', ['req' => true, 'h' => 'Harus alamat https://www.google.com/maps…', 'max' => 500]),
                    s_link('mapLink', 'Tautan "buka di Google Maps"', ['req' => true, 'max' => 500]),
                ]),
            ],
        ],
        'closing' => [
            'title' => 'Penutup & Footer',
            'intro' => 'Ajakan di bagian bawah, brosur, dan tautan jelajah di footer.',
            'fields' => [s_group('closing', 'Penutup & footer', [
                s_title2(),
                s_area('text', 'Teks ajakan', 200, ['req' => true, 'rows' => 2]),
                s_text('register', 'Tombol daftar', 30, ['req' => true]),
                s_text('ask', 'Tombol tanya admin', 30, ['req' => true]),
                s_text('brosur', 'Tombol unduh brosur', 30, ['req' => true]),
                s_text('about', 'Kalimat singkat sekolah (footer)', 100),
                s_text('explore', 'Judul "Jelajahi"', 30),
                s_text('visit', 'Judul "Kunjungi kami"', 30),
                s_text('network', 'Judul "Jaringan pendidikan"', 40),
                s_text('rights', 'Teks hak cipta', 60),
                s_pairs('explorer', 'Tautan jelajah di footer', 'Tulisan', 'Tujuan (mis. #program)', 8, 30, 120),
            ])],
            'shared' => [s_group('site', 'Brosur', [s_group('brosur', 'Berkas brosur (PDF)', [
                s_link('id', 'Brosur Bahasa Indonesia', ['req' => true, 'h' => 'Letakkan PDF di folder public lalu tulis jalurnya, mis. /brosur-sd-alfa-centauri.pdf']),
                s_link('en', 'Brosur Bahasa Inggris', ['req' => true]),
            ])])],
        ],
        'assistant' => [
            'title' => 'Asisten',
            'intro' => 'Asisten di pojok kanan bawah menjawab dengan mencocokkan kata kunci (bukan AI). Isi jawaban sebaiknya sama dengan FAQ.',
            'fields' => [s_group('assistant', 'Asisten', [
                s_strs('bubbles', 'Pertanyaan pemancing (berganti-ganti, maks 6)', 6, 60),
                s_area('greeting', 'Sapaan pembuka', 200, ['req' => true, 'rows' => 2]),
                s_area('fallback', 'Jawaban bila tidak ketemu', 240, ['req' => true, 'rows' => 2]),
                s_list('kb', 'Daftar jawaban', [
                    s_text('chip', 'Tombol topik (opsional)', 30),
                    s_strs('keys', 'Kata kunci (huruf kecil, maks 20)', 20, 40),
                    s_area('text', 'Jawaban', 600, ['req' => true, 'rows' => 3]),
                    s_list('links', 'Tautan di bawah jawaban (opsional)', [
                        s_text('label', 'Tulisan', 40, ['req' => true]),
                        s_link('href', 'Tujuan', ['req' => true]),
                    ], 3, ['min' => 0, 'it' => 'tautan']),
                ], 40, ['it' => 'jawaban']),
            ])],
            'shared' => [],
        ],
    ];
    return $all;
}

function section_def(string $key): ?array
{
    return sections_all()[$key] ?? null;
}

/** judul semua section: kunci => judul (urutan halaman) */
function sections_titles(): array
{
    $o = [];
    foreach (sections_all() as $k => $d) {
        $o[$k] = $d['title'];
    }
    return $o;
}

/* ---------------------------- validasi ---------------------------- */

/** tautan yang boleh dipakai: #bagian, /jalur, https://, http://, tel:, mailto: */
function sec_link(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    if ($s === '' || mb_strlen($s) > 500 || preg_match('/[\s\x00-\x1F"<>\\\\]/u', $s)) {
        return null;
    }
    if (preg_match('#^(https?://[^/\s]+|/(?!/)|\#|tel:\+?[0-9]{5,16}$|mailto:[^\s@]+@[^\s@]+$)#i', $s)) {
        if (preg_match('#^https?://#i', $s)) {
            $p = parse_url($s);
            return $p !== false && !empty($p['host']) ? $s : null;
        }
        return $s;
    }
    return null;
}

function sec_path(string $path, string $label): string
{
    return trim($path === '' ? $label : $path . ' › ' . $label);
}

/** bersihkan satu simpul. Mengembalikan nilai bersih; kesalahan ditambahkan ke $errs. */
function sec_clean(array $n, mixed $v, string $path, array &$errs): mixed
{
    $label = sec_path($path, (string) $n['l']);
    $req = !empty($n['req']);
    switch ($n['t']) {
        case 'text':
        case 'rich':
            $s = clean_text($v, (int) $n['max']);
            if ($req && $s === '') {
                $errs[] = "$label wajib diisi.";
            }
            if ($n['t'] === 'rich' && substr_count($s, '**') % 2 === 1) {
                $errs[] = "$label: tanda ** harus berpasangan.";
            }
            return $s;
        case 'area':
            $s = clean_multiline($v, (int) $n['max']);
            if ($req && $s === '') {
                $errs[] = "$label wajib diisi.";
            }
            return $s;
        case 'link':
            $s = is_string($v) ? trim($v) : '';
            if ($s === '') {
                if ($req) {
                    $errs[] = "$label wajib diisi.";
                }
                return '';
            }
            $l = sec_link($s);
            if ($l === null || (($n['k'] ?? '') === 'mapEmbed' && !preg_match('#^https://www\.google\.com/maps#', $s))) {
                $errs[] = "$label tidak valid.";
                return '';
            }
            return $l;
        case 'image':
            $s = is_string($v) ? trim($v) : '';
            if ($s === '') {
                if ($req) {
                    $errs[] = "$label wajib diisi.";
                }
                return '';
            }
            $p = teacher_photo($s);
            if ($p === null) {
                $errs[] = "$label: gambar tidak valid. Pilih atau unggah lewat panel.";
                return '';
            }
            return $p;
        case 'num':
            if ($v === null || $v === '') {
                if ($req) {
                    $errs[] = "$label wajib diisi.";
                }
                return null;
            }
            if (!is_numeric($v) || (float) $v != (int) $v) {
                $errs[] = "$label harus berupa angka bulat.";
                return null;
            }
            $i = (int) $v;
            if ($i < (int) ($n['min'] ?? 0) || $i > (int) ($n['maxv'] ?? 999999)) {
                $errs[] = "$label di luar batas (" . (int) ($n['min'] ?? 0) . ' sampai ' . (int) ($n['maxv'] ?? 999999) . ').';
                return null;
            }
            return $i;
        case 'select':
            $s = is_string($v) ? $v : '';
            if (!array_key_exists($s, $n['opts'])) {
                $errs[] = "$label: pilihan tidak dikenal.";
                return (string) array_key_first($n['opts']);
            }
            return $s;
        case 'title2':
            $a = is_array($v) ? array_values($v) : [];
            $x = clean_text($a[0] ?? '', (int) $n['max']);
            if ($x !== '' && is_string($a[0] ?? null) && preg_match('/\s$/u', (string) $a[0])) {
                $x .= ' '; // spasi di ujung bagian pertama berarti (judul dua bagian disambung)
            }
            $y = clean_text($a[1] ?? '', (int) $n['max']);
            if ($y === '') {
                $errs[] = "$label: bagian kedua wajib diisi.";
            }
            return [$x, $y];
        case 'strs':
            $out = [];
            foreach (is_array($v) ? $v : [] as $t) {
                $t = clean_text($t, (int) $n['max']);
                if ($t !== '') {
                    $out[] = $t;
                }
            }
            if (count($out) > (int) $n['mx']) {
                $errs[] = "$label: maksimal " . (int) $n['mx'] . ' isian.';
                $out = array_slice($out, 0, (int) $n['mx']);
            }
            if (!empty($n['exact']) && count($out) !== (int) $n['exact']) {
                $errs[] = "$label: harus berisi tepat " . (int) $n['exact'] . ' isian.';
            }
            return $out;
        case 'imgs':
            $out = [];
            foreach (is_array($v) ? $v : [] as $t) {
                $t = is_string($t) ? trim($t) : '';
                if ($t === '') {
                    continue;
                }
                $p = teacher_photo($t);
                if ($p === null || $p === '') {
                    $errs[] = "$label: ada gambar yang tidak valid.";
                    continue;
                }
                $out[] = $p;
            }
            if (count($out) > (int) $n['mx']) {
                $errs[] = "$label: maksimal " . (int) $n['mx'] . ' gambar.';
                $out = array_slice($out, 0, (int) $n['mx']);
            }
            return $out;
        case 'nums':
            $out = [];
            $in = is_array($v) ? array_values($v) : [];
            for ($i = 0; $i < (int) $n['exact']; $i++) {
                $x = $in[$i] ?? null;
                if ($x === null || $x === '') {
                    $out[] = null;
                } elseif (is_numeric($x) && (float) $x == (int) $x && (int) $x >= 0 && (int) $x <= 9999999) {
                    $out[] = (int) $x;
                } else {
                    $errs[] = "$label: angka ke-" . ($i + 1) . ' tidak valid.';
                    $out[] = null;
                }
            }
            return $out;
        case 'pairs':
            $out = [];
            foreach (is_array($v) ? $v : [] as $pr) {
                $pr = is_array($pr) ? array_values($pr) : [];
                $a = clean_text($pr[0] ?? '', (int) $n['maxa']);
                $b = clean_text($pr[1] ?? '', (int) $n['maxb']);
                if ($a === '' && $b === '') {
                    continue;
                }
                if ($a === '' || $b === '') {
                    $errs[] = "$label: setiap baris butuh " . $n['la'] . ' dan ' . $n['lb'] . '.';
                    continue;
                }
                $out[] = [$a, $b];
            }
            if (count($out) > (int) $n['mx']) {
                $errs[] = "$label: maksimal " . (int) $n['mx'] . ' baris.';
                $out = array_slice($out, 0, (int) $n['mx']);
            }
            return $out;
        case 'group':
            return sec_clean_fields($n['fields'], is_array($v) ? $v : [], sec_path($path, (string) $n['l']), $errs);
        case 'list':
            $items = is_array($v) ? array_values($v) : [];
            $min = (int) ($n['min'] ?? 1);
            if (count($items) > (int) $n['mx']) {
                $errs[] = "$label: maksimal " . (int) $n['mx'] . ' item.';
                $items = array_slice($items, 0, (int) $n['mx']);
            }
            if (count($items) < $min) {
                $errs[] = "$label: minimal $min item.";
            }
            if (!empty($n['fixed']) && count($items) !== (int) $n['mx']) {
                $errs[] = "$label: jumlah item tetap, tidak bisa ditambah atau dikurangi.";
            }
            $out = [];
            foreach ($items as $i => $it) {
                $out[] = sec_clean_fields($n['fields'], is_array($it) ? $it : [], $label . ' #' . ($i + 1), $errs);
            }
            return $out;
    }
    return null;
}

function sec_clean_fields(array $fields, array $in, string $path, array &$errs): array
{
    $out = [];
    foreach ($fields as $f) {
        $out[$f['k']] = sec_clean($f, $in[$f['k']] ?? null, $path, $errs);
    }
    return $out;
}

/**
 * Validasi seluruh dokumen section.
 * @return array{0: array, 1: string[]}
 */
function validate_section(string $key, array $in): array
{
    $def = section_def($key);
    if ($def === null) {
        return [[], ['Section tidak dikenal.']];
    }
    $errs = [];
    $out = [];
    foreach (['id' => 'ID', 'en' => 'EN'] as $lang => $tag) {
        $e = [];
        $out[$lang] = sec_clean_fields($def['fields'], is_array($in[$lang] ?? null) ? $in[$lang] : [], '', $e);
        foreach ($e as $m) {
            $errs[] = "[$tag] $m";
        }
    }
    if ($def['shared']) {
        $e = [];
        $out['shared'] = sec_clean_fields($def['shared'], is_array($in['shared'] ?? null) ? $in['shared'] : [], '', $e);
        foreach ($e as $m) {
            $errs[] = "[Umum] $m";
        }
    }
    return [$out, array_values(array_unique($errs))];
}

/** skema untuk editor (JSON) tanpa data internal */
function section_schema_for_js(string $key): array
{
    $d = section_def($key);
    return ['fields' => $d['fields'], 'shared' => $d['shared']];
}
