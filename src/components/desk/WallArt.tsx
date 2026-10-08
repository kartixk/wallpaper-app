"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Volume2, VolumeX } from "lucide-react";
import { WALL_ART_VIDEOS } from "./data";
import { Scribble, SectionTag } from "./Pencil";

export function WallArt() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [muted, setMuted] = useState(true);
  const userToggled = useRef(false);
  const video = WALL_ART_VIDEOS[index];

  // Only play while the frame is on screen
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    frameRef.current?.querySelectorAll("video").forEach((v) => {
      if (inView) v.play().catch(() => {});
      else v.pause();
    });
  }, [index, inView]);

  // Starts muted, auto-unmutes after 3s in view unless the visitor already chose
  useEffect(() => {
    if (!inView || userToggled.current) return;
    const t = setTimeout(() => setMuted(false), 3000);
    return () => clearTimeout(t);
  }, [inView]);

  const toggleMute = useCallback(() => {
    userToggled.current = true;
    setMuted((m) => !m);
  }, []);

  const next = useCallback(() => setIndex((i) => (i + 1) % WALL_ART_VIDEOS.length), []);

  return (
    <section id="wall-art" className="surface-paper grain relative overflow-hidden px-6 py-28 md:px-12">
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SectionTag n="04">
              Wall art
            </SectionTag>
            <p className="font-ruler relative mt-8 inline-block text-sm uppercase tracking-[0.2em] text-smoke">
              <span className="font-marker absolute -top-6 left-0 -rotate-6 text-xl normal-case tracking-normal text-clay">
                Pencil
              </span>
              <span className="relative">
                Dolphin
                <span className="absolute left-[-6%] top-1/2 h-[2px] w-[112%] -rotate-[8deg] bg-clay" />
              </span>{" "}
              Ground
            </p>
            <h2 className="display mt-3 text-5xl md:text-7xl">
              Vizag&apos;s biggest <Scribble color="#b5664b"><em>wall art.</em></Scribble>
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed text-smoke">
            A larger-than-life mural brought to life stroke by stroke — from bare concrete to a towering canvas across the city.
          </p>
        </div>

        {/* Dimension line, like a measured drawing of the wall */}
        <div aria-hidden className="font-ruler mt-14 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-smoke">
          <span className="h-4 w-px bg-ink/30" />
          <span className="h-px flex-1 bg-ink/20" />
          the wall
          <span className="h-px flex-1 bg-ink/20" />
          <span className="h-4 w-px bg-ink/30" />
        </div>

        <div ref={frameRef} className="relative mt-4 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-ink shadow-[0_2px_4px_rgba(40,30,15,0.12),0_50px_80px_-30px_rgba(40,30,15,0.55)] sm:aspect-video">
          <AnimatePresence initial={false}>
            <motion.video
              key={video.src}
              src={video.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              muted={muted}
              playsInline
              preload="metadata"
              loop={WALL_ART_VIDEOS.length <= 1}
              onEnded={WALL_ART_VIDEOS.length > 1 ? next : undefined}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>

          <a
            href={video.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glass on-media absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          >
            View reel <ExternalLink size={14} />
          </a>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="btn-glass on-media absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {WALL_ART_VIDEOS.length > 1 && (
          <div role="tablist" aria-label="Murals" className="mt-6 flex flex-wrap gap-3">
            {WALL_ART_VIDEOS.map((v, i) => (
              <button
                key={v.src}
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  i === index
                    ? "btn-ink"
                    : "btn-line"
                }`}
              >
                {String(i + 1).padStart(2, "0")} — {v.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
