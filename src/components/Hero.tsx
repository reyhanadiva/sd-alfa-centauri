import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { spmb, yearsActive } from "@/lib/site";
import { CertificateDialog } from "./CertificateDialog";
import { CountUp } from "./CountUp";
import { SpmbCard } from "./SpmbCard";

// Satu layar, satu pesan. Teks minim: headline, satu baris penjelas, dua tombol.
// Bukti (akreditasi, tahun, SPMB) ada di dua kartu kaca di pojok kanan bawah.
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="px-3 pb-3 sm:px-5">
      <div className="relative isolate mx-auto min-h-[34rem] max-w-[96rem] overflow-hidden rounded-[2rem] text-white lg:h-[calc(100svh-5.5rem)] lg:max-h-[56rem] lg:rounded-[2.5rem]">
        {/* TODO: ganti dengan foto resolusi tinggi (anak-anak/kegiatan). Foto gedung hanya 565px, jadi diberi overlay tebal. */}
        <Image
          src="/images/gedung-sd.jpg"
          alt="Gedung SD Alfa Centauri di Jalan Terate No. 10, Bandung"
          fill
          priority
          sizes="100vw"
          className="-z-20 scale-105 object-cover object-[50%_30%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-navy-900/10" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/65 via-navy-900/15 to-transparent" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-brand-700/25 mix-blend-multiply" />

        <div className="flex h-full flex-col justify-end gap-8 p-6 pt-40 sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:p-14">
          <div className="lg:max-w-[52rem]">
            <h1
              id="hero-title"
              className="animate-fade-up font-display text-[2.9rem] font-extrabold leading-[1.02] !text-white sm:text-6xl lg:text-[4.25rem] xl:text-[4.9rem]"
            >
              To Be The{" "}
              <span className="mx-0.5 rounded-2xl bg-brand-500 px-3 [box-decoration-break:clone]">Finest</span>
              <br className="hidden sm:block" /> School In The World
            </h1>
            <p
              className="animate-fade-up mt-5 text-lg text-white/85 sm:text-xl"
              style={{ animationDelay: "100ms" }}
            >
              Sekolah Dasar Islam di Bandung.
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "200ms" }}
            >
              <a
                href={spmb.href}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
              >
                Daftar SPMB
                <ArrowRight size={18} aria-hidden className="transition group-hover:translate-x-1" />
              </a>
              <a
                href="#profil"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Play size={14} fill="currentColor" aria-hidden /> Video profil
              </a>
            </div>
          </div>

          {/* Kartu kaca: bukti singkat */}
          <div
            className="animate-fade-up grid grid-cols-2 gap-3 lg:w-[28.5rem] lg:shrink-0"
            style={{ animationDelay: "300ms" }}
          >
            <div className="relative flex flex-col justify-between gap-3 rounded-3xl bg-white/[0.14] p-4 ring-1 sm:gap-4 sm:p-5 ring-white/25 backdrop-blur-xl">
              <div className="flex items-end gap-3">
                <p aria-hidden className="font-display text-[2.6rem] font-extrabold leading-none sm:text-[3.25rem]">
                  A
                </p>
                <p className="pb-1 text-[13px] font-semibold leading-tight text-white/85">
                  Terakreditasi
                  <br />
                  BAN-S/M
                </p>
              </div>
              <div className="border-t border-white/20 pt-3">
                <p className="text-[14px] font-bold">
                  <CountUp to={yearsActive} suffix="+" /> tahun
                  <span className="hidden font-semibold text-white/75 sm:inline"> sejak 2009</span>
                </p>
                <div className="mt-1.5">
                  <CertificateDialog variant="link" />
                </div>
              </div>
            </div>

            <SpmbCard />
          </div>
        </div>
      </div>
    </section>
  );
}
