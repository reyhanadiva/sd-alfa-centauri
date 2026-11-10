"use client";

import { useRef } from "react";

// Pembungkus "magnetik": isi bergeser sedikit mengikuti kursor saat didekati, lalu kembali pelan.
// Hanya untuk pointer halus (mouse/trackpad); di layar sentuh dan "reduce motion" diam saja.
export function Magnetic({ children, strength = 0.28, className = "" }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const ok = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !ok()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transition = "translate 120ms linear";
    el.style.translate = `${x}px ${y}px`;
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "translate 600ms cubic-bezier(0.2, 0.8, 0.2, 1)";
    el.style.translate = "0 0";
  };

  return (
    // Area tangkap sedikit lebih besar dari tombol supaya tarikan terasa sebelum kursor menyentuhnya
    <span onPointerMove={move} onPointerLeave={leave} className={`-m-4 inline-block p-4 ${className}`}>
      <span ref={ref} className="inline-block will-change-transform">
        {children}
      </span>
    </span>
  );
}
