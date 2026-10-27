import { about } from "@/lib/site";
import { VideoProfile } from "./VideoProfile";

export function About() {
  return (
    <section id="tentang" aria-labelledby="tentang-title" className="px-5 pb-20 sm:px-8 lg:pb-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Tentang Kami</p>
        <h2
          id="tentang-title"
          className="reveal mt-5 font-display text-[1.75rem] font-bold leading-snug sm:text-4xl sm:leading-snug lg:text-[2.6rem] lg:leading-[1.25]"
        >
          SD Alfa Centauri berkomitmen mewujudkan visi{" "}
          <span className="hl text-brand-600">&lsquo;To Be The Finest School In The World&rsquo;</span>{" "}
          melalui misi membentuk generasi yang <span className="hl">Taqwa, Cerdas, dan Kreatif.</span>
        </h2>
      </div>

      <div id="profil" className="reveal mx-auto mt-12 max-w-6xl lg:mt-16">
        <VideoProfile />
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-navy-700/80">
          {about.founding}
        </p>
      </div>
    </section>
  );
}
