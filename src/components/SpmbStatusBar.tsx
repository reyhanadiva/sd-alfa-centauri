"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Timer } from "lucide-react";
import { spmb } from "@/lib/site";

type Left = { d: number; h: number; m: number; s: number } | null;

function diff(target: number, now: number): Left {
  const ms = target - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
// Dibulatkan per detik supaya snapshot stabil di antara tick.
const nowSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
// Di server dan saat hidrasi awal: null, jadi tidak terjadi mismatch.
const serverSnapshot = () => null;

export function SpmbStatusBar() {
  const target = new Date(spmb.closesAt).getTime();
  const now = useSyncExternalStore(subscribe, nowSnapshot, serverSnapshot);
  // undefined = belum dihitung
  const left: Left | undefined = now === null ? undefined : diff(target, now);

  const units = left
    ? [
        { v: String(left.d), l: "Hari" },
        { v: pad(left.h), l: "Jam" },
        { v: pad(left.m), l: "Menit" },
        { v: pad(left.s), l: "Detik" },
      ]
    : null;

  return (
    <div id="spmb" className="relative z-10 -mt-24 px-5 sm:px-8 lg:-mt-28">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-[2rem] border border-brand-100 bg-white p-5 shadow-lift sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600">
            <Timer size={24} aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-brand-600">
              SPMB {spmb.academicYear}
            </p>
            <p className="font-display text-xl font-extrabold leading-snug text-navy-900">
              {spmb.wave} sedang dibuka
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 lg:justify-center">
          {left === undefined ? (
            <div className="h-[3.75rem] w-64" aria-hidden />
          ) : units ? (
            <div role="timer" aria-label="Sisa waktu pendaftaran" className="flex gap-2.5">
              {units.map((u) => (
                <div
                  key={u.l}
                  className="min-w-[3.6rem] rounded-xl bg-brand-50 px-2 py-2 text-center"
                >
                  <p className="font-display text-2xl font-extrabold tabular-nums leading-none text-navy-900">
                    {u.v}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-navy-700/70">{u.l}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-display text-lg font-bold text-navy-900">
              Pendaftaran gelombang ini telah ditutup
            </p>
          )}
        </div>

        <a
          href={spmb.href}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-6 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-navy-800"
        >
          Lihat info SPMB
          <ArrowRight size={17} aria-hidden className="transition group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
}
