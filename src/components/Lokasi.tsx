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
          <div>
            <ul className="divide-y divide-navy-900/10 border-y border-navy-900/10">
              {[
                { icon: Phone, label: "Telepon sekolah", value: site.phone, href: site.phoneHref, cta: "Telepon", ext: false },
                { icon: MessageCircle, label: "WhatsApp admin", value: site.whatsappDisplay, href: waLink(), cta: "Chat", ext: true },
              ].map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-4 py-3.5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                      <c.icon size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-navy-700/70">{c.label}</span>
                      <span className="block text-[17px] font-semibold tabular-nums text-navy-900">{c.value}</span>
                    </span>
                    <span className="rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-bold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">{c.cta}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={lokasi.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-navy-700"
            >
              Petunjuk arah <ArrowUpRight size={16} aria-hidden />
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
