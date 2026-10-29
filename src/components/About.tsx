import { links } from "@/lib/site";
import { getT, type Lang } from "@/lib/i18n";
import { Rich } from "./Rich";
import { Star } from "./Doodles";
import { VideoProfile } from "./VideoProfile";

// Satu layar di desktop: pernyataan visi (3 baris, kutipan visi selalu satu baris),
// video besar di kiri, dua fakta singkat di kanan.
export function About({ lang }: { lang: Lang }) {
  const { about } = getT(lang);
  return (
    <section
      id="tentang"
      aria-labelledby="tentang-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-8 lg:gap-6">
        <h2
          id="tentang-title"
          className="reveal text-center text-[1.3rem] font-medium leading-snug tracking-[-0.02em] text-navy-700 sm:text-[1.55rem] lg:text-[1.65rem]"
        >
          {about.lead}
          <span className="em-serif my-1 block whitespace-nowrap text-[min(6.4vw,3.3rem)] leading-[1.1] tracking-[-0.02em] text-brand-600">
            &lsquo;{about.quote}&rsquo;
          </span>
          {about.tail}{" "}
          <a
            href={links.yayasan}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy-900 underline decoration-brand-400 decoration-2 underline-offset-[5px] transition hover:text-brand-600"
          >
            {about.link}
          </a>
          .
        </h2>

        <div className="grid gap-4 lg:grid-cols-[1fr_17.5rem] lg:gap-5">
          <div id="profil" className="reveal">
            <VideoProfile lang={lang} className="w-full" />
          </div>

          <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex flex-col justify-between gap-3 rounded-[1.75rem] bg-brand-50 p-6 ring-1 ring-brand-100">
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

            <div className="flex flex-col justify-between gap-3 rounded-[1.75rem] bg-navy-900 p-6 text-white">
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
          </div>
        </div>
      </div>
    </section>
  );
}
