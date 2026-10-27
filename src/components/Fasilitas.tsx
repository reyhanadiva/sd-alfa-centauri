"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fasilitas, fasilitasTabs, keamanan } from "@/lib/site";
import { Photo } from "./Photo";

// EKSPERIMEN: empat gaya Fasilitas + Keamanan, semuanya menampilkan banyak fasilitas sekaligus.
// Pilih satu lewat tombol melayang, lalu sisanya dihapus.
//   split    = foto besar kiri, panel tab + kartu kanan (inspo travel)
//   daftar   = latar foto penuh + daftar bernomor di kanan (inspo dark list)
//   lengkung = deretan kartu melengkung (inspo galeri gelap)
//   kipas    = kartu mengipas menimpa judul raksasa (inspo kartu kaca)
const variants = [
  ["split", "Split"],
  ["daftar", "Daftar"],
  ["lengkung", "Lengkung"],
  ["kipas", "Kipas"],
] as const;
type Variant = (typeof variants)[number][0];

const pad = (n: number) => String(n).padStart(2, "0");
const N = fasilitas.length;

export function Fasilitas() {
  const [v, setV] = useState<Variant>("split");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id="fasilitas" aria-labelledby="fasilitas-title">
      {v === "split" && <Split />}
      {v === "daftar" && <Daftar />}
      {v === "lengkung" && <Lengkung />}
      {v === "kipas" && <Kipas />}

      <div
        className={`fixed right-3 top-1/2 z-40 -translate-y-1/2 transition duration-300 ${
          inView ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
        }`}
      >
        <div className="flex flex-col items-stretch gap-1 rounded-3xl bg-navy-900/90 p-1.5 text-[13px] font-semibold text-white shadow-lift ring-1 ring-white/20 backdrop-blur-xl">
          <span className="px-3 pb-1 pt-1.5 text-center text-[11px] uppercase tracking-wider text-white/55">Eksperimen</span>
          {variants.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setV(k)}
              aria-pressed={v === k}
              className={`rounded-full px-3.5 py-1.5 transition ${v === k ? "bg-white text-navy-900" : "hover:bg-white/15"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const H2 = ({ className = "", light = false }: { className?: string; light?: boolean }) => (
  <h2 id="fasilitas-title" className={`text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem] ${light ? "!text-white" : ""} ${className}`}>
    Tempat belajar yang{" "}
    <span className={`em-serif ${light ? "text-brand-200" : "text-brand-600"}`}>aman dan nyaman</span>
  </h2>
);

/* Baris keamanan: teks saja, tanpa ikon */
function Keamanan({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <ul
      id="keamanan"
      aria-label="Keamanan dan kesehatan"
      className={`grid grid-cols-2 gap-y-3 border-t pt-4 lg:grid-cols-4 ${dark ? "border-white/25" : "border-navy-900/10"} ${className}`}
    >
      {keamanan.map((k, i) => (
        <li key={k.title} className={`pr-4 ${i > 0 ? "lg:border-l lg:pl-5 " : ""}${dark ? "border-white/20" : "border-navy-900/10"}`}>
          <p className={`text-[16px] font-semibold leading-snug ${dark ? "text-white" : "text-navy-900"}`}>{k.title}</p>
        </li>
      ))}
    </ul>
  );
}

/* Tumpukan foto yang berganti dengan crossfade + zoom */
function Stack({ i, sizes = "100vw" }: { i: number; sizes?: string }) {
  return (
    <>
      {fasilitas.map((x, k) => (
        <div
          key={x.title}
          aria-hidden={k !== i}
          className={`absolute inset-0 transition-[opacity,transform] duration-[1200ms] ease-out ${k === i ? "scale-100 opacity-100" : "scale-[1.1] opacity-0"}`}
        >
          <Photo src={x.photo} alt={x.title} label={x.title} sizes={sizes} />
        </div>
      ))}
    </>
  );
}

/* ---------- A. Split ---------- */
function Split() {
  const [i, setI] = useState(0);
  const [tab, setTab] = useState<(typeof fasilitasTabs)[number]>("Semua");
  const f = fasilitas[i];
  const list = fasilitas.map((x, idx) => ({ x, idx })).filter(({ x }) => tab === "Semua" || x.cat === tab);
  const step = (d: 1 | -1) => setI((c) => (c + d + N) % N);

  return (
    <div className="grid lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="relative isolate min-h-[26rem] overflow-hidden text-white lg:rounded-r-[2.5rem]">
        <div className="absolute inset-0 -z-20"><Stack i={i} sizes="(min-width:1024px) 45vw, 100vw" /></div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-navy-900/15 to-navy-900/30" />
        <div className="flex h-full min-h-[26rem] flex-col justify-end gap-5 p-7 sm:p-10">
          <div key={i} className="fade-in">
            <h3 className="text-[2.4rem] font-semibold leading-[1.05] !text-white sm:text-5xl">{f.title}</h3>
            <p className="mt-2 max-w-sm text-[16px] text-white/85">{f.caption}</p>
          </div>
          <div className="flex items-center gap-4 text-[14px] font-semibold tabular-nums">
            <span>{pad(i + 1)}</span>
            <span className="relative h-px flex-1 bg-white/30">
              <span className="absolute inset-y-0 left-0 h-px bg-white transition-all duration-500" style={{ width: `${((i + 1) / N) * 100}%`, height: 2, top: -0.5 }} />
            </span>
            <span className="text-white/60">{pad(N)}</span>
            <button type="button" onClick={() => step(-1)} aria-label="Sebelumnya" className="grid size-10 place-items-center rounded-full ring-1 ring-white/40 transition hover:bg-white/15"><ChevronLeft size={18} aria-hidden /></button>
            <button type="button" onClick={() => step(1)} aria-label="Berikutnya" className="grid size-10 place-items-center rounded-full ring-1 ring-white/40 transition hover:bg-white/15"><ChevronRight size={18} aria-hidden /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6 px-5 py-12 sm:px-10 lg:py-6 xl:px-14">
        <H2 className="lg:text-[2.6rem]" />
        <div role="tablist" aria-label="Kategori fasilitas" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-navy-900/10">
          {fasilitasTabs.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => { setTab(t); const first = fasilitas.findIndex((x) => t === "Semua" || x.cat === t); if (first >= 0) setI(first); }}
              className={`-mb-px border-b-2 pb-2.5 text-[15px] font-semibold transition ${tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-navy-700/60 hover:text-navy-900"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <ul key={tab} className="fade-in grid grid-cols-2 gap-3 sm:grid-cols-4">
          {list.map(({ x, idx }) => (
            <li key={x.title}>
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-pressed={idx === i}
                className={`group relative isolate block aspect-[4/5] w-full overflow-hidden rounded-2xl p-3 text-left text-white transition ${idx === i ? "ring-[3px] ring-brand-600 ring-offset-2" : "opacity-90 hover:opacity-100"}`}
              >
                <Photo src={x.photo} alt="" label={x.title} sizes="180px" className="-z-20 transition duration-500 group-hover:scale-105" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                <span className="absolute inset-x-3 bottom-3 text-[14px] font-semibold leading-tight">{x.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <Keamanan />
      </div>
    </div>
  );
}

/* ---------- B. Daftar bernomor ---------- */
function Daftar() {
  const [i, setI] = useState(0);
  // Selalu berjalan: 5 detik per fasilitas (garis progres di baris aktif), tidak berhenti karena hover.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % N), 5000);
    return () => clearTimeout(t);
  }, [i]);
  const f = fasilitas[i];

  return (
    <div
      className="relative isolate overflow-hidden text-white lg:h-[calc(100svh-5rem)] lg:min-h-[44rem]"
    >
      <div className="absolute inset-0 -z-20"><Stack i={i} /></div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy-900/55" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/80 via-navy-900/20 to-navy-900/30" />

      <div className="mx-auto grid h-full w-full max-w-[78rem] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_22rem] lg:items-center lg:py-6">
        <div className="flex h-full flex-col justify-between gap-8 lg:py-4">
          <H2 light className="max-w-xl" />
          <div>
            <p key={`n${i}`} className="fade-in font-display text-[6rem] font-semibold leading-none tracking-[-0.05em] text-white/35 sm:text-[8rem]">{pad(i + 1)}</p>
            <div key={i} className="fade-in">
              <h3 className="mt-1 text-3xl font-semibold !text-white sm:text-4xl">{f.title}</h3>
              <p className="mt-1.5 max-w-sm text-[16px] text-white/80">{f.caption}</p>
            </div>
            <Keamanan dark className="mt-7 max-w-2xl" />
          </div>
        </div>

        <ul aria-label="Daftar fasilitas" className="grid gap-2">
          {fasilitas.map((x, k) => (
            <li key={x.title}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-current={k === i}
                className={`relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-2.5 text-left transition ${k === i ? "bg-white text-navy-900" : "bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-white/20"}`}
              >
                <span className={`font-display text-[1.6rem] font-semibold leading-none tabular-nums ${k === i ? "text-brand-600" : "text-white/55"}`}>{pad(k + 1)}</span>
                <span className="text-[16px] font-semibold">{x.title}</span>
                {k === i && <span key={i} className="bar-fill absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- C. Lengkung ---------- */
function Lengkung() {
  const ref = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("li");
    const center = (k: number) => items[k].offsetLeft - (el.clientWidth - items[k].offsetWidth) / 2;
    el.scrollLeft = center(3);
    const on = () => {
      let best = 0, d = Infinity;
      items.forEach((it, k) => {
        const dd = Math.abs(it.offsetLeft + it.offsetWidth / 2 - (el.scrollLeft + el.clientWidth / 2));
        if (dd < d) { d = dd; best = k; }
      });
      setActive(best);
    };
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  const go = (k: number) => {
    const el = ref.current;
    const it = el?.querySelectorAll<HTMLElement>("li")[k];
    if (el && it) el.scrollTo({ left: it.offsetLeft - (el.clientWidth - it.offsetWidth) / 2, behavior: "smooth" });
  };

  return (
    <div className="relative isolate overflow-x-clip bg-navy-900 py-14 text-white lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:flex-col lg:justify-center lg:py-6">
      <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-72 w-[56rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[110px]" />
      <H2 light className="mx-auto max-w-3xl px-5 text-center" />
      <ul ref={ref} aria-label="Fasilitas sekolah" className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-8.5rem)] py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fasilitas.map((x, k) => (
          <li key={x.title} className="arc-card relative isolate h-[min(22rem,calc(100svh-28rem))] min-h-[16rem] w-[17rem] shrink-0 snap-center overflow-hidden rounded-[1.5rem]">
            <button type="button" onClick={() => go(k)} className="block size-full text-left" aria-label={x.title}>
              <Photo src={x.photo} alt={x.title} label={x.title} sizes="272px" className="-z-20" />
              <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
              <span className="absolute inset-x-4 bottom-4 text-[1.2rem] font-semibold leading-tight text-white">{x.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-2 flex w-full max-w-[78rem] flex-col gap-5 px-5 sm:px-8">
        <p key={active} className="fade-in text-center text-[15px] text-white/80">{fasilitas[active].caption}</p>
        <Keamanan dark />
      </div>
    </div>
  );
}

/* ---------- D. Kipas ---------- */
function Kipas() {
  const mid = (N - 1) / 2;
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
  const z = zoom === null ? null : fasilitas[zoom];
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-white via-brand-50 to-white px-5 py-14 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6">
      <div className="mx-auto w-full max-w-[78rem] [--u:2.6rem] sm:[--u:5.2rem] lg:[--u:7.6rem]">
        <h2 id="fasilitas-title" className="text-center text-[clamp(3rem,8.5vw,7.25rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
          Fasilitas <span className="em-serif text-brand-600">lengkap</span>
        </h2>

        <ul aria-label="Fasilitas sekolah" className="relative mx-auto -mt-1 mb-20 h-[min(17rem,32svh)] sm:mb-24">
          {fasilitas.map((x, k) => {
            const d = k - mid;
            return (
              <li
                key={x.title}
                style={{ "--d": d, zIndex: 20 - Math.round(Math.abs(d) * 2) } as React.CSSProperties}
                className="group absolute left-1/2 top-0 -ml-[4.5rem] h-full w-[9rem] translate-x-[calc(var(--d)*var(--u))] translate-y-[calc(var(--d)*var(--d)*0.45rem)] rotate-[calc(var(--d)*4.5deg)] transition duration-500 ease-out hover:z-50 hover:-translate-y-5 hover:rotate-0 hover:scale-105 sm:-ml-[5.5rem] sm:w-[11rem] lg:-ml-[6.5rem] lg:w-[13rem]"
              >
                <button
                  type="button"
                  onClick={() => setZoom(k)}
                  aria-label={`Perbesar: ${x.title}`}
                  className="relative isolate block size-full cursor-zoom-in overflow-hidden rounded-[1.4rem] text-left shadow-lift ring-4 ring-white"
                >
                  <Photo src={x.photo} alt={x.title} label={x.title} sizes="208px" className="-z-20" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 text-[14px] font-semibold leading-tight text-white sm:text-[15px]">{x.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Keamanan className="mt-8" />
      </div>

      {z && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={z.title}
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[70] grid cursor-zoom-out place-items-center bg-navy-900/75 p-5 backdrop-blur-sm"
        >
          <div className="zoom-in relative isolate aspect-[4/5] w-[min(26rem,88vw)] max-h-[85svh] overflow-hidden rounded-[2rem] text-white shadow-lift ring-4 ring-white">
            <Photo src={z.photo} alt={z.title} label={z.title} sizes="420px" className="-z-20" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="text-3xl font-semibold !text-white">{z.title}</h3>
              <p className="mt-1.5 text-[16px] text-white/85">{z.caption}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
