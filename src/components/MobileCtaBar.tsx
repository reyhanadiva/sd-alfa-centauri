"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { spmb, waLink } from "@/lib/site";

// Bar CTA di bawah layar khusus ponsel. Muncul setelah hero lewat, sembunyi saat penutup (CTA) terlihat
// supaya tidak menumpuk dengan tombol besarnya. Memberi ruang aman untuk notch/home bar.
export function MobileCtaBar() {
  const [pastHero, setPastHero] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const end = document.getElementById("spmb");
    if (!hero || !end) return;
    const a = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0.1 });
    const b = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0.15 });
    a.observe(hero);
    b.observe(end);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);

  const show = pastHero && !atEnd;
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 transition duration-300 lg:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
    >
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-full bg-white/90 p-1.5 shadow-lift ring-1 ring-brand-100 backdrop-blur-xl">
        <a
          href="#spmb"
          tabIndex={show ? 0 : -1}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-[15px] font-bold text-white transition active:scale-[0.98]"
        >
          <Send size={16} aria-hidden /> Daftar SPMB {spmb.academicYear}
        </a>
        <a
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={show ? 0 : -1}
          aria-label="Tanya admin lewat WhatsApp"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e6f9f0] text-[#13795b] transition active:scale-95"
        >
          <MessageCircle size={21} aria-hidden />
        </a>
      </div>
    </div>
  );
}
