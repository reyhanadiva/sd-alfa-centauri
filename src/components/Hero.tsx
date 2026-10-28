import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { spmb } from "@/lib/site";
import { CertificateDialog } from "./CertificateDialog";
import { Rich } from "./Rich";
import { getT, type Lang } from "@/lib/i18n";

// Hero penuh layar tanpa kotak: foto gedung edge-to-edge, headline besar di kiri bawah,
// dua chip kaca kecil di kanan bawah (akreditasi dan SPMB). Navbar transparan melayang di atasnya.
export function Hero({ lang }: { lang: Lang }) {
  const { hero } = getT(lang);
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden text-white lg:max-h-[62rem]"
    >
      <Image
        src="/images/gedung-sd.jpg"
        alt={hero.alt}
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[50%_32%]"
      />
      {/* Atas gelap tipis untuk navbar, bawah gelap untuk headline */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-900/60 via-transparent to-transparent [mask-image:linear-gradient(to_bottom,black,transparent_30%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/92 via-navy-900/45 to-navy-900/0" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/45 to-transparent" />

      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-8 px-5 pb-8 pt-32 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:pb-12">
        <div>
          <h1
            id="hero-title"
            className="animate-fade-up text-[clamp(2.6rem,6.1vw,5.6rem)] font-semibold leading-[0.98] tracking-[-0.035em] !text-white"
          >
            To Be The <span className="em-serif pr-1 text-[1.06em]">Finest</span>
            <br />
            School In The World
          </h1>
          <p className="animate-fade-up mt-4 text-lg text-white/85 sm:text-xl" style={{ animationDelay: "100ms" }}>
            <Rich text={hero.sub} />
          </p>
          <div className="animate-fade-up mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: "200ms" }}>
            <a
              href={spmb.href}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              {hero.register}
              <ArrowRight size={17} aria-hidden className="transition group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* Dua chip kaca, sengaja kecil */}
        <div className="animate-fade-up flex flex-col gap-2.5 sm:flex-row lg:shrink-0" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.13] px-4 py-3 ring-1 ring-white/25 backdrop-blur-xl">
            <span aria-hidden className="font-display text-[2.6rem] font-semibold leading-none">A</span>
            <div className="text-[13px] leading-snug">
              <p className="font-bold">{hero.accredited}</p>
              <CertificateDialog variant="link" lang={lang} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
