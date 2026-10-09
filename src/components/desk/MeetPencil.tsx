"use client";

import { motion } from "framer-motion";
import { useAbout } from "@/context/AboutContext";
import { flight } from "./hero/flight";
import { Scribble, SectionTag } from "./Pencil";

const ease = [0.22, 1, 0.36, 1] as const;

export function MeetPencil() {
  const { about } = useAbout();
  const tools = about.toolkit
    .split(/,\s*(?:and\s+)?|\s+and\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    // overflow-clip, not hidden: hidden would make this the scroll container and un-stick the book below
    <section id="about" className="surface-paper grain relative overflow-clip px-6 pb-12 pt-32 md:px-12">
      <div className="mx-auto max-w-6xl">
        {/* the sketchbook flies down from the manifesto and falls open here (see hero/FlyingBook);
            its shadow fades in as it lands (--book: 0 → 1). It then stays pinned while the
            scroll through this tall wrapper turns its page to the index of the next section. */}
        <div
          ref={(el) => {
            flight.pin = el;
            return () => {
              flight.pin = null;
            };
          }}
          className="relative"
          style={{ height: "1400svh" }}
        >
          <div className="sticky top-0 grid h-[100svh] place-items-center">
            <div
              ref={(el) => {
                flight.spread = el;
                return () => {
                  flight.spread = null;
                };
              }}
              className="relative aspect-[44/30] w-full max-w-5xl"
            >
              <div
                aria-hidden
                style={{ opacity: "var(--book, 0)" }}
                className="absolute -bottom-10 left-1/2 h-16 w-[88%] -translate-x-1/2 rounded-[50%] bg-[#3a2a1a]/30 blur-3xl"
              />
            </div>
          </div>
        </div>

        {/* The words printed on the book's right-hand page. On phones the page is too small to
            read, so they're shown here; on larger screens they stay for screen readers. */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 1, ease }}
          className="mx-auto mt-14 max-w-2xl md:sr-only"
        >
          <SectionTag n="01">Meet Pencil</SectionTag>
          <h2 className="display mt-6 text-5xl md:text-7xl">
            Created to <Scribble><em>create.</em></Scribble>
          </h2>

          <p className="mt-8 text-xl leading-relaxed md:text-2xl">
            {about.leadText}{" "}
            {about.skills.map((s, i) => (
              <span key={s}>
                <span className="marker-highlight font-semibold">{s}</span>
                {i < about.skills.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink/75">{about.paragraph2}</p>
          <p className="mt-4 text-lg leading-relaxed text-ink/75">{about.paragraph3}</p>

          <div className="soft-card mt-10 rounded-2xl border border-white/70 bg-white/70 p-5 backdrop-blur">
            <p className="font-ruler mb-4 text-[11px] uppercase tracking-[0.3em] text-ink/55">In the pencil case</p>
            <ul className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <li key={t} className="rounded-full bg-gradient-to-b from-white to-[#efe9dc] px-3.5 py-1.5 text-sm font-medium shadow-[0_1px_0_white_inset,0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-ink/10">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
