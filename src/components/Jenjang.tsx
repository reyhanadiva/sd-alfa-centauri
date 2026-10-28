import { ArrowUpRight } from "lucide-react";
import { jaringan } from "@/lib/site";
import { Star } from "./Doodles";

// Jalur belajar dalam satu keluarga Alfa Centauri: TK → SD (di sini) → SMP → SMA. Garis putus-putus bergerak.
// Hanya memuat unit yang tautannya diberikan (jaringan di site.ts); tanpa klaim tambahan.
const step = (label: string) => jaringan.find((j) => j.label.startsWith(label));
const steps = [
  { jenjang: "TK", name: "TK Alfa Centauri", href: step("TK")?.href },
  { jenjang: "SD", name: "SD Alfa Centauri", here: true },
  { jenjang: "SMP", name: "SMP Alfa Centauri", href: step("SMP")?.href },
  { jenjang: "SMA", name: "SMA Alfa Centauri", href: step("SMA")?.href },
];
const lain = ["Yayasan", "English Now", "LCDU"].map(step).filter(Boolean) as { label: string; href: string }[];

export function Jenjang() {
  return (
    <section id="jenjang" aria-labelledby="jenjang-title" className="px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[78rem] text-center">
        <h2 id="jenjang-title" className="reveal text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]">
          Satu keluarga, <span className="em-serif text-brand-600">satu perjalanan</span>
        </h2>
        <p className="reveal mx-auto mt-3 max-w-xl text-[17px] text-navy-700">Alfa Centauri hadir di jenjang TK, SD, SMP, hingga SMA.</p>

        <ol className="relative mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {/* garis jalur (desktop) */}
          <svg aria-hidden viewBox="0 0 100 2" preserveAspectRatio="none" className="absolute left-[12%] right-[12%] top-8 hidden h-1 w-[76%] sm:block">
            <line x1="0" y1="1" x2="100" y2="1" stroke="#6fa2ff" strokeWidth="2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="dash-run" />
          </svg>
          {steps.map((s) => {
            const body = (
              <>
                <span className={`relative z-10 mx-auto grid size-16 place-items-center rounded-full text-[15px] font-bold transition ${s.here ? "bg-brand-600 text-white shadow-lift ring-4 ring-brand-200" : "bg-white text-brand-700 ring-2 ring-brand-200 group-hover:bg-brand-600 group-hover:text-white"}`}>
                  {s.here ? <Star className="size-8" /> : s.jenjang}
                </span>
                <span className="mt-3 block text-[16px] font-semibold text-navy-900">{s.name}</span>
                <span className="mt-0.5 block text-[13.5px] text-navy-700/75">
                  {s.here ? "Anda di sini" : <span className="inline-flex items-center gap-1 text-brand-700">Kunjungi <ArrowUpRight size={13} aria-hidden /></span>}
                </span>
              </>
            );
            return (
              <li key={s.jenjang} className="reveal">
                {s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="group block">{body}</a>
                ) : (
                  <div>{body}</div>
                )}
              </li>
            );
          })}
        </ol>

        <p className="reveal mt-10 flex flex-wrap items-center justify-center gap-2.5 text-[14px] text-navy-700/80">
          Lembaga lain:
          {lain.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-brand-50 px-3.5 py-1.5 font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">
              {l.label.split(" (")[0]}
            </a>
          ))}
        </p>
      </div>
    </section>
  );
}
