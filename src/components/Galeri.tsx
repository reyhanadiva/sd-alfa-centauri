"use client";

import { useEffect, useState } from "react";
import { galeri } from "@/lib/site";
import { Photo } from "./Photo";

// Galeri kegiatan: kartu mengipas di bawah judul besar; klik untuk memperbesar. Isi: `galeri` di site.ts.
const N = galeri.length;

export function Galeri() {
  const mid = (N - 1) / 2;
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
  const z = zoom === null ? null : galeri[zoom];
  return (
    <section id="galeri" aria-labelledby="galeri-title" className="relative overflow-hidden bg-gradient-to-b from-white via-brand-50 to-white px-5 py-14 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6">
      <div className="mx-auto w-full max-w-[78rem] [--u:2.6rem] sm:[--u:5.2rem] lg:[--u:7.6rem]">
        <h2 id="galeri-title" className="text-center text-[clamp(3rem,8.5vw,7.25rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
          Galeri <span className="em-serif text-brand-600">kegiatan</span>
        </h2>

        <ul aria-label="Galeri kegiatan" className="relative mx-auto mt-6 mb-16 h-[min(17rem,32svh)] sm:mb-24">
          {galeri.map((x, k) => {
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
        <p className="mt-8 text-center text-[15px] text-navy-700/80">Klik foto untuk memperbesar.</p>
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
    </section>
  );
}
