import { ArrowUpRight } from "lucide-react";
import { berita } from "@/lib/site";
import { Photo } from "./Photo";

const pastel = ["bg-brand-100", "bg-[#e3f4ff]", "bg-[#e6f9f0]", "bg-[#fff1e6]"];

// Berita: judul + pengantar + tautan "Semua berita" di satu baris; kartu pertama jadi sorotan
// (dua kolom, foto besar, kutipan), tiga lainnya kartu pastel yang lebih ringkas.
// Isi masih mockup, lihat `berita` di site.ts.
export function Berita() {
  return (
    <section
      id="berita"
      aria-labelledby="berita-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <div className="reveal flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h2 id="berita-title" className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]">
              Berita <span className="em-serif text-brand-600">terbaru</span>
            </h2>
            <p className="mt-3 max-w-md text-[17px] text-navy-700">Kabar kegiatan, prestasi, dan pengumuman dari sekolah.</p>
          </div>
          <a href="#" className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-navy-700">
            Semua berita <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>

        <ul className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:mt-9 lg:h-[min(28rem,calc(100svh-19rem))] lg:grid-cols-5">
          {berita.map((b, i) => {
            const feat = i === 0;
            return (
              <li key={b.title} className={`reveal ${feat ? "sm:col-span-2 lg:col-span-2" : ""}`}>
                <a
                  href={b.href}
                  className={`group flex h-full min-h-[22rem] flex-col rounded-[2rem] p-5 transition hover:-translate-y-1 hover:shadow-lift lg:min-h-0 ${feat ? "bg-navy-900 text-white" : pastel[i % pastel.length]}`}
                >
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold">
                    <span className={`rounded-full px-3 py-1 ${feat ? "bg-brand-500 text-white" : "bg-white text-navy-900"}`}>{b.cat}</span>
                    <span className={feat ? "text-white/70" : "text-navy-700/80"}>{b.date}</span>
                    {feat && <span className="ml-auto rounded-full bg-white/15 px-3 py-1 text-white">Sorotan</span>}
                  </p>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <h3 className={`font-semibold leading-snug ${feat ? "text-[1.6rem] !text-white" : "text-[1.1rem]"}`}>{b.title}</h3>
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full transition group-hover:rotate-45 ${feat ? "bg-white text-navy-900" : "bg-white text-navy-900 group-hover:bg-navy-900 group-hover:text-white"}`}>
                      <ArrowUpRight size={17} aria-hidden />
                    </span>
                  </div>
                  {feat && <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/75">{b.excerpt}</p>}
                  <div className="relative isolate mt-4 min-h-[9rem] flex-1 overflow-hidden rounded-[1.4rem]">
                    <Photo src={b.photo} alt="" label="Foto berita" sizes="(min-width:1024px) 460px, 94vw" className="transition duration-700 group-hover:scale-105" />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
