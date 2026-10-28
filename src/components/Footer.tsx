import Image from "next/image";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { jaringan, lokasi, site, thisYear, waLink } from "@/lib/site";
import { Clouds, Twinkles } from "./Sky";

// Footer bergambar: langit (awan melintas, bintang berkedip), tulisan besar, bukit berlapis,
// lalu tiga kolom (sekolah, kunjungi kami, jaringan pendidikan).
export function Footer() {
  return (
    <footer className="relative bg-navy-900 text-white">
      <div aria-hidden className="relative h-52 overflow-hidden bg-gradient-to-b from-brand-400 via-brand-200 to-brand-100 sm:h-72">
        <Twinkles color="text-white" />
        <Clouds color="text-white" />
        <p className="absolute inset-x-0 bottom-6 select-none text-center font-display text-[clamp(3rem,13vw,10.5rem)] font-semibold leading-none tracking-[-0.05em] text-white/90 sm:bottom-8">
          ALFA CENTAURI
        </p>
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-16 w-full sm:h-24">
          <path d="M0 70C160 10 320 10 480 55s330 60 500 10 330-45 460-5V140H0Z" fill="#2456c4" />
          <path d="M0 105c180-50 360-40 540 0s360 45 540 0 260-30 360-10v45H0Z" fill="#173a7a" />
          <path d="M0 125c200-30 420-20 640 0s520 20 800-8v23H0Z" fill="#0a1c40" />
        </svg>
      </div>

      <div className="mx-auto w-full max-w-[78rem] px-5 pb-8 pt-10 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-14">
          <div>
            <Image src="/images/logo-horizontal-white.png" alt="SD Alfa Centauri" width={220} height={56} className="h-12 w-auto" />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/75">
              Sekolah dasar Islam inklusif di Bandung. {site.tagline}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#spmb" className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14.5px] font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-brand-50">
                Info SPMB <ArrowUpRight size={16} aria-hidden />
              </a>
              <a href={waLink("Halo SD Alfa Centauri, saya ingin bertanya.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14.5px] font-bold ring-1 ring-white/40 transition hover:bg-white/10">
                <MessageCircle size={16} aria-hidden /> Tanya admin
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] !text-white/60">Kunjungi kami</h3>
            <ul className="mt-4 space-y-3.5 text-[15px] text-white/85">
              <li className="flex gap-3">
                <MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" />
                <a href={lokasi.mapLink} target="_blank" rel="noopener noreferrer" className="hover:text-white">{site.address}</a>
              </li>
              <li className="flex gap-3">
                <Phone size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" />
                <a href={site.phoneHref} className="hover:text-white">{site.phone}</a>
              </li>
              <li className="flex gap-3">
                <MessageCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" />
                <a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:text-white">{site.whatsappDisplay} (WhatsApp)</a>
              </li>
              <li className="flex gap-3">
                <Mail size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-300" />
                <a href={`mailto:${site.email}`} className="break-all hover:text-white">{site.email}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] !text-white/60">Jaringan pendidikan</h3>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
              {jaringan.map((j) => (
                <li key={j.href}>
                  <a href={j.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-white/85 hover:text-white">
                    {j.label}
                    <ArrowUpRight size={14} aria-hidden className="text-white/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[13.5px] text-white/60">
          <p>© {thisYear} {site.name}. Seluruh hak cipta dilindungi.</p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
