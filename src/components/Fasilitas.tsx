"use client";

import { useEffect, useState } from "react";
import { fasilitas, perKelas } from "@/lib/site";
import { Photo } from "./Photo";

// Fasilitas: latar foto penuh + daftar bernomor.
//   FasilitasDaftar = latar foto penuh + daftar bernomor, berganti otomatis tiap 5 detik
// Isi: lihat `fasilitas` di site.ts (hanya yang tertulis di website lama).

const pad = (n: number) => String(n).padStart(2, "0");
const N = fasilitas.length;

const H2 = ({ className = "", light = false }: { className?: string; light?: boolean }) => (
  <h2 id="fasilitas-title" className={`text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem] ${light ? "!text-white" : ""} ${className}`}>
    Ruang belajar yang{" "}
    <span className={`em-serif ${light ? "text-brand-200" : "text-brand-600"}`}>lengkap</span>
  </h2>
);

/* Baris ringkas: hanya yang tertulis "tiap kelas" di website lama */
function PerKelas({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-4 ${dark ? "border-white/25" : "border-navy-900/10"} ${className}`}>
      <p className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-white/60" : "text-navy-700/60"}`}>Di setiap kelas</p>
      <p className={`text-[16px] font-semibold ${dark ? "text-white" : "text-navy-900"}`}>{perKelas.join("  ·  ")}</p>
    </div>
  );
}

/* Tumpukan foto yang berganti dengan crossfade + zoom */
function Stack({ i, sizes = "100vw" }: { i: number; sizes?: string }) {
  return (
    <>
      {fasilitas.map((x, k) => (
        <div
          key={x.title}
          aria-hidden={k !== i}
          className={`absolute inset-0 transition-[opacity,transform] duration-[1200ms] ease-out ${k === i ? "scale-100 opacity-100" : "scale-[1.1] opacity-0"}`}
        >
          <Photo src={x.photo} alt={x.title} label={x.title} sizes={sizes} />
        </div>
      ))}
    </>
  );
}

/* ---------- Daftar bernomor ---------- */
export function FasilitasDaftar() {
  const [i, setI] = useState(0);
  // Selalu berjalan: 5 detik per fasilitas (garis progres di baris aktif), tidak berhenti karena hover.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % N), 5000);
    return () => clearTimeout(t);
  }, [i]);
  const f = fasilitas[i];

  return (
    <section
      id="fasilitas"
      aria-labelledby="fasilitas-title"
      className="relative isolate overflow-hidden text-white lg:h-[calc(100svh-5rem)] lg:min-h-[44rem]"
    >
      <div className="absolute inset-0 -z-20"><Stack i={i} /></div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy-900/55" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/80 via-navy-900/20 to-navy-900/30" />

      <div className="mx-auto grid h-full w-full max-w-[78rem] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_22rem] lg:items-center lg:py-6">
        <div className="flex h-full flex-col justify-between gap-8 lg:py-4">
          <H2 light className="max-w-xl" />
          <div>
            <p key={`n${i}`} className="fade-in font-display text-[6rem] font-semibold leading-none tracking-[-0.05em] text-white/35 sm:text-[8rem]">{pad(i + 1)}</p>
            <div key={i} className="fade-in">
              <h3 className="mt-1 text-3xl font-semibold !text-white sm:text-4xl">{f.title}</h3>
              <p className="mt-1.5 max-w-sm text-[16px] text-white/80">{f.caption}</p>
            </div>
            <PerKelas dark className="mt-7 max-w-2xl" />
          </div>
        </div>

        <ul aria-label="Daftar fasilitas" className="grid gap-2">
          {fasilitas.map((x, k) => (
            <li key={x.title}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-current={k === i}
                className={`relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-2.5 text-left transition ${k === i ? "bg-white text-navy-900" : "bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-white/20"}`}
              >
                <span className={`font-display text-[1.6rem] font-semibold leading-none tabular-nums ${k === i ? "text-brand-600" : "text-white/55"}`}>{pad(k + 1)}</span>
                <span className="text-[16px] font-semibold">{x.title}</span>
                {k === i && <span key={i} className="bar-fill absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
