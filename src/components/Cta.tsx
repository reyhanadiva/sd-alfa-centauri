import { ArrowUpRight, MessageCircle } from "lucide-react";
import { spmb, waLink } from "@/lib/site";
import { Star } from "./Doodles";
import { Clouds, PaperPlane, Twinkles } from "./Sky";

// CTA penutup: panel biru dengan langit bergerak (awan melintas, bintang berkedip, pesawat kertas),
// dan dua bintang yang mengorbit di kanan sebagai pengingat nama Alfa Centauri.
export function Cta() {
  return (
    <section id="spmb" aria-labelledby="cta-title" className="px-5 pb-16 pt-4 sm:px-8">
      <div className="relative isolate mx-auto flex min-h-[26rem] w-full max-w-[78rem] items-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-7 py-14 text-white shadow-lift sm:px-14 lg:min-h-[28rem]">
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <Twinkles color="text-white/80" />
          <Clouds color="text-white/25" />
          <div className="plane-fly absolute left-0 top-[18%] w-16 drop-shadow-lg">
            <PaperPlane />
          </div>
        </div>

        {/* Dua bintang mengorbit */}
        <div aria-hidden className="pointer-events-none absolute -right-10 top-1/2 hidden size-[26rem] -translate-y-1/2 lg:block">
          <div className="absolute inset-8 rounded-full border border-dashed border-white/35" />
          <div className="absolute inset-24 rounded-full border border-dashed border-white/25" />
          <div className="orbit absolute inset-0" style={{ "--dur": "26s" } as React.CSSProperties}>
            <Star className="absolute left-1/2 top-[1.4rem] size-9 -translate-x-1/2 text-white" />
          </div>
          <div className="orbit absolute inset-16" style={{ "--dur": "18s", animationDirection: "reverse" } as React.CSSProperties}>
            <Star className="absolute left-1/2 top-0 size-6 -translate-x-1/2 text-brand-200" />
          </div>
          <Star className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-white/90" />
        </div>

        <div className="relative max-w-2xl">
          <p className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-semibold ring-1 ring-white/30 backdrop-blur">
            SPMB {spmb.academicYear}
          </p>
          <h2 id="cta-title" className="mt-5 text-4xl font-semibold leading-[1.05] !text-white sm:text-5xl lg:text-[3.4rem]">
            Siap bertumbuh bersama <span className="em-serif text-brand-200">Alfa Centauri?</span>
          </h2>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-white/90">
            Tanyakan jadwal, syarat, dan cara mendaftar. Admin kami siap membantu lewat WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={waLink(`Halo SD Alfa Centauri, saya ingin mendaftar SPMB ${spmb.academicYear}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[16px] font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              Daftar SPMB <ArrowUpRight size={18} aria-hidden />
            </a>
            <a
              href={waLink("Halo SD Alfa Centauri, saya ingin bertanya.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[16px] font-bold ring-2 ring-white/60 transition hover:bg-white/15"
            >
              <MessageCircle size={18} aria-hidden /> Tanya admin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
