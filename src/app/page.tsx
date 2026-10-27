import { TopBar } from "@/components/TopBar";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SpmbStatusBar } from "@/components/SpmbStatusBar";
import { StatBar } from "@/components/StatBar";
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
        <Inklusi />
        {/* Berikutnya: Mengapa Memilih (bento), Tentang + 7 Pilar, Program, dst. */}
        <div className="h-24" />
      </main>
    </>
  );
}
