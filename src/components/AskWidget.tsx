"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Star } from "./Doodles";
import { faqs, jaringan, lokasi, pilarNames, site, waLink } from "@/lib/site";

type Link = { label: string; href: string };
type Msg = { from: "bot" | "me"; text: string; links?: Link[] };

// Asisten FAQ di kanan bawah. BUKAN AI: pencocokan kata kunci sederhana ke jawaban FAQ yang sudah ada;
// kalau tidak ketemu, dialihkan ke admin lewat WhatsApp (pertanyaan terisi otomatis). Tanpa backend.
const wa = (text: string): Link => ({ label: "Lanjut ke admin (WhatsApp)", href: waLink(`Halo SD Alfa Centauri, saya ingin bertanya: ${text}`) });
const brosur: Link = site.brosurHref
  ? { label: "Unduh brosur", href: site.brosurHref }
  : { label: "Minta brosur (WhatsApp)", href: waLink("Halo SD Alfa Centauri, saya ingin meminta brosur.") };

// ---- Basis pengetahuan ----
// Cara kerja: tiap entri punya daftar kata kunci. Pertanyaan diubah ke huruf kecil tanpa tanda baca, lalu tiap
// entri diberi skor = jumlah kata kunci yang muncul (kata kunci lebih panjang bernilai lebih). Entri skor tertinggi
// menjawab. Skor 0 = tidak dikenali: tampilkan saran topik + alihkan ke admin. Tidak ada AI/server; jawabannya
// hanya yang tertulis di sini. Menambah topik = menambah satu entri.
type Entry = { chip?: string; keys: string[]; text: string; links?: Link[] };
const kb: Entry[] = [
  { chip: "Cara daftar SPMB", keys: ["daftar", "spmb", "syarat", "pendaftaran", "masuk sd", "penerimaan"], text: faqs[4].a, links: [wa("cara dan jadwal pendaftaran SPMB")] },
  { chip: "Biaya pendidikan", keys: ["biaya", "spp", "uang", "bayar", "harga", "tarif", "gratis"], text: faqs[5].a, links: [wa("biaya pendidikan")] },
  { chip: "Anak berkebutuhan khusus", keys: ["khusus", "abk", "inklusi", "inklusif", "lsu", "psikolog", "terapi", "autis", "adhd", "disleksia"], text: faqs[0].a },
  { chip: "Ekstrakurikuler", keys: ["ekskul", "ekstra", "futsal", "renang", "pramuka", "robotik", "musik", "marching", "taekwondo", "menari", "sinematografi"], text: faqs[3].a },
  { chip: "Tahun berdiri", keys: ["berdiri", "didirikan", "sejarah", "tahun berapa", "sejak kapan", "dibuka tahun", "usia sekolah", "umur sekolah"], text: "SD Alfa Centauri berdiri pada 12 Juli 2009." },
  { keys: ["akreditasi", "terakreditasi", "sertifikat", "ban "], text: "SD Alfa Centauri terakreditasi A oleh BAN-S/M." },
  { keys: ["motto", "visi", "slogan", "tagline", "finest"], text: `Motto kami: "${site.tagline}".` },
  { keys: ["karakter", "pilar", "akhlak", "adab"], text: `Kami menanamkan 7 karakter siswa: ${pilarNames.join(", ")}.` },
  { keys: ["kurikulum", "mapel", "mata pelajaran"], text: faqs[1].a },
  { keys: ["cara belajar", "metode", "pembelajaran", "belajar di kelas", "student centered"], text: faqs[2].a },
  { keys: ["tahfidz", "quran", "qur'an", "hafal", "hafalan", "munaqosyah", "dhuha", "shalat", "sholat"], text: faqs[6].a },
  { keys: ["gakko", "tosho", "surala", "literasi", "membaca", "reading", "matematika"], text: "Kami memiliki budaya literasi Gakko Tosho, Surala untuk belajar matematika lewat e-learning, dan Reading Challenge." },
  { keys: ["bimbel", "ssc", "sony", "les ", "kelas 5", "kelas lima"], text: "Tersedia bimbel kelas 5 bersama Sony Sugema College (SSC)." },
  { keys: ["portal", "rapor", "raport", "nilai anak", "perkembangan anak"], text: "Portal Orang Tua memungkinkan orang tua memantau perkembangan akademik dan karakter ananda." },
  { chip: "Fasilitas", keys: ["fasilitas", "cctv", "proyektor", "internet", "wifi", "mushola", "musholla", "multimedia", "ruang kelas", "tv interaktif"], text: "Di setiap kelas ada proyektor, AC, CCTV, dan internet 24 jam. Tersedia juga TV interaktif, ruang multimedia, mushola, dan Portal Orang Tua." },
  { chip: "Lokasi sekolah", keys: ["lokasi", "alamat", "dimana", "di mana", "maps", "peta", "arah", "letak"], text: `${site.name} berada di ${site.address}.`, links: [{ label: "Buka di Google Maps", href: lokasi.mapLink }] },
  { keys: ["telepon", "telpon", "kontak", "hubungi", "nomor", "email", "whatsapp", "nomer"], text: `Telepon sekolah ${site.phone}, WhatsApp ${site.whatsappDisplay}, email ${site.email}.`, links: [{ label: "Chat WhatsApp", href: waLink() }, { label: "Telepon", href: site.phoneHref }] },
  { keys: ["instagram", "sosmed", "media sosial", "sosial media"], text: `Ikuti kami di Instagram ${site.instagramHandle}.`, links: [{ label: "Buka Instagram", href: site.instagram }] },
  { keys: ["smp", "sma", "tk ", "taman kanak", "lanjut", "jenjang", "yayasan", "english now", "lcdu"], text: "Alfa Centauri juga memiliki TK, SMP, dan SMA. Daftar lengkapnya ada di bagian bawah halaman ini.", links: jaringan.slice(1, 4).map((j) => ({ label: j.label, href: j.href })) },
  { chip: "Brosur", keys: ["brosur", "brochure", "unduh", "download", "profil sekolah"], text: site.brosurHref ? "Brosur sekolah bisa diunduh di sini." : "Brosur akan dikirim admin lewat WhatsApp.", links: [brosur] },
];

const clean = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim()} `;
function match(q: string) {
  const t = clean(q);
  let best: Entry | null = null;
  let top = 0;
  for (const e of kb) {
    const score = e.keys.reduce((n, k) => n + (t.includes(k.length < 4 ? ` ${k.trim()} ` : k) ? Math.min(3, 1 + k.length / 6) : 0), 0);
    if (score > top) { top = score; best = e; }
  }
  return best;
}

const hello: Msg = { from: "bot", text: "Halo, saya Bintang, asisten SD Alfa Centauri. Mau tahu tentang apa? Pilih topik di bawah atau tulis pertanyaanmu." };

export function AskWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([hello]);
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setMsgs((m) => [...m, { from: "me", text: t }]);
    setQ("");
    setTyping(true);
    const hit = match(t);
    const reply: Omit<Msg, "from"> = hit
      ? { text: hit.text, links: hit.links }
      : { text: "Maaf, saya belum punya jawaban untuk itu. Kamu bisa pilih topik di bawah, atau tanyakan langsung ke admin kami.", links: [wa(t)] };
    timer.current = setTimeout(() => {
      setMsgs((m) => [...m, { from: "bot", ...reply }]);
      setTyping(false);
    }, 600);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Asisten FAQ SD Alfa Centauri"
          className="zoom-in fixed bottom-[5.25rem] right-4 z-[56] flex max-h-[min(34rem,calc(100svh-7.5rem))] w-[min(23rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-brand-100 sm:right-6"
        >
          <div className="flex items-center gap-3 bg-navy-900 px-4 py-3.5 text-white">
            <span className="grid size-10 place-items-center rounded-full bg-brand-500"><Star className="size-5 text-white" /></span>
            <div className="flex-1 leading-tight">
              <p className="text-[16px] font-semibold">Bintang</p>
              <p className="text-[12.5px] text-white/65">Asisten SD Alfa Centauri</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="grid size-9 place-items-center rounded-full transition hover:bg-white/15">
              <X size={18} aria-hidden />
            </button>
          </div>

          <div ref={scroller} aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto bg-brand-50/60 px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`fade-in flex flex-col gap-1.5 ${m.from === "me" ? "items-end" : "items-start"}`}>
                <p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-snug ${m.from === "me" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-navy-900 ring-1 ring-brand-100"}`}>{m.text}</p>
                {m.links?.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-navy-900 px-3.5 py-1.5 text-[13px] font-bold text-white transition hover:bg-navy-700">{l.label}</a>
                ))}
              </div>
            ))}
            {typing && (
              <p className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-brand-100" aria-label="Mengetik">
                {[0, 1, 2].map((d) => <span key={d} className="twinkle size-1.5 rounded-full bg-brand-400" style={{ "--dur": "1s", "--delay": `${d * -0.25}s` } as React.CSSProperties} />)}
              </p>
            )}
          </div>

          <div className="border-t border-brand-100 bg-white px-3 pb-3 pt-2.5">
            <div className="flex gap-1.5 overflow-x-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {kb.filter((it) => it.chip).map((it) => (
                <button key={it.chip} type="button" onClick={() => ask(it.chip!)} className="shrink-0 rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">{it.chip}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 rounded-full bg-brand-50 p-1.5 pl-4 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-500">
              <label htmlFor="ask-q" className="sr-only">Pertanyaan</label>
              <input ref={input} id="ask-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tulis pertanyaan…" className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-navy-700/45" />
              <button type="submit" aria-label="Kirim" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"><Send size={16} aria-hidden /></button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setTimeout(() => input.current?.focus(), 50); }}
        aria-expanded={open}
        aria-label={open ? "Tutup asisten" : "Ada pertanyaan? Tanya Bintang, asisten sekolah"}
        className="fixed bottom-4 right-4 z-[56] inline-flex h-14 items-center gap-2 rounded-full bg-brand-600 px-4 text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-700 active:scale-95 sm:right-6 sm:px-5"
      >
        {open ? <X size={22} aria-hidden /> : <Star className="twinkle size-6 text-white" style={{ "--dur": "3.2s" } as React.CSSProperties} />}
        <span className="hidden text-[15px] font-bold sm:inline">{open ? "Tutup" : "Ada pertanyaan?"}</span>
      </button>
    </>
  );
}
