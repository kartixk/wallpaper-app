"use client";

import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { BottomNav } from "./BottomNav";
import { motion } from "framer-motion";
import Link from "next/link";

export function NavigationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPencilPage = pathname === "/pencil";

  // the portfolio's own pages (home, and the work pages under /desk) bring their own navigation
  const isRootPage = pathname === "/" || pathname === "/desk" || pathname.startsWith("/desk/");
  const hideTopNav = isPencilPage || isRootPage;

  return (
    <>
      {!hideTopNav && (
        <div className="sticky top-0 z-[100] w-full px-5 py-4 flex items-center justify-between gap-4 bg-[#f0f2f5]/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
          <Link href="/pencil">
            <motion.img
              layoutId="app-logo"
              src="/logo.png"
              alt="Logo"
              className="h-10 w-auto object-contain cursor-pointer"
            />
          </Link>
          <SearchBar />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {!isPencilPage && !isRootPage && (
        <>
          <div className="w-full flex items-center justify-center gap-3 pb-32 pt-4 opacity-80">
            <span className="text-2xl font-bold dark:text-white">With</span>
            <span className="heart text-[40px]">❤️</span>
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          </div>
          <BottomNav />
        </>
      )}
    </>
  );
}
