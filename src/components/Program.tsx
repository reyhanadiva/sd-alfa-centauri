"use client";

import { useState } from "react";
import { ekskul, ranah } from "@/lib/site";
import { Icon } from "./icons";

// Explorer program: tiga ranah (Taqwa, Cerdas, Kreatif) sebagai tab di kiri,
// ekstrakurikuler sebagai kisi ikon di kanan. Satu layar, tanpa paragraf panjang.
export function Program() {
  const [active, setActive] = useState(0);
  const r = ranah[active];

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
          <div className="reveal flex flex-col rounded-[2rem] bg-brand-50 p-6 ring-1 ring-brand-100 sm:p-7">
            <div role="tablist" aria-label="Ranah program" className="flex w-fit gap-1 rounded-full bg-white p-1 ring-1 ring-brand-100">
              {ranah.map((x, i) => (
                <button
                  key={x.key}
                  role="tab"
                  type="button"
                  id={`tab-${x.key}`}
                  aria-selected={active === i}
                  aria-controls="panel-ranah"
                  onClick={() => setActive(i)}
                  className={`rounded-full px-5 py-2 text-[15px] font-bold transition ${
                    active === i ? "bg-brand-600 text-white" : "text-navy-700 hover:bg-brand-50"
                  }`}
                >
                  {x.key}
                </button>
              ))}
            </div>

            <div id="panel-ranah" role="tabpanel" aria-labelledby={`tab-${r.key}`} className="mt-6 flex flex-1 flex-col">
              <p className="em-serif text-[2rem] leading-tight text-navy-900 sm:text-[2.4rem]">{r.tagline}</p>
              <ul className="mt-5 grid flex-1 content-center gap-3 sm:grid-cols-2">
                {r.items.map((it) => (
                  <li key={it.title} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-brand-100">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                      <Icon name={it.icon} size={19} />
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
          </div>

          {/* Ekskul */}
          <div id="ekskul" className="reveal flex flex-col rounded-[2rem] bg-navy-900 p-6 text-white sm:p-7">
            <h3 className="text-2xl font-semibold !text-white">Ekstrakurikuler</h3>
            <p className="mt-1 text-[15px] text-white/65">Pilih sesuai minat ananda.</p>
            <ul className="mt-5 grid flex-1 grid-cols-3 gap-2.5">
              {ekskul.map((e) => (
                <li
                  key={e.label}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.07] p-2 py-4 text-center ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-white text-brand-600">
                    <Icon name={e.icon} size={19} />
                  </span>
                  <span className="text-[13px] font-semibold leading-tight">{e.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
