"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { testimoni } from "@/lib/site";

const N = testimoni.length;
const tint = ["bg-brand-100 text-brand-700", "bg-[#e6f9f0] text-[#13795b]", "bg-[#fff1e6] text-[#b4531a]"];

// Testimoni orang tua: satu kutipan besar yang berganti otomatis (6 detik, garis progres di avatar aktif),
// bisa dipilih lewat avatar atau panah. Isi masih CONTOH: lihat `testimoni` di site.ts.
export function Testimoni() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % N), 6000);
    return () => clearTimeout(t);
  }, [i]);
  const t = testimoni[i];

  return (
    <section
      id="testimoni"
      aria-labelledby="testimoni-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="relative mx-auto w-full max-w-[78rem] overflow-hidden rounded-[2.5rem] bg-brand-50 px-6 py-14 ring-1 ring-brand-100 sm:px-14 lg:py-16">
        <Quote aria-hidden size={220} strokeWidth={1} className="absolute -left-4 -top-6 text-brand-200/70" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 id="testimoni-title" className="reveal text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]">
            Kata <span className="em-serif text-brand-600">orang tua</span>
          </h2>
          <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-[12px] font-bold text-navy-700/70 ring-1 ring-brand-100">Contoh isi, belum testimoni asli</span>

          <figure key={i} className="fade-in mt-8 min-h-[12rem]">
            <blockquote className="em-serif text-[1.8rem] leading-[1.25] text-navy-900 sm:text-[2.3rem]">“{t.quote}”</blockquote>
            <figcaption className="mt-5 text-[16px] font-semibold text-navy-900">
              {t.name} <span className="font-normal text-navy-700/70">· {t.note}</span>
            </figcaption>
          </figure>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button type="button" onClick={() => setI((i - 1 + N) % N)} aria-label="Sebelumnya" className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-brand-100 transition hover:bg-brand-100">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <ul className="flex items-center gap-3" aria-label="Pilih testimoni">
              {testimoni.map((x, k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setI(k)}
                    aria-label={`Testimoni ${k + 1}`}
                    aria-current={k === i}
                    className={`relative grid size-12 place-items-center overflow-hidden rounded-full text-[15px] font-bold transition ${tint[k % tint.length]} ${k === i ? "ring-2 ring-brand-600 ring-offset-2 ring-offset-brand-50" : "opacity-60 hover:opacity-100"}`}
                  >
                    {x.name.replace("[", "").charAt(0)}
                    {k === i && <span key={i} className="bar-fill absolute inset-x-0 bottom-0 h-1 origin-left bg-brand-600" style={{ animationDuration: "6s" }} />}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setI((i + 1) % N)} aria-label="Berikutnya" className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-brand-100 transition hover:bg-brand-100">
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
