"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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

  // Ponsel/tablet: kartu digeser ke samping; titik penanda mengikuti kartu yang terlihat
  const rail = useRef<HTMLOListElement>(null);
  const [slide, setSlide] = useState(0);
  // Ponsel/tablet: kutipan lengkap disembunyikan, dibuka per kartu (kalimat utama tetap jadi fokus)
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const toggle = (k: number) =>
    setOpened((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const onRail = () => {
    const el = rail.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first || el.scrollWidth <= el.clientWidth) return;
    setSlide(Math.min(items.length - 1, Math.round(el.scrollLeft / (first.offsetWidth + 16))));
  };

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
        <div className="min-w-0">
        <ol
          ref={rail}
          onScroll={onRail}
          tabIndex={0}
          aria-label={ui.title[0] + ui.title[1]}
          className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:snap-none lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((t, k) => {
            const on = k === i;
            return (
              <li
                key={t.name}
                ref={(el) => { refs.current[k] = el; }}
                data-k={k}
                className="w-[86%] shrink-0 snap-center self-start sm:w-[62%] lg:flex lg:min-h-[78svh] lg:w-auto lg:shrink lg:items-center"
              >
                <figure data-on={on || undefined} className="group/q rounded-xl bg-white p-6 ring-1 ring-paper-line sm:p-7 lg:h-auto lg:rounded-none lg:bg-transparent lg:p-0 lg:py-10 lg:ring-0">
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
                    <p className="font-display text-[1.6rem] font-normal leading-[1.15] tracking-[-0.02em] text-navy-900 transition-colors duration-700 sm:text-[2.6rem] lg:text-[3.1rem] lg:text-[#737888] lg:group-data-[on]/q:text-navy-900">
                      <Rich text={`“${t.highlight}”`} strong="em-serif text-brand-700 transition-colors duration-700 lg:text-[#737888] lg:group-data-[on]/q:text-brand-700" />
                    </p>
                    <p id={`testi-full-${k}`} className={`mt-5 max-w-2xl text-[15px] leading-relaxed text-navy-700 sm:text-[16px] lg:mt-6 lg:block lg:text-[17px] ${opened.has(k) ? "" : "max-lg:hidden"}`}>{t.quote}</p>
                    <button
                      type="button"
                      aria-expanded={opened.has(k)}
                      aria-controls={`testi-full-${k}`}
                      onClick={() => toggle(k)}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full text-[15px] font-bold text-brand-700 lg:hidden"
                    >
                      {opened.has(k) ? ui.close : ui.readMore}
                      <ChevronDown size={18} aria-hidden className={`transition-transform duration-300 ${opened.has(k) ? "rotate-180" : ""}`} />
                    </button>
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
        {/* Ponsel/tablet: penanda posisi geser */}
        <div aria-hidden className="mt-4 flex justify-center gap-1.5 lg:hidden">
          {items.map((t, k) => (
            <span key={t.name} className={`h-1.5 rounded-full transition-all duration-300 ${k === slide ? "w-6 bg-gold-400" : "w-1.5 bg-navy-900/20"}`} />
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
