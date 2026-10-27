import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { WhyChoose } from "@/components/WhyChoose";
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
        {/* Berikutnya: Program + Ekskul, Fasilitas + Keamanan.
            Inklusi nanti dipindah ke bawah Fasilitas & Keamanan; sementara di sini sampai section itu dibuat. */}
        <Inklusi />
        <div className="h-24" />
      </main>
    </>
  );
}
