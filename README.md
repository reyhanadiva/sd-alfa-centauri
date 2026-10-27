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
- `src/components/`: komponen per section (`TopBar`, `Navbar`, `Hero`, `SpmbStatusBar`, ...).
- `src/app/globals.css`: palet warna (biru dari logo), font, animasi.
- `public/images/`: logo dan foto.

## Data placeholder yang perlu diganti

Daftar lengkap yang harus diverifikasi ada di [`DATA-CHECKLIST.md`](./DATA-CHECKLIST.md).

- Tanggal penutupan SPMB dan gelombang: `spmb` di `src/lib/site.ts`
- URL Portal Orang Tua / Portal Guru: `src/components/TopBar.tsx`
- Tombol ID/EN baru berupa tampilan, terjemahan belum dipasang
