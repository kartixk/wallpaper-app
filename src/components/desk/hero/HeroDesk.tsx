"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { READY_EVENT, flight } from "./flight";
import { ArrowDown, Play } from "lucide-react";

const DeskScene = dynamic(() => import("./DeskScene"), { ssr: false });

export function HeroDesk() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => {
    setReady(true);
    flight.ready = true;
    window.dispatchEvent(new Event(READY_EVENT));
  }, []);

  // Stop rendering the desk once it has scrolled away
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[radial-gradient(120%_90%_at_50%_30%,#e6e0d4_0%,#3a3430_80%)]"
    >
      <h1 className="sr-only">Abishek — Created to Create</h1>

      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
        <DeskScene running={inView} eventSource={sectionRef} onReady={handleReady} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-6 md:px-10 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 md:flex-row md:items-end md:justify-end">
          <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
            <Link href="/desk" className="btn-ink inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium">
              See the work <ArrowDown size={18} />
            </Link>
            <a
              href="#reel"
              className="btn-line inline-flex items-center gap-2 rounded-full bg-paper/70 px-6 py-3 font-medium backdrop-blur"
            >
              <Play size={16} fill="currentColor" /> Watch the reel
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
