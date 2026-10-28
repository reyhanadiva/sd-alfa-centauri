import { getT, type Lang } from "@/lib/i18n";
import { Star } from "./Doodles";
import { ActivityRail } from "./ActivityRail";
import { Icon } from "./icons";

// Tepi atas/bawah melengkung (bukan kotak) supaya peralihan antar section terasa mengalir.
function Curve({ edge }: { edge: "top" | "bottom" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 h-8 w-full text-navy-900 sm:h-14 ${
        edge === "top" ? "top-0 -translate-y-[99%]" : "bottom-0 translate-y-[99%] rotate-180"
      }`}
    >
      <path d="M0 56 Q720 -24 1440 56 Z" fill="currentColor" />
    </svg>
  );
}

// Program Pendidikan Inklusif (LSU): gelap dan ringkas. Judul jelas ini program, tiga poin layanan,
// lalu aktivitas pendampingan yang bergerak pelan sendiri dan bisa digeser. Tanpa tombol, tanpa foto anak.
export function Inklusi({ lang }: { lang: Lang }) {
  const { inklusi: k } = getT(lang);
  return (
    <section
      id="inklusi"
      aria-labelledby="inklusi-title"
      className="relative isolate mt-10 overflow-x-clip bg-navy-900 text-white lg:mt-16"
    >
      <Curve edge="top" />
      <Curve edge="bottom" />
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <Star className="absolute -right-10 top-10 size-64 rotate-12 text-white/[0.04]" />
        <div className="absolute left-1/2 top-0 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[110px]" />
      </div>

      <div className="flex flex-col items-center justify-center gap-8 py-16 text-center lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:gap-10 lg:py-8">
        <div className="px-5 sm:px-8">
          <p className="mx-auto w-fit rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/20">
            {k.badge}
          </p>
          <h2
            id="inklusi-title"
            className="reveal mx-auto mt-5 max-w-5xl text-[2.6rem] font-semibold leading-[1.02] !text-white sm:text-6xl lg:text-[3.7rem]"
          >
            {k.title[0]}<span className="em-serif text-brand-300">{k.title[1]}</span>
          </h2>
          <p className="mt-3 text-lg text-white/70 sm:text-xl">{k.sub}</p>
        </div>

        {/* Tiga poin layanan */}
        <ul className="reveal mx-auto grid w-full max-w-[72rem] gap-6 px-5 text-left sm:grid-cols-3 sm:gap-0 sm:px-8">
          {k.points.map((p, i) => (
            <li
              key={p.title}
              className={`flex items-start gap-3.5 sm:px-6 ${i > 0 ? "sm:border-l sm:border-white/15" : ""}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-500/25 text-brand-200 ring-1 ring-brand-300/30">
                <Icon name={p.icon} size={21} />
              </span>
              <div>
                <p className="text-[17px] font-semibold leading-snug text-white">{p.title}</p>
                <p className="mt-0.5 text-[15px] leading-snug text-white/65">{p.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Aktivitas pendampingan: bergerak pelan, berhenti saat disentuh */}
        <div className="reveal w-full">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">
            {k.activitiesLabel}
          </p>
          <ActivityRail items={k.activities} label={k.activitiesLabel} />
        </div>
      </div>
    </section>
  );
}
