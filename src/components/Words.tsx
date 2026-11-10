"use client";

import { useEffect, useRef } from "react";

// Memecah judul menjadi kata; saat judul masuk layar, kata naik bergiliran (lihat `.rise` di globals.css).
// Pakai IntersectionObserver supaya jalan di semua browser. Tanpa JS, atau judul sudah terlihat saat halaman
// dibuka, atau "reduce motion": judul tampil biasa tanpa animasi.
export function Words({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // sudah terlihat: jangan disembunyikan
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
  const words = text.trim().split(/\s+/);
  return (
    <span ref={ref} className="rise">
      {words.map((w, i) => (
        <span key={i}>
          <span className="w" style={{ "--i": i } as React.CSSProperties}>{w}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
