"use client";

import { useEffect, useRef, useState } from "react";
import { getT, type Lang } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Photo } from "./Photo";

// Galeri kegiatan: mosaik foto di atas latar navy. Kolom foto bergeser dengan kecepatan berbeda saat halaman di-scroll
// (parallax ringan, scroll tetap normal). Hover: foto lain meredup, chip "Lihat" menyusul kursor. Klik = perbesar.
// Isi: `galeri` di content/*.ts.
export function Galeri({ lang }: { lang: Lang }) {
  const g = getT(lang).galeri;
  const galeri = g.items;
  const [zoom, setZoom] = useState<number | null>(null);
  const [slide, setSlide] = useState(0); // foto ke-berapa dalam kegiatan yang dibuka
  const rail = useRef<HTMLUListElement>(null);
  const z = zoom === null ? null : galeri[zoom];
  const album = z ? [z.photo, ...(z.more ?? [])] : [];
  const open = (k: number) => { setSlide(0); setZoom(k); };
  const goSlide = (n: number) => {
    const el = rail.current;
    if (!el || album.length < 2) return;
    el.scrollTo({ left: ((n + album.length) % album.length) * el.clientWidth, behavior: "smooth" });
  };
  const slideRef = useRef(0);
  useEffect(() => { slideRef.current = slide; }, [slide]);
  const goRef = useRef(goSlide);
  useEffect(() => { goRef.current = goSlide; });
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      else if (e.key === "ArrowRight") goRef.current(slideRef.current + 1);
      else if (e.key === "ArrowLeft") goRef.current(slideRef.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
  // ---------- Mosaik: kolom foto bergeser dengan kecepatan berbeda saat halaman di-scroll (scroll biasa, tidak dikunci) ----------
  const sec = useRef<HTMLElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = sec.current;
    if (!s || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const r = s.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      // -1 saat section baru masuk dari bawah, 0 saat di tengah layar, 1 saat hampir keluar di atas
      const p = ((vh / 2) - (r.top + r.height / 2)) / ((vh + r.height) / 2);
      s.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Chip "Lihat" yang menyusul kursor di atas foto (kursor asli tetap terlihat)
  const moveChip = (e: React.PointerEvent) => {
    const c = chip.current;
    if (!c || e.pointerType !== "mouse") return;
    c.style.translate = `${e.clientX + 18}px ${e.clientY + 18}px`;
    c.dataset.on = (e.target as HTMLElement).closest("[data-card]") ? "1" : "";
  };

  // Ukuran foto bergantian supaya mosaik tidak seragam
  const ratio = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[5/4]"];
  const tile = (k: number, cls = "") => {
    const x = galeri[k];
    return (
      <li key={x.title} className={cls}>
        <button
          type="button"
          data-card
          onClick={() => open(k)}
          aria-label={g.zoom.replace("{x}", x.title)}
          className={`group/t relative isolate block w-full overflow-hidden rounded-xl bg-navy-800 text-left transition-opacity duration-500 group-has-[[data-card]:hover]/m:opacity-55 hover:!opacity-100 ${ratio[k % ratio.length]}`}
        >
          <span className="absolute inset-0 -z-20 transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/t:scale-[1.06]">
            <Photo src={x.photo} alt="" label={x.title} sizes="(min-width: 1024px) 300px, 48vw" />
          </span>
          <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-navy-900/5 to-transparent" />
          <span className="absolute inset-x-4 bottom-4 block">
            <span className="block font-display text-[1.15rem] font-medium leading-tight text-white sm:text-[1.35rem]">{x.title}</span>
            <span className="hidden max-h-0 overflow-hidden text-[14px] leading-snug text-white/85 opacity-0 transition-all duration-500 group-hover/t:mt-1 group-hover/t:max-h-12 group-hover/t:opacity-100 lg:block">
              {x.caption}
            </span>
          </span>
        </button>
      </li>
    );
  };
  const cols = (n: number) => Array.from({ length: n }, (_, c) => galeri.map((_, k) => k).filter((k) => k % n === c));
  const speed = [-70, 50, -25]; // px pergeseran maksimum tiap kolom (desktop)

  return (
    <section ref={sec} id="galeri" aria-labelledby="galeri-title" className="relative overflow-clip bg-navy-900 px-5 py-20 text-white sm:px-8 lg:py-28">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 h-[30rem] w-[40rem] rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="relative mx-auto grid w-full max-w-[80rem] gap-10 lg:grid-cols-[18rem_1fr] lg:gap-14">
        <div>
          <h2 id="galeri-title" className="text-[clamp(3rem,10vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.03em] !text-white lg:sticky lg:top-[calc(50svh-5rem)] lg:text-[5.25rem]">
            {g.title[0]}
            <span className="em-serif block text-gold-300">{g.title[1]}</span>
          </h2>
        </div>

        <div onPointerMove={moveChip} onPointerLeave={() => chip.current && (chip.current.dataset.on = "")} className="group/m">
          {/* Desktop: 3 kolom ber-parallax */}
          <div className="hidden grid-cols-3 items-start gap-5 lg:grid">
            {cols(3).map((col, c) => (
              <ul
                key={c}
                aria-label={c === 0 ? g.aria : undefined}
                className={`flex flex-col gap-5 will-change-transform ${c === 1 ? "mt-24" : ""}`}
                style={{ translate: `0 calc(var(--p, 0) * ${speed[c]}px)` }}
              >
                {col.map((k) => tile(k))}
              </ul>
            ))}
          </div>
          {/* Ponsel & tablet: 2 kolom, tanpa parallax */}
          <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:hidden">
            {cols(2).map((col, c) => (
              <ul key={c} aria-label={c === 0 ? g.aria : undefined} className={`flex flex-col gap-3 sm:gap-4 ${c === 1 ? "mt-10" : ""}`}>
                {col.map((k) => tile(k))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={chip}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 grid size-16 scale-0 place-items-center rounded-full bg-gold-300 text-[13px] font-bold text-navy-900 opacity-0 shadow-lg transition-[scale,opacity,translate] duration-200 ease-out data-[on=1]:scale-100 data-[on=1]:opacity-100"
      >
        {lang === "en" ? "View" : "Lihat"}
      </div>

      {z && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={z.title}
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[70] grid place-items-center bg-navy-900/75 p-5 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="zoom-in relative isolate aspect-[4/5] w-[min(26rem,88vw)] max-h-[85svh] overflow-hidden rounded-[1.25rem] text-white shadow-lift ring-4 ring-white"
          >
            {/* Satu kegiatan = satu rangkaian foto yang bisa digeser */}
            <ul
              ref={rail}
              onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
              className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {album.map((ph, k) => (
                <li key={k} className="relative size-full shrink-0 snap-center">
                  <Photo src={ph} alt="" label={z.title} sizes="420px" className="-z-20" />
                </li>
              ))}
            </ul>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/10 to-transparent" />
            <button type="button" onClick={() => setZoom(null)} aria-label={g.close} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-navy-900 transition hover:bg-white">
              <X size={18} aria-hidden />
            </button>
            {album.length > 1 && (
              <>
                <button type="button" onClick={() => goSlide(slide - 1)} aria-label={g.prev} className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-900 shadow-lift transition hover:bg-white">
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <button type="button" onClick={() => goSlide(slide + 1)} aria-label={g.next} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-900 shadow-lift transition hover:bg-white">
                  <ChevronRight size={20} aria-hidden />
                </button>
                <p className="absolute left-4 top-4 rounded-full bg-navy-900/70 px-3 py-1 text-[13px] font-semibold tabular-nums backdrop-blur">{slide + 1} / {album.length}</p>
              </>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
              <h3 className="font-display text-3xl font-medium !text-white">{z.title}</h3>
              <p className="mt-1.5 text-[16px] text-white/85">{z.caption}</p>
              {album.length > 1 && (
                <div aria-hidden className="mt-3 flex gap-1.5">
                  {album.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all duration-300 ${k === slide ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
