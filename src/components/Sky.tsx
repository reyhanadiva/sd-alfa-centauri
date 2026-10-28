import { Star } from "./Doodles";

// Dekorasi langit bergerak untuk CTA dan footer. Semua aria-hidden; reduce-motion dimatikan lewat CSS global.
export function Cloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 52" aria-hidden className={className} fill="currentColor">
      <circle cx="34" cy="32" r="18" />
      <circle cx="62" cy="22" r="22" />
      <circle cx="92" cy="32" r="16" />
      <rect x="16" y="32" width="92" height="18" rx="9" />
    </svg>
  );
}

const CLOUDS = [
  { top: "12%", w: "w-24", dur: "70s", delay: "-10s", o: "opacity-70" },
  { top: "34%", w: "w-36", dur: "95s", delay: "-55s", o: "opacity-90" },
  { top: "60%", w: "w-20", dur: "80s", delay: "-30s", o: "opacity-60" },
];

export function Clouds({ color = "text-white" }: { color?: string }) {
  return (
    <>
      {CLOUDS.map((c, i) => (
        <div key={i} aria-hidden className="cloud-drift absolute left-0" style={{ top: c.top, "--dur": c.dur, "--delay": c.delay } as React.CSSProperties}>
          <Cloud className={`${c.w} ${color} ${c.o}`} />
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

// Siluet gedung sekolah dengan jendela menyala; dipakai di bukit footer.
export function SchoolSilhouette({ className = "" }: { className?: string }) {
  const win = (x: number, y: number, k: number) => (
    <rect key={`${x}-${y}`} x={x} y={y} width="9" height="12" rx="1.5" fill="#cfe2ff" className="twinkle" style={{ "--dur": `${3 + (k % 3)}s`, "--delay": `${-k * 0.7}s` } as React.CSSProperties} />
  );
  const row1 = [40, 60, 80, 205, 225, 245];
  const row2 = [40, 60, 80, 205, 225, 245];
  return (
    <svg viewBox="0 -14 300 144" aria-hidden className={className} fill="#0a1c40">
      <rect x="20" y="58" width="260" height="72" />
      <rect x="116" y="34" width="68" height="96" />
      <polygon points="112,34 150,10 188,34" />
      <rect x="149" y="-6" width="2" height="18" />
      <polygon points="151,-6 168,0 151,6" fill="#6fa2ff" />
      <path d="M138 130V96a12 12 0 0 1 24 0v34Z" fill="#173a7a" />
      {row1.map((x, k) => win(x, 74, k))}
      {row2.map((x, k) => win(x, 100, k + 3))}
      {win(133, 50, 7)}{win(158, 50, 8)}
      <circle cx="8" cy="112" r="16" /><rect x="6" y="112" width="4" height="18" />
      <circle cx="294" cy="110" r="18" /><rect x="292" y="110" width="4" height="20" />
    </svg>
  );
}
