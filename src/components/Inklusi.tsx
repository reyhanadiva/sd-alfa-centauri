import { ArrowRight, Check, HeartHandshake, MessageCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { inklusi, waLink } from "@/lib/site";
import { Photo } from "./Photo";
import { Plus, Star } from "./Doodles";

// Tepi atas/bawah melengkung (bukan kotak) supaya peralihan antar section terasa mengalir.
function Curve({ edge }: { edge: "top" | "bottom" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 h-8 w-full sm:h-14 ${
        edge === "top"
          ? "top-0 -translate-y-[99%] text-brand-600"
          : "bottom-0 translate-y-[99%] rotate-180 text-brand-700"
      }`}
    >
      <path d="M0 56 Q720 -24 1440 56 Z" fill="currentColor" />
    </svg>
  );
}

export function Inklusi() {
  return (
    <section
      id="inklusi"
      aria-labelledby="inklusi-title"
      className="relative isolate mt-10 bg-gradient-to-br from-brand-600 to-brand-700 text-white lg:mt-16"
    >
      <Curve edge="top" />
      <Curve edge="bottom" />

      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <Star className="absolute -right-16 -top-10 size-72 rotate-12 text-white/[0.06]" />
        <Star className="absolute -bottom-20 -left-16 size-60 -rotate-12 text-white/[0.05]" />
        <Plus className="absolute left-[47%] top-14 hidden size-6 text-white/25 lg:block" />
        <div className="absolute inset-0 opacity-[0.1] [background-image:radial-gradient(white_1.2px,transparent_1.2px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-10 lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-10">
        {/* Teks */}
        <div className="reveal">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-bold ring-1 ring-white/25">
            <ShieldCheck size={16} aria-hidden /> Learning Support Unit (LSU)
          </p>

          <h2
            id="inklusi-title"
            className="mt-5 font-display text-4xl font-extrabold leading-[1.06] text-white sm:text-5xl lg:text-[3.1rem]"
          >
            Setiap anak belajar <span className="hl-white">dengan caranya.</span>
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 lg:text-[17px]">
            Lingkungan belajar yang suportif bagi semua siswa, termasuk anak yang membutuhkan
            pendampingan khusus, dengan pendampingan akademik dan perilaku sesuai kebutuhannya.
          </p>

          <ul className="mt-6 space-y-2.5">
            {inklusi.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[17px] font-semibold">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-brand-600">
                  <Check size={14} strokeWidth={3.5} aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>

          {/* Alur singkat dalam satu baris */}
          <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-[14px] font-semibold text-white/90">
            {inklusi.steps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-2">
                {i > 0 && <ArrowRight size={14} aria-hidden className="text-white/50" />}
                <span className="grid size-5 place-items-center rounded-full bg-white/20 text-[11px] font-extrabold">
                  {i + 1}
                </span>
                {s.title}
              </li>
            ))}
          </ol>

          <ul className="mt-6 flex flex-wrap gap-2 border-t border-white/20 pt-5">
            {inklusi.activities.map((a) => (
              <li key={a} className="rounded-full bg-white/15 px-3.5 py-1 text-[13px] font-semibold ring-1 ring-white/25">
                {a}
              </li>
            ))}
          </ul>

          <a
            href={waLink("Halo SD Alfa Centauri, saya ingin bertanya tentang program inklusi (LSU).")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-base font-bold text-brand-700 shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            <MessageCircle size={19} aria-hidden /> Tanya program inklusi
          </a>
        </div>

        {/* Foto */}
        <div className="reveal relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[3rem] rounded-br-[6rem] border-[6px] border-white shadow-lift lg:h-[min(34rem,calc(100svh-11rem))] lg:w-auto">
            <Photo
              alt="Guru mendampingi seorang siswa belajar di kelas"
              label="Guru mendampingi siswa belajar"
              sizes="(min-width: 1024px) 480px, 90vw"
            />
          </div>

          <div className="absolute left-2 top-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-navy-900 shadow-lift sm:left-4 lg:left-0">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-600">
              <Stethoscope size={21} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-navy-700/70">Diawasi oleh</p>
              <p className="font-display text-[15px] font-extrabold">Psikolog Klinis</p>
            </div>
          </div>

          <div className="absolute bottom-10 right-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-navy-900 shadow-lift sm:right-4 lg:right-0">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-600">
              <HeartHandshake size={21} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-navy-700/70">Fokus pada</p>
              <p className="font-display text-[15px] font-extrabold">Pendampingan Individual</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
