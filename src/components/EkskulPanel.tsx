"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, LayoutGrid } from "lucide-react";
import { ekskul } from "@/lib/site";
import { Icon } from "./icons";
import { Photo } from "./Photo";

// Ekstrakurikuler dengan dua tampilan: kisi ikon, atau satu foto besar per kegiatan yang bisa digeser.
// Foto: isi `photo` di `ekskul` (site.ts) per kegiatan.
export function EkskulPanel() {
  const [mode, setMode] = useState<"grid" | "foto">("grid");
  const [idx, setIdx] = useState(0);
  const rail = useRef<HTMLUListElement>(null);

  const go = (i: number) => {
    const el = rail.current;
    if (!el) return;
    const n = (i + ekskul.length) % ekskul.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = rail.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div id="ekskul" className="reveal flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] bg-navy-900 p-6 text-white sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold !text-white">Ekstrakurikuler</h3>
          <p className="mt-1 text-[15px] text-white/65">Beragam kegiatan sesuai minat ananda.</p>
        </div>
        <div role="group" aria-label="Tampilan" className="flex shrink-0 rounded-full bg-white/10 p-1">
          {(
            [
              ["grid", "Kisi", LayoutGrid],
              ["foto", "Foto", ImageIcon],
            ] as const
          ).map(([m, label, I]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              aria-label={`Tampilan ${label}`}
              className={`grid size-9 place-items-center rounded-full transition ${
                mode === m ? "bg-white text-navy-900" : "text-white/70 hover:text-white"
              }`}
            >
              <I size={16} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      {mode === "grid" ? (
        <ul key="grid" className="fade-in mt-5 grid flex-1 grid-cols-3 gap-2.5">
          {ekskul.map((e) => (
            <li
              key={e.label}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.07] p-2 py-4 text-center ring-1 ring-white/15 transition hover:bg-white/15"
            >
              <span className="grid size-10 place-items-center rounded-full bg-white text-brand-600">
                <Icon name={e.icon} size={19} />
              </span>
              <span className="text-[13px] font-semibold leading-tight">{e.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div key="foto" className="fade-in relative mt-5 h-[20rem] min-h-0 lg:h-auto lg:flex-1">
          {/* Satu foto per geser, selebar kotak */}
          <ul
            ref={rail}
            onScroll={onScroll}
            aria-label="Ekstrakurikuler"
            className="flex size-full snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ekskul.map((e) => (
              <li key={e.label} className="relative isolate size-full shrink-0 snap-center">
                <Photo src={e.photo} alt={e.label} label={e.label} sizes="(min-width:1024px) 460px, 90vw" className="-z-20" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
                <p className="absolute bottom-4 left-4 rounded-full bg-navy-900/65 px-4 py-1.5 text-lg font-semibold backdrop-blur">{e.label}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => go(idx - 1)} aria-label="Sebelumnya" className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-900 shadow-lift transition hover:bg-white">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" onClick={() => go(idx + 1)} aria-label="Berikutnya" className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-900 shadow-lift transition hover:bg-white">
            <ChevronRight size={20} aria-hidden />
          </button>
          <p className="absolute bottom-4 right-4 rounded-full bg-navy-900/70 px-3 py-1 text-[12.5px] font-semibold tabular-nums backdrop-blur">
            {idx + 1} / {ekskul.length}
          </p>
        </div>
      )}
    </div>
  );
}
