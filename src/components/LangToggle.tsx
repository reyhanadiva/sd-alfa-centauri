"use client";

import { useState } from "react";

// Baru tampilan. Terjemahan EN belum dipasang; tombol hanya menyimpan pilihan di state.
export function LangToggle({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<"id" | "en">("id");

  return (
    <div
      role="group"
      aria-label="Bahasa"
      className={`flex items-center rounded-full bg-brand-50 p-0.5 text-[12px] font-bold ${className}`}
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            lang === l ? "bg-white text-navy-900 shadow-sm" : "text-navy-700/70 hover:text-navy-900"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
