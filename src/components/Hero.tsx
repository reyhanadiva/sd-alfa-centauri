import Image from "next/image";
import { ArrowRight, BadgeCheck, Play, Sparkles } from "lucide-react";
import { spmb } from "@/lib/site";
import { Plus, Ring, Squiggle, Star } from "./Doodles";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-gradient-to-b from-brand-100 via-brand-50 to-white pb-36 pt-10 sm:pt-14 lg:pb-44 lg:pt-20"
    >
      {/* Latar: titik halus + cahaya lembut */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(var(--color-brand-300)_1.2px,transparent_1.2px)] [background-size:26px_26px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div
        aria-hidden
        className="absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full bg-brand-300/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-24 top-1/2 -z-10 size-80 rounded-full bg-sky/10 blur-3xl"
      />

      {/* Doodle aksen */}
      <Star className="absolute left-[6%] top-24 -z-10 hidden size-7 rotate-[-12deg] text-brand-400/60 md:block" />
      <Squiggle className="absolute bottom-40 left-[4%] -z-10 hidden w-28 text-brand-300 lg:block" />
      <Plus className="absolute right-[7%] top-28 -z-10 hidden size-6 text-brand-400/60 md:block" />
      <Ring className="absolute bottom-48 right-[44%] -z-10 hidden size-6 text-brand-300 lg:block" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
        {/* Teks */}
        <div>
          <a
            href={spmb.href}
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-[13px] font-bold text-brand-700 shadow-sm transition hover:border-brand-400"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-pulse-dot rounded-full bg-green-500" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
            SPMB TA {spmb.academicYear} Dibuka
            <ArrowRight size={14} aria-hidden />
          </a>

          <h1
            id="hero-title"
            className="animate-fade-up mt-6 font-display text-[2.6rem] font-extrabold leading-[1.04] sm:text-6xl lg:text-[4.25rem]"
            style={{ animationDelay: "80ms" }}
          >
            To Be The <span className="hl text-brand-600">Finest</span> School In The World
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-lg text-navy-700 sm:text-xl"
            style={{ animationDelay: "160ms" }}
          >
            Mewujudkan generasi masa depan yang <strong>Bertakwa, Cerdas, dan Kreatif</strong>{" "}
            melalui integrasi nilai keislaman dan sains teknologi sejak usia dini.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href={spmb.href}
              className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-base font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              Daftar SPMB Online
              <ArrowRight
                size={18}
                aria-hidden
                className="transition group-hover:translate-x-1"
              />
            </a>
            <a
              href="#profil"
              className="group inline-flex items-center gap-3 rounded-full border border-brand-200 bg-white px-6 py-3.5 text-base font-bold text-navy-800 transition hover:border-brand-400 hover:bg-brand-50"
            >
              <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <Play size={13} fill="currentColor" aria-hidden />
              </span>
              Lihat Video Profil
            </a>
          </div>
        </div>

        {/* Visual */}
        <div
          className="animate-fade-up relative mx-auto w-full max-w-xl lg:max-w-none"
          style={{ animationDelay: "200ms" }}
        >
          {/* Bingkai miring di belakang foto */}
          <div
            aria-hidden
            className="absolute inset-0 translate-x-3 translate-y-4 rotate-[3deg] rounded-[2.75rem] bg-brand-500/90 lg:translate-x-4 lg:translate-y-5"
          />
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2.75rem] rounded-tl-[6rem] border-[6px] border-white bg-brand-100 shadow-lift">
            <Image
              src="/images/gedung-sd.jpg"
              alt="Gedung SD Alfa Centauri di Jalan Terate No. 10, Bandung"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 92vw"
              className="object-cover"
            />
          </div>

          {/* Stiker */}
          <div
            style={{ ["--r" as string]: "-4deg" }}
            className="animate-float absolute -left-3 bottom-8 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift sm:-left-8"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-600">
              <BadgeCheck size={22} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-navy-700/70">Akreditasi</p>
              <p className="font-display text-base font-extrabold text-navy-900">Terakreditasi A</p>
            </div>
          </div>

          <div
            style={{ ["--r" as string]: "5deg", animationDelay: "-2s" }}
            className="animate-float absolute -right-2 -top-5 flex items-center gap-2 rounded-2xl bg-navy-900 px-4 py-2.5 text-white shadow-lift sm:-right-5"
          >
            <Sparkles size={16} className="text-sun" aria-hidden />
            <span className="text-[13px] font-bold">Sejak 2009</span>
          </div>

          <Star className="absolute -bottom-4 right-10 size-9 rotate-[14deg] text-white drop-shadow-md" />
        </div>
      </div>
    </section>
  );
}
