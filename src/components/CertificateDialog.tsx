"use client";

import { useRef } from "react";
import { Award, X } from "lucide-react";
import { Photo } from "./Photo";

export function CertificateDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[15px] font-bold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
      >
        <Award size={18} aria-hidden /> Lihat sertifikat
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
