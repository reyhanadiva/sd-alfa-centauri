"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { getT, type Lang } from "@/lib/i18n";
import { Photo } from "./Photo";
import { Words } from "./Words";

// Fasilitas: satu foto besar + daftar pilihan. Berganti otomatis tiap 5 detik, ada tombol jeda; berhenti sendiri setelah pengunjung memilih.
// Isi: lihat `fasilitas` di site.ts (hanya yang tertulis di website lama).


type F = ReturnType<typeof getT>["fasilitas"];

const H2 = ({ f, className = "", light = false, id = "fasilitas-title" }: { f: F; className?: string; light?: boolean; id?: string }) => (
  <h2 id={id} className={`text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-[3.75rem] ${light ? "!text-white" : ""} ${className}`}>
    <Words text={f.title[0] + f.title[1]} />
  </h2>
);

/* Baris ringkas: hanya yang tertulis "tiap kelas" di website lama */
function PerKelas({ f, dark = false, className = "" }: { f: F; dark?: boolean; className?: string }) {
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-4 ${dark ? "border-white/25" : "border-navy-900/10"} ${className}`}>
      <p className={`text-[14px] font-semibold ${dark ? "text-white/80" : "text-navy-700"}`}>{f.perKelasLabel}</p>
      <p className={`text-[16px] font-semibold ${dark ? "text-white" : "text-navy-900"}`}>{f.perKelas.join("  ·  ")}</p>
    </div>
  );
}

/* Tumpukan foto yang berganti dengan crossfade + zoom */
function Stack({ f, i, sizes = "100vw" }: { f: F; i: number; sizes?: string }) {
  return (
    <>
      {f.items.map((x, k) => (
        <div
          key={x.title}
          aria-hidden={k !== i}
          className={`absolute inset-0 transition-[opacity,transform] duration-[1200ms] ease-out ${k === i ? "scale-100 opacity-100" : "scale-[1.1] opacity-0"}`}
        >
          <Photo src={x.photo} alt={x.title} label={x.title} sizes={sizes} />
        </div>
      ))}
    </>
  );
}

/* ---------- Foto besar + daftar pilihan ---------- */
export function FasilitasDaftar({ lang }: { lang: Lang }) {
  const fas = getT(lang).fasilitas;
  const fasilitas = fas.items;
  const N = fasilitas.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const running = !paused && !reduced;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((x) => (x + 1) % N), 5000);
    return () => clearTimeout(t);
  }, [i, running, N]);
  const f = fasilitas[i];

  // Ponsel: chip aktif digulir ke tengah barisnya (tanpa menggulir halaman)
  const chips = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const row = chips.current;
    const el = row?.children[i] as HTMLElement | undefined;
    if (row && el && row.scrollWidth > row.clientWidth) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [i]);

  return (
    <section id="fasilitas" aria-labelledby="fasilitas-title" className="px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-[78rem]">
        <H2 f={fas} />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_21rem] lg:gap-5">
          <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[1.25rem] text-white shadow-lift sm:aspect-[16/9] lg:aspect-auto lg:h-[min(30rem,calc(100svh-14rem))]">
            <Stack f={fas} i={i} sizes="(min-width: 1024px) 760px, 94vw" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-navy-900/10" />
            <div aria-live="off" key={i} className="fade-in absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-7">
              <h3 className="text-2xl font-semibold !text-white sm:text-4xl">{f.title}</h3>
              {f.caption && <p className="mt-1 max-w-md text-[15px] leading-snug text-white/90 sm:text-[16px]">{f.caption}</p>}
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={lang === "en" ? (running ? "Pause slideshow" : "Play slideshow") : running ? "Jeda tampilan otomatis" : "Putar tampilan otomatis"}
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-navy-900/60 text-white backdrop-blur transition hover:bg-navy-900"
            >
              {running ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            </button>
          </div>

          <ul ref={chips} aria-label={fas.listAria} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 lg:grid lg:auto-rows-fr lg:gap-1.5 [&::-webkit-scrollbar]:hidden">
            {fasilitas.map((x, k) => (
              <li key={x.title} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => { setI(k); setPaused(true); }}
                  aria-current={k === i}
                  className={`relative flex min-h-11 w-full items-center overflow-hidden rounded-full px-4 py-2.5 text-left text-[15px] font-semibold transition-colors duration-300 lg:rounded-2xl lg:px-5 ${k === i ? "bg-navy-900 text-white" : "bg-brand-50 text-navy-800 ring-1 ring-brand-100 hover:bg-brand-100"}`}
                >
                  {x.title}
                  {k === i && running && <span key={i} className="bar-fill absolute inset-x-0 bottom-0 h-0.5 bg-brand-400" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <PerKelas f={fas} className="mt-6" />
      </div>
    </section>
  );
}
