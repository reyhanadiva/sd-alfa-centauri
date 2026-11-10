"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Phone, Send, X } from "lucide-react";
import { site, spmb } from "@/lib/site";
import { getT, type Lang } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";

export function Navbar({ lang }: { lang: Lang }) {
  const { nav, portals, ui } = getT(lang);
  // solid: sudah melewati hero. Navbar mengikuti gerak scroll (naik pelan saat scroll turun, turun lagi saat scroll naik).
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    let hiddenNow = false;
    let down = 0; // jarak scroll turun berturut-turut sejak melewati hero
    let up = 0; // jarak scroll naik berturut-turut
    const apply = (hide: boolean) => {
      const h = head.current;
      if (!h || hide === hiddenNow) return;
      hiddenNow = hide;
      const H = h.offsetHeight + 8;
      // Hilang: geser naik + memudar dengan kurva melambat (650 ms). Muncul: sedikit lebih cepat (450 ms).
      // visibility ditunda sampai animasi selesai, supaya tidak "putus" di tengah jalan; saat muncul langsung terlihat.
      const d = hide ? 650 : 450;
      h.style.transition = [
        `transform ${d}ms cubic-bezier(0.22,1,0.36,1)`,
        `opacity ${hide ? 500 : 300}ms cubic-bezier(0.4,0,0.2,1)`,
        `visibility 0s linear ${hide ? d : 0}ms`,
        "background-color 300ms, box-shadow 300ms, border-color 300ms",
      ].join(", ");
      h.style.transform = `translate3d(0, ${hide ? -H : 0}px, 0)`;
      h.style.opacity = hide ? "0" : "1";
      h.style.pointerEvents = hide ? "none" : "";
      h.style.visibility = hide ? "hidden" : "visible";
    };
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const hero = document.getElementById("hero");
      const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - 96 : 80;
      setSolid(y > heroEnd);
      // garis progres baca halaman (tanpa render ulang)
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // pakai properti `scale` (bukan transform): kelas Tailwind v4 scale-x-0 memakai `scale` dan akan menimpa transform
      if (bar.current) bar.current.style.scale = `${max > 0 ? Math.min(1, y / max) : 0} 1`;
      const delta = y - last;
      last = y;
      // Navbar menggantung: tetap diam sepanjang hero dan ±700px scroll turun setelahnya, baru perlahan naik dan hilang.
      // Scroll naik ±80px sudah cukup untuk memunculkannya lagi.
      if (delta > 0) { down += delta; up = 0; } else if (delta < 0) { up -= delta; down = 0; }
      if (openRef.current || y <= heroEnd) { down = 0; apply(false); }
      else if (down > 700) apply(true);
      else if (up > 80) apply(false);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div ref={bar} aria-hidden className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-gold-400" style={{ scale: "0 1" }} />
      {/* Transparan di atas hero (teks putih), solid setelah melewati hero. Sembunyi saat scroll turun. */}
      <header
        ref={head}
        className={`fixed inset-x-0 top-0 z-50 will-change-transform ${
          solid
            ? "border-b border-brand-100/70 bg-white/75 shadow-[0_8px_30px_-18px_rgb(15_42_92/0.35)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between gap-3 px-5 sm:px-8">
          <a href="#" aria-label={ui.home} className="shrink-0">
            <Image
              src={solid ? "/images/logo-star.png" : "/images/logo-star-white.png"}
              alt="SD Alfa Centauri"
              width={208}
              height={232}
              priority
              className="h-10 w-auto transition-transform duration-500 hover:rotate-[72deg]"
            />
          </a>

          <nav aria-label={ui.mainMenu} className="hidden items-center xl:flex">
            {nav.map((item) => (
              <div key={item.label} className="group relative">
                <a
                  href={item.href}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-semibold transition ${
                    solid ? "text-navy-800 hover:bg-brand-50 hover:text-brand-700" : "text-white hover:bg-white/15"
                  }`}
                >
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className="transition group-hover:rotate-180 group-focus-within:rotate-180"
                    />
                  )}
                </a>
                {item.children && (
                  <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <ul className="rounded-2xl border border-brand-100 bg-white p-2 shadow-lift">
                      {item.children.map((c) => (
                        <li key={c.label}>
                          <a href={c.href} className="block rounded-xl px-4 py-2.5 transition hover:bg-brand-50">
                            <span className="block text-[15px] font-semibold text-navy-900">{c.label}</span>
                            {c.desc && <span className="block text-[14px] text-navy-700">{c.desc}</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Portal: dulu di top bar, sekarang dropdown kecil */}
            <div className="group relative hidden xl:block">
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-semibold transition ${
                  solid ? "text-navy-700 hover:bg-brand-50" : "text-white hover:bg-white/15"
                }`}
              >
                {ui.portal}
                <ChevronDown size={14} aria-hidden className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
              </button>
              <div className="invisible absolute right-0 top-full w-52 translate-y-2 pt-3 opacity-0 transition duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <ul className="rounded-2xl border border-brand-100 bg-white p-2 shadow-lift">
                  {portals.map((p) => (
                    <li key={p.label}>
                      <a href={p.href} className="block rounded-xl px-4 py-2.5 text-[15px] font-semibold text-navy-900 transition hover:bg-brand-50">
                        {p.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <LangToggle lang={lang} label={ui.language} className="hidden sm:flex" onDark={!solid} />

            <a
              href={spmb.href}
              className={`hidden items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-bold transition sm:inline-flex ${
                "btn-gold"
              }`}
            >
              <Send size={15} aria-hidden /> {ui.register}
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={ui.openMenu}
              aria-expanded={open}
              className={`grid size-11 place-items-center rounded-full transition xl:hidden ${
                solid ? "bg-brand-50 text-navy-800" : "bg-white/15 text-white"
              }`}
            >
              <Menu size={22} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Panel menu ponsel: di LUAR <header> karena backdrop-filter membuat elemen fixed ikut ukuran header */}
      <div className={`fixed inset-0 z-[60] xl:hidden ${open ? "visible" : "invisible"}`} aria-hidden={!open} inert={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-navy-900/50 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between px-5">
            <Image src="/images/logo-horizontal.png" alt="SD Alfa Centauri" width={1200} height={232} className="h-9 w-auto" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={ui.closeMenu}
              className="grid size-11 place-items-center rounded-full bg-brand-50"
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          <nav aria-label={ui.mobileMenu} className="flex-1 overflow-y-auto px-5 pb-6">
            <ul className="divide-y divide-brand-100">
              {nav.map((item) => (
                <li key={item.label}>
                  {item.children ? (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-lg font-bold text-navy-900">
                        {item.label}
                        <ChevronDown size={20} aria-hidden className="transition group-open:rotate-180" />
                      </summary>
                      <ul className="pb-3 pl-1">
                        {item.children.map((c) => (
                          <li key={c.label}>
                            <a
                              href={c.href}
                              onClick={() => setOpen(false)}
                              className="block rounded-xl px-3 py-2.5 text-[16px] text-navy-700 hover:bg-brand-50"
                            >
                              {c.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <a href={item.href} onClick={() => setOpen(false)} className="block py-4 text-lg font-bold text-navy-900">
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
              <li className="py-4">
                <p className="text-sm font-semibold text-navy-700">{ui.portal}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {portals.map((p) => (
                    <a key={p.label} href={p.href} className="rounded-full bg-brand-50 px-4 py-2 text-[15px] font-semibold text-brand-700">
                      {p.label}
                    </a>
                  ))}
                </div>
              </li>
            </ul>
          </nav>

          <div className="space-y-3 border-t border-brand-100 p-5">
            <div className="flex items-center justify-between">
              <a href={site.phoneHref} className="inline-flex items-center gap-2 text-[15px] font-semibold text-navy-800">
                <Phone size={16} aria-hidden /> {site.phone}
              </a>
              <LangToggle lang={lang} label={ui.language} />
            </div>
            <a
              href={spmb.href}
              onClick={() => setOpen(false)}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-bold"
            >
              <Send size={18} aria-hidden /> {ui.registerOnline}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
