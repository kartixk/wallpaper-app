"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { afterDeskReady } from "./hero/flight";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

// the hero's sketchbook flies down into the slot beside the text
const FlyingBook = dynamic(() => import("./hero/FlyingBook"), { ssr: false });

// Key phrases borrow the gradient of the section they lead to.
const GRADIENTS = {
  graphite: "bg-gradient-to-br from-[#8d8a83] via-[#4a4843] to-[#1f1e1c]",
  pixels: "bg-gradient-to-br from-[#a3b0c2] via-[#6f7f95] to-[#4b5a6e]",
  motion: "bg-gradient-to-br from-[#b6bfad] via-[#8a9682] to-[#5d6857]",
  walls: "bg-gradient-to-br from-[#e2b48a] via-[#c27a58] to-[#9c4f36]",
};

const LINE: { t: string; g?: keyof typeof GRADIENTS }[] = [
  { t: "I" },
  { t: "sketch" },
  { t: "in" },
  { t: "graphite,", g: "graphite" },
  { t: "paint" },
  { t: "in" },
  { t: "pixels,", g: "pixels" },
  { t: "set" },
  { t: "drawings" },
  { t: "in" },
  { t: "motion", g: "motion" },
  { t: "—" },
  { t: "and" },
  { t: "turn" },
  { t: "whole" },
  { t: "city", g: "walls" },
  { t: "walls", g: "walls" },
  { t: "into" },
  { t: "canvases." },
];

export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  // its canvas only spins up once the hero desk is showing, so the two never load at once
  const [bookReady, setBookReady] = useState(false);
  useEffect(() => afterDeskReady(() => setBookReady(true)), []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });

  return (
    <section
      aria-label="About the work"
      className="surface-stone grain relative overflow-hidden px-6 py-32 md:px-12 md:py-44"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-12 md:gap-16">
        {/* the sketchbook lands here; its shadow fades in as it arrives (--book: 0 → 1) */}
        <div className="md:col-span-5">
          <div
            ref={slot}
            className="relative mx-auto aspect-[22/30] w-[min(58vw,250px)] md:w-full md:max-w-[340px]"
          >
            <div
              aria-hidden
              style={{ opacity: "var(--book, 0)" }}
              className="absolute -bottom-8 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[50%] bg-[#3a2a1a]/35 blur-2xl"
            />
          </div>
          {bookReady && <FlyingBook slot={slot} />}
        </div>

        <div className="md:col-span-7">
          <p
            ref={ref}
            className="display text-[2.3rem] leading-[1.08] sm:text-5xl lg:text-6xl"
          >
            {LINE.map((w, i) => (
              <Word
                key={i}
                progress={scrollYProgress}
                range={[i / LINE.length, (i + 1) / LINE.length]}
                gradient={w.g && GRADIENTS[w.g]}
              >
                {w.t}
              </Word>
            ))}
          </p>
          <p className="font-ruler mt-12 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-ink/55">
            <span aria-hidden className="h-px w-10 bg-ink/40" />
            Abishek, a.k.a. Pencil
          </p>
        </div>
      </div>
    </section>
  );
}

function Word({
  children,
  progress,
  range,
  gradient,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  gradient?: string;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <>
      <motion.span
        style={{ opacity }}
        className={
          gradient
            ? `${gradient} -ml-[0.15em] bg-clip-text py-[0.1em] pl-[0.15em] pr-[0.08em] text-transparent [font-family:var(--font-accent)] font-normal italic`
            : undefined
        }
      >
        {children}
      </motion.span>{" "}
    </>
  );
}
