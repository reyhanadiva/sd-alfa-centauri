import { ekskul, pilarNames, ranah, yearsActive } from "@/lib/site";
import { CountUp } from "./CountUp";

// Band angka: hanya fakta dari data yang sudah ada (berdiri 2009, akreditasi A, ranah, ekskul, pilar).
export function Angka() {
  const items = [
    { n: yearsActive, suffix: "", label: "tahun melayani pendidikan sejak 2009" },
    { n: ranah.length, suffix: "", label: "ranah program: Taqwa, Cerdas, Kreatif" },
    { n: ekskul.length, suffix: "", label: "ekstrakurikuler pilihan" },
    { n: pilarNames.length, suffix: "", label: "pilar karakter siswa" },
  ];
  return (
    <section aria-label="Alfa Centauri dalam angka" className="px-5 py-10 sm:px-8 lg:py-14">
      <ul className="mx-auto grid max-w-[78rem] grid-cols-2 gap-y-8 rounded-[2rem] bg-brand-50 px-6 py-9 ring-1 ring-brand-100 sm:px-10 lg:grid-cols-4 lg:gap-y-0">
        {items.map((it, i) => (
          <li key={it.label} className={`reveal px-3 text-center lg:px-6 ${i > 0 ? "lg:border-l lg:border-brand-200" : ""}`}>
            <p className="font-display text-[3.2rem] font-semibold leading-none tracking-[-0.04em] text-brand-600 sm:text-[4.2rem]">
              <CountUp to={it.n} suffix={it.suffix} />
            </p>
            <p className="mx-auto mt-2 max-w-[11rem] text-[14.5px] leading-snug text-navy-700">{it.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
