"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { profileVideo } from "@/lib/site";

// Video profil yang langsung berjalan (muted, loop) saat terlihat di layar, seperti website SMP.
// - mp4: <video> autoplay, otomatis jeda saat keluar layar, ada tombol jeda dan suara.
// - youtubeId: iframe dimuat hanya saat terlihat (hemat bandwidth), autoplay muted loop.
// - keduanya kosong: tampil poster dengan tombol putar (belum ada video).
// "Reduce motion": tidak autoplay, pengunjung menekan putar sendiri.
export function VideoProfile({ className = "" }: { className?: string }) {
  const { mp4, youtubeId, poster, title } = profileVideo;
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [ytLoaded, setYtLoaded] = useState(false); // iframe dimuat sekali, lalu tetap ada
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) setYtLoaded(true);
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    // nilai awal dibaca lewat callback agar tidak setState sinkron di badan effect
    const t = setTimeout(onMq, 0);
    return () => {
      mq.removeEventListener("change", onMq);
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  // Putar/jeda <video> mengikuti keterlihatan
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !mp4) return;
    if (inView && !reduced) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [inView, reduced, mp4]);

  // YouTube: jeda saat keluar layar, lanjut dari titik terakhir saat kembali.
  useEffect(() => {
    const w = frameRef.current?.contentWindow;
    if (!w || !ytLoaded) return;
    const cmd = (func: string) =>
      w.postMessage(JSON.stringify({ event: "command", func, args: "" }), "*");
    if (inView && !reduced) cmd("playVideo");
    else if (!inView) cmd("pauseVideo");
  }, [inView, reduced, ytLoaded]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const ytSrc = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&autoplay=${reduced ? 0 : 1}&mute=1&loop=1&playlist=${youtubeId}&controls=1&playsinline=1&rel=0&modestbranding=1`
    : null;

  return (
    <div
      ref={boxRef}
      className={`relative aspect-video overflow-hidden rounded-[1.75rem] bg-navy-900 shadow-lift ring-1 ring-brand-100 sm:rounded-[2.25rem] ${className}`}
    >
      {mp4 ? (
        <>
          <video
            ref={videoRef}
            src={mp4}
            poster={poster}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            aria-label={title}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="size-full object-cover"
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Jeda video" : "Putar video"}
              className="grid size-11 place-items-center rounded-full bg-navy-900/70 text-white backdrop-blur transition hover:bg-navy-900"
            >
              {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
              className="grid size-11 place-items-center rounded-full bg-navy-900/70 text-white backdrop-blur transition hover:bg-navy-900"
            >
              {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
            </button>
          </div>
        </>
      ) : ytSrc && ytLoaded ? (
        <iframe
          ref={frameRef}
          src={ytSrc}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full"
        />
      ) : (
        <>
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(min-width: 1024px) 1100px, 94vw"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/55 via-transparent to-transparent" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid size-20 place-items-center rounded-full bg-white/95 text-brand-600 shadow-lift">
              <Play size={30} fill="currentColor" aria-hidden className="translate-x-0.5" />
            </span>
          </div>
          {!youtubeId && (
            <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3.5 py-1 text-[12px] font-bold text-navy-800">
              Video profil menyusul
            </span>
          )}
        </>
      )}
    </div>
  );
}
