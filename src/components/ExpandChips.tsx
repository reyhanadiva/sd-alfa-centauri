"use client";

import { useState } from "react";

// Beberapa chip + tombol "+N lainnya" yang membuka sisanya, supaya kartu tetap rapi.
export function ExpandChips({ items, visible = 3 }: { items: readonly string[]; visible?: number }) {
  const [open, setOpen] = useState(false);
  const list = open ? items : items.slice(0, visible);
  const rest = items.length - visible;

  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {list.map((p) => (
        <li key={p} className="rounded-full bg-white/20 px-3.5 py-1.5 text-[14px] font-semibold ring-1 ring-white/30 backdrop-blur-md">
          {p}
        </li>
      ))}
      {rest > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="rounded-full bg-white px-3.5 py-1.5 text-[14px] font-bold text-navy-900 transition hover:bg-brand-50"
          >
            {open ? "Tutup" : `+${rest} lainnya`}
          </button>
        </li>
      )}
    </ul>
  );
}
