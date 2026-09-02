"use client";

import { useState } from "react";
import { useFolders } from "@/context/FolderContext";
import { useImage } from "@/context/ImageContext";
import { useSearch } from "@/context/SearchContext";
import { cn } from "@/lib/utils";
import { MediaThumb } from "@/components/MediaThumb";

export default function Home() {
  const { folders } = useFolders();
  const { viewImage } = useImage();
  const { searchQuery } = useSearch();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Get images based on active folder, or all if none selected
  let displayedImages: string[] = [];
  if (activeFolderId) {
    const activeFolder = folders.find(f => f.id === activeFolderId);
    if (activeFolder) {
      displayedImages = activeFolder.images;
    }
  } else {
    // Extract all images from all folders into a single flat array
    displayedImages = folders.flatMap(folder => folder.images);
    // Deduplicate images just in case
    displayedImages = Array.from(new Set(displayedImages));
  }

  // Filter by search query
  displayedImages = displayedImages.filter(src => src.toLowerCase().includes(searchQuery.toLowerCase()));

  const getTextColor = (hex: string) => {
    if (!hex) return "rgb(255,255,255)";
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
    <div className="flex flex-col items-center min-h-screen pt-6 px-5 pb-10">
      {folders.length > 0 && (
        <div className="sticky top-[89px] z-40 bg-[#f0f2f5]/80 dark:bg-zinc-950/80 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-full shadow-sm w-full max-w-[1200px] mb-8 overflow-x-auto custom-scrollbar p-2">
          <div className="flex gap-3">
            <button
              onClick={() => {
                setActiveFolderId(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                activeFolderId === null
                  ? "bg-[#111] dark:bg-white text-white dark:text-black shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              All
            </button>
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => {
                  setActiveFolderId(folder.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={activeFolderId === folder.id ? { backgroundColor: folder.color, color: getTextColor(folder.color) } : {}}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                  activeFolderId === folder.id
                    ? "shadow-md"
                    : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                )}
              >
                {folder.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {displayedImages.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 mt-10 text-center max-w-sm">
          No images found.
        </p>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6 w-full max-w-[1200px]">
          {displayedImages.map((src, index) => (
            <div key={index} className="break-inside-avoid relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow mb-6 cursor-pointer group" onClick={() => viewImage(src)}>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10"></div>
              <MediaThumb
                src={src}
                alt={`Uploaded image ${index + 1}`}
                width={640}
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
