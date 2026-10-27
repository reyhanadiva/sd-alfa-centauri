import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import { lokasi, site, waLink } from "@/lib/site";

// Lokasi: alamat besar (baris pertama biru) di kiri, peta di kanan.
export function Lokasi() {
  return (
    <section
      id="lokasi"
      aria-labelledby="lokasi-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto grid w-full max-w-[78rem] overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-brand-100 lg:h-[min(34rem,calc(100svh-9rem))] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between gap-8 p-7 sm:p-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy-700/60">Lokasi</p>
          <div>
            <h2 id="lokasi-title" className="text-[2.4rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              <span className="text-brand-600">{lokasi.street}</span>
              <br />
              {lokasi.city}
            </h2>
            <p className="mt-4 text-[16px] text-navy-700">{site.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[15px] font-semibold">
            <a
              href={lokasi.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-white transition hover:-translate-y-0.5 hover:bg-navy-700"
            >
              Petunjuk arah <ArrowUpRight size={16} aria-hidden />
            </a>
            <a href={site.phoneHref} className="inline-flex items-center gap-2 text-navy-800 hover:text-brand-600">
              <Phone size={16} aria-hidden /> {site.phone}
            </a>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-navy-800 hover:text-brand-600">
              <MessageCircle size={16} aria-hidden /> {site.whatsappDisplay}
            </a>
          </div>
        </div>

        <div className="relative min-h-[20rem] bg-brand-50">
          <iframe
            title="Peta lokasi SD Alfa Centauri"
            src={lokasi.mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
