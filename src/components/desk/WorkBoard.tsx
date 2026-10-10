"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { INSTAGRAM_URL, WORK, workHref } from "./data";
import { Scribble, SectionTag, Tape } from "./Pencil";
import { FILTER_EVENT } from "./tools";

interface Piece {
  src: string;
  category: string;
}

const ALL = "All";
const ALL_PIECES: Piece[] = WORK.flatMap((c) => c.images.map((src) => ({ src, category: c.title })));
// deterministic "pinned by hand" tilt per card
const tilt = (i: number) => ((i * 37) % 7) - 3;

export function WorkBoard({ initialFilter = ALL, syncUrl = false, children }: { initialFilter?: string; syncUrl?: boolean; children?: React.ReactNode } = {}) {
  const [filter, setFilter] = useState(initialFilter);
  const [open, setOpen] = useState<number | null>(null);

  // the sketchbook's "view more" (and the tools) send the visitor here, to the medium they were looking at
  useEffect(() => {
    const onFilter = (e: Event) => {
      const wanted = (e as CustomEvent<string>).detail;
      setFilter(WORK.some((c) => c.title === wanted) ? wanted : ALL);
      setOpen(null);
    };
    window.addEventListener(FILTER_EVENT, onFilter);
    return () => window.removeEventListener(FILTER_EVENT, onFilter);
  }, []);

  const pieces = useMemo(
    () => (filter === ALL ? ALL_PIECES : ALL_PIECES.filter((p) => p.category === filter)),
    [filter]
  );

  return (
    <section id="work" className="surface-graphite grain relative px-6 py-28 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SectionTag n="03" light>
              Selected work
            </SectionTag>
            <h2 className="display mt-6 text-5xl md:text-7xl">
              Fresh off <Scribble color="#ecd3a0"><em>the desk.</em></Scribble>
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed text-paper/70">
            Graphite, charcoal, ink, watercolour and pixels — a few favourites pinned to the wall.
          </p>
        </div>

        <div role="tablist" aria-label="Filter by medium" className="mt-10 flex flex-wrap gap-3">
          {[ALL, ...WORK.map((c) => c.title)].map((t) => {
            const active = t === filter;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(t);
                  // on its own page, the address follows the tab, so any view can be shared or bookmarked
                  if (syncUrl) window.history.replaceState(null, "", workHref(t === ALL ? undefined : t));
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-b from-white to-[#f3ece0] text-ink shadow-[0_1px_0_white_inset,0_8px_20px_-6px_rgba(0,0,0,0.6)]"
                    : "btn-glass"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <motion.ul layout className="mt-12 columns-2 gap-5 md:columns-3 md:gap-8">
          <AnimatePresence mode="popLayout">
            {pieces.map((p, i) => (
              <motion.li
                layout
                key={p.src}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 160, damping: 20 }}
                className="mb-5 break-inside-avoid md:mb-8"
              >
                <button
                  onClick={() => setOpen(i)}
                  style={{ rotate: `${tilt(i)}deg` }}
                  className="group relative block w-full bg-gradient-to-b from-white to-[#f3efe6] p-2 pb-8 text-left text-ink shadow-[0_2px_3px_rgba(0,0,0,0.25),0_24px_40px_-16px_rgba(0,0,0,0.7)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:z-10 hover:rotate-0! hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_4px_6px_rgba(0,0,0,0.2),0_40px_60px_-18px_rgba(0,0,0,0.8)] md:p-3 md:pb-10"
                >
                  {i % 3 === 0 && <Tape className="-top-3 left-1/2 h-6 w-16 -translate-x-1/2" />}
                  <Image
                    src={p.src}
                    alt={`${p.category} by Abishek`}
                    width={800}
                    height={1000}
                    sizes="(max-width: 768px) 45vw, 360px"
                    className="h-auto w-full"
                  />
                  <span className="font-ruler absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.15em] text-ink/60 md:bottom-3">
                    {p.category}
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ochre inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-medium"
          >
            More on Instagram <ExternalLink size={16} />
          </a>
          <Link
            href="/gallery"
            className="btn-glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold"
          >
            Get his art as wallpapers →
          </Link>
        </div>
        {children}
      </div>

      <Lightbox pieces={pieces} index={open} onChange={setOpen} />
    </section>
  );
}

function Lightbox({
  pieces,
  index,
  onChange,
}: {
  pieces: Piece[];
  index: number | null;
  onChange: (i: number | null) => void;
}) {
  const n = pieces.length;
  const close = useCallback(() => onChange(null), [onChange]);
  const step = useCallback(
    (d: number) => index !== null && onChange((index + d + n) % n),
    [index, n, onChange]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  const piece = index !== null ? pieces[index] : null;

  return (
    <AnimatePresence>
      {piece && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={piece.category}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm md:p-10"
          onClick={close}
        >
          <motion.div
            key={piece.src}
            initial={{ scale: 0.92, rotate: -2, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="relative h-[78vh] w-full max-w-4xl bg-white p-3 pb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full w-full">
              <Image src={piece.src} alt={`${piece.category} by Abishek`} fill sizes="(max-width: 768px) 100vw, 900px" className="object-contain" />
            </div>
            <div className="font-ruler absolute bottom-3 left-4 right-4 flex justify-between text-xs uppercase tracking-[0.15em] text-ink/70">
              <span>{piece.category}</span>
              <span>
                {index! + 1} / {n}
              </span>
            </div>
          </motion.div>

          <button aria-label="Close" onClick={close} className="btn-glass absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full">
            <X size={20} />
          </button>
          {n > 1 && (
            <>
              <button
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="btn-glass absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="btn-glass absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
