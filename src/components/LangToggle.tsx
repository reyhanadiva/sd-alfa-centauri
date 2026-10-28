import type { Lang } from "@/lib/lang";

// Pindah bahasa = pindah halaman: "/" (Indonesia) dan "/en" (English). Tanpa JS, ramah mesin pencari (hreflang).
export function LangToggle({ lang, label, className = "", onDark = false }: { lang: Lang; label: string; className?: string; onDark?: boolean }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center rounded-full p-0.5 text-[12px] font-bold transition-colors ${onDark ? "bg-white/15" : "bg-brand-50"} ${className}`}
    >
      {(["id", "en"] as const).map((l) => (
        <a
          key={l}
          href={l === "en" ? "/en" : "/"}
          hrefLang={l}
          lang={l}
          aria-current={lang === l ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            lang === l
              ? "bg-white text-navy-900 shadow-sm"
              : onDark
                ? "text-white/80 hover:text-white"
                : "text-navy-700/70 hover:text-navy-900"
          }`}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
