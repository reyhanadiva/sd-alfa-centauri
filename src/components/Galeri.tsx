"use client";

import { useEffect, useRef, useState } from "react";
import { getT, type Lang } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Photo } from "./Photo";
import { SnapRail } from "./SnapRail";

// Galeri kegiatan: "gulungan film". Di layar lebar section dipin dan kartu foto bergerak horizontal saat halaman\n// di-scroll (foto di dalam kartu ber-parallax, chip "Lihat" mengikuti kursor). Di ponsel/tablet: geser biasa.\n// Klik kartu untuk memperbesar. Isi: `galeri` di content/*.ts.
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
  // ---------- Layar lebar: section "dipin", kartu bergerak horizontal mengikuti scroll ----------
  const sec = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const span = useRef(0); // jarak geser horizontal maksimum (px)
  useEffect(() => {
    const s = sec.current, t = track.current;
    if (!s || !t) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const frame = () => {
      raf = 0;
      if (!mq.matches) return;
      const vh = window.innerHeight;
      const r = s.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      t.style.transform = `translate3d(${-p * span.current}px,0,0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (still.matches) return;
      // Parallax foto di dalam kartu: bergeser berlawanan arah dengan posisi kartu terhadap tengah layar
      const vw = window.innerWidth;
      t.querySelectorAll<HTMLElement>("[data-card]").forEach((c) => {
        const b = c.getBoundingClientRect();
        if (b.right < -200 || b.left > vw + 200) return;
        c.style.setProperty("--o", (((b.left + b.width / 2) - vw / 2) / vw).toFixed(3));
      });
    };
    const measure = () => {
      if (!mq.matches) { s.style.height = ""; t.style.transform = ""; return; }
      span.current = Math.max(0, t.scrollWidth - window.innerWidth);
      s.style.height = `${window.innerHeight + span.current}px`;
      frame();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Fokus keyboard ke kartu yang belum terlihat: gulir halaman sampai kartu itu ada di tengah
  const reveal = (el: HTMLElement) => {
    const s = sec.current, t = track.current;
    if (!s || !t || !window.matchMedia("(min-width: 1024px)").matches || span.current === 0) return;
    const want = el.offsetLeft - (window.innerWidth - el.offsetWidth) / 2;
    const p = Math.min(1, Math.max(0, want / span.current));
    window.scrollTo({ top: s.offsetTop + p * span.current, behavior: "instant" as ScrollBehavior });
  };

  // Chip "Lihat" yang mengikuti kursor di atas kartu
  const moveChip = (e: React.PointerEvent) => {
    const c = chip.current;
    if (!c || e.pointerType !== "mouse") return;
    const over = !!(e.target as HTMLElement).closest("[data-card]");
    c.style.translate = `${e.clientX}px ${e.clientY}px`;
    c.dataset.on = over ? "1" : "";
  };

  return (
    <section ref={sec} id="galeri" aria-label={g.aria} className="relative bg-navy-900 text-white">
      {/* ---------- Layar lebar ---------- */}
      <div className="sticky top-0 hidden h-[100svh] overflow-hidden lg:block">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-1/4 h-[30rem] w-[40rem] rounded-full bg-brand-600/25 blur-[120px]" />
        <ul
          ref={track}
          aria-label={g.aria}
          onPointerMove={moveChip}
          onPointerLeave={() => chip.current && (chip.current.dataset.on = "")}
          className="relative flex h-full items-center gap-8 pl-[6vw] pr-[12vw] will-change-transform"
        >
          <li className="w-[32rem] shrink-0 pr-8">
            <h2 className="text-[clamp(4.5rem,8vw,8rem)] font-medium leading-[0.92] tracking-[-0.03em] !text-white">
              {g.title[0]}
              <span className="em-serif block text-gold-300">{g.title[1]}</span>
            </h2>
            <p className="mt-6 max-w-xs text-[17px] leading-relaxed text-white/80">{galeri.length} {lang === "en" ? "moments from the school year. Keep scrolling." : "momen dari keseharian sekolah. Terus gulir."}</p>
          </li>
          {galeri.map((x, k) => (
            <li key={x.title} className={`shrink-0 ${k % 2 ? "translate-y-10" : "-translate-y-6"}`}>
              <button
                type="button"
                data-card
                onClick={() => open(k)}
                onFocus={(e) => reveal(e.currentTarget)}
                aria-label={g.zoom.replace("{x}", x.title)}
                className="group block cursor-none text-left"
              >
                <span className={`relative isolate block overflow-hidden rounded-xl bg-navy-800 ${k % 3 === 1 ? "h-[min(28rem,56svh)] w-[min(24rem,30vw)]" : "h-[min(34rem,66svh)] w-[min(27rem,34vw)]"}`}>
                  <span className="absolute inset-[-8%] block transition-transform duration-700 ease-out group-hover:scale-[1.04]" style={{ translate: "calc(var(--o, 0) * -9%) 0" }}>
                    <Photo src={x.photo} alt="" label={x.title} sizes="440px" />
                  </span>
                  <span aria-hidden className="absolute inset-0 bg-navy-900/10 transition group-hover:bg-transparent" />
                </span>
                <span className="mt-4 block font-display text-[1.6rem] font-medium leading-tight text-white">{x.title}</span>
                <span className="mt-1 block max-w-[22rem] text-[15px] text-white/75">{x.caption}</span>
              </button>
            </li>
          ))}
        </ul>
        {/* Garis progres galeri */}
        <div aria-hidden className="absolute inset-x-[6vw] bottom-8 h-px bg-white/15">
          <div ref={bar} className="h-full origin-left scale-x-0 bg-gold-300" />
        </div>
        {/* Chip kursor */}
        <div
          ref={chip}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-30 -ml-11 -mt-11 grid size-22 scale-0 place-items-center rounded-full bg-gold-300 text-[14px] font-bold text-navy-900 opacity-0 transition-[scale,opacity] duration-300 data-[on=1]:scale-100 data-[on=1]:opacity-100"
        >
          {lang === "en" ? "View" : "Lihat"}
        </div>
      </div>

      {/* ---------- Ponsel & tablet: judul + geser satu per satu ---------- */}
      <div className="px-5 py-16 sm:px-8 lg:hidden">
        <h2 className="text-[clamp(3rem,12vw,5rem)] font-medium leading-[0.95] tracking-[-0.03em] !text-white">
          {g.title[0]}
          <span className="em-serif text-gold-300">{g.title[1]}</span>
        </h2>
        <div className="mt-8">
          <SnapRail label={g.aria} basis="72%" className="sm:grid sm:grid-cols-3 sm:gap-4">
            {galeri.map((x, k) => (
              <button
                key={x.title}
                type="button"
                onClick={() => open(k)}
                aria-label={g.zoom.replace("{x}", x.title)}
                className="relative isolate block aspect-[4/5] w-full overflow-hidden rounded-xl text-left"
              >
                <Photo src={x.photo} alt="" label={x.title} sizes="(min-width: 640px) 33vw, 70vw" className="-z-20" />
                <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-navy-900"><Maximize2 size={15} aria-hidden /></span>
                <span className="absolute inset-x-4 bottom-4 font-display text-xl font-medium leading-tight text-white">{x.title}</span>
              </button>
            ))}
          </SnapRail>
        </div>
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
              <h3 className="text-3xl font-semibold !text-white">{z.title}</h3>
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
