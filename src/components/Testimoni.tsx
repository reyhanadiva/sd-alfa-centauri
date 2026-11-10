"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Quote, X } from "lucide-react";
import { getT, type Lang } from "@/lib/i18n";
import { Photo } from "./Photo";
import { Rich } from "./Rich";
import { Words } from "./Words";

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
  const dlg = useRef<HTMLDialogElement>(null);
  const [reading, setReading] = useState(false); // dialog "baca selengkapnya" terbuka: jeda otomatis
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const running = !paused && !reduced && !reading;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((x) => (x + 1) % N), MS);
    return () => clearTimeout(t);
  }, [i, N, running]);
  const go = (d: number) => { setPaused(true); setI((x) => (x + d + N) % N); };
  const t = testimoni[i];

  return (
    <section
      id="testimoni"
      aria-labelledby="testimoni-title"
      className="px-5 py-16 sm:px-8 lg:py-20"
    >
      <div
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
        className="relative mx-auto w-full max-w-[78rem] overflow-hidden rounded-[1.25rem] bg-paper p-6 sm:p-10 lg:p-12"
      >
        <Quote aria-hidden size={240} strokeWidth={1} className="pointer-events-none absolute -right-6 -top-8 rotate-180 text-paper-line" />
        <h2 id="testimoni-title" className="relative text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-[3.75rem]">
          <Words text={ui.title[0] + ui.title[1]} />
        </h2>

        <div className="relative mt-8 grid items-center gap-7 lg:mt-10 lg:grid-cols-[18rem_1fr] lg:gap-12">
          <div key={`p${i}`} className="fade-in relative mx-auto aspect-[4/5] w-48 overflow-hidden rounded-[1.25rem] shadow-lift ring-4 ring-white sm:w-56 lg:w-full">
            {t.photo ? (
              <Photo src={t.photo} alt={ui.photoAlt.replace("{x}", t.name)} label={ui.photoLabel} sizes="288px" />
            ) : (
              <Photo alt="" label={ui.photoLabel} sizes="288px" />
            )}
          </div>

          <figure key={i} className="fade-in text-center lg:text-left">
            <blockquote className="font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.02em] text-navy-900 sm:text-[2.6rem] lg:min-h-[8.5rem] lg:text-[3rem]">
              <Rich text={`“${t.highlight}”`} strong="em-serif text-brand-700" />
            </blockquote>
            <figcaption className="mt-5 leading-snug">
              <span className="block text-[17px] font-semibold text-navy-900">{t.name}</span>
              <span className="block text-[15px] text-navy-700">{t.persona}</span>
              <span className="block text-[14px] text-navy-700">{t.note}</span>
            </figcaption>
            <button
              type="button"
              onClick={() => { setReading(true); dlg.current?.showModal(); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-100"
            >
              {ui.readMore} <ChevronRight size={15} aria-hidden />
            </button>
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
                    onClick={() => { setPaused(true); setI(k); }}
                    aria-label={ui.item.replace("{n}", String(k + 1)).replace("{p}", x.persona)}
                    aria-current={on}
                    className={`relative grid size-11 place-items-center rounded-full transition sm:size-14 ${on ? "scale-105" : "opacity-80 hover:opacity-100"}`}
                  >
                    <span className={`relative grid size-[78%] place-items-center overflow-hidden rounded-full text-[15px] font-bold ${tint[k % tint.length]}`}>
                      {x.photo ? <Photo src={x.photo} alt="" label="" sizes="48px" /> : x.name.replace("[", "").charAt(0)}
                    </span>
                    <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 -rotate-90">
                      <circle cx="24" cy="24" r="22" fill="none" strokeWidth="2.5" className="stroke-brand-200/70" />
                      {on && running && (
                        <circle key={i} cx="24" cy="24" r="22" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="ring-dash stroke-brand-600" style={{ animationDuration: `${MS}ms` }} />
                      )}
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={lang === "en" ? (running ? "Pause slideshow" : "Play slideshow") : running ? "Jeda tampilan otomatis" : "Putar tampilan otomatis"}
            className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-brand-100 transition hover:bg-brand-100"
          >
            {running ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
          </button>
          <button type="button" onClick={() => go(1)} aria-label={ui.next} className="hidden size-11 place-items-center rounded-full bg-white ring-1 ring-brand-100 transition hover:bg-brand-100 sm:grid">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </div>

      <dialog
        ref={dlg}
        aria-label={t.name}
        onClose={() => setReading(false)}
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}
        className="pop-dialog m-auto w-[min(94vw,40rem)] rounded-3xl bg-white p-0 shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 sm:px-8 sm:pt-6">
          <div className="leading-snug">
            <p className="text-[17px] font-semibold text-navy-900">{t.name}</p>
            <p className="text-[14.5px] text-navy-700">{t.persona}</p>
            <p className="text-[14px] text-navy-700">{t.note}</p>
          </div>
          <button type="button" onClick={() => dlg.current?.close()} aria-label={ui.close} className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-navy-800 transition hover:bg-brand-100">
            <X size={20} aria-hidden />
          </button>
        </div>
        <p className="max-h-[60svh] overflow-y-auto px-6 pb-7 pt-4 text-[16.5px] leading-relaxed text-navy-800 sm:px-8">“{t.quote}”</p>
      </dialog>
    </section>
  );
}
