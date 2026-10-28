import { useId } from "react";
import { Star } from "./Doodles";

// Dekorasi langit bergerak untuk CTA dan footer. Semua aria-hidden; reduce-motion dimatikan lewat CSS global.
// Awan satu gumpalan dengan tepi membulat dan gradasi lembut (putih ke biru muda), bukan lingkaran tumpuk.
export function Cloud({ className = "" }: { className?: string }) {
  const id = `cg${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 220 96" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#cfe2ff" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M40 86C14 86 6 58 30 52c-4-26 30-38 50-20C90 8 134 6 146 34c24-12 56 4 46 28 18 4 20 24-2 24Z"
      />
    </svg>
  );
}

const CLOUDS = [
  { top: "9%", w: "w-28", dur: "85s", delay: "-20s", o: "opacity-[0.16]" },
  { top: "30%", w: "w-48", dur: "120s", delay: "-70s", o: "opacity-[0.12]" },
  { top: "52%", w: "w-24", dur: "95s", delay: "-45s", o: "opacity-[0.14]" },
  { top: "70%", w: "w-40", dur: "140s", delay: "-100s", o: "opacity-[0.1]" },
];

// `color` dipertahankan agar pemanggil lama tetap jalan; warna kini dari gradasi awan dan opacity per lapisan.
export function Clouds({ color: _color }: { color?: string } = {}) {
  void _color;
  return (
    <>
      {CLOUDS.map((c, i) => (
        <div key={i} aria-hidden className="cloud-drift absolute left-0" style={{ top: c.top, "--dur": c.dur, "--delay": c.delay } as React.CSSProperties}>
          <Cloud className={`${c.w} ${c.o}`} />
        </div>
      ))}
    </>
  );
}

const STARS = [
  ["8%", "18%", "size-3"], ["22%", "52%", "size-2"], ["34%", "14%", "size-4"], ["47%", "40%", "size-2"],
  ["58%", "10%", "size-3"], ["71%", "46%", "size-4"], ["83%", "16%", "size-2"], ["92%", "38%", "size-3"],
];

export function Twinkles({ color = "text-white" }: { color?: string }) {
  return (
    <>
      {STARS.map(([l, t, z], i) => (
        <Star
          key={i}
          className={`twinkle absolute ${z} ${color}`}
          style={{ left: l, top: t, "--dur": `${2.4 + (i % 4) * 0.7}s`, "--delay": `${-i * 0.6}s` } as React.CSSProperties}
        />
      ))}
    </>
  );
}

export function PaperPlane({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" aria-hidden className={className} fill="none">
      <path d="M2 18 62 2 40 38 29 24 2 18Z" fill="#fff" />
      <path d="M29 24 62 2 33 28Z" fill="#cfe2ff" />
      <path d="M29 24 33 36 38 28" fill="#a6c8ff" />
    </svg>
  );
}

// Bintang jatuh: garis tipis yang melintas diagonal secara berkala.
export function ShootingStars() {
  const items = [
    { top: "6%", left: "88%", dur: "12s", delay: "1s" },
    { top: "22%", left: "70%", dur: "15s", delay: "6s" },
    { top: "4%", left: "55%", dur: "18s", delay: "10s" },
  ];
  return (
    <>
      {items.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="shoot absolute h-[2px] w-28 rounded-full bg-gradient-to-r from-white via-white/50 to-transparent"
          style={{ top: s.top, left: s.left, "--dur": s.dur, "--delay": s.delay } as React.CSSProperties}
        />
      ))}
    </>
  );
}

// Bintang kembar: dua bintang berbeda ukuran saling mengitari dalam cahaya lembut.
export function BinaryStar({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative ${className}`}>
      <div className="glow-pulse absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgb(111_162_255/0.6),transparent_65%)] blur-md" />
      <div className="absolute inset-3 rounded-full border border-dashed border-white/30" />
      <div className="orbit absolute inset-0" style={{ "--dur": "14s" } as React.CSSProperties}>
        <Star className="absolute left-1/2 top-0 size-[38%] -translate-x-1/2 -translate-y-1/4 text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
        <Star className="absolute bottom-0 left-1/2 size-[22%] -translate-x-1/2 translate-y-1/4 text-brand-300 drop-shadow-[0_0_10px_rgba(111,162,255,0.9)]" />
      </div>
    </div>
  );
}
