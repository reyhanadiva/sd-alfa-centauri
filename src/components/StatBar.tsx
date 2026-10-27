import { stats } from "@/lib/site";
import { CountUp } from "./CountUp";

export function StatBar() {
  return (
    <section aria-label="Sekilas SD Alfa Centauri" className="px-5 pb-20 pt-16 sm:px-8 lg:pb-28 lg:pt-20">
      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-y-10 lg:grid-cols-4 lg:gap-y-0">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`reveal px-4 text-center ${
              i > 0 ? "lg:border-l lg:border-brand-100" : ""
            } ${i % 2 === 1 ? "border-l border-brand-100 lg:border-l" : ""}`}
          >
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <p className="font-display text-5xl font-extrabold leading-none text-brand-600 sm:text-6xl">
                {s.text ? (
                  s.text
                ) : s.count == null ? (
                  <span title="Data menyusul">XXX{s.suffix}</span>
                ) : (
                  <CountUp to={s.count} suffix={s.suffix} />
                )}
              </p>
              <p className="mt-3 text-base font-bold text-navy-900">{s.label}</p>
              {s.note && <p className="mt-0.5 text-sm text-navy-700/70">{s.note}</p>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
