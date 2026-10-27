"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Phone, Send, X } from "lucide-react";
import { nav, portals, site, spmb } from "@/lib/site";
import { LangToggle } from "./LangToggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Wrapper transparan; hanya pill-nya yang menerima klik */}
      <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-5">
        <div
          className={`pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full pl-5 pr-2 ring-1 ring-brand-100 transition-all duration-300 ${
            scrolled
              ? "h-14 bg-white/75 shadow-[0_10px_30px_-14px_rgb(15_42_92/0.4)] backdrop-blur-xl"
              : "h-16 bg-white shadow-soft"
          }`}
        >
          <a href="#" aria-label="SD Alfa Centauri, ke beranda" className="shrink-0">
            <Image
              src="/images/logo-horizontal.png"
              alt="SD Alfa Centauri"
              width={1200}
              height={232}
              priority
              className={`w-auto transition-all duration-300 ${scrolled ? "h-8" : "h-9"}`}
            />
          </a>

          <nav aria-label="Menu utama" className="hidden items-center lg:flex">
            {nav.map((item) => (
              <div key={item.label} className="group relative">
                <a
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold text-navy-800 transition hover:bg-brand-50 hover:text-brand-700"
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
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-semibold text-navy-700 transition hover:bg-brand-50"
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

            <LangToggle className="hidden xl:flex" />

            <a
              href={spmb.href}
              className="hidden items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[15px] font-bold text-white transition hover:bg-brand-700 sm:inline-flex"
            >
              <Send size={15} aria-hidden /> Daftar SPMB
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-expanded={open}
              className="grid size-11 place-items-center rounded-full bg-brand-50 text-navy-800 lg:hidden"
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
