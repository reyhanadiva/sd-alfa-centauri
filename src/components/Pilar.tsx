"use client";

import { useState } from "react";
import { BadgeCheck, Check, Clock, HandHelping, Mountain, Rocket, Smile, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { bintangKembar, pilar } from "@/lib/site";
import { Star } from "./Doodles";

// Urutan harus sama dengan `pilar` di src/lib/site.ts
const icons: LucideIcon[] = [BadgeCheck, Sparkles, Rocket, Clock, Mountain, Smile, HandHelping];

export function Pilar() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="pilar"
      aria-labelledby="pilar-title"
      className="relative isolate mx-3 overflow-hidden rounded-[2.25rem] bg-navy-900 text-white sm:mx-6 lg:rounded-[3rem]"
    >
      <Star className="absolute -left-14 top-10 -z-10 size-56 -rotate-12 text-white/[0.04]" />
      <Star className="absolute -right-10 bottom-0 -z-10 size-72 rotate-12 text-brand-500/[0.08]" />

      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:py-24">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="reveal">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-300">
              Pendidikan Karakter
            </p>
            <h2
              id="pilar-title"
              className="mt-4 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl"
            >
              7 Pilar Karakter <span className="hl-white">Alcenturian</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Nilai-nilai yang ditanamkan setiap hari, supaya anak tumbuh cerdas sekaligus
              berakhlak.
            </p>
          </div>

          {/* Filosofi Bintang Kembar */}
          <figure className="reveal flex items-start gap-4 rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10 sm:p-6">
            <div aria-hidden className="relative mt-1 size-14 shrink-0">
              <Star className="absolute left-0 top-3 size-9 -rotate-12 text-brand-300" />
              <Star className="absolute right-0 top-0 size-10 rotate-6 text-brand-500" />
            </div>
            <div>
              <figcaption className="text-[12px] font-bold uppercase tracking-[0.16em] text-brand-300">
                Filosofi Bintang Kembar
              </figcaption>
              <blockquote className="mt-1.5 text-[16px] leading-relaxed text-white/90">
                {bintangKembar}
              </blockquote>
            </div>
          </figure>
        </div>

        <ol className="reveal mt-12 flex flex-col gap-3 lg:mt-16 lg:h-[27rem] lg:flex-row">
          {pilar.map((p, i) => {
            const Icon = icons[i];
            const isActive = active === i;
            return (
              <li
                key={p.name}
                data-active={isActive}
                className={`group relative overflow-hidden rounded-3xl ring-1 transition-[flex-grow,background-color,box-shadow] duration-500 lg:flex-[1_1_0%] lg:data-[active=true]:flex-[5_1_0%] ${
                  isActive
                    ? "bg-gradient-to-br from-brand-500 to-brand-700 ring-white/20"
                    : "bg-white/[0.06] ring-white/10 hover:bg-white/[0.1]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-expanded={isActive}
                  aria-label={`Pilar ${i + 1}: ${p.name}`}
                  className="absolute inset-0 z-10 cursor-pointer rounded-3xl"
                />

                <div className="relative flex h-full flex-col p-5 lg:p-6">
                  <div className="flex items-center gap-3 lg:group-data-[active=false]:flex-col lg:group-data-[active=false]:items-start lg:group-data-[active=false]:gap-2.5">
                    <span className="font-display text-sm font-bold tabular-nums text-white/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl transition-colors duration-500 ${
                        isActive ? "bg-white text-brand-600" : "bg-white/10 text-brand-300"
                      }`}
                    >
                      <Icon size={22} aria-hidden />
                    </span>
                    <h3 className="font-display text-xl font-bold text-white lg:group-data-[active=false]:sr-only">
                      {p.name}
                    </h3>
                  </div>

                  {/* Nama vertikal saat panel menyempit (desktop) */}
                  <span
                    aria-hidden
                    className="hidden rotate-180 whitespace-nowrap font-display text-lg font-bold text-white/80 [writing-mode:vertical-rl] lg:absolute lg:bottom-6 lg:left-6 lg:block lg:group-data-[active=true]:hidden"
                  >
                    {p.name}
                  </span>

                  {/* Isi: accordion di ponsel, panel melebar di desktop */}
                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 group-data-[active=true]:grid-rows-[1fr] lg:mt-auto lg:grid-rows-[1fr] lg:opacity-0 lg:transition-opacity lg:duration-300 lg:group-data-[active=true]:opacity-100 lg:group-data-[active=true]:delay-200">
                    <div className="overflow-hidden">
                      <div className="pt-5 lg:w-[22rem]">
                        <p className="font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
                          {p.meaning}
                        </p>
                        <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.16em] text-white/70">
                          Perilaku yang diharapkan
                        </p>
                        <ul className="mt-3 space-y-2.5">
                          {p.behaviors.map((b) => (
                            <li key={b} className="flex items-start gap-3 text-[16px] text-white/95">
                              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white text-brand-600">
                                <Check size={12} strokeWidth={3.5} aria-hidden />
                              </span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
