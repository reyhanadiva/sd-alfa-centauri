"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Beberapa chip + tombol "+N lainnya". Sisanya muncul dengan transisi halus (bukan tiba-tiba).
export function ExpandChips({ items, visible = 3 }: { items: readonly string[]; visible?: number }) {
  const [open, setOpen] = useState(false);
  const rest = items.length - visible;

  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {items.slice(0, visible).map((p) => (
        <Chip key={p}>{p}</Chip>
      ))}
      {items.slice(visible).map((p, i) => (
        <li
          key={p}
          aria-hidden={!open}
          style={{ transitionDelay: open ? `${i * 70}ms` : "0ms" }}
          className={`origin-left whitespace-nowrap rounded-full bg-white/20 text-[14px] font-semibold ring-1 ring-white/30 backdrop-blur-md transition-all duration-500 ease-out ${
            open ? "max-w-[18rem] scale-100 px-3.5 py-1.5 opacity-100" : "pointer-events-none -ml-2 max-w-0 scale-75 overflow-hidden px-0 py-1.5 opacity-0 !ring-0"
          }`}
        >
          {p}
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[14px] font-bold text-navy-900 shadow-lg shadow-navy-900/20 transition hover:scale-105 hover:bg-brand-50 active:scale-95"
        >
          {open ? "Tutup" : `+${rest} lainnya`}
          <ChevronDown size={15} aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </li>
    </ul>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full bg-white/20 px-3.5 py-1.5 text-[14px] font-semibold ring-1 ring-white/30 backdrop-blur-md">
      {children}
    </li>
  );
}
