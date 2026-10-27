import { keamanan } from "@/lib/site";
import { FasilitasCarousel } from "./FasilitasCarousel";
import { Icon } from "./icons";

// Fasilitas (carousel foto) + keamanan dan kesehatan (satu baris ikon). Satu layar.
export function Fasilitas() {
  return (
    <section
      id="fasilitas"
      aria-labelledby="fasilitas-title"
      className="px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-[44rem] lg:items-center lg:py-6"
    >
      <div className="mx-auto w-full max-w-[78rem]">
        <h2 id="fasilitas-title" className="reveal text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]">
          Tempat belajar yang <span className="em-serif text-brand-600">aman dan nyaman</span>
        </h2>

        <div className="reveal mt-6 lg:mt-20">
          <FasilitasCarousel />
        </div>

        <ul
          id="keamanan"
          className="reveal mt-5 grid gap-px overflow-hidden rounded-[1.75rem] bg-brand-100 ring-1 ring-brand-100 sm:grid-cols-2 lg:grid-cols-4"
        >
          {keamanan.map((k) => (
            <li key={k.title} className="flex items-center gap-3.5 bg-brand-50 px-5 py-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
                <Icon name={k.icon} size={21} />
              </span>
              <div className="leading-snug">
                <p className="text-[16px] font-semibold text-navy-900">{k.title}</p>
                <p className="text-[14px] text-navy-700/80">{k.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
