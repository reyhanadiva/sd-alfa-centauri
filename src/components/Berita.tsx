import { ArrowUpRight } from "lucide-react";
import { berita } from "@/lib/site";
import { Photo } from "./Photo";

const pastel = ["bg-brand-100", "bg-[#e3f4ff]", "bg-[#e6f9f0]"];

// Berita: satu kartu utama (foto penuh, judul di kotak putih) + tiga kartu horizontal pastel.
export function Berita() {
  const [main, ...rest] = berita;
  return (
    <section
      id="berita"
      aria-labelledby="berita-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="berita-title" className="reveal text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]">
          Berita <span className="em-serif text-brand-600">terbaru</span>
        </h2>

        <div className="mt-8 grid gap-3.5 lg:mt-9 lg:h-[min(31rem,calc(100svh-17rem))] lg:grid-cols-12">
          <a
            href={main.href}
            className="reveal group relative isolate flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-white lg:col-span-7 lg:min-h-0"
          >
            <Photo src={main.photo} alt="" label="Foto berita utama" sizes="(min-width:1024px) 720px, 94vw" className="-z-20 transition duration-700 group-hover:scale-105" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/70 via-transparent to-navy-900/20" />
            <div className="flex gap-2 text-[13px] font-semibold">
              <span className="rounded-full bg-white px-3.5 py-1.5 text-navy-900">{main.date}</span>
              <span className="rounded-full bg-white/20 px-3.5 py-1.5 ring-1 ring-white/50 backdrop-blur-md">{main.cat}</span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <h3 className="max-w-[30rem] text-[1.9rem] font-semibold leading-[1.35] sm:text-[2.2rem]">
                <span className="rounded-xl bg-white px-3 py-0.5 text-navy-900 [box-decoration-break:clone]">{main.title}</span>
              </h3>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-navy-900 transition group-hover:rotate-45">
                <ArrowUpRight size={20} aria-hidden />
              </span>
            </div>
          </a>

          <div className="grid gap-3.5 lg:col-span-5 lg:grid-rows-3">
            {rest.map((b, i) => (
              <a
                key={b.title}
                href={b.href}
                className={`reveal group flex min-h-[9.5rem] gap-4 rounded-[1.75rem] p-3 transition hover:-translate-y-0.5 hover:shadow-soft ${pastel[i]}`}
              >
                <div className="relative isolate w-[36%] shrink-0 overflow-hidden rounded-[1.25rem]">
                  <Photo src={b.photo} alt="" label="Foto berita" sizes="200px" className="transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-1.5 pr-2">
                  <div>
                    <p className="text-[12.5px] font-semibold text-navy-700/80">
                      <span className="rounded-full bg-white px-2.5 py-1 text-navy-900">{b.cat}</span>
                      <span className="ml-2">{b.date}</span>
                    </p>
                    <h3 className="mt-2 text-[1.1rem] font-semibold leading-snug">{b.title}</h3>
                  </div>
                  <p className="inline-flex items-center gap-1 text-[14px] font-semibold text-brand-700">
                    Baca selengkapnya <ArrowUpRight size={15} aria-hidden className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
