"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Scribble, SectionTag } from "./Pencil";

export function Showreel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
    v.play().catch(() => {});
  };

  return (
    <section
      id="reel"
      className="surface-stone grain relative overflow-hidden px-6 py-28 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SectionTag n="05">
              Showreel
            </SectionTag>
            <h2 className="display mt-6 text-5xl md:text-7xl">
              Dimensions <Scribble><em>in motion.</em></Scribble>
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed text-smoke">
            From static sketches to fully rendered worlds — 3D animation, motion design and visual storytelling.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-12">
          {/* Monitor */}
          <div className="lg:col-span-9">
            <button
              onClick={toggle}
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              className="group relative block w-full rounded-[1.6rem] bg-gradient-to-b from-[#2e2e2e] to-[#0c0c0c] p-3 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_2px_4px_rgba(40,30,15,0.15),0_50px_80px_-30px_rgba(40,30,15,0.6)] md:p-4"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg">
                <video
                  ref={videoRef}
                  src="/showreel.mp4"
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <span className="btn-glass on-media absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {muted ? "Click for sound" : "Sound on"}
                </span>
              </div>
              <span aria-hidden className="mx-auto mt-3 block h-1.5 w-1.5 rounded-full bg-clay" />
            </button>
          </div>

          {/* Record player: spins while the reel has sound */}
          <div className="flex flex-col items-center gap-4 lg:col-span-3">
            <button
              onClick={toggle}
              aria-label={muted ? "Drop the needle — turn sound on" : "Lift the needle — turn sound off"}
              className="relative aspect-square w-48 rounded-2xl bg-gradient-to-br from-[#8a5532] via-[#5e3519] to-[#3a1f0e] p-4 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_36px_50px_-24px_rgba(40,30,15,0.6)] md:w-56"
            >
              <span
                className={`block h-full w-full rounded-full ${muted ? "" : "animate-spin-record"}`}
                style={{
                  background:
                    "radial-gradient(circle, #b5664b 0 17%, #111 18% 20%, #222 21% 30%, #111 31% 40%, #232323 41% 52%, #111 53% 64%, #222 65% 78%, #111 79%)",
                }}
              >
                <span className="font-marker absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-paper">
                  pencil
                </span>
              </span>
              {/* tonearm */}
              <span
                aria-hidden
                className={`absolute right-3 top-3 h-28 w-2 origin-top rounded-full bg-[#b9b9b4] transition-transform duration-500 md:h-32 ${
                  muted ? "rotate-[8deg]" : "rotate-[28deg]"
                }`}
              />
            </button>
            <p className="font-marker text-center text-lg text-smoke">
              {muted ? "drop the needle ↑" : "now spinning ♪"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
