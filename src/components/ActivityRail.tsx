"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

const COPIES = 6; // daftar diulang agar putarannya tanpa ujung, bahkan di layar sangat lebar

// Kegiatan pendampingan: berjalan pelan tanpa henti (loop tak berujung), bisa diseret dengan mouse atau digeser
// dengan jari/trackpad. Tidak berhenti karena hover; hanya jeda saat disentuh/diseret dan lanjut ±1 detik kemudian.
// "Reduce motion": tidak otomatis, tetap bisa digeser.
export function ActivityRail({ items, label }: { items: readonly { icon: string; label: string }[]; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const loop = Array.from({ length: COPIES }, () => items).flat();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setW = () => el.scrollWidth / COPIES; // lebar satu salinan daftar
    const wrap = () => {
      const w = setW();
      if (el.scrollLeft >= 2 * w) el.scrollLeft -= w;
      else if (el.scrollLeft < w) el.scrollLeft += w;
    };
    el.scrollLeft = setW();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    let holding = false; // jari/mouse sedang menekan
    let touched = performance.now(); // terakhir kali pengguna berinteraksi

    // Seret dengan mouse
    let drag: { x: number; left: number; id: number } | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: el.scrollLeft, id: e.pointerId };
      holding = true;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      el.scrollLeft = drag.left - (e.clientX - drag.x);
      wrap();
      drag.left = el.scrollLeft + (e.clientX - drag.x); // pertahankan titik pegang setelah loncat
      touched = performance.now();
    };
    const up = () => {
      if (!drag) return;
      try { el.releasePointerCapture(drag.id); } catch {}
      drag = null;
      holding = false;
      el.style.cursor = "";
      touched = performance.now();
    };
    // Sentuh / roda / trackpad
    const hold = () => { holding = true; touched = performance.now(); };
    const release = () => { holding = false; touched = performance.now(); };
    const poke = () => { touched = performance.now(); };
    const onScroll = () => {
      wrap();
      // geseran yang bukan dari kita (momentum, trackpad) juga dihitung sebagai interaksi
      if (Math.abs(el.scrollLeft - pos) > 2) touched = performance.now();
    };

    const tick = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      const idle = !holding && t - touched > 1000;
      if (idle && !reduce) {
        pos += dt * 0.04; // px per ms
        el.scrollLeft = pos;
        wrap();
        pos = el.scrollLeft;
      } else {
        pos = el.scrollLeft; // ikuti geseran pengguna
      }
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", release, { passive: true });
    el.addEventListener("touchcancel", release, { passive: true });
    el.addEventListener("wheel", poke, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", release);
      el.removeEventListener("touchcancel", release);
      el.removeEventListener("wheel", poke);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul
        ref={ref}
        aria-label={label}
        className="flex cursor-grab select-none gap-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
