"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import Image from "next/image";
import { getT, type Lang } from "@/lib/i18n";

type Link = { label: string; href: string };
type Msg = { from: "bot" | "me"; text: string; links?: Link[] };

// Asisten di kanan bawah. BUKAN AI dan tidak membaca tampilan halaman: pencocokan kata kunci sederhana ke daftar
// jawaban yang tersimpan di kamus bahasa (src/content/*.ts, bagian `assistant.kb`). Kalau tidak ketemu, dialihkan ke
// admin lewat WhatsApp (pertanyaan terisi otomatis). Tanpa backend. Menambah topik = menambah satu entri di kamus.
type Entry = { chip?: string; keys: string[]; text: string; links?: Link[] };

const clean = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim()} `;
function match(kb: Entry[], q: string) {
  const t = clean(q);
  let best: Entry | null = null;
  let top = 0;
  for (const e of kb) {
    const score = e.keys.reduce((n, k) => n + (t.includes(k.length < 4 ? ` ${k.trim()} ` : k) ? Math.min(3, 1 + k.length / 6) : 0), 0);
    if (score > top) { top = score; best = e; }
  }
  return best;
}

export function AskWidget({ lang }: { lang: Lang }) {
  const a = getT(lang).assistant;
  const kb: Entry[] = a.kb;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: a.greeting }]);
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState(false);
  // Balon sapaan kecil di atas logo: muncul setelah 3 detik, hilang sendiri setelah 11 detik, bisa ditutup.
  const [bubble, setBubble] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const on = setTimeout(() => setBubble(true), 3000);
    const off = setTimeout(() => setBubble(false), 14000);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setMsgs((m) => [...m, { from: "me", text: t }]);
    setQ("");
    setTyping(true);
    const hit = match(kb, t);
    const reply: Omit<Msg, "from"> = hit
      ? { text: hit.text, links: hit.links }
      : { text: a.fallback, links: [{ label: a.waLabel, href: a.waAsk(t) }] };
    timer.current = setTimeout(() => {
      setMsgs((m) => [...m, { from: "bot", ...reply }]);
      setTyping(false);
    }, 600);
  };

  const toggle = () => {
    setBubble(false);
    setOpen((o) => !o);
    setTimeout(() => input.current?.focus(), 50);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={a.dialog}
          className="zoom-in fixed bottom-[6.25rem] right-4 z-[56] flex max-h-[min(34rem,calc(100svh-8.5rem))] w-[min(23rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-brand-100 sm:right-6"
        >
          <div className="flex items-center gap-3 bg-navy-900 px-4 py-3.5 text-white">
            <span className="relative grid size-10 place-items-center rounded-full bg-white">
              <Image src="/images/logo-star.png" alt="" width={208} height={232} className="h-7 w-auto" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="text-[16px] font-semibold">{a.name}</p>
              <p className="text-[12.5px] text-white/65">{a.tagline}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={a.close} className="grid size-9 place-items-center rounded-full transition hover:bg-white/15">
              <X size={18} aria-hidden />
            </button>
          </div>

          <div ref={scroller} aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto bg-brand-50/60 px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`fade-in flex flex-col gap-1.5 ${m.from === "me" ? "items-end" : "items-start"}`}>
                <p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-snug ${m.from === "me" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-navy-900 ring-1 ring-brand-100"}`}>{m.text}</p>
                {m.links?.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-navy-900 px-3.5 py-1.5 text-[13px] font-bold text-white transition hover:bg-navy-700">{l.label}</a>
                ))}
              </div>
            ))}
            {typing && (
              <p className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-brand-100" aria-label={a.typing}>
                {[0, 1, 2].map((d) => <span key={d} className="twinkle size-1.5 rounded-full bg-brand-400" style={{ "--dur": "1s", "--delay": `${d * -0.25}s` } as React.CSSProperties} />)}
              </p>
            )}
          </div>

          <div className="border-t border-brand-100 bg-white px-3 pb-3 pt-2.5">
            <div className="flex gap-1.5 overflow-x-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {kb.filter((it) => it.chip).map((it) => (
                <button key={it.chip} type="button" onClick={() => ask(it.chip!)} className="shrink-0 rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100">{it.chip}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 rounded-full bg-brand-50 p-1.5 pl-4 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-500">
              <label htmlFor="ask-q" className="sr-only">{a.question}</label>
              <input ref={input} id="ask-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.placeholder} className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-navy-700/45" />
              <button type="submit" aria-label={a.send} className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"><Send size={16} aria-hidden /></button>
            </form>
          </div>
        </div>
      )}

      {/* Logo sebagai asisten: tombol bulat berlogo bintang + balon ucapan kecil di atasnya */}
      <div className="fixed bottom-4 right-4 z-[56] sm:right-6">
        {bubble && !open && (
          <div className="zoom-in absolute bottom-[calc(100%+0.65rem)] right-0 w-max max-w-[min(15rem,calc(100vw-2rem))] origin-bottom-right">
            <div className="relative flex items-center gap-1 rounded-2xl rounded-br-md bg-white py-2 pl-4 pr-1.5 text-[14.5px] font-semibold leading-snug text-navy-900 shadow-lift ring-1 ring-brand-100">
              <button type="button" onClick={toggle} className="text-left">{a.bubble}</button>
              <button type="button" onClick={() => setBubble(false)} aria-label={a.bubbleClose} className="grid size-7 shrink-0 place-items-center rounded-full text-navy-700/60 transition hover:bg-brand-50 hover:text-navy-900">
                <X size={14} aria-hidden />
              </button>
              <span aria-hidden className="absolute -bottom-1.5 right-6 size-3 rotate-45 bg-white ring-1 ring-brand-100 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? a.fabClose : a.fab}
          className="group relative grid size-16 place-items-center rounded-full bg-white shadow-lift ring-1 ring-brand-100 transition hover:-translate-y-0.5 active:scale-95"
        >
          {!open && <span aria-hidden className="halo-brand absolute inset-0 rounded-full" />}
          {open ? (
            <X size={26} aria-hidden className="text-navy-900" />
          ) : (
            <Image src="/images/logo-star.png" alt="" width={208} height={232} className="relative h-9 w-auto transition group-hover:rotate-6 group-hover:scale-110" />
          )}
        </button>
      </div>
    </>
  );
}
