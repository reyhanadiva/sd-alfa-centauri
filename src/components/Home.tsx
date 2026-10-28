import type { Lang } from "@/lib/lang";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { About } from "./About";
import { WhyChoose } from "./WhyChoose";
import { FasilitasDaftar } from "./Fasilitas";
import { Galeri } from "./Galeri";
import { AskWidget } from "./AskWidget";
import { Testimoni } from "./Testimoni";
import { Closing } from "./Closing";
import { Berita } from "./Berita";
import { Faq } from "./Faq";
import { Lokasi } from "./Lokasi";
import { Prestasi } from "./Prestasi";
import { Program } from "./Program";
import { Inklusi } from "./Inklusi";

// Tiap section dirancang muat satu layar di desktop (tanpa harus scroll di dalam section).
export function Home({ lang }: { lang: Lang }) {
  return (
    <>
      <Navbar lang={lang} />
      <main className="flex-1">
        <Hero lang={lang} />
        <About lang={lang} />
        <WhyChoose lang={lang} />
        <Program lang={lang} />
        <FasilitasDaftar lang={lang} />
        <Inklusi lang={lang} />
        {/* Praktis (info cepat orang tua) dikeluarkan dulu; komponen masih ada di Praktis.tsx */}
        <Prestasi lang={lang} />
        <Galeri lang={lang} />
        <Testimoni lang={lang} />
        <Berita lang={lang} />
        <Faq lang={lang} />
        <Lokasi lang={lang} />
      </main>
      <Closing lang={lang} />
      <AskWidget lang={lang} />
    </>
  );
}
