import { ArrowUpRight, BookOpen, Calculator, Handshake, Trophy } from "lucide-react";
import { ssc, unggulanPills } from "@/lib/site";
import { CertificateDialog } from "./CertificateDialog";
import { Plus, Star } from "./Doodles";

const iconChip = "grid size-12 place-items-center rounded-2xl";

export function WhyChoose() {
  return (
    <section
      id="mengapa"
      aria-labelledby="mengapa-title"
      className="px-5 pb-24 sm:px-8 lg:pb-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">
            Mengapa SD Alfa Centauri
          </p>
          <h2
            id="mengapa-title"
            className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl"
          >
            Mengapa memilih <span className="hl">SD Alfa Centauri?</span>
          </h2>
          <p className="mt-5 text-lg text-navy-700">
            Memadukan keunggulan akademik, karakter islami, dan kemitraan strategis untuk mencetak
            generasi yang Taqwa, Cerdas, dan Kreatif.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:auto-rows-[minmax(13.5rem,auto)] lg:grid-cols-4 lg:gap-5">
          {/* 1. Akreditasi A */}
          <article
            id="akreditasi"
            className="reveal relative flex flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-600 to-brand-700 p-7 text-white sm:col-span-2 sm:p-9 lg:row-span-2"
          >
            <Star className="absolute -right-10 -top-10 size-56 rotate-12 text-white/10" />
            <p className="relative text-sm font-bold uppercase tracking-[0.16em] text-brand-200">
              Jaminan mutu
            </p>
            <p
              aria-hidden
              className="relative mt-2 font-display text-[8rem] font-extrabold leading-none sm:text-[11rem] lg:text-[15rem]"
            >
              A
            </p>
            <h3 className="relative -mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Terakreditasi A
            </h3>
            <p className="relative mt-3 max-w-md text-[17px] leading-relaxed text-white/90">
              Pengakuan tertinggi dari BAN-S/M atas konsistensi kualitas tata kelola, kurikulum, dan
              capaian prestasi siswa sejak dini.
            </p>
            <div className="relative mt-auto pt-8">
              <CertificateDialog />
            </div>
          </article>

          {/* 2. Program Unggulan Terpadu */}
          <article className="reveal flex flex-col rounded-[1.75rem] border border-brand-100 bg-white p-7 shadow-soft sm:col-span-2 sm:p-8">
            <span className={`${iconChip} bg-brand-100 text-brand-600`}>
              <Trophy size={24} aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold">Program Unggulan Terpadu</h3>
            <p className="mt-2 text-navy-700">
              Berbagai program komprehensif untuk mengembangkan potensi, minat, bakat, dan
              kepedulian lingkungan siswa.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {unggulanPills.map((p) => (
                <li
                  key={p}
                  className="rounded-full bg-brand-50 px-3.5 py-1.5 text-[14px] font-semibold text-brand-700 ring-1 ring-brand-100"
                >
                  {p}
                </li>
              ))}
            </ul>
          </article>

          {/* 3. Gakko Tosho & Surala */}
          <article className="reveal flex flex-col rounded-[1.75rem] bg-brand-100 p-7">
            <span className={`${iconChip} bg-white text-brand-600`}>
              <Calculator size={24} aria-hidden />
            </span>
            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand-700">
              Numerasi & e-learning
            </p>
            <h3 className="mt-1 font-display text-xl font-bold">Gakko Tosho & Surala</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-700">
              Menunjang pembelajaran matematika dengan kurikulum adaptasi Jepang (Gakko Tosho) dan
              penguatan hitungan melalui e-learning Surala.
            </p>
          </article>

          {/* 4. Kurikulum adaptif */}
          <article className="reveal flex flex-col rounded-[1.75rem] border border-brand-100 bg-white p-7 shadow-soft">
            <span className={`${iconChip} bg-brand-100 text-brand-600`}>
              <BookOpen size={24} aria-hidden />
            </span>
            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand-600">
              Sistem belajar
            </p>
            <h3 className="mt-1 font-display text-xl font-bold">Kurikulum Adaptif</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-700">
              Kurikulum Nasional Kemendikbud yang disesuaikan untuk memfasilitasi bakat dan
              keunikan setiap siswa secara optimal.
            </p>
          </article>

          {/* 5. Kemitraan bimbel SSC (tanpa logo) */}
          <article className="reveal flex flex-col rounded-[1.75rem] bg-navy-900 p-7 text-white sm:col-span-2 sm:p-8">
            <span className={`${iconChip} bg-white/10 text-brand-300`}>
              <Handshake size={24} aria-hidden />
            </span>
            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand-300">
              Kemitraan
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-white">Kemitraan Bimbel SSC</h3>
            <p className="mt-2 max-w-lg text-white/80">
              Siswa kelas atas mendapatkan tambahan jam belajar intensif bersama{" "}
              {ssc.href ? (
                <a
                  href={ssc.href}
                  className="font-semibold text-white underline decoration-brand-400 underline-offset-4 hover:decoration-white"
                >
                  {ssc.name}
                </a>
              ) : (
                <strong className="font-semibold text-white">{ssc.name}</strong>
              )}{" "}
              untuk memperkuat pemahaman materi esensial.
            </p>
          </article>

          {/* 6. Pendidikan karakter */}
          <a
            href="#pilar"
            className="reveal group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-brand-50 p-7 ring-1 ring-brand-100 transition hover:-translate-y-1 hover:ring-brand-300 sm:col-span-2 sm:p-8"
          >
            <Plus className="absolute right-8 top-8 size-5 text-brand-300" />
            <div aria-hidden className="flex gap-1.5 text-brand-500">
              {Array.from({ length: 7 }).map((_, i) => (
                <Star key={i} className="size-6" />
              ))}
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold">Pendidikan Karakter</h3>
            <p className="mt-2 max-w-md text-navy-700">
              Tujuh pilar karakter yang ditanamkan setiap hari, dari Jujur sampai Bermanfaat.
            </p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-bold text-brand-700">
              Lihat 7 pilar
              <ArrowUpRight
                size={18}
                aria-hidden
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
