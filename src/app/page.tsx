import { TopBar } from "@/components/TopBar";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SpmbStatusBar } from "@/components/SpmbStatusBar";
import { StatBar } from "@/components/StatBar";
import { About } from "@/components/About";
import { WhyChoose } from "@/components/WhyChoose";
import { Pilar } from "@/components/Pilar";
import { Inklusi } from "@/components/Inklusi";

export default function Home() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <SpmbStatusBar />
        <StatBar />
        <About />
        <WhyChoose />
        <Pilar />
        {/* Berikutnya: Program + Ekskul, Fasilitas + Keamanan.
            Inklusi sengaja di bawahnya (setelah Fasilitas & Keamanan) supaya tidak ada 3 blok berat berurutan.
            Sementara ditaruh di sini sampai section di atas selesai dibuat. */}
        <Inklusi />
        <div className="h-24" />
      </main>
    </>
  );
}
