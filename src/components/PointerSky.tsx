"use client";

import { useRef } from "react";

// Menyimpan posisi kursor sebagai variabel CSS (--px, --py: -1..1) di elemen ini, supaya lapisan di dalamnya
// bisa bergeser dengan kedalaman berbeda (parallax) cukup lewat CSS. Hanya mouse; sentuh dan reduce-motion diam.
export function PointerSky({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", (((x - r.left) / r.width - 0.5) * 2).toFixed(3));
      el.style.setProperty("--py", (((y - r.top) / r.height - 0.5) * 2).toFixed(3));
    });
  };
  const leave = () => {
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={className}>
      {children}
    </div>
  );
}
