"use client";

import { Children, useRef, useState } from "react";

// Di ponsel: barisan yang digeser (snap, kartu berikutnya mengintip) dengan titik penanda.
// Di layar sm ke atas: wrapper hilang (`contents`), jadi `className` mengatur grid biasa.
// Gunakan `className` untuk layout sm+ (mis. "sm:grid sm:grid-cols-2"). Anak langsung = satu kartu.
export function SnapRail({
  children,
  className = "",
  basis = "84%",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  basis?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const items = Children.toArray(children);

  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 14;
    setIdx(Math.min(items.length - 1, Math.round(el.scrollLeft / w)));
  };

  return (
    <div className="reveal min-w-0">
      <div
        ref={ref}
        onScroll={onScroll}
        role="list"
        aria-label={label}
        className={`flex snap-x snap-mandatory gap-3.5 overflow-x-auto max-sm:-mx-5 max-sm:px-5 max-sm:pb-1 [scrollbar-width:none] sm:snap-none sm:overflow-visible [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {items.map((c, i) => (
          <div
            key={i}
            role="listitem"
            style={{ "--b": basis } as React.CSSProperties}
            className="flex snap-center max-sm:w-[var(--b)] max-sm:shrink-0 sm:contents [&>*]:w-full [&>*]:min-w-0"
          >
            {c}
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-3 flex justify-center gap-1.5 sm:hidden">
        {items.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-5 bg-brand-600" : "w-1.5 bg-brand-200"}`} />
        ))}
      </div>
    </div>
  );
}
