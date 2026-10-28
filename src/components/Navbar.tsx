"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Phone, Send, X } from "lucide-react";
import { nav, portals, site, spmb } from "@/lib/site";
import { LangToggle } from "./LangToggle";

export function Navbar() {
  // solid: sudah melewati hero. hidden: sedang scroll turun (muncul lagi saat scroll naik).
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    let down = 0; // jarak scroll turun berturut-turut
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const hero = document.getElementById("hero");
      const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - 96 : 80;
      setSolid(y > heroEnd);
      // garis progres baca halaman (tanpa render ulang)
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const delta = y - last;
      if (Math.abs(delta) > 4) {
        // Baru sembunyi setelah scroll turun cukup jauh (±350px); naik sedikit saja langsung muncul.
        down = delta > 0 ? down + delta : 0;
        // Navbar tetap menggantung sepanjang hero; baru boleh sembunyi setelah hero lewat.
        setHidden(delta > 0 && down > 350 && y > heroEnd);
        last = y;
      }
      if (y < 40) setHidden(false);
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
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div ref={bar} aria-hidden className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left scale-x-0 bg-brand-500" />
      {/* Transparan di atas hero (teks putih), solid setelah melewati hero. Sembunyi saat scroll turun. */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow,border-color] duration-300 ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${
          solid
            ? "border-b border-brand-100/70 bg-white/80 shadow-[0_8px_30px_-18px_rgb(15_42_92/0.4)] backdrop-blur-xl backdrop-saturate-150"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between gap-3 px-5 sm:px-8">
          <a href="#" aria-label="SD Alfa Centauri, ke beranda" className="shrink-0">
            <Image
              src={solid ? "/images/logo-horizontal.png" : "/images/logo-horizontal-white.png"}
              alt="SD Alfa Centauri"
              width={1200}
              height={232}
              priority
              className="h-9 w-auto"
            />
          </a>

          <nav aria-label="Menu utama" className="hidden items-center lg:flex">
            {nav.map((item) => (
              <div key={item.label} className="group relative">
                <a
                  href={item.href}
                  className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold transition ${
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
                            {c.desc && <span className="block text-[13px] text-navy-700/70">{c.desc}</span>}
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
            <div className="group relative hidden lg:block">
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-semibold transition ${
                  solid ? "text-navy-700 hover:bg-brand-50" : "text-white/90 hover:bg-white/15"
                }`}
              >
                Portal
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

            <LangToggle className="hidden xl:flex" onDark={!solid} />

            <a
              href={spmb.href}
              className={`hidden items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-bold transition sm:inline-flex ${
                solid ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-white text-navy-900 hover:bg-brand-50"
              }`}
            >
              <Send size={15} aria-hidden /> Daftar SPMB
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-expanded={open}
              className={`grid size-11 place-items-center rounded-full transition lg:hidden ${
                solid ? "bg-brand-50 text-navy-800" : "bg-white/15 text-white"
              }`}
            >
              <Menu size={22} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Panel menu ponsel: di LUAR <header> karena backdrop-filter membuat elemen fixed ikut ukuran header */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${open ? "visible" : "invisible"}`} aria-hidden={!open}>
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
              aria-label="Tutup menu"
              className="grid size-11 place-items-center rounded-full bg-brand-50"
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          <nav aria-label="Menu seluler" className="flex-1 overflow-y-auto px-5 pb-6">
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
                <p className="text-sm font-semibold text-navy-700/70">Portal</p>
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
              <LangToggle />
            </div>
            <a
              href={spmb.href}
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 font-bold text-white"
            >
              <Send size={18} aria-hidden /> Daftar SPMB Online
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
