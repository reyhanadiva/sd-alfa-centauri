// Mengambil data yang diterbitkan panel (content.json) dan menaruhnya di src/content/panel.generated.json,
// yang digabungkan ke teks bawaan website saat build (lihat src/lib/panel.ts).
// Sumber, berurutan: PANEL_CONTENT_URL (alamat https), PANEL_CONTENT_FILE (jalur berkas), public/data/content.json
// atau storage/data/content.json (panel lokal). Tidak ada / rusak = "{}" (website memakai teks bawaan, tanpa error).
// Dijalankan otomatis sebelum `npm run dev` dan `npm run build`.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "src/content/panel.generated.json");
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

async function load() {
  const url = process.env.PANEL_CONTENT_URL;
  if (url) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return { src: url, text: await r.text() };
    } catch (e) {
      console.warn("sync-panel: gagal mengambil", url, "-", e.message);
    }
  }
  const files = [process.env.PANEL_CONTENT_FILE, resolve(root, "public/data/content.json"), resolve(root, "storage/data/content.json")].filter(Boolean);
  for (const f of files) if (existsSync(f)) return { src: f, text: readFileSync(f, "utf8") };
  return null;
}

let json = "{}\n";
let note = "tidak ada data panel, memakai teks bawaan";
const got = await load();
if (got) {
  try {
    const d = JSON.parse(got.text);
    if (!isObj(d)) throw new Error("bukan objek");
    json = JSON.stringify(d, null, 2) + "\n";
    note = "memakai " + got.src;
  } catch (e) {
    console.warn("sync-panel: data panel rusak (" + e.message + "), memakai teks bawaan");
  }
}
mkdirSync(dirname(out), { recursive: true });
let prev = "";
try { prev = readFileSync(out, "utf8"); } catch { /* belum ada */ }
if (prev !== json) writeFileSync(out, json);
console.log("sync-panel:", note);
