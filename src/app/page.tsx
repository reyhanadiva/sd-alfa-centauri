import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { WhyChoose } from "@/components/WhyChoose";
import { FasilitasDaftar } from "@/components/Fasilitas";
import { Galeri } from "@/components/Galeri";
import { Testimoni } from "@/components/Testimoni";
import { MobileCtaBar } from "@/components/MobileCtaBar";
import { Closing } from "@/components/Closing";
import { Berita } from "@/components/Berita";
import { Faq } from "@/components/Faq";
import { Lokasi } from "@/components/Lokasi";
import { Prestasi } from "@/components/Prestasi";
import { Program } from "@/components/Program";
import { Inklusi } from "@/components/Inklusi";

// Tiap section dirancang muat satu layar di desktop (tanpa harus scroll di dalam section).
export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <WhyChoose />
        <Program />
        <FasilitasDaftar />
        <Inklusi />
        {/* Praktis (info cepat orang tua) dikeluarkan dulu; komponen masih ada di Praktis.tsx */}
        <Prestasi />
        <Galeri />
        <Testimoni />
        <Berita />
        <Faq />
        <Lokasi />
      </main>
      <Closing />
      <MobileCtaBar />
    </>
  );
}
