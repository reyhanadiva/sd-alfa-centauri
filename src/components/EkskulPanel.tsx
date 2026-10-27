"use client";

import { useState } from "react";
import { Image as ImageIcon, LayoutGrid } from "lucide-react";
import { ekskul } from "@/lib/site";
import { Icon } from "./icons";
import { Photo } from "./Photo";

// Ekstrakurikuler dengan dua tampilan: kisi ikon, atau kartu foto + teks di bawahnya (geser).
// Foto: isi `photo` di `ekskul` (site.ts) per kegiatan.
export function EkskulPanel() {
  const [mode, setMode] = useState<"grid" | "foto">("grid");

  return (
    <div id="ekskul" className="reveal flex flex-col rounded-[2rem] bg-navy-900 p-6 text-white sm:p-7">
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
        <ul
          key="foto"
          aria-label="Ekstrakurikuler"
          className="fade-in mt-5 flex min-h-[16rem] flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ekskul.map((e) => (
            <li key={e.label} className="flex w-[9.25rem] shrink-0 snap-start flex-col gap-2.5">
              <div className="relative flex-1 overflow-hidden rounded-2xl ring-1 ring-white/15">
                <Photo src={e.photo} alt={e.label} label={e.label} sizes="150px" />
              </div>
              <p className="text-[14px] font-semibold leading-tight">{e.label}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
