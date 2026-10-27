"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fasilitas } from "@/lib/site";
import { Photo } from "./Photo";

export function FasilitasCarousel() {
  const ref = useRef<HTMLUListElement>(null);
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    const card = el?.querySelector<HTMLElement>("li");
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-2 lg:absolute lg:-top-[4.25rem] lg:right-0 lg:mb-0">
        {[-1, 1].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => go(d as 1 | -1)}
            aria-label={d < 0 ? "Sebelumnya" : "Berikutnya"}
            className="grid size-11 place-items-center rounded-full bg-white text-navy-900 ring-1 ring-brand-200 transition hover:bg-brand-600 hover:text-white hover:ring-brand-600 active:scale-95"
          >
            {d < 0 ? <ChevronLeft size={20} aria-hidden /> : <ChevronRight size={20} aria-hidden />}
          </button>
        ))}
      </div>

      <ul
        ref={ref}
        aria-label="Fasilitas sekolah"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fasilitas.map((f) => (
          <li
            key={f.title}
            className="group relative isolate flex h-[min(23rem,calc(100svh-27rem))] min-h-[17rem] w-[17.5rem] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[1.75rem] p-5 text-white"
          >
            <Photo
              src={f.photo}
              alt={f.title}
              label={f.title}
              sizes="280px"
              className="-z-20 transition duration-700 group-hover:scale-105"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/30 to-transparent" />
            <h3 className="text-[1.3rem] font-semibold leading-tight !text-white">{f.title}</h3>
            <p className="mt-1 text-[14px] leading-snug text-white/85">{f.caption}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
