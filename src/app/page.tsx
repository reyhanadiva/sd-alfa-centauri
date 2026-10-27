import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { WhyChoose } from "@/components/WhyChoose";
import { Fasilitas } from "@/components/Fasilitas";
import { Berita } from "@/components/Berita";
import { Faq } from "@/components/Faq";
import { Lokasi } from "@/components/Lokasi";
import { Prestasi } from "@/components/Prestasi";
import { Praktis } from "@/components/Praktis";
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
        {/* Berikutnya: Galeri, Testimoni, CTA penutup, Footer. */}
        <Program />
        <Fasilitas />
        <Inklusi />
        <Praktis />
        <Prestasi />
        {/* Galeri dan Testimoni menyusul (dilewati dulu) */}
        <Berita />
        <Faq />
        <Lokasi />
        <div className="h-24" />
      </main>
    </>
  );
}
