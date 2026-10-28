"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera } from "lucide-react";

type Props = {
  /**
   * - Path lokal ("/images/...") → next/image (dioptimasi).
   * - URL foto stok Pexels → dicoba dulu dari berkas lokal "/images/stock/pexels-<id>.jpg" (hasil `npm run fetch-stock`),
   *   lalu dari CDN Pexels; kalau dua-duanya gagal tampil placeholder.
   * - Kosong → placeholder berlabel.
   */
  src?: string;
  alt: string;
  /** Deskripsi foto yang dibutuhkan, tampil di placeholder. */
  label: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

const pexelsId = (u?: string) => u?.match(/pexels-photo-(\d+)\.jpe?g/)?.[1];
const tones = [
  "from-brand-300 via-brand-200 to-brand-100",
  "from-brand-200 via-[#dbeafe] to-[#e0f2fe]",
  "from-[#bfdbfe] via-brand-100 to-[#e0e7ff]",
  "from-brand-400/70 via-brand-200 to-[#e6f9f0]",
];
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

// Induk harus `relative` dengan ukuran/aspect-ratio sendiri.
export function Photo({ src, alt, label, sizes, priority, className = "" }: Props) {
  // stage: urutan sumber yang dicoba untuk `src` ini (0 = pertama). Berganti src → mulai dari awal.
  const [st, setSt] = useState({ src, stage: 0 });
  const stage = st.src === src ? st.stage : 0;
  const next = () => setSt({ src, stage: stage + 1 });

  const pid = pexelsId(src);
  const remote = !!src && /^https?:\/\//.test(src);
  const sources = pid ? [`/images/stock/pexels-${pid}.jpg`, src!] : src ? [src] : [];
  const current = sources[stage];
  const failed = !current;

  return (
    <>
      {/* Placeholder selalu di bawah: kalau foto belum/tidak termuat, tidak ada lubang kosong */}
      {(failed || remote) && (
        <div
          role={failed ? "img" : undefined}
          aria-label={failed ? label : undefined}
          aria-hidden={failed ? undefined : true}
          className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${tones[hash(label) % tones.length]}`}
        >
          <Camera aria-hidden strokeWidth={1.25} className="absolute -right-6 -top-6 size-40 rotate-12 text-white/40" />
          <div className="absolute inset-0 grid place-items-center p-4">
            <span className="max-w-[85%] rounded-full bg-white/80 px-3.5 py-1.5 text-center text-[12.5px] font-bold leading-tight text-navy-800 shadow-sm backdrop-blur">
              {label}
            </span>
          </div>
        </div>
      )}

      {current && !remote && (
        <Image src={current} alt={alt} fill sizes={sizes} priority={priority} onError={next} className={`object-cover ${className}`} />
      )}
      {current && remote && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current}
          src={current}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={next}
          className={`absolute inset-0 size-full object-cover ${className}`}
        />
      )}
    </>
  );
}
