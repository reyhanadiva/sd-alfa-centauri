"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { getT, type Lang } from "@/lib/i18n";
import { Photo } from "./Photo";

const tint = ["bg-brand-100 text-brand-700", "bg-[#e6f9f0] text-[#13795b]", "bg-[#fff1e6] text-[#b4531a]"];
const MS = 6000;

// Testimoni orang tua: foto besar + kutipan + persona (profesi/jabatan) di kiri-kanan; berganti otomatis
// tiap 6 detik, dengan cincin progres melingkar di avatar aktif. Bisa dipilih lewat avatar, panah, atau geser.
// Isi masih CONTOH: lihat `testimoni` di site.ts (foto: isi `photo`).
export function Testimoni({ lang }: { lang: Lang }) {
  const ui = getT(lang).testimoni;
  const testimoni = ui.items;
  const N = testimoni.length;
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % N), MS);
    return () => clearTimeout(t);
  }, [i, N]);
  const go = (d: number) => setI((x) => (x + d + N) % N);
  const t = testimoni[i];

  return (
    <section
      id="testimoni"
      aria-labelledby="testimoni-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
        className="relative mx-auto w-full max-w-[78rem] overflow-hidden rounded-[2.5rem] bg-brand-50 p-6 ring-1 ring-brand-100 sm:p-10 lg:p-12"
      >
        <Quote aria-hidden size={240} strokeWidth={1} className="pointer-events-none absolute -right-6 -top-8 rotate-180 text-brand-200/60" />
        <h2 id="testimoni-title" className="reveal relative text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]">
          {ui.title[0]}<span className="em-serif text-brand-600">{ui.title[1]}</span>
        </h2>

        <div className="relative mt-8 grid items-center gap-7 lg:mt-10 lg:grid-cols-[18rem_1fr] lg:gap-12">
          <div key={`p${i}`} className="fade-in relative mx-auto aspect-[4/5] w-48 overflow-hidden rounded-[2rem] shadow-lift ring-4 ring-white sm:w-56 lg:w-full">
            {t.photo ? (
              <Photo src={t.photo} alt={ui.photoAlt.replace("{x}", t.name)} label={ui.photoLabel} sizes="288px" />
            ) : (
              <Photo alt="" label={ui.photoLabel} sizes="288px" />
            )}
          </div>

          <figure key={i} className="fade-in text-center lg:text-left">
            <blockquote className={`em-serif leading-[1.3] text-navy-900 lg:min-h-[10.5rem] ${t.quote.length > 260 ? "text-[1.12rem] sm:text-[1.3rem] lg:text-[1.4rem]" : "text-[1.7rem] sm:text-[2.1rem]"}`}>“{t.quote}”</blockquote>
            <figcaption className="mt-4 leading-snug">
              <span className="block text-[17px] font-semibold text-navy-900">{t.name}</span>
              <span className="block text-[15px] text-navy-700">{t.persona}</span>
              <span className="block text-[14px] text-navy-700/65">{t.note}</span>
            </figcaption>
          </figure>
        </div>

        <div className="relative mt-8 flex items-center justify-center gap-3 sm:gap-4">
          <button type="button" onClick={() => go(-1)} aria-label={ui.prev} className="hidden size-11 place-items-center rounded-full bg-white ring-1 ring-brand-100 transition hover:bg-brand-100 sm:grid">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <ul className="flex items-center gap-2 sm:gap-3" aria-label={ui.pick}>
            {testimoni.map((x, k) => {
              const on = k === i;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setI(k)}
                    aria-label={ui.item.replace("{n}", String(k + 1)).replace("{p}", x.persona)}
                    aria-current={on}
                    className={`relative grid size-11 place-items-center rounded-full transition sm:size-14 ${on ? "scale-105" : "opacity-65 hover:opacity-100"}`}
                  >
                    <span className={`relative grid size-[78%] place-items-center overflow-hidden rounded-full text-[15px] font-bold ${tint[k % tint.length]}`}>
                      {x.photo ? <Photo src={x.photo} alt="" label="" sizes="48px" /> : x.name.replace("[", "").charAt(0)}
                    </span>
                    <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 -rotate-90">
                      <circle cx="24" cy="24" r="22" fill="none" strokeWidth="2.5" className="stroke-brand-200/70" />
                      {on && (
                        <circle key={i} cx="24" cy="24" r="22" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="ring-dash stroke-brand-600" style={{ animationDuration: `${MS}ms` }} />
                      )}
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => go(1)} aria-label={ui.next} className="hidden size-11 place-items-center rounded-full bg-white ring-1 ring-brand-100 transition hover:bg-brand-100 sm:grid">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
