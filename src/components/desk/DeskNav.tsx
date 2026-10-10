"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "./data";

export function DeskNav() {
  const [open, setOpen] = useState(false);
  // off the home page the section links lead back to it ("/#about"), not to a section that is not here
  const home = usePathname() === "/";
  const to = (href: string) => (home || !href.startsWith("#") ? href : `/${href}`);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
      <nav className="soft-card relative mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/60 bg-paper/80 px-3 py-2 backdrop-blur-xl md:px-4">
        <a href={to("#top")} className="flex items-center" aria-label="Abishek — back to top">
          <Image src="/pencil/logo-abishek.png" alt="Abishek" width={1050} height={645} className="h-9 w-auto md:h-10" priority />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={to(l.href)}
                className="rounded-full px-4 py-2 text-sm font-medium text-ink/75 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/gallery"
              className="btn-ink ml-2 inline-block rounded-full px-5 py-2 text-sm font-medium"
            >
              Wallpapers ↗
            </Link>
          </li>
        </ul>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* scroll progress drawn as a pencil line along the bottom edge */}
        <motion.span
          aria-hidden
          style={{ scaleX: progress }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-ochre via-clay to-dusk"
        />
      </nav>

      {open && (
        <ul className="soft-card mx-auto mt-3 flex max-w-6xl flex-col rounded-2xl border border-white/60 bg-paper/90 p-2 backdrop-blur-xl md:hidden">
          {[...NAV_LINKS, { label: "Wallpapers ↗", href: "/gallery" }].map((l) => (
            <li key={l.href}>
              <a
                href={to(l.href)}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-base font-medium hover:bg-ink/5"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
