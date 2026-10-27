"use client";

import { useState } from "react";
import { ArrowUp, Minus, Plus } from "lucide-react";
import { faqs, waLink } from "@/lib/site";
import { Photo } from "./Photo";

const pad = (n: number) => String(n + 1).padStart(2, "0");

// FAQ: foto + kartu "tanya admin" di kiri (ketik pertanyaan lanjutan, lanjut ke WhatsApp),
// daftar bernomor di kanan (satu terbuka, transisi tinggi halus).
export function Faq() {
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState("");

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="faq-title" className="reveal text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]">
          Pertanyaan yang <span className="em-serif text-brand-600">sering diajukan</span>
        </h2>

        <div className="mt-8 grid gap-3.5 lg:mt-9 lg:h-[min(32rem,calc(100svh-17rem))] lg:grid-cols-[0.8fr_1.2fr]">
          {/* Kiri: foto + tanya admin */}
          <div className="reveal relative isolate min-h-[22rem] overflow-hidden rounded-[2rem]">
            <Photo src="/images/siswa-membaca.jpg" alt="Siswa SD Alfa Centauri membaca bersama" label="Suasana kelas" sizes="(min-width:1024px) 480px, 94vw" className="-z-10 object-[30%_40%]" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = q.trim();
                window.open(waLink(t ? `Halo SD Alfa Centauri, saya ingin bertanya: ${t}` : undefined), "_blank", "noopener,noreferrer");
              }}
              className="absolute inset-x-3 bottom-3 rounded-[1.5rem] bg-white p-4 shadow-lift"
            >
              <p className="text-[17px] font-semibold leading-snug text-navy-900">Belum ketemu jawabannya?</p>
              <p className="mt-0.5 text-[14px] text-navy-700/80">Tulis pertanyaanmu, kami lanjutkan lewat WhatsApp.</p>
              <label htmlFor="faq-q" className="sr-only">Pertanyaan untuk admin</label>
              <div className="mt-3 flex items-center gap-2 rounded-full bg-brand-50 p-1.5 pl-4 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-500">
                <input
                  id="faq-q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Contoh: apakah ada kelas percobaan?"
                  className="min-w-0 flex-1 bg-transparent text-[14.5px] text-navy-900 outline-none placeholder:text-navy-700/45"
                />
                <button type="submit" aria-label="Kirim lewat WhatsApp" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 active:scale-95">
                  <ArrowUp size={18} aria-hidden />
                </button>
              </div>
            </form>
          </div>

          {/* Kanan: daftar bernomor */}
          <ul className="reveal flex flex-col gap-2 lg:justify-between">
            {faqs.map((f, i) => {
              const on = open === i;
              return (
                <li key={f.q} className={`overflow-hidden rounded-[1.4rem] ring-1 transition-colors duration-300 ${on ? "bg-brand-50 ring-brand-200" : "bg-white ring-brand-100 hover:bg-brand-50/60"}`}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={on}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpen(on ? -1 : i)}
                      className="flex w-full items-center gap-4 px-3 py-2.5 text-left"
                    >
                      <span className={`grid h-10 w-12 shrink-0 place-items-center rounded-xl text-[13px] font-bold tabular-nums transition-colors duration-300 ${on ? "bg-brand-600 text-white" : "bg-brand-50 text-navy-700/60"}`}>
                        {pad(i)}
                      </span>
                      <span className="flex-1 text-[16px] font-semibold leading-snug text-navy-900">{f.q}</span>
                      <span className="mr-2 text-navy-700">
                        {on ? <Minus size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
                      </span>
                    </button>
                  </h3>
                  <div id={`faq-a-${i}`} role="region" className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <p className="overflow-hidden px-3 pl-[4.75rem] pr-6 text-[15px] leading-relaxed text-navy-700">
                      <span className="block pb-3.5">{f.a}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
