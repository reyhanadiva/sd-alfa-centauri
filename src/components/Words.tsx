"use client";

import { useEffect, useRef } from "react";
import { split } from "./split";

// Animasi "kabur lalu jelas" saat teks masuk layar (lihat `.rise` dan `.blur-in` di globals.css).
// Dipicu IntersectionObserver supaya jalan di semua browser. Tanpa JS, atau sudah terlihat saat halaman dibuka,
// atau "reduce motion": tampil biasa tanpa animasi.
function useArm<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0) return; // sudah terlihat: jangan disembunyikan
    el.dataset.armed = "";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.in = "";
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Judul: kata muncul bergiliran. */
export function Words({ text }: { text: string }) {
  const ref = useArm<HTMLSpanElement>();
  return <span ref={ref} className="rise">{split(text)}</span>;
}

/** Pembungkus bebas: semua `split(...)` di dalamnya dipicu bersamaan saat blok masuk layar. */
export function Rise({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useArm<HTMLSpanElement>();
  return <span ref={ref} className={`rise ${className}`}>{children}</span>;
}

/** Blok (video, kartu): muncul dari kabur menjadi jelas, dengan jeda `delay` ms. */
export function BlurIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useArm<HTMLDivElement>();
  return (
    <div ref={ref} className={`blur-in ${className}`} style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
