"use client";

import { useState } from "react";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { getT, type Lang } from "@/lib/i18n";
import { Photo } from "./Photo";

// FAQ: foto + tombol "tanya admin" di kiri (membuka WhatsApp dengan pesan template; tanpa backend),
// daftar pertanyaan di kanan (satu terbuka, transisi tinggi halus).
export function Faq({ lang }: { lang: Lang }) {
  const faq = getT(lang).faq;
  const faqs = faq.items;
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="px-5 py-16 sm:px-8 lg:py-20"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="faq-title" className="reveal text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-[3.75rem]">
          {faq.title[0]}{faq.title[1]}
        </h2>

        <div className="mt-8 grid gap-3.5 lg:mt-9 lg:min-h-[32rem] lg:grid-cols-[0.8fr_1.2fr]">
          {/* Kiri: foto + tanya admin */}
          <div className="reveal relative isolate min-h-[22rem] overflow-hidden rounded-[1.25rem]">
            <Photo src="/images/siswa-membaca.jpg" alt={faq.photoAlt} label={faq.photoLabel} sizes="(min-width:1024px) 480px, 94vw" className="-z-10 object-[30%_40%]" />
            <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-5 shadow-lift">
              <p className="text-[17px] font-semibold leading-snug text-navy-900">{faq.noAnswer}</p>
              <p className="mt-0.5 text-[14px] text-navy-700">{faq.help}</p>
              <a
                href={faq.askWa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-[15px] font-bold text-white transition hover:bg-brand-700"
              >
                <MessageCircle size={18} aria-hidden /> {faq.ask}
              </a>
            </div>
          </div>

          {/* Kanan: daftar pertanyaan */}
          <ul className="reveal flex flex-col gap-2 lg:justify-between">
            {faqs.map((f, i) => {
              const on = open === i;
              return (
                <li key={f.q} className={`overflow-hidden rounded-xl ring-1 transition-colors duration-300 ${on ? "bg-brand-50 ring-brand-200" : "bg-white ring-brand-100 hover:bg-brand-50/60"}`}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={on}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpen(on ? -1 : i)}
                      id={`faq-q-${i}`}
                      className="flex min-h-12 w-full items-center gap-4 px-5 py-3 text-left"
                    >
                      <span className="flex-1 text-[16px] font-semibold leading-snug text-navy-900">{f.q}</span>
                      <span className="mr-2 text-navy-700">
                        {on ? <Minus size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
                      </span>
                    </button>
                  </h3>
                  <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} inert={!on} className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <p className="overflow-hidden px-5 pr-6 text-[15px] leading-relaxed text-navy-700">
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
