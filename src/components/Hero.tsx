import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { spmb } from "@/lib/site";
import { CertificateDialog } from "./CertificateDialog";
import { Rich } from "./Rich";
import { getT, type Lang } from "@/lib/i18n";
import { Magnetic } from "./Magnetic";

const W = ({ i, children, className = "" }: { i: number; children: React.ReactNode; className?: string }) => (
  <span className={`word ${className}`} style={{ "--i": i } as React.CSSProperties}>{children}</span>
);

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
      <div className="hero-par absolute inset-0 -z-20">
        <Image
          src="/images/gedung-sd.jpg"
          alt={hero.alt}
          fill
          priority
          sizes="100vw"
          className="hero-zoom object-cover object-[50%_32%]"
        />
      </div>
      {/* Atas gelap tipis untuk navbar, bawah gelap untuk headline */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-900/60 via-transparent to-transparent [mask-image:linear-gradient(to_bottom,black,transparent_30%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/92 via-navy-900/45 to-navy-900/0" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/45 to-transparent" />

      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-8 px-5 pb-8 pt-32 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:pb-12 lg:pr-24">
        <div>
          <h1
            id="hero-title"
            className="text-[clamp(2.6rem,6.1vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.025em] !text-white"
          >
            <W i={0}>To</W> <W i={1}>Be</W> <W i={2}>The</W> <W i={3} className="em-serif pr-1 text-[1.06em] text-gold-300">Finest</W>
            <br />
            <W i={4}>School</W> <W i={5}>In</W> <W i={6}>The</W> <W i={7}>World</W>
          </h1>
          <p className="animate-fade-up mt-4 text-lg text-white/85 sm:text-xl" style={{ animationDelay: "750ms" }}>
            <Rich text={hero.sub} />
          </p>
          <div className="animate-fade-up mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: "900ms" }}>
            <Magnetic>
            <a
                href={spmb.href}
                className="btn-gold group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[16px] font-bold"
              >
                {hero.register}
                <ArrowRight size={17} aria-hidden className="transition group-hover:translate-x-1" />
              </a>
            </Magnetic>
          </div>
        </div>

        {/* Dua chip kaca, sengaja kecil */}
        <div className="animate-fade-up flex flex-col gap-2.5 sm:flex-row lg:shrink-0" style={{ animationDelay: "1050ms" }}>
          <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.13] px-4 py-3 ring-1 ring-white/25 backdrop-blur-xl">
            <span aria-hidden className="font-display text-[2.6rem] font-semibold leading-none">A</span>
            <div className="text-[14px] leading-snug">
              <p className="font-bold">{hero.accredited}</p>
              <CertificateDialog variant="link" lang={lang} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
