"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fasilitas, keamanan } from "@/lib/site";
import { FasilitasCarousel } from "./FasilitasCarousel";
import { Photo } from "./Photo";

// EKSPERIMEN: empat gaya penyajian Fasilitas + Keamanan. Pilih satu lewat tombol melayang,
// lalu sisanya dihapus.
//   jam      = kartu + latar sama-tema, jarum melingkar mengganti kartu (inspo 1 & 2)
//   kipas    = animasi mengikuti scroll: kartu menumpuk lalu mengembang, lalu keluar (inspo 4 dst.)
//   geser    = tumpukan kartu yang digeser kiri-kanan (inspo 3)
//   carousel = strip kartu biasa
const variants = [
  ["jam", "Jam"],
  ["kipas", "Kipas"],
  ["geser", "Geser"],
  ["carousel", "Carousel"],
] as const;
type Variant = (typeof variants)[number][0];

export function Fasilitas() {
  const [v, setV] = useState<Variant>("jam");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id="fasilitas" aria-label="Fasilitas dan keamanan">
      {v === "jam" && <Jam />}
      {v === "kipas" && <Kipas />}
      {v === "geser" && <Geser />}
      {v === "carousel" && <Carousel />}

      {/* Pemilih eksperimen (sementara) */}
      <div
        className={`fixed right-3 top-1/2 z-40 -translate-y-1/2 transition duration-300 ${
          inView ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
        }`}
      >
        <div className="flex flex-col items-stretch gap-1 rounded-3xl bg-navy-900/90 p-1.5 text-[13px] font-semibold text-white shadow-lift ring-1 ring-white/20 backdrop-blur-xl">
          <span className="px-3 pb-1 pt-1.5 text-center text-[11px] uppercase tracking-wider text-white/55">Eksperimen</span>
          {variants.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setV(k)}
              aria-pressed={v === k}
              className={`rounded-full px-3.5 py-1.5 transition ${v === k ? "bg-white text-navy-900" : "hover:bg-white/15"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Baris keamanan: teks saja, tanpa ikon ---------- */
function Keamanan({ dark = false }: { dark?: boolean }) {
  return (
    <ul
      id="keamanan"
      aria-label="Keamanan dan kesehatan"
      className={`grid grid-cols-2 gap-y-4 border-t pt-5 lg:grid-cols-4 ${dark ? "border-white/25" : "border-navy-900/10"}`}
    >
      {keamanan.map((k, i) => (
        <li key={k.title} className={`pr-4 ${i > 0 ? "lg:border-l lg:pl-6 " : ""}${dark ? "border-white/20" : "border-navy-900/10"}`}>
          <p className={`text-[17px] font-semibold ${dark ? "text-white" : "text-navy-900"}`}>{k.title}</p>
          <p className={`mt-0.5 text-[14px] leading-snug ${dark ? "text-white/70" : "text-navy-700/80"}`}>{k.desc}</p>
        </li>
      ))}
    </ul>
  );
}

const shell = "px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6";

/* ---------- A. Jam ---------- */
const DURATION = 5200;

function Jam() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = fasilitas.length;

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), DURATION);
    return () => clearTimeout(t);
  }, [i, paused, n]);

  const f = fasilitas[i];
  return (
    <div
      className="relative isolate overflow-hidden text-white lg:h-[calc(100svh-5rem)] lg:min-h-[44rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Latar: foto yang sama dengan kartu, diperbesar dan digelapkan */}
      {fasilitas.map((x, k) => (
        <div
          key={x.title}
          aria-hidden
          className={`absolute inset-0 -z-20 transition-[opacity,transform] duration-[1400ms] ease-out ${
            k === i ? "scale-100 opacity-100" : "scale-[1.12] opacity-0"
          }`}
        >
          <Photo src={x.photo} alt="" label={x.title} sizes="100vw" />
        </div>
      ))}
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy-900/55" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/80 via-transparent to-navy-900/40" />

      <div className="mx-auto flex h-full w-full max-w-[78rem] flex-col justify-between gap-8 px-5 py-16 sm:px-8 lg:py-8">
        <h2 id="fasilitas-title" className="reveal max-w-3xl text-4xl font-semibold leading-[1.05] !text-white sm:text-5xl lg:text-[3rem]">
          Tempat belajar yang <span className="em-serif text-brand-200">aman dan nyaman</span>
        </h2>

        <div className="flex flex-col items-center gap-5">
          {/* Kartu + jarum jam */}
          <div className="relative w-[min(17rem,72vw)]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] shadow-lift ring-1 ring-white/25">
              {fasilitas.map((x, k) => (
                <div
                  key={x.title}
                  className={`absolute inset-0 transition-[opacity,transform] duration-[1000ms] ease-out ${
                    k === i ? "scale-100 opacity-100" : "scale-110 opacity-0"
                  }`}
                >
                  <Photo src={x.photo} alt={x.title} label={x.title} sizes="320px" />
                </div>
              ))}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/10 to-transparent" />
              <div key={i} className="fade-in absolute inset-x-0 bottom-0 p-5">
                <h3 className="text-[1.75rem] font-semibold leading-[1.05] !text-white">{f.title}</h3>
                <p className="mt-1.5 text-[15px] leading-snug text-white/85">{f.caption}</p>
              </div>
            </div>

            {/* Busur yang menyapu searah jarum jam, satu putaran = satu kartu */}
            <div className="absolute -right-4 -top-4 grid size-[4.25rem] place-items-center rounded-full bg-navy-900/70 ring-1 ring-white/25 backdrop-blur-md">
              <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
                <circle
                  key={i}
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  className="ring-sweep"
                  style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? "paused" : "running" }}
                />
              </svg>
              <span className="text-[13px] font-bold tabular-nums">
                {String(i + 1).padStart(2, "0")}
                <span className="text-white/55">/{String(n).padStart(2, "0")}</span>
              </span>
            </div>
          </div>

          <div className="flex gap-2" role="tablist" aria-label="Pilih fasilitas">
            {fasilitas.map((x, k) => (
              <button
                key={x.title}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={x.title}
                onClick={() => setI(k)}
                className={`h-2 rounded-full transition-all duration-500 ${k === i ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </div>

        <Keamanan dark />
      </div>
    </div>
  );
}

/* ---------- B. Kipas (mengikuti scroll) ---------- */
function Kipas() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const s = stage.current;
    if (!w || !s) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    const update = () => {
      raf = 0;
      const r = w.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = clamp(-r.top / total);
      // 0 → 0.4 mengembang, 0.4 → 0.8 tahan, 0.8 → 1 keluar
      s.style.setProperty("--s", reduced ? "1" : String(clamp(p / 0.4)));
      s.style.setProperty("--e", reduced ? "0" : String(clamp((p - 0.8) / 0.2)));
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

  const mid = (fasilitas.length - 1) / 2;
  return (
    <div ref={wrap} className="relative h-[300svh]">
      <div
        ref={stage}
        style={{ "--s": 0, "--e": 0 } as React.CSSProperties}
        className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden bg-gradient-to-b from-white via-brand-50 to-white px-5 pb-8 pt-24 sm:px-8 [--u:3.6rem] sm:[--u:8rem] lg:[--u:11.5rem]"
      >
        <div className="mx-auto w-full max-w-[78rem]">
          <h2
            id="fasilitas-title"
            className="mx-auto max-w-3xl text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.2rem]"
            style={{ transform: "translateY(calc(var(--e) * -12svh))", opacity: "calc(1 - var(--e))" }}
          >
            Tempat belajar yang <span className="em-serif text-brand-600">aman dan nyaman</span>
          </h2>

          <div className="relative mx-auto mt-10 h-[min(20rem,42svh)] sm:mt-14">
            {fasilitas.map((f, idx) => (
              <article
                key={f.title}
                style={
                  {
                    "--k": idx - mid,
                    transform:
                      "translate3d(calc(var(--k) * var(--s) * var(--u)), calc(var(--e) * -40svh), 0) rotate(calc(var(--k) * var(--s) * 3.5deg)) scale(calc(0.62 + 0.38 * var(--s)))",
                    zIndex: 10 - Math.round(Math.abs(idx - mid)),
                  } as React.CSSProperties
                }
                className="absolute left-1/2 top-0 -ml-[5.5rem] h-full w-[11rem] overflow-hidden rounded-[1.5rem] shadow-lift ring-4 ring-white sm:-ml-[7rem] sm:w-[14rem] lg:-ml-[8rem] lg:w-[16rem]"
              >
                <Photo src={f.photo} alt={f.title} label={f.title} sizes="256px" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-4">
                  <h3 className="text-[15px] font-semibold leading-tight !text-white sm:text-lg">{f.title}</h3>
                </div>
              </article>
            ))}
          </div>

          <div
            className="mt-10 sm:mt-14"
            style={{ opacity: "calc(var(--s) * var(--s) * (1 - var(--e)))", transform: "translateY(calc((1 - var(--s)) * 2rem))" }}
          >
            <Keamanan />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- C. Geser (tumpukan kartu) ---------- */
function Geser() {
  const n = fasilitas.length;
  const [order, setOrder] = useState(() => fasilitas.map((_, k) => k));
  const [dx, setDx] = useState(0);
  const start = useRef(0);
  const [dragging, setDragging] = useState(false);

  const next = () => setOrder((o) => [...o.slice(1), o[0]]);
  const prev = () => setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)]);

  return (
    <div className={`${shell} bg-gradient-to-b from-white via-brand-50 to-white`}>
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="fasilitas-title" className="reveal text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]">
          Tempat belajar yang <span className="em-serif text-brand-600">aman dan nyaman</span>
        </h2>

        <div className="mt-10 flex items-center justify-center gap-4 sm:gap-8">
          <button type="button" onClick={prev} aria-label="Sebelumnya" className="hidden size-12 shrink-0 place-items-center rounded-full bg-white ring-1 ring-brand-200 transition hover:bg-brand-600 hover:text-white active:scale-95 sm:grid">
            <ChevronLeft size={21} aria-hidden />
          </button>

          <div className="relative h-[27rem] w-[min(19rem,80vw)] touch-pan-y select-none">
            {fasilitas.map((f, idx) => {
              const pos = order.indexOf(idx);
              const front = pos === 0;
              return (
                <article
                  key={f.title}
                  onPointerDown={front ? (e) => { start.current = e.clientX; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); } : undefined}
                  onPointerMove={front ? (e) => { if (dragging) setDx(e.clientX - start.current); } : undefined}
                  onPointerUp={
                    front
                      ? () => {
                          if (dx < -70) next();
                          else if (dx > 70) prev();
                          setDx(0);
                          setDragging(false);
                        }
                      : undefined
                  }
                  style={{
                    transform: front
                      ? `translateX(${dx}px) rotate(${dx / 24}deg)`
                      : `translateY(${Math.min(pos, 3) * 1.1}rem) scale(${1 - Math.min(pos, 3) * 0.06})`,
                    opacity: pos > 2 ? 0 : 1,
                    zIndex: n - pos,
                    transition: dragging && front ? "none" : "transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s",
                  }}
                  className={`absolute inset-0 flex flex-col rounded-[1.75rem] bg-white p-3 shadow-lift ring-1 ring-brand-100 ${front ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <div className="relative flex-1 overflow-hidden rounded-[1.25rem]">
                    <Photo src={f.photo} alt={f.title} label={f.title} sizes="300px" />
                  </div>
                  <div className="px-2 pb-1.5 pt-3.5">
                    <h3 className="text-[1.25rem] font-semibold leading-tight">{f.title}</h3>
                    <p className="mt-0.5 text-[14px] leading-snug text-navy-700/80">{f.caption}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <button type="button" onClick={next} aria-label="Berikutnya" className="hidden size-12 shrink-0 place-items-center rounded-full bg-white ring-1 ring-brand-200 transition hover:bg-brand-600 hover:text-white active:scale-95 sm:grid">
            <ChevronRight size={21} aria-hidden />
          </button>
        </div>
        <p className="mt-4 text-center text-[13px] text-navy-700/60 sm:hidden">Geser kartu ke kiri atau kanan</p>

        <div className="mt-8">
          <Keamanan />
        </div>
      </div>
    </div>
  );
}

/* ---------- D. Carousel ---------- */
function Carousel() {
  return (
    <div className={shell}>
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="fasilitas-title" className="reveal text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]">
          Tempat belajar yang <span className="em-serif text-brand-600">aman dan nyaman</span>
        </h2>
        <div className="reveal mt-6 lg:mt-20">
          <FasilitasCarousel />
        </div>
        <div className="reveal mt-6">
          <Keamanan />
        </div>
      </div>
    </div>
  );
}
