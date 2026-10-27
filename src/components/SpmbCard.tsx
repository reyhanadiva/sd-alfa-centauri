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

// Kartu kaca kecil untuk hero: status SPMB + hitung mundur. Seluruh kartu adalah tautan.
export function SpmbCard({ className = "" }: { className?: string }) {
  const now = useSyncExternalStore(subscribe, nowSnapshot, serverSnapshot);
  const target = new Date(spmb.closesAt).getTime();

  let body: React.ReactNode;
  if (now === null) {
    body = <div className="h-[4.25rem]" aria-hidden />;
  } else if (target - now <= 0) {
    body = <p className="font-display text-xl font-bold leading-snug">Gelombang ini telah ditutup</p>;
  } else {
    const s = Math.floor((target - now) / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    body = (
      <div role="timer" aria-label="Sisa waktu pendaftaran">
        <p className="font-display text-[2.6rem] font-extrabold leading-none tabular-nums sm:text-[3.25rem]">
          {d}
          <span className="ml-1.5 text-base font-bold text-white/80 sm:text-lg">hari</span>
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-white/75">
          {pad(h)}:{pad(m)}:{pad(sec)}
        </p>
      </div>
    );
  }

  return (
    <a
      href={spmb.href}
      className={`group relative flex flex-col justify-between gap-4 rounded-3xl bg-white/[0.14] p-4 text-white sm:gap-5 sm:p-5 ring-1 ring-white/25 backdrop-blur-xl transition hover:bg-white/[0.2] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[14px] font-bold leading-snug">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-pulse-dot rounded-full bg-green-400" />
            <span className="relative inline-flex size-2.5 rounded-full bg-green-400" />
          </span>
          SPMB {spmb.academicYear}
          <span className="hidden sm:inline">dibuka</span>
        </p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-navy-900 transition group-hover:rotate-12">
          <ArrowUpRight size={16} aria-hidden />
        </span>
      </div>
      {body}
    </a>
  );
}
