import { Star } from "./Doodles";
import { LsuStrip } from "./LsuStrip";

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

// LSU: gelap, eksklusif, minim tulisan. Satu kalimat + strip kartu selebar layar. Tanpa tombol.
export function Inklusi() {
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

      <div className="flex flex-col items-center justify-center py-16 text-center lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:py-8">
        <div className="px-5 sm:px-8">
          <p className="mx-auto w-fit rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/20">
            Learning Support Unit (LSU)
          </p>
          <h2
            id="inklusi-title"
            className="reveal mx-auto mt-5 max-w-5xl text-[2.6rem] font-semibold leading-[1.02] !text-white sm:text-6xl lg:text-[3.7rem]"
          >
            Setiap anak belajar <span className="em-serif text-brand-300">dengan caranya.</span>
          </h2>
        </div>
        <div className="reveal mt-4 w-full lg:mt-6">
          <LsuStrip />
        </div>
      </div>
    </section>
  );
}
