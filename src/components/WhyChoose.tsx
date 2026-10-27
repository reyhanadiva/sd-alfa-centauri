import { ArrowUpRight } from "lucide-react";
import { ssc, unggulanPills } from "@/lib/site";
import { AskAdmin } from "./AskAdmin";
import { CertificateDialog } from "./CertificateDialog";
import { Photo } from "./Photo";

// Tiga alasan (Akreditasi A, Program Unggulan Terpadu, Kemitraan SSC) + satu kartu tanya admin.
// Tiap kartu sengaja beda gaya: huruf raksasa, foto latar, tipografi di atas navy, kartu bergaya form.
// Judul + satu kalimat di tiap kartu; tidak ada paragraf panjang.
export function WhyChoose() {
  const shown = unggulanPills.slice(0, 3);
  const rest = unggulanPills.length - shown.length;

  return (
    <section
      id="mengapa"
      aria-labelledby="mengapa-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2
          id="mengapa-title"
          className="reveal text-center text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.4rem]"
        >
          Mengapa memilih <span className="em-serif text-brand-600">SD Alfa Centauri?</span>
        </h2>

        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:mt-9 lg:h-[min(34rem,calc(100svh-17rem))] lg:grid-cols-12 lg:grid-rows-2">
          {/* 1. Akreditasi: huruf raksasa */}
          <article className="reveal relative flex min-h-[22rem] flex-col overflow-hidden rounded-[2rem] bg-brand-100 p-7 sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:min-h-0">
            <h3 className="text-2xl font-semibold">Terakreditasi A</h3>
            <p className="mt-1.5 max-w-[17rem] text-[16px] leading-snug text-navy-700">
              Standar mutu pendidikan yang diakui BAN-S/M.
            </p>
            <p
              aria-hidden
              className="pointer-events-none absolute -bottom-10 right-6 select-none font-display text-[17rem] font-semibold leading-none tracking-[-0.06em] text-brand-600 lg:-bottom-12 lg:right-5 lg:text-[21rem]"
            >
              A
            </p>
            <div className="relative mt-auto">
              <CertificateDialog variant="dark" />
            </div>
          </article>

          {/* 2. Program unggulan: foto sebagai latar */}
          <article className="reveal relative isolate flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-[2rem] p-7 text-white sm:col-span-2 lg:col-span-8 lg:min-h-0">
            <Photo
              src="/images/siswa-membaca.jpg"
              alt="Siswa SD Alfa Centauri membaca buku di luar kelas"
              label="Kegiatan siswa"
              sizes="(min-width: 1024px) 760px, 94vw"
              className="-z-20 object-[50%_30%]"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/35 to-transparent" />
            <h3 className="text-2xl font-semibold !text-white sm:text-[1.75rem]">Program Unggulan Terpadu</h3>
            <p className="mt-1.5 max-w-md text-[16px] leading-snug text-white/85">
              Mengembangkan potensi, minat, dan bakat setiap siswa.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {shown.map((p) => (
                <li key={p} className="rounded-full bg-white/20 px-3.5 py-1.5 text-[14px] font-semibold ring-1 ring-white/30 backdrop-blur-md">
                  {p}
                </li>
              ))}
              <li className="rounded-full bg-white px-3.5 py-1.5 text-[14px] font-bold text-navy-900">+{rest} lainnya</li>
            </ul>
          </article>

          {/* 3. Kemitraan SSC: tipografi di atas navy */}
          <article className="reveal relative flex min-h-[15rem] flex-col overflow-hidden rounded-[2rem] bg-navy-900 p-7 text-white lg:col-span-4 lg:min-h-0">
            <p
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-3 select-none font-display text-[8.5rem] font-semibold leading-none tracking-[-0.07em] text-white/[0.07]"
            >
              SSC
            </p>
            <h3 className="relative text-2xl font-semibold !text-white">Kemitraan Bimbel</h3>
            <p className="relative mt-1.5 text-[16px] leading-snug text-white/80">
              Jam belajar tambahan bersama {ssc.name}.
            </p>
            {ssc.href ? (
              <a
                href={ssc.href}
                className="relative mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-navy-900 transition hover:bg-brand-50"
              >
                Selengkapnya <ArrowUpRight size={15} aria-hidden />
              </a>
            ) : null}
          </article>

          {/* 4. Tanya admin: kartu bergaya form */}
          <article className="reveal relative flex min-h-[15rem] flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-700 p-7 text-white sm:col-span-2 lg:col-span-4 lg:min-h-0">
            <h3 className="text-2xl font-semibold !text-white">Masih ada pertanyaan?</h3>
            <p className="mt-1.5 text-[16px] leading-snug text-white/85">Tanya admin kami langsung.</p>
            <AskAdmin />
          </article>
        </div>
      </div>
    </section>
  );
}
