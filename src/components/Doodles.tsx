// Dekorasi halus bergaya coretan buku tulis, selaras dengan latar logo SD.
// Semua aria-hidden; hanya aksen, bukan konten.

const STAR = "12,2 14.9,8.9 22.4,9.3 16.6,14.1 18.5,21.4 12,17.3 5.5,21.4 7.4,14.1 1.6,9.3 9.1,8.9";

export function Star({ className = "", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <polygon points={STAR} fill={fill} strokeLinejoin="round" />
    </svg>
  );
}

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 24" fill="none" aria-hidden className={className}>
      <path
        d="M3 14c8-12 14-12 20 0s12 12 20 0 14-12 20 0 12 12 20 0 14-12 20 0"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Plus({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Ring({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3.5" />
    </svg>
  );
}
