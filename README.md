# SD Alfa Centauri: website

Next.js (App Router) + Tailwind CSS v4. Siap di-deploy ke Vercel (framework terdeteksi otomatis).

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # cek build produksi
npm run lint
```

## Struktur

- `src/lib/site.ts`: data yang sering berubah (kontak, WhatsApp, jadwal SPMB, menu). **Ganti di sini.**
- `src/components/`: komponen per section (`Navbar`, `Hero`, `About`, `WhyChoose`, `Inklusi`, ...).
- `src/app/globals.css`: palet warna (biru dari logo), font, animasi.
- `public/images/`: logo dan foto asli sekolah. Foto stock sementara (Unsplash, hotlink) diatur di `stock` dalam `site.ts`; ganti dengan foto asli lewat prop `src` pada `Photo`.

## Data placeholder yang perlu diganti

Daftar lengkap yang harus diverifikasi ada di [`DATA-CHECKLIST.md`](./DATA-CHECKLIST.md).

- Tanggal penutupan SPMB dan gelombang: `spmb` di `src/lib/site.ts`
- URL Portal Orang Tua / Portal Guru: `portals` di `src/lib/site.ts`
- Tombol ID/EN baru berupa tampilan, terjemahan belum dipasang
