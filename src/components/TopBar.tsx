import { Phone, Mail, UserRound, GraduationCap } from "lucide-react";
import { site } from "@/lib/site";
import { LangToggle } from "./LangToggle";

export function TopBar() {
  return (
    <div className="hidden bg-navy-900 text-[13px] text-white/85 md:block">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <a
            href={site.phoneHref}
            className="inline-flex items-center gap-2 transition hover:text-white"
          >
            <Phone size={14} aria-hidden /> {site.phone}
          </a>
          <a
            href={`mailto:${site.email}`}
            className="hidden items-center gap-2 transition hover:text-white lg:inline-flex"
          >
            <Mail size={14} aria-hidden /> {site.email}
          </a>
        </div>

        <div className="flex items-center gap-5">
          {/* TODO: isi URL portal yang sebenarnya */}
          <a
            href="#"
            className="inline-flex items-center gap-2 font-semibold text-white transition hover:text-brand-300"
          >
            <UserRound size={14} aria-hidden /> Portal Orang Tua
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 font-semibold text-white transition hover:text-brand-300"
          >
            <GraduationCap size={14} aria-hidden /> Portal Guru
          </a>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
