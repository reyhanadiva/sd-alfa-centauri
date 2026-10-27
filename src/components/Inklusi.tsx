import { Check, HeartHandshake, MessageCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { inklusi, waLink } from "@/lib/site";
import { Photo } from "./Photo";
import { Plus, Star } from "./Doodles";

export function Inklusi() {
  return (
    <section
      id="inklusi"
      aria-labelledby="inklusi-title"
      className="relative isolate mx-3 overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 text-white sm:mx-6 lg:rounded-[3rem]"
    >
      {/* Dekorasi latar */}
      <Star className="absolute -right-16 -top-16 -z-10 size-72 rotate-12 text-white/[0.06]" />
      <Star className="absolute -bottom-24 -left-20 -z-10 size-64 -rotate-12 text-white/[0.05]" />
      <Plus className="absolute left-[46%] top-16 -z-10 hidden size-6 text-white/25 lg:block" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.12] [background-image:radial-gradient(white_1.2px,transparent_1.2px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
      />

      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        {/* Teks */}
        <div className="reveal">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-bold ring-1 ring-white/25">
            <ShieldCheck size={16} aria-hidden /> Learning Support Unit (LSU)
          </p>

          <h2
            id="inklusi-title"
            className="mt-6 font-display text-4xl font-extrabold leading-[1.06] text-white sm:text-5xl lg:text-[3.4rem]"
          >
            Setiap anak belajar <span className="hl-white">dengan caranya.</span>
          </h2>
          <p className="mt-3 font-display text-lg font-bold text-brand-200">
            Program Pendidikan Inklusif
          </p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">
            Kami menghadirkan lingkungan belajar yang suportif bagi semua siswa, termasuk anak yang
            membutuhkan pendampingan khusus. Setiap anak mendapat pendampingan akademik dan perilaku
            yang disesuaikan dengan kebutuhannya.
          </p>

          <ul className="mt-8 space-y-3.5">
            {inklusi.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-lg font-semibold">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-brand-600">
                  <Check size={16} strokeWidth={3.5} aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>

          {/* Alur pendampingan */}
          <div className="mt-10">
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-brand-200">
              Alur pendampingan
            </h3>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {inklusi.steps.map((s, i) => (
                <li
                  key={s.title}
                  className="relative rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-white font-display text-sm font-extrabold text-brand-600">
                    {i + 1}
                  </span>
                  <p className="mt-3 font-display text-[17px] font-bold leading-snug text-white">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-white/80">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Aktivitas */}
          <div className="mt-10 border-t border-white/20 pt-8">
            <p className="text-sm font-semibold text-white/80">Aktivitas pendukung</p>
            <ul className="mt-3 flex flex-wrap gap-2.5">
              {inklusi.activities.map((a) => (
                <li
                  key={a}
                  className="rounded-full bg-white/15 px-4 py-1.5 text-[14px] font-semibold ring-1 ring-white/25"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <a
            href={waLink("Halo SD Alfa Centauri, saya ingin bertanya tentang program inklusi (LSU).")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-base font-bold text-brand-700 shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            <MessageCircle size={20} aria-hidden /> Tanya program inklusi
          </a>
        </div>

        {/* Foto */}
        <div className="reveal relative mx-auto w-full max-w-lg self-start lg:sticky lg:top-28 lg:max-w-none">
          <div
            aria-hidden
            className="absolute inset-0 -rotate-3 rounded-[3rem] rounded-br-[7rem] bg-white/15"
          />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] rounded-br-[7rem] border-[6px] border-white shadow-lift">
            <Photo
              alt="Guru mendampingi seorang siswa belajar di kelas"
              label="Guru mendampingi siswa belajar"
              sizes="(min-width: 1024px) 520px, 90vw"
            />
          </div>

          <div className="absolute left-3 top-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-navy-900 shadow-lift sm:-left-6">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-100 text-brand-600">
              <Stethoscope size={22} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-navy-700/70">Diawasi oleh</p>
              <p className="font-display text-base font-extrabold">Psikolog Klinis</p>
            </div>
          </div>

          <div className="absolute bottom-10 right-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-navy-900 shadow-lift sm:-right-5">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-100 text-brand-600">
              <HeartHandshake size={22} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-navy-700/70">Fokus pada</p>
              <p className="font-display text-base font-extrabold">Pendampingan Individual</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
