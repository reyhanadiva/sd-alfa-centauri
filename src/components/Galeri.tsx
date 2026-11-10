"use client";

import { useEffect, useRef, useState } from "react";
import { getT, type Lang } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Photo } from "./Photo";
import { SnapRail } from "./SnapRail";

// Galeri kegiatan: kartu mengipas di bawah judul besar; klik untuk memperbesar. Isi: `galeri` di site.ts.
export function Galeri({ lang }: { lang: Lang }) {
  const g = getT(lang).galeri;
  const galeri = g.items;
  const N = galeri.length;
  const mid = (N - 1) / 2;
  const [zoom, setZoom] = useState<number | null>(null);
  const [focus, setFocus] = useState(Math.floor(mid)); // kartu yang sedang di-hover/fokus, judulnya tampil di bawah kipas
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
  return (
    <section id="galeri" aria-labelledby="galeri-title" className="relative overflow-hidden bg-gradient-to-b from-white via-paper to-white px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-[78rem] [--u:2.6rem] sm:[--u:5.2rem] lg:[--u:7.6rem]">
        <h2 id="galeri-title" className="text-center text-[clamp(3rem,8.5vw,7.25rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          {g.title[0]}{g.title[1]}
        </h2>

        <ul aria-label={g.aria} className="relative mx-auto mt-6 hidden h-[min(17rem,32svh)] sm:mb-10 sm:block">
          {galeri.map((x, k) => {
            const d = k - mid;
            return (
              <li
                key={x.title}
                onMouseEnter={() => setFocus(k)}
                onFocus={() => setFocus(k)}
                style={{ "--d": d, zIndex: 20 - Math.round(Math.abs(d) * 2) } as React.CSSProperties}
                className="group absolute left-1/2 top-0 -ml-[4.5rem] h-full w-[9rem] translate-x-[calc(var(--d)*var(--u))] translate-y-[calc(var(--d)*var(--d)*0.45rem)] rotate-[calc(var(--d)*4.5deg)] hover:z-50 focus-within:z-50 sm:-ml-[5.5rem] sm:w-[11rem] lg:-ml-[6.5rem] lg:w-[13rem]"
              >
                <button
                  type="button"
                  onClick={() => open(k)}
                  aria-label={g.zoom.replace("{x}", x.title)}
                  className="relative isolate block size-full cursor-zoom-in overflow-hidden rounded-xl text-left shadow-lift ring-4 ring-white transition duration-500 ease-out group-hover:-translate-y-5 group-hover:scale-105 group-hover:rotate-[calc(var(--d)*-4.5deg)] group-focus-within:-translate-y-5 group-focus-within:scale-105 group-focus-within:rotate-[calc(var(--d)*-4.5deg)]"
                >
                  <Photo src={x.photo} alt="" label={x.title} sizes="208px" className="-z-20" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                </button>
              </li>
            );
          })}
        </ul>
        {/* Judul kartu yang sedang disorot: kartu saling menimpa, jadi judul ditaruh di bawah kipas */}
        <div aria-live="polite" className="hidden text-center sm:block">
          <p key={focus} className="fade-in text-2xl font-semibold text-navy-900">{galeri[focus].title}</p>
          <p className="mt-1 text-[16px] text-navy-700">{galeri[focus].caption}</p>
        </div>

        {/* Ponsel: geser satu per satu (kipas hanya untuk layar lebar) */}
        <div className="mt-8 sm:hidden">
          <SnapRail label={g.aria} basis="72%">
            {galeri.map((x, k) => (
              <button
                key={x.title}
                type="button"
                onClick={() => open(k)}
                aria-label={g.zoom.replace("{x}", x.title)}
                className="relative isolate block aspect-[4/5] overflow-hidden rounded-[1.25rem] text-left shadow-lift ring-4 ring-white"
              >
                <Photo src={x.photo} alt="" label={x.title} sizes="70vw" className="-z-20" />
                <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-navy-900"><Maximize2 size={15} aria-hidden /></span>
                <span className="absolute inset-x-4 bottom-4 text-lg font-semibold leading-tight text-white">{x.title}</span>
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
