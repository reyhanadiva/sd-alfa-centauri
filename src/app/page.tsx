import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { WhyChoose } from "@/components/WhyChoose";
import { FasilitasDaftar, FasilitasKipas } from "@/components/Fasilitas";
import { Cta } from "@/components/Cta";
import { Footer } from "@/components/Footer";
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
        <Program />
        <FasilitasDaftar />
        {/* Gaya alternatif (Kipas): tinggal pilih salah satu, atau pakai untuk Galeri */}
        <FasilitasKipas />
        <Inklusi />
        <Praktis />
        <Prestasi />
        {/* Galeri dan Testimoni menyusul (dilewati dulu) */}
        <Berita />
        <Faq />
        <Lokasi />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
