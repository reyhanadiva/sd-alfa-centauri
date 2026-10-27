import { about, bintangKembar } from "@/lib/site";
import { Star } from "./Doodles";
import { VideoProfile } from "./VideoProfile";

// Satu layar di desktop: pernyataan, video (lebarnya mengikuti sisa tinggi layar), baris penutup.
export function About() {
  return (
    <section
      id="tentang"
      aria-labelledby="tentang-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:gap-7">
        <h2
          id="tentang-title"
          className="reveal mx-auto max-w-4xl text-center font-display text-[1.7rem] font-bold leading-snug sm:text-3xl lg:text-[2.2rem] lg:leading-[1.25]"
        >
          SD Alfa Centauri berkomitmen mewujudkan visi{" "}
          <span className="hl text-brand-600">&lsquo;To Be The Finest School In The World&rsquo;</span>{" "}
          melalui misi membentuk generasi yang <span className="hl">Taqwa, Cerdas, dan Kreatif.</span>
        </h2>

        <div id="profil" className="reveal">
          {/* Lebar = tinggi tersisa × 16/9, supaya video + baris bawah muat satu layar */}
          <VideoProfile className="mx-auto w-full lg:w-[min(100%,calc((100svh-24rem)*1.7778))]" />
        </div>

        <div className="reveal mx-auto grid w-full max-w-4xl gap-4 text-sm leading-relaxed text-navy-700 sm:grid-cols-2 sm:gap-8">
          <p>{about.founding}</p>
          <div className="flex items-start gap-3">
            <div aria-hidden className="relative mt-0.5 size-9 shrink-0">
              <Star className="absolute left-0 top-2 size-5 -rotate-12 text-brand-300" />
              <Star className="absolute right-0 top-0 size-6 rotate-6 text-brand-500" />
            </div>
            <p>
              <strong className="font-bold text-navy-900">Filosofi Bintang Kembar. </strong>
              {bintangKembar}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
