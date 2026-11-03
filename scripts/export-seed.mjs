// Membuat public/edizon/lib/seed/content.json: isi awal editor panel, diambil dari teks website saat ini
// (src/content/id.ts, en.ts, src/lib/site.ts). Jalankan: npm run seed   (butuh Node 22.18+ yang bisa membaca .ts).
// Gagal tidak mematikan apa pun: berkas seed yang sudah ada tetap dipakai.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  register(pathToFileURL(resolve(root, "scripts/alias-hooks.mjs")).href);
  // sync-panel mengisi src/content/panel.generated.json; seed harus dari teks BAWAAN, jadi abaikan data panel
  process.env.PANEL_IGNORE = "1";
  const { id } = await import("../src/content/id.ts");
  const { en } = await import("../src/content/en.ts");
  const { site, lokasi, yearsActive } = await import("../src/lib/site.ts");

  const pick = (c, keys) => Object.fromEntries(keys.map((k) => [k, c[k]]));
  const both = (keys, shared = {}) => ({ id: pick(id, keys), en: pick(en, keys), shared });
  const seed = {
    site: { name: site.name, tagline: site.tagline, waNumber: site.whatsapp, logoFull: "", logoWhite: "", logoMark: "", favicon: "" },
    seo: both(["meta"]),
    navbar: both(["nav", "ui", "portals"]),
    hero: both(["hero", "cert"], { cert: { img: id.cert.img } }),
    about: both(["about"]),
    why: both(["why", "stats"], { stats: { numbers: [yearsActive, null, null, null] } }),
    program: both(["program"]),
    fasilitas: both(["fasilitas"]),
    inklusi: both(["inklusi"]),
    prestasi: both(["prestasi"], { prestasi: { total: id.prestasi.total, since: id.prestasi.since } }),
    galeri: both(["galeri"]),
    testimoni: both(["testimoni"]),
    berita: both(["berita"]),
    faq: both(["faq"]),
    lokasi: both(["lokasi"], {
      site: { phone: site.phone, phoneHref: site.phoneHref, whatsappDisplay: site.whatsappDisplay, email: site.email, address: site.address, instagram: site.instagram, instagramHandle: site.instagramHandle },
      lokasiMap: { mapEmbed: lokasi.mapEmbed, mapLink: lokasi.mapLink },
    }),
    closing: both(["closing"], { site: { brosur: site.brosur } }),
    assistant: both(["assistant"]),
  };
  // buang fungsi (mis. assistant.waAsk) dan nilai undefined
  const json = JSON.stringify(seed, (k, v) => (typeof v === "function" ? undefined : v), 2) + "\n";
  const out = resolve(root, "public/edizon/lib/seed/content.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json);
  console.log("seed ditulis:", out, `(${Object.keys(seed).length} dokumen)`);
} catch (e) {
  console.warn("export-seed dilewati:", e.message);
}
