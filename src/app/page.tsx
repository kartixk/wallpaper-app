"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Play, Mail, Code, X,
  Volume2, VolumeX, Flame, Sparkles, Tv,
  ChevronLeft, ChevronRight, ExternalLink
} from "lucide-react";
import StickerPeel from "./components/StickerPeel";
import SpotlightNavbar from "./components/SpotlightNavbar";
import doodle1 from "./doodle-1.png";
import { useAbout } from "@/context/AboutContext";

// Lazy load the AnimatedDock since it's at the very bottom of the page.
const AnimatedDock = dynamic(() => import("./components/ui/animated-dock").then(mod => mod.AnimatedDock), {
  ssr: false,
  loading: () => <div className="h-16 w-full animate-pulse bg-surface/50 rounded-full" />
});

// --- GALLERY DATA ---
const INSTAGRAM_URL = "https://www.instagram.com/pencill.7";

interface GalleryItem {
  title: string;
  number: string;
  coverImage: string;
  images: string[];
}

const GALLERY_DATA: GalleryItem[] = [
  {
    title: "Pencil Sketches",
    number: "01",
    coverImage: "/gallery-1.jpeg",
    images: ["/gallery-1.jpeg",
      "/pencilsketches/pencilsketches1.jpg",
      "/pencilsketches/pencilsketches2.jpeg",
      "/pencilsketches/pencilsketches3.webp",
      "/pencilsketches/pencilsketches4.jpeg",
      "/pencilsketches/pencilsketches5.jpeg",
    ],
  },
  {
    title: "Digital Arts",
    number: "02",
    coverImage: "/gallery-2.jpeg",
    images: [
      "/gallery-2.jpeg",
      "/digitalarts/digitalarts5.jpeg",
      "/digitalarts/digitalarts1.webp",
      "/digitalarts/digitalarts2.webp",
      "/digitalarts/digitalarts3.webp",
      "/digitalarts/digitalarts4.jpg",
    ],
  },
  {
    title: "Charcoal Portraits",
    number: "03",
    coverImage: "/gallery-3.jpg",
    images: ["/gallery-3.jpg"],
  },
  {
    title: "Watercolors",
    number: "04",
    coverImage: "/gallery-5.jpeg",
    images: ["/gallery-5.jpeg"],
  },
  {
    title: "Pen Sketches",
    number: "05",
    coverImage: "/gallery-6.jpeg",
    images: ["/gallery-6.jpeg"],
  },
  {
    title: "Acrylic & Pen",
    number: "06",
    coverImage: "/gallery-4.jpeg",
    images: ["/gallery-4.jpeg"],
  },
];

const WALL_ART_VIDEOS = [
  { src: "/wall-art-1.mp4", label: "The Paradise", instagramUrl: "https://www.instagram.com/reel/DVhubNQkdgM/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==" },
  { src: "/wall-art-2.mp4", label: "PEDDI", instagramUrl: "https://www.instagram.com/reel/DZJnRCfRHuY/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==" },
];

export default function Profile() {
  const smoothEase = [0.22, 1, 0.36, 1] as const;
  const { about } = useAbout();

  // --- VIDEO STATE ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // --- WALL ART CAROUSEL STATE ---
  const [wallArtIndex, setWallArtIndex] = useState(0);
  const [wallArtDirection, setWallArtDirection] = useState(0);
  const wallArtContainerRef = useRef<HTMLDivElement>(null);
  const [isWallArtInView, setIsWallArtInView] = useState(false);

  const nextWallArt = useCallback(() => {
    setWallArtDirection(1);
    setWallArtIndex((prev) => (prev + 1) % WALL_ART_VIDEOS.length);
  }, []);

  const prevWallArt = useCallback(() => {
    setWallArtDirection(-1);
    setWallArtIndex((prev) => (prev - 1 + WALL_ART_VIDEOS.length) % WALL_ART_VIDEOS.length);
  }, []);

  const goToWallArt = useCallback((index: number) => {
    setWallArtDirection(index > wallArtIndex ? 1 : -1);
    setWallArtIndex(index);
  }, [wallArtIndex]);

  // Only start playback once the carousel scrolls into view
  useEffect(() => {
    const el = wallArtContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsWallArtInView(entry.isIntersecting),
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = wallArtContainerRef.current;
    if (!el) return;
    el.querySelectorAll("video").forEach((v) => {
      if (isWallArtInView) v.play().catch(() => { });
      else v.pause();
    });
  }, [wallArtIndex, isWallArtInView]);

  // --- WALL ART MUTE STATE (starts muted, auto-unmutes after 3s spent in view) ---
  const [wallArtMuted, setWallArtMuted] = useState(true);
  const wallArtAutoUnmuteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wallArtUserInteracted = useRef(false);

  const toggleWallArtMute = useCallback(() => {
    wallArtUserInteracted.current = true;
    if (wallArtAutoUnmuteTimer.current) {
      clearTimeout(wallArtAutoUnmuteTimer.current);
      wallArtAutoUnmuteTimer.current = null;
    }
    setWallArtMuted((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isWallArtInView && !wallArtUserInteracted.current) {
      wallArtAutoUnmuteTimer.current = setTimeout(() => {
        setWallArtMuted(false);
      }, 3000);
    }
    return () => {
      if (wallArtAutoUnmuteTimer.current) {
        clearTimeout(wallArtAutoUnmuteTimer.current);
        wallArtAutoUnmuteTimer.current = null;
      }
    };
  }, [isWallArtInView]);

  // --- GALLERY MODAL STATE ---
  const [selectedCard, setSelectedCard] = useState<GalleryItem | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);

  const closeModal = useCallback(() => {
    setSelectedCard(null);
    setCarouselIndex(0);
    setSlideDirection(0);
  }, []);

  const openModal = useCallback((item: GalleryItem) => {
    setSelectedCard(item);
    setCarouselIndex(0);
    setSlideDirection(0);
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (!selectedCard) return;
    setSlideDirection(index > carouselIndex ? 1 : -1);
    setCarouselIndex(index);
  }, [selectedCard, carouselIndex]);

  const nextSlide = useCallback(() => {
    if (!selectedCard) return;
    setSlideDirection(1);
    setCarouselIndex((prev) => (prev + 1) % selectedCard.images.length);
  }, [selectedCard]);

  const prevSlide = useCallback(() => {
    if (!selectedCard) return;
    setSlideDirection(-1);
    setCarouselIndex((prev) => (prev - 1 + selectedCard.images.length) % selectedCard.images.length);
  }, [selectedCard]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    if (selectedCard) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedCard, closeModal, nextSlide, prevSlide]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: smoothEase } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  return (
    <div className="portfolio-theme">
      <main className="min-h-screen bg-transparent text-foreground font-sans selection:bg-foreground selection:text-background relative">



        {/* --- LIQUID GLASS NAVBAR --- */}
        <SpotlightNavbar
          items={[
            { label: "Home", href: "#home" },
            { label: "About", href: "#about" },
            { label: "Showreel", href: "#showreel" },
            { label: "Arsenal", href: "#gallery" },
            { label: "Contact", href: "#contact" },
          ]}
        />

        {/* --- HERO SECTION --- */}
        <section id="home" className="h-screen min-h-screen flex flex-col justify-center relative pt-20 overflow-hidden">
          {/* Full-screen backdrop */}
          <div className="absolute inset-0 -z-20">
            <Image
              src="/hero-image.jpeg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />
          </div>

          {/* Logo Sticker Peel for Smart Morph */}
          <div className="absolute top-24 right-6 md:right-12 z-30 hidden sm:block">
            <StickerPeel
              layoutId="app-logo"
              imageSrc="/logo.png"
              width={120}
              rotate={-10}
              peelDirection={10}
              shadowIntensity={0.25}
              lightingIntensity={0.05}
            />
          </div>

          <div className="px-6 md:px-12 max-w-7xl mx-auto relative z-10 w-full -translate-y-16 md:-translate-y-20">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl">
              <motion.p variants={fadeUp} className="text-white/70 font-medium tracking-[0.2em] uppercase text-xs mb-8 flex items-center gap-4">
                <span className="w-12 h-[1px] bg-white/40"></span> Visual Artist
              </motion.p>

              <motion.h1 variants={fadeUp} className="text-7xl md:text-8xl lg:text-[10rem] font-serif tracking-tighter leading-[0.85] mb-8 relative inline-block text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                Abi<span className="italic pr-2">s</span>hek
                <div className="absolute -top-4 -right-8 md:-top-6 md:-right-16 z-30 hidden sm:block">
                  <StickerPeel
                    imageSrc={doodle1.src}
                    width={100}
                    rotate={12}
                    peelDirection={25}
                    shadowIntensity={0.25}
                    lightingIntensity={0.02}
                    className="contrast-125 saturate-110"
                  />
                </div>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/80 font-light leading-relaxed max-w-lg tracking-wide">
                Specializing in pencil sketches, digital arts, 3D animations, and viral content creation. Blurring the line between physical and digital spaces.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* --- WALL ART SECTION --- */}
        <section id="wall-art" className="py-32 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <div className="flex flex-col md:flex-row gap-8 justify-between items-end mb-12">
              <div>
                <motion.div variants={fadeUp} className="relative inline-block mb-3 pl-1">
                  <span className="absolute -top-5 left-0 font-semibold text-red-500 text-lg md:text-xl -rotate-6 select-none">
                    Pencil
                  </span>
                  <span className="text-muted font-medium tracking-[0.2em] uppercase text-xs flex items-center gap-1.5">
                    <span className="relative inline-block">
                      Dolphin
                      <span className="absolute left-[-6%] top-1/2 w-[112%] h-[2px] bg-red-500 -rotate-[8deg] origin-center pointer-events-none" />
                    </span>
                    <span>Ground</span>
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold uppercase tracking-tight">
                  Vizag&apos;s Biggest Wall Art
                </motion.h2>
              </div>
              <motion.p variants={fadeUp} className="text-muted max-w-sm text-base md:text-lg leading-relaxed font-light pb-2">
                A larger-than-life mural brought to life stroke by stroke — from bare concrete to a towering canvas across the city.
              </motion.p>
            </div>

            <motion.div
              ref={wallArtContainerRef}
              variants={fadeUp}
              className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.1)] bg-surface"
            >
              <AnimatePresence initial={false} custom={wallArtDirection} mode="popLayout">
                <motion.video
                  key={wallArtIndex}
                  custom={wallArtDirection}
                  variants={{
                    enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.5, ease: smoothEase }}
                  src={WALL_ART_VIDEOS[wallArtIndex].src}
                  loop={WALL_ART_VIDEOS.length <= 1}
                  onEnded={WALL_ART_VIDEOS.length > 1 ? nextWallArt : undefined}
                  muted={wallArtMuted}
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              <div className="absolute bottom-8 left-8 z-20 backdrop-blur-md bg-black/40 border border-white/10 text-xs font-medium tracking-widest uppercase px-6 py-3 rounded-xl text-white shadow-sm">
                {WALL_ART_VIDEOS[wallArtIndex].label}
              </div>

              <a
                href={WALL_ART_VIDEOS[wallArtIndex].instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-8 left-8 z-20 flex items-center gap-2 backdrop-blur-md bg-black/40 border border-white/20 text-xs font-medium tracking-widest uppercase px-5 py-3 rounded-xl text-white shadow-sm hover:bg-black/60 transition-colors"
              >
                View Reel <ExternalLink size={14} />
              </a>

              <button
                onClick={(e) => { e.stopPropagation(); toggleWallArtMute(); }}
                className="absolute top-8 right-8 z-20 w-11 h-11 rounded-full backdrop-blur-md bg-black/40 border border-white/20 flex items-center justify-center text-white hover:bg-black/60 hover:scale-110 transition-all duration-300 shadow-lg"
              >
                {wallArtMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {WALL_ART_VIDEOS.length > 1 && (
                <>
                  <button
                    onClick={prevWallArt}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 hover:scale-110 transition-all duration-300 shadow-lg"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={nextWallArt}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 hover:scale-110 transition-all duration-300 shadow-lg"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="absolute bottom-8 right-8 z-20 flex gap-2">
                    {WALL_ART_VIDEOS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToWallArt(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === wallArtIndex ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* --- ABOUT SECTION --- */}
        <section id="about" className="py-32 px-6 md:px-12 max-w-6xl mx-auto relative z-10 border-t border-border/80 mt-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-muted font-medium tracking-[0.2em] uppercase text-xs mb-10 flex items-center gap-4">
              <span className="w-12 h-[1px] bg-foreground/30"></span> The Story
            </motion.h2>

            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden backdrop-blur-2xl bg-white/40 border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-12 lg:p-16"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-transparent opacity-80 pointer-events-none" />

              <div className="relative z-10 text-xl md:text-3xl lg:text-[2.15rem] leading-[1.6] md:leading-[1.7] font-medium text-foreground/90 tracking-tight">
                {about.leadText}

                <span className="inline-flex flex-wrap gap-2 md:gap-3 mx-2 md:mx-3 items-center translate-y-2">
                  {about.skills.map((skill) => (
                    <SkillTag key={skill}>{skill}</SkillTag>
                  ))}
                </span>

                <InlineBadge rotate={-8} bg="bg-amber-400" text="text-amber-950">
                  <Sparkles fill="currentColor" size={24} className="md:w-7 md:h-7" />
                </InlineBadge>
                <br /><br />

                <span className="text-muted/90 font-light">
                  {about.paragraph2}

                  <InlineBadge rotate={-5} bg="bg-indigo-500" text="text-white">
                    <Tv fill="currentColor" size={22} className="md:w-6 md:h-6" />
                  </InlineBadge>
                </span>
                <br /><br />

                <span className="text-muted/90 font-light">
                  {about.paragraph3}

                  <InlineBadge rotate={12} bg="bg-rose-500" text="text-white">
                    <Flame fill="currentColor" size={22} className="md:w-6 md:h-6" />
                  </InlineBadge>
                </span>

                {/* The Toolkit Footnote */}
                <div className="mt-12 pt-8 border-t border-border/60">
                  <p className="text-base md:text-lg font-mono text-muted leading-relaxed">
                    <strong className="text-foreground font-serif italic text-xl mr-3 font-medium">My Toolkit:</strong>
                    {about.toolkit}
                  </p>
                </div>

              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* --- CINEMATIC SHOWREEL SECTION --- */}
        <section id="showreel" className="py-32 px-6 md:px-12 max-w-7xl mx-auto relative z-10 border-t border-border/80">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <div className="flex flex-col md:flex-row gap-8 justify-between items-end mb-12">
              <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold uppercase tracking-tight">
                Dimensions in Motion
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 max-w-sm text-base md:text-lg leading-relaxed font-light pb-2">
                From static sketches to fully rendered worlds. Hit play to watch a collection of my 3D animated videos and visual storytelling.
              </motion.p>
            </div>

            <motion.div
              variants={fadeUp}
              className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.1)] bg-surface cursor-pointer group"
              onClick={toggleMute}
            >
              <video
                ref={videoRef}
                src="/showreel.mp4"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="metadata"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] scale-100 group-hover:scale-[1.02]"
              />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center">
                <div className={`w-20 h-20 rounded-full backdrop-blur-xl bg-black/40 border border-white/20 flex items-center justify-center text-white transition-all duration-500 ease-out shadow-2xl ${isMuted ? 'scale-100 opacity-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}`}>
                  {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
                </div>
              </div>

              <div className="absolute bottom-8 left-8 backdrop-blur-md bg-black/40 border border-white/10 text-xs font-medium tracking-widest uppercase px-6 py-3 rounded-xl text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-[800ms]">
                {isMuted ? "Click to Unmute" : "Playing with Audio"}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* --- SELECTED WORKS / MEDIUMS --- */}
        <section id="gallery" className="py-32 px-6 md:px-12 max-w-7xl mx-auto border-t border-border/80 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: smoothEase }}
            className="flex flex-col md:flex-row gap-8 justify-between items-end mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-serif tracking-tighter">Creative Arsenal</h2>
            <p className="text-muted max-w-sm text-base md:text-lg leading-relaxed font-light pb-2">
              A comprehensive toolkit designed to bring complex ideas into clear, engaging visual realities.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12"
          >
            {GALLERY_DATA.map((item) => (
              <GalleryCard
                key={item.number}
                title={item.title}
                number={item.number}
                imageSrc={item.coverImage}
                onClick={() => openModal(item)}
              />
            ))}
          </motion.div>
        </section>

        {/* --- CONTACT SECTION --- */}
        <section id="contact" className="py-32 px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: smoothEase }}
            className="max-w-7xl mx-auto flex flex-col items-center text-center"
          >
            <div className="mb-6">
              <Flame size={48} className="text-foreground/20" strokeWidth={1} />
            </div>
            <h2 className="text-4xl md:text-6xl font-serif tracking-tighter mb-4">Get in Touch</h2>
            <p className="text-muted text-base md:text-lg font-light mb-12 max-w-md leading-relaxed">
              Open for commissions, collaborations, and creative projects.
            </p>
            <AnimatedDock
              items={[
                { link: "https://www.instagram.com/pencill.7", target: "_blank", Icon: <Camera size={20} /> },
                { link: "https://www.youtube.com/@pencill7", target: "_blank", Icon: <Play size={20} /> },
                { link: "mailto:challaabi12@gmail.com", Icon: <Mail size={20} /> },
              ]}
            />
          </motion.div>
        </section>

        {/* --- CAROUSEL GALLERY MODAL --- */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
              onClick={closeModal}
            >
              {/* Darker Backdrop */}
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-5xl max-h-[90vh] rounded-[2rem] overflow-hidden bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-background/50 backdrop-blur-md border border-border flex items-center justify-center text-foreground hover:bg-background transition-all duration-300 shadow-sm hover:scale-105"
                >
                  <X size={24} />
                </button>

                {/* Carousel Image Area */}
                <div className="relative w-full flex-1 min-h-[50vh] md:min-h-[60vh] bg-foreground/5 overflow-hidden">
                  <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
                    <motion.div
                      key={carouselIndex}
                      custom={slideDirection}
                      variants={{
                        enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center justify-center p-4"
                    >
                      <Image
                        src={selectedCard.images[carouselIndex]}
                        alt={`${selectedCard.title} - ${carouselIndex + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 1200px"
                        className="object-contain p-2 md:p-8"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Arrows — only show if more than 1 image */}
                  {selectedCard.images.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-background/60 backdrop-blur-md border border-border/60 flex items-center justify-center text-foreground hover:bg-background hover:scale-110 transition-all duration-300 shadow-lg"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-background/60 backdrop-blur-md border border-border/60 flex items-center justify-center text-foreground hover:bg-background hover:scale-110 transition-all duration-300 shadow-lg"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {selectedCard.images.length > 1 && (
                    <div className="absolute top-6 left-6 z-20 px-4 py-2 rounded-full bg-background/60 backdrop-blur-md border border-border/60 text-xs font-mono tracking-widest text-foreground/80">
                      {carouselIndex + 1} / {selectedCard.images.length}
                    </div>
                  )}
                </div>

                {/* Dot Indicators */}
                {selectedCard.images.length > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4 bg-surface">
                    {selectedCard.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => goToSlide(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === carouselIndex
                          ? "bg-foreground scale-110"
                          : "bg-foreground/20 hover:bg-foreground/40"
                          }`}
                      />
                    ))}
                  </div>
                )}

                {/* Info Bar + View More */}
                <div className="flex items-center justify-between p-6 md:px-10 md:py-8 bg-background border-t border-border/60 shrink-0">
                  <div>
                    <h3 className="text-2xl md:text-4xl font-serif tracking-tight">{selectedCard.title}</h3>
                    <p className="text-muted text-sm md:text-base font-mono uppercase tracking-widest mt-2">Medium — {selectedCard.number}</p>
                  </div>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium tracking-wide hover:scale-105 hover:shadow-lg transition-all duration-300"
                  >
                    View More <ExternalLink size={16} />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- FOOTER --- */}
        <footer className="py-16 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-muted font-medium uppercase tracking-[0.2em] relative z-10 border-t border-border/80">
          <span>© {new Date().getFullYear()} Pencil7</span>
          <span className="mt-4 md:mt-0 hover:text-foreground transition-colors cursor-pointer duration-500">Visakhapatnam, IN</span>
        </footer>

      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function SkillTag({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="inline-block px-4 py-1.5 md:px-5 md:py-2 bg-foreground/5 backdrop-blur-md border border-foreground/10 text-foreground font-mono text-xs md:text-sm uppercase tracking-wider rounded-full cursor-pointer hover:bg-foreground hover:text-background transition-colors duration-300 shadow-sm"
    >
      {children}
    </motion.span>
  );
}

function InlineBadge({ children, rotate, bg, text }: { children: React.ReactNode, rotate: number, bg: string, text: string }) {
  return (
    <motion.span
      whileHover={{ scale: 1.15, rotate: 0 }}
      className={`inline-flex items-center justify-center align-middle mx-3 md:mx-4 w-10 h-10 md:w-14 md:h-14 rounded-full shadow-lg ${bg} ${text} transform transition-all duration-500 cursor-default ring-1 ring-white/30 hover:shadow-2xl`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </motion.span>
  );
}

function GalleryCard({ title, number, imageSrc, onClick }: { title: string, number: string, imageSrc: string, onClick?: () => void }) {
  const smoothEase = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: smoothEase } }
      }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[4/5] bg-background mb-6 relative overflow-hidden rounded-xl border border-border/80 shadow-sm transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-xl group-hover:-translate-y-2">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] scale-100 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-0" />
        <div className="absolute inset-0 flex items-center justify-center text-white font-sans text-xs uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-10">
          View Work
        </div>
      </div>
      <div className="flex justify-between items-start border-b border-border/80 pb-4 transition-colors duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-foreground/30">
        <h3 className="text-xl font-serif tracking-tight group-hover:italic transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">{title}</h3>
        <span className="text-xs font-sans text-muted tracking-widest transition-colors duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-foreground">{number}</span>
      </div>
    </motion.div>
  );
}
