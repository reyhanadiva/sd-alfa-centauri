"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera } from "lucide-react";

type Props = {
  /**
   * - Path lokal ("/images/...") → next/image (dioptimasi).
   * - URL http(s) → foto stock (hotlink), dimuat apa adanya; kalau gagal, tampil placeholder.
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

// Induk harus `relative` dengan ukuran/aspect-ratio sendiri.
export function Photo({ src, alt, label, sizes, priority, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const remote = !!src && /^https?:\/\//.test(src);

  return (
    <>
      {/* Placeholder selalu ada di bawah, jadi foto remote yang gagal dimuat tidak meninggalkan lubang */}
      {(!src || failed || remote) && (
        <div
          role={!src || failed ? "img" : undefined}
          aria-label={!src || failed ? `Placeholder foto: ${label}` : undefined}
          aria-hidden={src && !failed ? true : undefined}
          className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-200 via-brand-100 to-brand-300"
        >
          <div className="flex flex-col items-center gap-2 px-4 text-center text-brand-700/70">
            <Camera size={32} aria-hidden />
            <span className="rounded-full bg-white/75 px-3 py-1 text-[12px] font-bold">Foto: {label}</span>
          </div>
        </div>
      )}

      {src && !remote && (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
      )}
      {src && remote && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`absolute inset-0 size-full object-cover ${className}`}
        />
      )}
    </>
  );
}
