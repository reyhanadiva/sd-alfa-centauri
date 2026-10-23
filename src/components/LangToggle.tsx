"use client";

import { useState } from "react";

// Baru tampilan. Terjemahan EN belum dipasang; tombol hanya menyimpan pilihan di state.
export function LangToggle() {
  const [lang, setLang] = useState<"id" | "en">("id");

  return (
    <div
      role="group"
      aria-label="Bahasa"
      className="flex items-center rounded-full bg-white/10 p-0.5 text-[12px] font-bold"
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-0.5 uppercase transition ${
            lang === l ? "bg-white text-navy-900" : "text-white/80 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
