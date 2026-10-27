"use client";

import { useRef } from "react";
import { Award, X } from "lucide-react";
import { Photo } from "./Photo";

export function CertificateDialog({ variant = "solid" }: { variant?: "solid" | "link" | "dark" }) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={
          variant === "link"
            ? "relative z-10 inline-flex items-center gap-1.5 text-[13px] font-bold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
            : variant === "dark"
              ? "inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-[14px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-navy-700"
              : "inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[15px] font-bold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
        }
      >
        <Award size={variant === "link" ? 14 : 17} aria-hidden /> Lihat sertifikat
      </button>

      <dialog
        ref={ref}
        aria-label="Sertifikat akreditasi"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(92vw,34rem)] rounded-3xl bg-white p-0 shadow-lift backdrop:bg-navy-900/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="font-display text-lg font-bold">Sertifikat Akreditasi A</h3>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Tutup"
            className="grid size-10 place-items-center rounded-full bg-brand-50 text-navy-800 transition hover:bg-brand-100"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="p-6">
          {/* TODO: ganti dengan scan sertifikat BAN-S/M */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
            <Photo
              alt="Sertifikat akreditasi A dari BAN-S/M"
              label="Scan sertifikat akreditasi (BAN-S/M)"
              sizes="34rem"
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
