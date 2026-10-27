import Image from "next/image";
import { Camera } from "lucide-react";

type Props = {
  /** Isi `src` kalau foto sudah ada. Tanpa `src`, tampil placeholder berlabel. */
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
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Placeholder foto: ${label}`}
      className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-200 via-brand-100 to-brand-300 ${className}`}
    >
      <div className="flex flex-col items-center gap-2.5 px-4 text-center text-brand-700/70">
        <Camera size={38} aria-hidden />
        <span className="rounded-full bg-white/75 px-3.5 py-1 text-[12px] font-bold">
          Foto: {label}
        </span>
      </div>
    </div>
  );
}
