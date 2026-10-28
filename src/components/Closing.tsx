import Image from "next/image";
import { ArrowUpRight, Download, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { lokasi, site, thisYear } from "@/lib/site";
import { getT, type Lang } from "@/lib/i18n";
import { BinaryStar, Cloud, Clouds, ShootingStars, Twinkles } from "./Sky";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-brand-300">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" />
    </svg>
  );
}

// Penutup satu adegan: langit malam (CTA) → bukit → footer di atas warna bukit
// yang sama, jadi tanpa sambungan. Elemen bergerak: bintang berkedip dan jatuh, awan, bintang kembar
// mengorbit, awan menggantung di bukit. Reduce-motion dimatikan lewat CSS global.
export function Closing({ lang }: { lang: Lang }) {
  const { closing: c, lokasi: loc } = getT(lang);
  return (
    <div className="relative isolate overflow-hidden rounded-t-[3rem] bg-gradient-to-b from-navy-800 via-navy-900 to-navy-900 text-white sm:rounded-t-[4.5rem]">
      {/* ---------- CTA ---------- */}
      <section id="spmb" aria-labelledby="cta-title" className="relative px-5 pb-24 pt-20 text-center sm:px-8 sm:pt-28">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div aria-hidden className="absolute -top-40 left-1/2 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/35 blur-[120px]" />
          <Twinkles color="text-white" />
          <ShootingStars />
          <Clouds />
        </div>

        <div className="relative mx-auto flex max-w-3xl flex-col items-center">
          <BinaryStar className="size-28 sm:size-36" />
          <h2 id="cta-title" className="mt-9 text-[2.6rem] font-semibold leading-[1.02] !text-white sm:text-6xl lg:text-[4.4rem]">
            {c.title[0]}<span className="em-serif text-brand-300">{c.title[1]}</span>
          </h2>
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-white/80">
            {c.text}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <a
              href={c.registerWa}
              target="_blank"
              rel="noopener noreferrer"
              className="halo inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[17px] font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              {c.register} <ArrowUpRight size={20} aria-hidden />
            </a>
            <a
              href={c.askWa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[17px] font-bold ring-2 ring-white/45 transition hover:bg-white/10"
            >
              <MessageCircle size={19} aria-hidden /> {c.ask}
            </a>
          </div>
          <a
            href={site.brosur[lang]}
            download
            className="mt-6 inline-flex items-center gap-2 text-[15.5px] font-semibold text-brand-200 underline decoration-brand-300/50 underline-offset-4 transition hover:text-white"
          >
            <Download size={17} aria-hidden /> {c.brosur}
          </a>
        </div>
      </section>

      {/* ---------- Bukit + sekolah ---------- */}
      <div aria-hidden className="relative -mb-px h-44 sm:h-64">
        <svg viewBox="0 0 1440 260" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d="M0 120C200 60 380 70 560 110s360 70 560 20 240-40 320-20V260H0Z" fill="#173a7a" />
        </svg>
        {/* Awan menggantung di punggung bukit, bergoyang pelan */}
        <div className="sway absolute bottom-[42%] left-[8%] w-56 opacity-20 sm:w-80"><Cloud /></div>
        <div className="sway absolute bottom-[38%] right-[6%] w-48 opacity-[0.16] sm:w-72" style={{ animationDelay: "-6s" }}><Cloud /></div>
        <svg viewBox="0 0 1440 260" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d="M0 160c220-60 460-40 700 10s520 40 740-20V260H0Z" fill="#0f2a5c" />
          <path d="M0 215c260-40 560-30 820 0s400 25 620-5V260H0Z" fill="#0a1c40" />
        </svg>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="bg-navy-900">
        <div className="mx-auto w-full max-w-[78rem] px-5 pb-20 pt-4 sm:px-8 sm:pb-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.4fr_0.7fr_1.1fr_1fr] lg:gap-12">
            <div className="col-span-2 lg:col-span-1">
              <Image src="/images/logo-horizontal-white.png" alt="SD Alfa Centauri" width={220} height={56} className="h-12 w-auto" />
              <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">
                {c.about}
              </p>
              <p className="mt-3 max-w-xs text-[15px] font-semibold leading-snug text-brand-200">{site.tagline}</p>
            </div>

            <nav aria-label={c.explore} className="order-3 lg:order-none">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] !text-white/55">{c.explore}</h3>
              <ul className="mt-3 space-y-2 text-[15px] lg:mt-4 lg:space-y-2.5">
                {c.explorer.map(([l, h]) => (
                  <li key={h}><a href={h} className="text-white/80 hover:text-white">{l}</a></li>
                ))}
              </ul>
            </nav>

            <div className="order-2 col-span-2 lg:order-none lg:col-span-1">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] !text-white/55">{c.visit}</h3>
              <ul className="mt-4 space-y-3.5 text-[15px] text-white/80">
                <li className="flex gap-3"><MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" /><a href={lokasi.mapLink} target="_blank" rel="noopener noreferrer" className="hover:text-white">{loc.street} {loc.city}</a></li>
                <li className="flex gap-3"><Phone size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" /><a href={site.phoneHref} className="hover:text-white">{site.phone}</a></li>
                <li className="flex gap-3"><MessageCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" /><a href={c.askWa} target="_blank" rel="noopener noreferrer" className="hover:text-white">{site.whatsappDisplay} {c.wa}</a></li>
                <li className="flex gap-3"><InstagramIcon /><a href={site.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">{site.instagramHandle}</a></li>
                <li className="flex gap-3"><Mail size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" /><a href={`mailto:${site.email}`} className="break-all hover:text-white">{site.email}</a></li>
              </ul>
            </div>

            <div className="order-4 lg:order-none">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] !text-white/55">{c.network}</h3>
              <ul className="mt-3 space-y-2 text-[15px] lg:mt-4 lg:space-y-2.5">
                {c.jaringan.map((j) => (
                  <li key={j.href}>
                    <a href={j.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-white/80 hover:text-white">
                      {j.label}
                      <ArrowUpRight size={14} aria-hidden className="text-white/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[13.5px] text-white/55">
            <p>© {thisYear} {site.name}. {c.rights}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
