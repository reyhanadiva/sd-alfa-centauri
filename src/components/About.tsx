import { links } from "@/lib/site";
import { getT, type Lang } from "@/lib/i18n";
import { Rich } from "./Rich";
import { Star } from "./Doodles";
import { VideoProfile } from "./VideoProfile";
import { BlurIn, Rise } from "./Words";
import { split } from "./split";

// Satu layar di desktop: pernyataan visi (3 baris, kutipan visi selalu satu baris),
// video besar di kiri, dua fakta singkat di kanan.
export function About({ lang }: { lang: Lang }) {
  const { about } = getT(lang);
  const count = (t: string) => t.trim().split(/\s+/).length;
  const nLead = count(about.lead);
  const nQuote = count(about.quote);
  const nTail = count(about.tail);
  return (
    <section
      id="tentang"
      aria-labelledby="tentang-title"
      className="px-5 py-16 sm:px-8 lg:py-20"
    >
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-8 lg:gap-6">
        <h2
          id="tentang-title"
          className="text-center text-[1.3rem] font-medium leading-snug tracking-[-0.02em] text-navy-700 sm:text-[1.55rem] lg:text-[1.65rem]"
        >
          <Rise>
            {split(about.lead)}
            <span className="em-serif my-1 block text-[clamp(1.9rem,7vw,3.3rem)] lg:whitespace-nowrap leading-[1.1] tracking-[-0.02em] text-brand-600">
              {split(`\u2018${about.quote}\u2019`, nLead)}
            </span>
            {split(about.tail, nLead + nQuote)}{" "}
            <a
              href={links.yayasan}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline decoration-brand-400 decoration-2 underline-offset-[5px] transition hover:text-brand-600 hover:decoration-brand-600"
            >
              {split(about.link, nLead + nQuote + nTail)}
            </a>
            .
          </Rise>
        </h2>

        <div className="grid gap-4 lg:grid-cols-[1fr_17.5rem] lg:gap-5">
          <div id="profil">
            <BlurIn delay={350}>
              <VideoProfile lang={lang} className="w-full" />
            </BlurIn>
          </div>

          <BlurIn delay={550} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex flex-col justify-between gap-3 rounded-[1.25rem] bg-paper p-6">
              <p className="font-display text-[3.4rem] font-semibold leading-none tracking-[-0.05em] text-brand-600">
                2009
              </p>
              <div>
                <p className="text-[17px] font-bold text-navy-900">{about.founded}</p>
                <p className="mt-1 text-[15px] leading-snug text-navy-700">
                  {about.under}
                  <br />
                  <a
                    href={links.yayasan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-600"
                  >
                    {about.foundation}
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-[1.25rem] bg-navy-900 p-6 text-white">
              <div aria-hidden className="relative h-12 w-20">
                <Star className="star-a absolute left-0 top-3 size-8 -rotate-12 text-brand-300" />
                <Star className="star-b absolute left-9 top-0 size-10 rotate-6 text-white" />
              </div>
              <div>
                <p className="text-[17px] font-bold leading-snug text-white">
                  {about.twinTitle}
                </p>
                <p className="mt-1 text-[15px] leading-snug text-white/80">
                  <Rich text={about.twinText} strong="font-bold text-white" />
                </p>
              </div>
            </div>
          </BlurIn>
        </div>
      </div>
    </section>
  );
}
