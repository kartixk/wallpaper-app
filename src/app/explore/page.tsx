"use client";

import { useState } from "react";
import { useFolders, Folder } from "@/context/FolderContext";
import { useImage } from "@/context/ImageContext";
import { useSearch } from "@/context/SearchContext";
import { FolderCard } from "@/components/FolderCard";
import { motion, AnimatePresence } from "framer-motion";
import { MediaThumb } from "@/components/MediaThumb";

export default function Explore() {
  const { folders } = useFolders();
  const { viewImage } = useImage();
  const { searchQuery } = useSearch();
  const exploreFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  const getTextColor = (hex: string) => {
    hex = hex.replace(/^#/, "");
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 140 ? "rgb(0,0,0)" : "rgb(255,255,255)";
  };

  return (
    <div className="flex flex-col items-center min-h-screen pt-12 px-5 pb-32">
      {exploreFolders.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 mt-10">
          No collections created yet. Go to /admin to create some!
        </p>
      ) : (
        <div className="flex flex-wrap gap-y-[70px] gap-x-10 justify-center w-full max-w-[1200px]">
          {exploreFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              layoutIdPrefix="explore"
              onClick={() => setSelectedFolder(folder)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedFolder && (
          <motion.div
            layoutId={`explore-${selectedFolder.id}-container`}
            className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
            style={{ backgroundColor: selectedFolder.color }}
          >
            {/* Header */}
            <motion.div
              layoutId={`explore-${selectedFolder.id}-glass`}
              className="sticky top-0 z-10 w-full px-6 py-5 flex items-center justify-between backdrop-blur-md bg-black/10 border-b border-white/20"
            >
              <motion.h3
                layoutId={`explore-${selectedFolder.id}-title`}
                className="font-bold text-3xl tracking-tight drop-shadow-sm"
                style={{ color: getTextColor(selectedFolder.color) }}
              >
                {selectedFolder.name}
              </motion.h3>

              <button
                onClick={() => setSelectedFolder(null)}
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-colors border-none cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 stroke-white stroke-[2.5px]" style={{ stroke: getTextColor(selectedFolder.color) }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </motion.div>

            {/* Images Grid */}
            <div className="p-6 md:p-10 columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
              {selectedFolder.images.map((src: string, idx: number) => (
                <motion.div
                  key={idx}
                  layoutId={`explore-${selectedFolder.id}-image-${idx}`}
                  className="relative w-full break-inside-avoid rounded-2xl overflow-hidden shadow-xl cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => viewImage(src)}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10"></div>
                  <MediaThumb src={src} alt="wallpaper" width={640} className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
