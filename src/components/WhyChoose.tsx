import { pilarNames, ssc, unggulanPills } from "@/lib/site";
import { Photo } from "./Photo";
import { Plus, Star } from "./Doodles";

// Bento 4 kartu, muat satu layar. Pembagian peran:
// hero = bukti singkat, bento = apa yang anak dapatkan (program, karakter, kurikulum, kemitraan).
export function WhyChoose() {
  return (
    <section
      id="mengapa"
      aria-labelledby="mengapa-title"
      className="relative bg-gradient-to-b from-white via-brand-50/80 to-white px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-8"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="reveal flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h2
            id="mengapa-title"
            className="font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:whitespace-nowrap"
          >
            Mengapa memilih <span className="hl">SD Alfa Centauri?</span>
          </h2>
          <p className="max-w-md text-base text-navy-700 lg:pb-1.5">
            Keunggulan akademik, karakter islami, dan kemitraan strategis untuk generasi yang Taqwa,
            Cerdas, dan Kreatif.
          </p>
        </div>

        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:mt-9 lg:h-[min(33rem,calc(100svh-18rem))] lg:grid-cols-4 lg:grid-rows-2">
          {/* Program unggulan: kartu terbesar */}
          <article className="reveal relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white sm:col-span-2 sm:p-7 lg:row-span-2">
            <Star className="absolute -right-8 -top-8 size-44 rotate-12 text-white/10" />
            <h3 className="relative font-display text-2xl font-bold text-white sm:text-[1.75rem]">
              Program Unggulan Terpadu
            </h3>
            <p className="relative mt-2 max-w-md text-[15px] leading-relaxed text-white/85">
              Program komprehensif untuk mengembangkan potensi, minat, bakat, dan kepedulian
              lingkungan siswa.
            </p>
            <ul className="relative mt-4 flex flex-wrap gap-2">
              {unggulanPills.map((p) => (
                <li
                  key={p}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-[14px] font-semibold ring-1 ring-white/25"
                >
                  {p}
                </li>
              ))}
            </ul>
            {/* TODO: ganti dengan foto kegiatan siswa */}
            <div className="relative mt-5 min-h-[9rem] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/30">
              <Photo
                alt="Siswa mengikuti kegiatan belajar"
                label="Kegiatan siswa"
                sizes="(min-width: 1024px) 560px, 92vw"
              />
            </div>
          </article>

          {/* 7 pilar sebagai pills */}
          <article className="reveal relative flex flex-col justify-center overflow-hidden rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-brand-100 sm:col-span-2 sm:p-7">
            <Plus className="absolute right-6 top-6 size-5 text-brand-300" />
            <h3 className="font-display text-2xl font-bold">7 Pilar Karakter</h3>
            <p className="mt-1.5 text-[15px] text-navy-700">Ditanamkan setiap hari di sekolah.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {pilarNames.map((p) => (
                <li
                  key={p}
                  className="rounded-full bg-brand-50 px-3.5 py-1.5 text-[14px] font-semibold text-brand-700 ring-1 ring-brand-100"
                >
                  {p}
                </li>
              ))}
            </ul>
          </article>

          {/* Kurikulum */}
          <article className="reveal flex flex-col rounded-[2rem] bg-brand-100 p-6">
            <h3 className="font-display text-xl font-bold">Kurikulum Adaptif</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-700">
              Kurikulum Nasional yang disesuaikan dengan bakat dan keunikan tiap siswa.
            </p>
            <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {["Gakko Tosho", "Surala"].map((c) => (
                <li key={c} className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-brand-700">
                  {c}
                </li>
              ))}
            </ul>
          </article>

          {/* Kemitraan SSC, tanpa logo */}
          <article className="reveal flex flex-col rounded-[2rem] bg-navy-900 p-6 text-white">
            <h3 className="font-display text-xl font-bold text-white">Bimbel bersama SSC</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/80">
              Tambahan jam belajar intensif untuk kelas atas bersama{" "}
              {ssc.href ? (
                <a href={ssc.href} className="font-semibold text-white underline underline-offset-4">
                  {ssc.name}
                </a>
              ) : (
                <strong className="font-semibold text-white">{ssc.name}</strong>
              )}
              .
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
