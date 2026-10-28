import { yearsActive } from "@/lib/site";
import { CountUp } from "./CountUp";
import { getT, type Lang } from "@/lib/i18n";

// Angka sekolah, menempel di bawah "Mengapa memilih". `n: null` = belum ada data, tampil "XX+".
// TODO(data real): isi jumlah siswa, guru, dan alumni dari sekolah; hanya tahun melayani yang sudah pasti (sejak 2009).
const nums: (number | null)[] = [yearsActive, null, null, null];

export function Angka({ lang }: { lang: Lang }) {
  const { stats } = getT(lang);
  const items = stats.labels.map((label, i) => ({ n: nums[i], label }));
  return (
    <ul aria-label={stats.aria} className="mt-10 grid grid-cols-2 gap-y-7 border-t border-navy-900/10 pt-8 lg:grid-cols-4 lg:gap-y-0">
      {items.map((it, i) => (
        <li key={it.label} className={`reveal px-3 text-center lg:px-6 ${i > 0 ? "lg:border-l lg:border-navy-900/10" : ""}`}>
          <p className="font-display text-[2.8rem] font-semibold leading-none tracking-[-0.04em] text-brand-600 sm:text-[3.4rem]">
            {it.n === null ? "XX+" : <CountUp to={it.n} suffix="+" />}
          </p>
          <p className="mt-2 text-[14.5px] leading-snug text-navy-700">{it.label}</p>
        </li>
      ))}
    </ul>
  );
}
