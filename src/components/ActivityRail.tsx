"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

// Kegiatan pendampingan: berjalan pelan sendiri, tapi bisa digeser/diseret kapan saja.
// Berhenti saat disentuh, di-hover, atau difokus; lanjut 2,5 detik setelah pengguna berhenti.
// Daftar digandakan agar putarannya tanpa putus. "Reduce motion": tidak otomatis, hanya bisa digeser.
export function ActivityRail({ items }: { items: readonly { icon: string; label: string }[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const loop = [...items, ...items];

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let paused = false;
    let resume: ReturnType<typeof setTimeout> | undefined;
    let last = performance.now();
    let pos = el.scrollLeft;

    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (!paused) {
        pos += dt * 0.035; // piksel per milidetik (pelan)
        const half = el.scrollWidth / 2;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      } else {
        pos = el.scrollLeft; // ikuti geseran pengguna
      }
      raf = requestAnimationFrame(tick);
    };
    const pause = () => { paused = true; clearTimeout(resume); };
    const later = () => { clearTimeout(resume); resume = setTimeout(() => { paused = false; last = performance.now(); }, 2500); };
    const onScroll = () => {
      // loncat mulus saat pengguna menggeser melewati ujung daftar ganda
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      else if (el.scrollLeft <= 0 && paused) el.scrollLeft += half;
    };

    el.addEventListener("pointerdown", pause);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", () => { pause(); later(); }, { passive: true });
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", later);
    el.addEventListener("touchend", later, { passive: true });
    el.addEventListener("pointerup", later);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", later);
    el.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resume);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", later);
      el.removeEventListener("touchend", later);
      el.removeEventListener("pointerup", later);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", later);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul ref={ref} aria-label="Kegiatan pendampingan" className="flex gap-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loop.map((a, i) => (
          <li
            key={i}
            aria-hidden={i >= items.length ? true : undefined}
            className="flex h-[8.5rem] w-[12.5rem] shrink-0 flex-col items-center justify-center gap-3 rounded-3xl bg-white/[0.07] p-5 text-center ring-1 ring-white/15"
          >
            <span className="grid size-11 place-items-center rounded-full bg-white text-brand-600">
              <Icon name={a.icon} size={21} />
            </span>
            <span className="text-[16px] font-semibold leading-snug text-white">{a.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
