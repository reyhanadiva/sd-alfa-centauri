"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { waLink } from "@/lib/site";

// Kartu bergaya form: ketik pertanyaan, lalu terbuka WhatsApp admin dengan pesan terisi.
export function AskAdmin() {
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = q.trim()
          ? `Halo SD Alfa Centauri, saya ingin bertanya: ${q.trim()}`
          : undefined;
        window.open(waLink(text), "_blank", "noopener,noreferrer");
      }}
      className="mt-auto"
    >
      <label htmlFor="ask-admin" className="sr-only">
        Pertanyaan untuk admin
      </label>
      <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-lift">
        <input
          id="ask-admin"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tulis pertanyaanmu…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-navy-900 outline-none placeholder:text-navy-700/50"
        />
        <button
          type="submit"
          aria-label="Kirim lewat WhatsApp"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </div>
    </form>
  );
}
