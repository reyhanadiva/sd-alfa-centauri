"use client";

import { useSyncExternalStore } from "react";
import { ArrowUpRight } from "lucide-react";
import { spmb } from "@/lib/site";

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
// Dibulatkan per detik supaya snapshot stabil di antara tick.
const nowSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
// Server dan hidrasi awal: null, jadi tidak ada mismatch.
const serverSnapshot = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

// Chip kaca kecil untuk hero: status SPMB + hitung mundur satu baris. Seluruh chip adalah tautan.
export function SpmbCard({ className = "" }: { className?: string }) {
  const now = useSyncExternalStore(subscribe, nowSnapshot, serverSnapshot);
  const target = new Date(spmb.closesAt).getTime();

  let sub: React.ReactNode = <span aria-hidden className="inline-block h-4" />;
  if (now !== null) {
    if (target - now <= 0) {
      sub = "Gelombang ini telah ditutup";
    } else {
      const s = Math.floor((target - now) / 1000);
      sub = (
        <span role="timer" aria-label="Sisa waktu pendaftaran" className="tabular-nums">
          Tutup dalam {Math.floor(s / 86400)} hari {pad(Math.floor((s % 86400) / 3600))}:
          {pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
        </span>
      );
    }
  }

  return (
    <a
      href={spmb.href}
      className={`group flex items-center gap-3.5 rounded-2xl bg-white/[0.13] px-4 py-3 text-white ring-1 ring-white/25 backdrop-blur-xl transition hover:bg-white/[0.2] ${className}`}
    >
      <span className="relative flex size-2.5 shrink-0">
        <span className="absolute inline-flex size-full animate-pulse-dot rounded-full bg-green-400" />
        <span className="relative inline-flex size-2.5 rounded-full bg-green-400" />
      </span>
      <div className="min-w-0 flex-1 text-[13px] leading-snug">
        <p className="font-bold">SPMB {spmb.academicYear} dibuka</p>
        <p className="text-white/75">{sub}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-navy-900 transition group-hover:rotate-12">
        <ArrowUpRight size={16} aria-hidden />
      </span>
    </a>
  );
}
