"use client";

import { useEffect, useRef, useState } from "react";
import { getT, type Lang } from "@/lib/i18n";
import { Photo } from "./Photo";
import { Rich } from "./Rich";
import { Words } from "./Words";

// Testimoni orang tua sebagai "scrollytelling": di layar lebar, kolom kiri menempel (foto, nama, persona berganti),
// kolom kanan berisi kutipan yang menyala satu per satu mengikuti scroll. Kutipan lengkap langsung terbaca,
// tanpa autoplay, tanpa dialog. Ponsel/tablet: kartu bertumpuk biasa, foto kecil di atas tiap kutipan.
// Isi: `testimoni` di content/*.ts.
export function Testimoni({ lang }: { lang: Lang }) {
  const ui = getT(lang).testimoni;
  const items = ui.items;
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  // Kutipan "aktif" = yang melewati garis tengah layar
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setI(Number((e.target as HTMLElement).dataset.k)); }),
      { rootMargin: "-48% 0px -48% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const initial = (name: string) => name.replace(/^(dr\.|Dr\.)\s*/, "").replace("[", "").charAt(0);

  return (
    <section id="testimoni" aria-labelledby="testimoni-title" className="bg-paper px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto grid w-full max-w-[78rem] gap-10 lg:grid-cols-[22rem_1fr] lg:gap-20">
        {/* ---------- Kiri: menempel di tengah layar (desktop) ---------- */}
        <div>
          <div className="lg:sticky lg:top-[max(6rem,calc(50svh-19rem))]">
            <h2 id="testimoni-title" className="text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-[3.75rem]">
              <Words text={ui.title[0] + ui.title[1]} />
            </h2>

            <div aria-hidden className="mt-8 hidden lg:block">
              <div className="relative h-[min(27.5rem,46svh)] w-full overflow-hidden rounded-xl bg-paper-line">
                {items.map((t, k) => (
                  <div
                    key={t.name}
                    className={`absolute inset-0 transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${k === i ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}
                  >
                    {t.photo ? (
                      <Photo src={t.photo} alt="" label={ui.photoLabel} sizes="352px" />
                    ) : (
                      <span className="grid size-full place-items-center font-display text-[6rem] text-brand-600">{initial(t.name)}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="relative mt-5 h-[5.5rem]">
                {items.map((t, k) => (
                  <div key={t.name} className={`absolute inset-0 transition-[opacity,translate] duration-500 ${k === i ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                    <p className="text-[17px] font-semibold leading-snug text-navy-900">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug text-navy-700">{t.persona}</p>
                  </div>
                ))}
              </div>
              {/* Penanda posisi */}
              <div className="mt-4 flex gap-1.5">
                {items.map((t, k) => (
                  <span key={t.name} className={`h-1 rounded-full transition-all duration-500 ${k === i ? "w-10 bg-gold-400" : "w-4 bg-navy-900/15"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Kanan: kutipan ---------- */}
        <ol className="flex flex-col gap-14 lg:gap-0">
          {items.map((t, k) => {
            const on = k === i;
            return (
              <li
                key={t.name}
                ref={(el) => { refs.current[k] = el; }}
                data-k={k}
                className="lg:flex lg:min-h-[78svh] lg:items-center"
              >
                <figure className={`transition-opacity duration-700 lg:py-10 ${on ? "lg:opacity-100" : "lg:opacity-25"}`}>
                  {/* Ponsel/tablet: foto dan nama di atas kutipan */}
                  <figcaption className="mb-6 flex items-center gap-4 lg:hidden">
                    <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-paper-line font-display text-2xl text-brand-600">
                      {t.photo ? <Photo src={t.photo} alt="" label="" sizes="64px" /> : initial(t.name)}
                    </span>
                    <span className="leading-snug">
                      <span className="block text-[17px] font-semibold text-navy-900">{t.name}</span>
                      <span className="block text-[14px] text-navy-700">{t.persona}</span>
                    </span>
                  </figcaption>

                  <blockquote>
                    <p className="font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.02em] text-navy-900 sm:text-[2.6rem] lg:text-[3.1rem]">
                      <Rich text={`“${t.highlight}”`} strong="em-serif text-brand-700" />
                    </p>
                    <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-navy-700">{t.quote}</p>
                  </blockquote>
                  <p className="mt-5 text-[14px] font-semibold text-navy-700">
                    <span className="hidden lg:inline">{t.name} · </span>
                    {t.note}
                  </p>
                </figure>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
