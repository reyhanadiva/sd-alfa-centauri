import { Icon } from "./icons";

// Kegiatan pendampingan: daftar statis yang membungkus ke baris berikutnya (tanpa gerak otomatis, tanpa JS).
export function ActivityRail({ items, label }: { items: readonly { icon: string; label: string }[]; label: string }) {
  return (
    <ul aria-label={label} className="mx-auto flex max-w-[78rem] flex-wrap justify-center gap-3 px-5 sm:px-8">
      {items.map((a) => (
        <li
          key={a.label}
          className="flex items-center gap-3 rounded-full bg-white/[0.08] py-2 pl-2 pr-5 ring-1 ring-white/20"
        >
          <span className="grid size-10 place-items-center rounded-full bg-white text-brand-600">
            <Icon name={a.icon} size={20} />
          </span>
          <span className="text-[16px] font-semibold leading-snug text-white">{a.label}</span>
        </li>
      ))}
    </ul>
  );
}
