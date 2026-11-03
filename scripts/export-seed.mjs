// Membuat public/edizon/lib/seed/content.json: nilai awal editor panel, diambil dari teks website saat ini
// (src/lib/site.ts, src/content/id.ts, src/content/en.ts). Jalankan: npm run seed   (Node 22.18+ bisa membaca .ts langsung)
// Gagal tidak mematikan apa pun: berkas seed yang sudah ada tetap dipakai.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const { site } = await import(new URL("../src/lib/site.ts", import.meta.url).href);
  const seed = {
    // Pengaturan situs: identitas + WhatsApp + logo (kosong = logo bawaan website)
    site: { name: site.name, tagline: site.tagline, waNumber: site.whatsapp, logoFull: "", logoWhite: "", logoMark: "", favicon: "" },
    // section beranda ditambahkan satu per satu (Fase B)
  };
  const out = resolve(root, "public/edizon/lib/seed/content.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(seed, null, 2) + "\n");
  console.log("seed ditulis:", out);
} catch (e) {
  console.warn("export-seed dilewati:", e.message);
}
