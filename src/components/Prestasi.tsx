import { getT, type Lang } from "@/lib/i18n";
import { CountUp } from "./CountUp";
import { Star } from "./Doodles";
import { SnapRail } from "./SnapRail";

// Total prestasi (angka besar) + sorotan per kategori. Tanpa tombol: halaman prestasi lengkap belum ada.
// Semua angka/nama lomba masih placeholder (lihat `prestasi` di site.ts).
const tones = ["bg-brand-100", "bg-white ring-1 ring-brand-100 shadow-soft", "bg-brand-50 ring-1 ring-brand-100", "bg-brand-100"];

export function Prestasi({ lang }: { lang: Lang }) {
  const { prestasi } = getT(lang);
  return (
    <section
      id="prestasi"
      aria-labelledby="prestasi-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="prestasi-title" className="reveal text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]">
          {prestasi.title[0]}<span className="em-serif text-brand-600">{prestasi.title[1]}</span>
        </h2>

        <div className="mt-8 grid gap-3.5 lg:mt-9 lg:h-[min(32rem,calc(100svh-17rem))] lg:grid-cols-[0.8fr_1.4fr]">
          <div className="reveal relative flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-navy-900 p-8 text-white">
            <Star className="absolute -right-10 -top-10 size-56 rotate-12 text-white/[0.06]" />
            <p className="relative text-[17px] font-semibold text-white/75">{prestasi.totalLabel}</p>
            <div className="relative">
              <p className="font-display text-[6rem] font-semibold leading-none tracking-[-0.05em] sm:text-[7.5rem]">
                <CountUp to={prestasi.total} suffix="+" />
              </p>
              <p className="mt-2 text-[17px] text-white/75">{prestasi.sinceText.replace("{y}", String(prestasi.since))}</p>
            </div>
          </div>

          <SnapRail label={prestasi.aria} basis="86%" wrapperClassName="lg:h-full" className="sm:grid sm:grid-cols-2 lg:h-full lg:grid-rows-2">
            {prestasi.categories.map((c, i) => (
              <article key={c.name} className={`flex flex-col rounded-[2rem] p-6 ${tones[i]}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xl font-semibold">{c.name}</h3>
                  <p className="font-display text-[1.9rem] font-semibold leading-none tracking-[-0.03em] text-brand-600">{c.count}</p>
                </div>
                <ul className="mt-auto space-y-2.5 pt-4">
                  {c.items.map(([rank, text]) => (
                    <li key={text} className="flex items-start gap-3 text-[14.5px] leading-snug text-navy-700">
                      <span className="mt-px shrink-0 rounded-full bg-navy-900 px-2.5 py-0.5 text-[12px] font-bold text-white">{rank}</span>
                      {text}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </SnapRail>
        </div>
      </div>
    </section>
  );
}
