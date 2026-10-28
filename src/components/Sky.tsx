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
