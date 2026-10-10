"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Scribble, SectionTag } from "./Pencil";
import { TOOLS, openTool, type Tool } from "./tools";
import { workHref } from "./data";

const ToolCup = dynamic(() => import("./ToolCup"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[2rem] bg-sand/30" />,
});

export function WhatIDo() {
  const [active, setActive] = useState<Tool["id"] | null>(null);
  const router = useRouter();
  // a tool leads to its medium's own page; Wall Art, which has a section of its own on this page, scrolls to it
  const open = (t: Tool) => (t.anchor ? openTool(t) : router.push(workHref(t.category)));
  const stageRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Only mount and animate the 3D scene while it is near the viewport
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="skills" className="surface-stone grain relative overflow-hidden px-6 py-28 md:py-0">
      <div className="mx-auto grid max-w-4xl items-center gap-10">
        {/* On larger screens the sketchbook (just above) carries the heading, the index and the
            tools, so this section shows nothing there. Phones, where the page is too small to
            read, keep the full section; screen readers get the heading either way. */}
        <div className="md:hidden">
          <SectionTag n="02">What I do</SectionTag>
          <h2 className="display mt-6 text-5xl md:text-7xl">
            Every tool has <Scribble><em>a job.</em></Scribble>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-smoke">
            Pull a tool out of the cup to see what it makes — from graphite portraits to murals the size of a building.
          </p>

          <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
            {TOOLS.map((t) => (
              <li key={t.id}>
                <button
                  onMouseEnter={() => setActive(t.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(t.id)}
                  onBlur={() => setActive(null)}
                  onClick={() => open(t)}
                  className={`group flex w-full items-center justify-between py-3.5 text-left transition-colors ${
                    active === t.id ? "text-ink" : "text-ink/70"
                  }`}
                >
                  <span className="flex items-baseline gap-4">
                    <span className="text-lg font-medium">{t.discipline}</span>
                    <span className="font-ruler text-[11px] uppercase tracking-[0.2em] text-smoke/80">{t.name}</span>
                  </span>
                  <ArrowUpRight
                    size={18}
                    className={`transition-transform ${active === t.id ? "translate-x-0.5 -translate-y-0.5 text-ochre" : "text-ink/30"}`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="sr-only hidden md:block">Every tool has a job.</h2>

        <div ref={stageRef} className="relative h-[440px] sm:h-[520px] md:hidden">
          {/* soft pool of lamp light under the cup */}
          <div aria-hidden className="absolute inset-x-[10%] bottom-[6%] top-[20%] rounded-full bg-[radial-gradient(closest-side,rgba(255,250,240,0.9),rgba(255,250,240,0))]" />
          {inView && <ToolCup active={active} onActive={setActive} onSelect={open} running={inView} />}
          <p className="font-marker pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-lg text-smoke/80">
            {TOOLS.find((t) => t.id === active)?.discipline ?? "go on, pull one out ↑"}
          </p>
        </div>
      </div>
    </section>
  );
}
