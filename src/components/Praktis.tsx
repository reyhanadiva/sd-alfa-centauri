import { ArrowUpRight } from "lucide-react";
import { portals, praktis } from "@/lib/site";
import { Plus, Star } from "./Doodles";

// Info harian orang tua, bentuk bento. Nilai asli: lihat `praktis` di site.ts (masih placeholder).
export function Praktis() {
  const portal = portals[0];
  return (
    <section
      id="info-orang-tua"
      aria-labelledby="praktis-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="praktis-title" className="reveal text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]">
          Praktis untuk <span className="em-serif text-brand-600">orang tua</span>
        </h2>

        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:mt-9 lg:h-[min(32rem,calc(100svh-17rem))] lg:grid-cols-12 lg:grid-rows-2">
          {/* Jam sekolah: angka besar */}
          <article className="reveal flex min-h-[13rem] flex-col justify-between rounded-[2rem] bg-brand-100 p-7 lg:col-span-5 lg:min-h-0">
            <h3 className="text-xl font-semibold">Jam sekolah</h3>
            <div>
              <p className="font-display text-[2.6rem] font-semibold leading-none tracking-[-0.04em] text-brand-600 sm:text-[3.2rem]">
                {praktis.jam.value}
              </p>
              <p className="mt-2 text-[16px] text-navy-700">{praktis.jam.note}</p>
            </div>
          </article>

          {/* Antar-jemput: gelap */}
          <article className="reveal relative flex min-h-[13rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-navy-900 p-7 text-white lg:col-span-3 lg:min-h-0">
            <Star className="absolute -right-6 -top-6 size-32 rotate-12 text-white/[0.06]" />
            <h3 className="relative text-xl font-semibold !text-white">Antar-jemput</h3>
            <p className="relative text-[16px] leading-snug text-white/75">{praktis.jemput.note}</p>
          </article>

          {/* Portal: kartu tinggi dengan mockup layar */}
          <article className="reveal relative flex min-h-[26rem] flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-brand-500 to-brand-700 p-7 text-white sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:min-h-0">
            <h3 className="text-2xl font-semibold !text-white">Portal Orang Tua</h3>
            <p className="mt-1 max-w-[16rem] text-[16px] leading-snug text-white/85">Satu pintu masuk informasi sekolah.</p>
            <a
              href={portal.href}
              className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              Buka portal <ArrowUpRight size={15} aria-hidden />
            </a>
            {/* Mockup layar sederhana (bukan fitur nyata) */}
            <div aria-hidden className="absolute -bottom-10 left-1/2 w-[15rem] -translate-x-1/2 rotate-[-4deg] rounded-[2rem] bg-white p-3 shadow-lift">
              <div className="h-[13rem] space-y-2.5 rounded-[1.5rem] bg-brand-50 p-4">
                <div className="h-3 w-1/2 rounded-full bg-brand-300" />
                <div className="h-14 rounded-2xl bg-white shadow-sm" />
                <div className="h-14 rounded-2xl bg-white shadow-sm" />
                <div className="h-3 w-2/3 rounded-full bg-brand-200" />
              </div>
            </div>
          </article>

          {/* Katering */}
          <article className="reveal relative flex min-h-[13rem] flex-col justify-between rounded-[2rem] bg-white p-7 ring-1 ring-brand-100 shadow-soft lg:col-span-4 lg:min-h-0">
            <Plus className="absolute right-6 top-6 size-5 text-brand-300" />
            <h3 className="text-xl font-semibold">Katering</h3>
            <div>
              <p className="text-[1.6rem] font-semibold leading-tight tracking-[-0.02em]">{praktis.katering.value}</p>
              <p className="mt-1 text-[16px] text-navy-700">{praktis.katering.note}</p>
            </div>
          </article>

          {/* Seragam */}
          <article className="reveal flex min-h-[13rem] flex-col justify-between rounded-[2rem] bg-brand-50 p-7 ring-1 ring-brand-100 lg:col-span-4 lg:min-h-0">
            <h3 className="text-xl font-semibold">Seragam</h3>
            <div>
              <p className="text-[1.6rem] font-semibold leading-tight tracking-[-0.02em]">{praktis.seragam.value}</p>
              <p className="mt-1 text-[16px] text-navy-700">{praktis.seragam.note}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
