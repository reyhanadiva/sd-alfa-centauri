import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { WhyChoose } from "@/components/WhyChoose";
import { Fasilitas } from "@/components/Fasilitas";
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
        {/* Berikutnya: Galeri, Testimoni, Berita, FAQ, Lokasi, CTA, Footer. */}
        <Program />
        <Fasilitas />
        <Inklusi />
        <Praktis />
        <Prestasi />
        <div className="h-24" />
      </main>
    </>
  );
}
