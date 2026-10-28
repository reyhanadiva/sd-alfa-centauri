"use client";

import { useState } from "react";
import { ranah } from "@/lib/site";
import { EkskulPanel } from "./EkskulPanel";
import { Icon } from "./icons";
import { Photo } from "./Photo";

// Explorer program: tiga ranah (Taqwa, Cerdas, Kreatif) sebagai tab di kiri,
// ekstrakurikuler sebagai kisi ikon di kanan. Satu layar, tanpa paragraf panjang.
export function Program() {
  const [state, setState] = useState({ active: 0, dir: 1 });
  const { active, dir } = state;
  const r = ranah[active];
  const select = (i: number) => setState((s) => (i === s.active ? s : { active: i, dir: i > s.active ? 1 : -1 }));

  return (
    <section
      id="program"
      aria-labelledby="program-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2
          id="program-title"
          className="reveal text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]"
        >
          Program yang menumbuhkan{" "}
          <span className="em-serif text-brand-600">Taqwa, Cerdas, dan Kreatif</span>
        </h2>

        <div className="mt-8 grid gap-3.5 lg:mt-9 lg:h-[min(31rem,calc(100svh-16rem))] lg:grid-cols-[1.45fr_1fr]">
          {/* Tab ranah */}
          <div className="reveal flex min-w-0 flex-col rounded-[2rem] bg-brand-50 p-6 ring-1 ring-brand-100 sm:p-7">
            {/* Tab dengan indikator yang bergeser */}
            <div
              role="tablist"
              aria-label="Ranah program"
              className="relative grid w-full max-w-sm grid-cols-3 rounded-full bg-white p-1 ring-1 ring-brand-100"
            >
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-brand-600 shadow-md shadow-brand-600/30 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(${active * 100}%)` }}
              />
              {ranah.map((x, i) => (
                <button
                  key={x.key}
                  role="tab"
                  type="button"
                  id={`tab-${x.key}`}
                  aria-selected={active === i}
                  aria-controls="panel-ranah"
                  onClick={() => select(i)}
                  className={`relative z-10 rounded-full px-2 py-2 text-[15px] font-bold transition-colors duration-300 ${
                    active === i ? "text-white" : "text-navy-700 hover:text-brand-700"
                  }`}
                >
                  {x.key}
                </button>
              ))}
            </div>

            <div
              key={r.key}
              id="panel-ranah"
              role="tabpanel"
              aria-labelledby={`tab-${r.key}`}
              className="mt-6 flex flex-1 flex-col gap-5 sm:flex-row"
            >
              <div className={`flex flex-1 flex-col ${dir > 0 ? "slide-r" : "slide-l"}`}>
                <p className="em-serif text-[2rem] leading-tight text-navy-900 sm:text-[2.2rem]">{r.tagline}</p>
                <ul className="mt-5 grid flex-1 content-center gap-2.5">
                  {r.items.map((it) => (
                    <li key={it.title} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-brand-100">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                        <Icon name={it.icon} size={18} />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[15px] font-semibold text-navy-900">{it.title}</span>
                        {"desc" in it && it.desc && (
                          <span className="mt-0.5 block text-[13px] text-navy-700/75">{it.desc}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="fade-in relative min-h-[14rem] overflow-hidden rounded-3xl sm:min-h-0 sm:w-[38%]">
                <Photo
                  src={r.photo}
                  alt={r.photoLabel}
                  label={r.photoLabel}
                  sizes="(min-width: 1024px) 280px, 90vw"
                />
              </div>
            </div>
          </div>

          <EkskulPanel />
        </div>
      </div>
    </section>
  );
}
