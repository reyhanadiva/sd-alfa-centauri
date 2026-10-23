import { TopBar } from "@/components/TopBar";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SpmbStatusBar } from "@/components/SpmbStatusBar";

export default function Home() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <SpmbStatusBar />
        {/* Section berikutnya (stat bar, inklusi, dst.) ditambahkan di sini */}
        <div className="h-24" />
      </main>
    </>
  );
}
