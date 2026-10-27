import {
  BookMarked, BookOpenText, CarFront, Cctv, ShieldCheck, Stethoscope, Bot, Brain, Calculator, Clapperboard, Compass, Drum, Gem, Goal, HeartPulse,
  Lightbulb, Medal, MoonStar, Music, Palette, PartyPopper, PersonStanding, Presentation,
  Puzzle, Rocket, Scale, Shirt, Sparkles, Sun, Tent, Trophy, UserRound, Users, Waves,
  type LucideIcon,
} from "lucide-react";

// Nama ikon di data (site.ts) → komponen lucide. Satu tempat supaya data tetap berupa teks biasa.
const map: Record<string, LucideIcon> = {
  psikolog: Brain, ppi: UserRound, terapi: HeartPulse,
  manik: Gem, yoga: PersonStanding, puzzle: Puzzle, seimbang: Scale, gambar: Palette, kancing: Shirt,
  quran: BookOpenText, sun: Sun, masjid: MoonStar,
  book: BookMarked, calc: Calculator, read: BookOpenText, project: Lightbulb, trophy: Trophy,
  reflect: Compass, parents: Users, palette: Palette, expo: Presentation, trip: Rocket,
  film: Clapperboard, drum: Drum, music: Music, tent: Tent, swim: Waves, goal: Goal, bot: Bot,
  dance: PartyPopper, medal: Medal,
  cctv: Cctv, uks: Stethoscope, jemput: CarFront, shield: ShieldCheck,
};

export function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const C = map[name] ?? Sparkles;
  return <C size={size} aria-hidden className={className} />;
}


