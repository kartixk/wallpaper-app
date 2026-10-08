"use client";

import { motion } from "framer-motion";

export function Tape({ className }: { className?: string }) {
  return <span aria-hidden className={`tape absolute block h-7 w-24 ${className ?? ""}`} />;
}

/** "01 —— Label" eyebrow. */
export function SectionTag({ n, children, light }: { n: string; children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`font-ruler flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] ${light ? "text-white/75" : "text-ink/60"}`}>
      <span className="font-bold">{n}</span>
      <span aria-hidden className={`h-px w-10 ${light ? "bg-white/50" : "bg-ink/40"}`} />
      {children}
    </p>
  );
}

/** Pencil-stroke underline that draws itself when scrolled into view. Wrap the accent word. */
export function Scribble({ children, color = "#d4a24c" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.28em] w-full overflow-visible">
        <motion.path
          d="M4 16 C 60 6, 120 4, 180 10 S 270 18, 296 8"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
        />
      </svg>
    </span>
  );
}
