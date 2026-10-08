import Image from "next/image";
import Link from "next/link";
import { Camera, Mail, Play } from "lucide-react";
import { EMAIL, INSTAGRAM_URL, YOUTUBE_URL } from "./data";
import { Scribble, SectionTag } from "./Pencil";

export function Contact() {
  return (
    <section id="contact" className="grain relative overflow-hidden bg-[radial-gradient(55%_65%_at_78%_75%,rgba(212,162,76,0.26)_0%,rgba(212,162,76,0.06)_45%,transparent_70%),linear-gradient(180deg,#2a2926,#1a1917)] px-6 pt-28 text-paper md:px-12">
      <div className="mx-auto grid max-w-6xl items-end gap-10 md:grid-cols-12">
        <div className="pb-16 md:col-span-7 md:pb-28">
          <SectionTag n="06" light>
            Contact
          </SectionTag>
          <h2 className="display mt-6 text-5xl md:text-7xl">
            Got a wall, a brand or <Scribble color="#ecd3a0"><em>a story?</em></Scribble>
          </h2>
          <p className="mt-8 text-2xl font-medium text-ochre-soft md:text-3xl">Let&apos;s create something.</p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-paper/70">
            Open for commissions, murals, animation and design collaborations.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <a
              href={`mailto:${EMAIL}`}
              className="btn-ochre inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold"
            >
              <Mail size={18} /> {EMAIL}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold"
            >
              <Camera size={18} /> @pencill.7
            </a>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold"
            >
              <Play size={18} /> YouTube
            </a>
          </div>
        </div>

        {/* Cut-out art sitting in a warm glow */}
        <div className="relative mx-auto w-full max-w-md md:col-span-5">
          <p className="font-marker absolute right-2 top-[14%] z-10 rotate-6 rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-ink shadow-[0_18px_30px_-10px_rgba(0,0,0,0.7)] md:-right-4">
            mmph! <span className="text-ink/50">(say hi)</span>
          </p>
          <Image
            src="/pencil/pencil-hoodie.png"
            alt="Pencil in a yellow hoodie with a pencil held in his mouth"
            width={697}
            height={816}
            sizes="(max-width: 768px) 100vw, 450px"
            className="h-auto w-full drop-shadow-[0_0_40px_rgba(212,162,76,0.3)]"
          />
        </div>
      </div>

      <footer className="font-ruler relative mx-auto mt-0 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-paper/20 py-8 text-xs uppercase tracking-[0.2em] text-paper/60 md:flex-row">
        <span>© {new Date().getFullYear()} Pencil7 · Abishek</span>
        <Link href="/gallery" className="hover:text-ochre-soft">
          Wallpapers
        </Link>
        <span>Visakhapatnam, IN</span>
      </footer>
    </section>
  );
}
