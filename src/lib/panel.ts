// Menggabungkan data yang diterbitkan panel admin (src/content/panel.generated.json, diisi scripts/sync-panel.mjs)
// di atas teks bawaan website (src/content/id.ts, en.ts). Data panel kosong, rusak, atau tidak ada = tampilan persis seperti bawaan.
import raw from "@/content/panel.generated.json" with { type: "json" };
import type { Lang } from "./lang";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

// PANEL_IGNORE=1 dipakai skrip seed supaya seed selalu berasal dari teks bawaan, bukan data panel
const ignore = typeof process !== "undefined" && !!process.env?.PANEL_IGNORE;
const data: Obj = !ignore && isObj(raw) ? (raw as Obj) : {};

/** Gabung dalam: objek digabung per kunci; daftar objek digabung per urutan (kolom yang tak ada di panel tetap dari bawaan);
 *  daftar biasa dan nilai tunggal diganti. Fungsi dan kunci yang tak ada di panel dibiarkan. */
export function deepMerge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(over)) {
    if (Array.isArray(base) && over.every(isObj)) {
      return over.map((o, i) => deepMerge((base as unknown[])[i] ?? {}, o)) as unknown as T;
    }
    return over as unknown as T;
  }
  if (isObj(over)) {
    const b: Obj = isObj(base) ? (base as Obj) : {};
    const out: Obj = { ...b };
    for (const k of Object.keys(over)) out[k] = deepMerge(b[k], over[k]);
    return out as T;
  }
  return over as unknown as T;
}

/** dokumen section yang diterbitkan panel: { id, en, shared } */
const docs = Object.entries(data).filter(([k, v]) => k !== "site" && isObj(v) && (isObj(v.id) || isObj(v.en) || isObj(v.shared)));

// kunci di "shared" yang bukan bagian dari teks halaman (dibaca site.ts)
const NOT_CONTENT = new Set(["site", "lokasiMap"]);

export function applyPanel<T>(base: T, lang: Lang): T {
  let out = base;
  for (const [, doc] of docs) {
    const d = doc as Obj;
    if (isObj(d.shared)) {
      const s = Object.fromEntries(Object.entries(d.shared).filter(([k]) => !NOT_CONTENT.has(k)));
      out = deepMerge(out, s);
    }
    if (isObj(d[lang])) out = deepMerge(out, d[lang]);
  }
  return out;
}

/** nilai bersama untuk src/lib/site.ts (kontak, peta, brosur, identitas) */
export function panelSite() {
  const s: Obj = {};
  const idn = isObj(data.site) ? (data.site as Obj) : {};
  if (typeof idn.name === "string" && idn.name) s.name = idn.name;
  if (typeof idn.tagline === "string" && idn.tagline) s.tagline = idn.tagline;
  if (typeof idn.waNumber === "string" && /^\d{9,15}$/.test(idn.waNumber)) s.whatsapp = idn.waNumber;
  for (const [, doc] of docs) {
    const sh = (doc as Obj).shared;
    if (isObj(sh) && isObj(sh.site)) Object.assign(s, deepMerge({}, sh.site));
  }
  const lk = docs.map(([, d]) => (d as Obj).shared).find((x) => isObj(x) && isObj((x as Obj).lokasiMap)) as Obj | undefined;
  return { site: s, lokasiMap: lk ? (lk.lokasiMap as Obj) : {} };
}
