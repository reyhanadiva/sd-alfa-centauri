// Mengunduh foto stok Pexels yang dipakai situs ke public/images/stock, supaya tidak bergantung pada CDN saat tampil.
// Jalankan di komputer yang punya akses internet:  npm run fetch-stock
// Daftar ID dibaca dari src/content/*.ts (pola px(<id>)). Foto yang sudah ada dilewati.
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";

const dir = new URL("../public/images/stock/", import.meta.url);
const src = new URL("../src/content/", import.meta.url);
mkdirSync(dir, { recursive: true });
const ids = [...new Set(readdirSync(src).flatMap((f) => [...readFileSync(new URL(f, src), "utf8").matchAll(/px\((\d+)\)/g)].map((m) => m[1])))];
let ok = 0, fail = 0;
for (const id of ids) {
  const out = new URL(`pexels-${id}.jpg`, dir);
  if (existsSync(out)) { ok++; continue; }
  try {
    const res = await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(String(res.status));
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    ok++;
    console.log("ok  ", id);
  } catch (e) {
    fail++;
    console.log("GAGAL", id, e.message);
  }
}
console.log(`\nSelesai: ${ok} foto tersedia, ${fail} gagal dari ${ids.length}.`);
