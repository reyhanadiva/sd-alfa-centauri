"use client";

import { useEffect, useRef } from "react";
import { Brain, ChevronLeft, ChevronRight, HeartPulse } from "lucide-react";
import { lsuCards } from "@/lib/site";
import { Photo } from "./Photo";

const icons = { psikolog: Brain, terapi: HeartPulse } as const;

// Strip kartu geser bergaya galeri. Kartu di tengah tegak, kartu di tepi miring dan memudar
// (CSS scroll-driven `.lsu-card`; browser tanpa dukungan menampilkan kartu datar biasa).
export function LsuStrip() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const items = el.querySelectorAll<HTMLElement>("[data-card]");
    const target = items[Math.min(2, items.length - 1)];
    if (card && target) {
      el.scrollLeft = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    }
  }, []);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    const card = el?.querySelector<HTMLElement>("[data-card]");
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={ref}
        role="region"
        aria-label="Layanan Learning Support Unit"
        tabIndex={0}
        className="lsu-strip flex snap-x snap-mandatory gap-5 overflow-x-auto px-[calc(50%-8.5rem)] py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {lsuCards.map((c) => {
          const Icon = c.icon ? icons[c.icon] : null;
          return (
            <article
              key={c.title}
              data-card
              className={`lsu-card relative isolate flex h-[min(26rem,calc(100svh-24rem))] min-h-[19rem] w-[17rem] shrink-0 snap-center flex-col justify-end overflow-hidden rounded-[1.75rem] p-5 text-white ${
                c.tone === "sky" ? "bg-gradient-to-b from-sky to-brand-600" : "bg-gradient-to-b from-brand-500 to-brand-700"
              }`}
            >
              {c.photo ? (
                <>
                  <Photo src={c.photo} alt={c.title} label={c.title} sizes="272px" className="-z-20" />
                  <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/25 to-transparent" />
                </>
              ) : (
                Icon && (
                  <span aria-hidden className="absolute left-5 top-5 grid size-16 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
                    <Icon size={30} />
                  </span>
                )
              )}
              <h3 className="text-[1.4rem] font-semibold leading-tight !text-white">{c.title}</h3>
              <p className="mt-1.5 text-[15px] leading-snug text-white/85">{c.caption}</p>
            </article>
          );
        })}
      </div>

      <div className="flex justify-center gap-2.5">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Kartu sebelumnya"
          className="grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Kartu berikutnya"
          className="grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
