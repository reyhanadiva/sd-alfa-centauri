"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { Star } from "./Doodles";

// Kegiatan pendampingan sebagai rasi bintang: tiap kegiatan satu bintang, tersambung garis.
// Kursor menjadi "senter": bintang terdekat menyala, garis ke tetangganya ikut terang, bintang latar bergeser pelan.
// Tanpa kursor (ponsel / diam), bintang menyala bergiliran. "Reduce motion": semua diam, garis langsung tampil.
// Makna: setiap anak bersinar dengan caranya sendiri, dan pendampingan menyambungkan semuanya.

type Item = { icon: string; label: string };

// Posisi (persen) untuk layar lebar dan ponsel (potret)
const WIDE = [[12, 64], [27, 28], [43, 62], [58, 26], [73, 60], [88, 30]];
const TALL = [[35, 7], [64, 23], [35, 40], [64, 57], [35, 74], [64, 90]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 3], [2, 4]];

// Bintang latar: posisi tetap (deterministik) supaya server dan browser sama
let seed = 20090712;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const DUST = Array.from({ length: 46 }, () => {
  const [x, y, s, d, o] = [rnd(), rnd(), rnd(), rnd(), rnd()];
  return { x: +(x * 100).toFixed(2), y: +(y * 100).toFixed(2), s: 1 + Math.round(s * 2), d: +d.toFixed(3), o: +(0.25 + o * 0.5).toFixed(2) };
});

export function Constellation({ items, label }: { items: readonly Item[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);
  const [on, setOn] = useState(-1);
  const [seen, setSeen] = useState(false);
  const lastPointer = useRef(0);
  const n = Math.min(items.length, WIDE.length);

  // Muncul saat terlihat; giliran menyala saat tidak ada kursor
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) setSeen(true);
    }, { threshold: 0.3 });
    io.observe(el);
    let k = 0;
    const t = reduce
      ? undefined
      : setInterval(() => {
          if (!visible || performance.now() - lastPointer.current < 2500) return;
          setOn(k % n);
          k++;
        }, 1700);
    return () => {
      io.disconnect();
      if (t) clearInterval(t);
    };
  }, [n]);

  const raf = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    lastPointer.current = performance.now();
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sx", `${x - r.left}px`);
      el.style.setProperty("--sy", `${y - r.top}px`);
      el.style.setProperty("--px", `${((x - r.left) / r.width - 0.5) * 2}`);
      el.style.setProperty("--py", `${((y - r.top) / r.height - 0.5) * 2}`);
      let best = -1;
      let dist = 190;
      nodes.current.forEach((nd, i) => {
        if (!nd) return;
        const b = nd.getBoundingClientRect();
        const d = Math.hypot(b.left + b.width / 2 - x, b.top + 14 - y);
        if (d < dist) { dist = d; best = i; }
      });
      setOn(best);
    });
  };

  const lit = (a: number, b: number) => on === a || on === b;
  const lines = (pos: number[][]) =>
    EDGES.filter(([a, b]) => a < n && b < n).map(([a, b], i) => (
      <line
        key={`${a}-${b}`}
        x1={pos[a][0]} y1={pos[a][1]} x2={pos[b][0]} y2={pos[b][1]}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        className={`transition-[opacity,stroke,stroke-width] ease-out ${lit(a, b) ? "stroke-gold-300" : "stroke-white"}`}
        style={{
          opacity: seen ? (lit(a, b) ? 0.95 : 0.25) : 0,
          strokeWidth: lit(a, b) ? 2 : 1.25,
          transitionDuration: seen && !lit(a, b) ? "900ms" : "400ms",
          transitionDelay: seen && on < 0 ? `${300 + i * 140}ms` : "0ms",
        }}
      />
    ));

  return (
    <div
      ref={box}
      onPointerMove={onMove}
      onPointerLeave={() => setOn(-1)}
      className="group/c relative mx-auto h-[38rem] w-full max-w-[80rem] sm:h-[28rem]"
    >
      {/* Senter kursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/c:opacity-100"
        style={{ background: "radial-gradient(20rem circle at var(--sx, 50%) var(--sy, 50%), rgb(111 162 255 / 0.2), transparent 70%)" }}
      />

      {/* Debu bintang, bergeser berlawanan arah kursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[10%] -inset-y-16 transition-transform duration-700 ease-out [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_75%)]"
        style={{ transform: "translate(calc(var(--px, 0) * -14px), calc(var(--py, 0) * -10px))" }}
      >
        {DUST.map((s, i) => (
          <span
            key={i}
            className="twinkle absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o,
              "--dur": `${2.5 + s.d * 3}s`, "--delay": `${-s.d * 4}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Garis rasi */}
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full sm:hidden">{lines(TALL)}</svg>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 hidden size-full sm:block">{lines(WIDE)}</svg>

      <ul aria-label={label}>
        {items.slice(0, n).map((a, i) => {
          const active = on === i;
          return (
            <li
              key={a.label}
              ref={(el) => { nodes.current[i] = el; }}
              className="absolute left-[var(--mx)] top-[var(--my)] flex -translate-x-1/2 -translate-y-[14px] flex-col items-center gap-2 transition-opacity duration-700 sm:left-[var(--x)] sm:top-[var(--y)]"
              style={{
                "--x": `${WIDE[i][0]}%`, "--y": `${WIDE[i][1]}%`, "--mx": `${TALL[i][0]}%`, "--my": `${TALL[i][1]}%`,
                opacity: seen ? 1 : 0, transitionDelay: seen ? `${150 + i * 160}ms` : "0ms",
              } as React.CSSProperties}
            >
              <span className="relative grid size-7 place-items-center">
                <span
                  aria-hidden
                  className={`absolute inset-[-14px] rounded-full bg-[radial-gradient(circle,rgb(255_201_60/0.55),transparent_65%)] transition duration-500 ${active ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
                />
                <Star
                  className={`relative size-7 transition duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${active ? "rotate-[36deg] scale-[1.45] text-gold-300" : "text-white/85"}`}
                />
              </span>
              <span
                className={`flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3.5 text-[14px] font-semibold ring-1 transition duration-500 ${
                  active ? "bg-white text-navy-900 ring-white" : "bg-navy-900/60 text-white ring-white/20 backdrop-blur"
                }`}
              >
                <span className={`grid size-7 place-items-center rounded-full transition ${active ? "bg-gold-300 text-navy-900" : "bg-white/10 text-brand-200"}`}>
                  <Icon name={a.icon} size={15} />
                </span>
                {a.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
