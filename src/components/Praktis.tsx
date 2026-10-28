import { ArrowUpRight, CalendarDays, ClipboardList, LayoutDashboard, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { infoCepat, lokasi, site, waLink } from "@/lib/site";
import { Photo } from "./Photo";

const icons: Record<string, LucideIcon> = {
  portal: LayoutDashboard, kalender: CalendarDays, spmb: ClipboardList, wa: MessageCircle, telp: Phone, map: MapPin,
};

const resolve = (href: string) =>
  href === "wa" ? waLink("Halo SD Alfa Centauri, saya ingin bertanya.") : href === "tel" ? site.phoneHref : href === "map" ? lokasi.mapLink : href;

// Akses cepat untuk orang tua: semua kartu adalah tautan, isinya hanya hal yang memang ada
// (portal, kalender, SPMB, kontak). Tidak ada data jam, jemput, atau seragam karena belum ada datanya.
export function Praktis() {
  return (
    <section
      id="info-orang-tua"
      aria-labelledby="praktis-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto grid w-full max-w-[78rem] gap-8 lg:h-[min(32rem,calc(100svh-9rem))] lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="reveal relative isolate flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-[2rem] p-7 text-white sm:p-9">
          <Photo src="/images/gedung-sd.jpg" alt="Gedung SD Alfa Centauri" label="Gedung sekolah" sizes="(min-width:1024px) 480px, 94vw" className="-z-20 object-[30%_50%]" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-navy-900/25 to-navy-900/35" />
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/80">Info orang tua</p>
          <div>
            <h2 id="praktis-title" className="text-4xl font-semibold leading-[1.05] !text-white sm:text-5xl">
              Butuh sesuatu? <span className="em-serif text-brand-200">Mulai dari sini</span>
            </h2>
            <p className="mt-3 max-w-sm text-[16px] text-white/85">Portal, jadwal, pendaftaran, dan kontak sekolah dalam satu tempat.</p>
          </div>
        </div>

        <ul className="grid content-center gap-x-8 sm:grid-cols-2">
          {infoCepat.map((c) => {
            const C = icons[c.icon];
            const href = resolve(c.href);
            const ext = href.startsWith("http");
            return (
              <li key={c.title} className="reveal border-b border-navy-900/10 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                <a
                  href={href}
                  {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-center gap-4 py-5"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                    <C size={22} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold leading-snug text-navy-900">{c.title}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-navy-700/80">{c.desc}</span>
                  </span>
                  <ArrowUpRight size={18} aria-hidden className="shrink-0 text-navy-700/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
