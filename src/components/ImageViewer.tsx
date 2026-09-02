"use client";

import { motion, AnimatePresence } from "framer-motion";
import { isVideoUrl } from "@/lib/utils";

interface ImageViewerProps {
  src: string | null;
  onClose: () => void;
}

export function ImageViewer({ src, onClose }: ImageViewerProps) {
  const handleDownload = async () => {
    if (!src) return;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ext = isVideoUrl(src) ? "mp4" : "jpg";
      link.download = "wallpaper-" + Date.now() + "." + ext;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed, falling back to new tab", error);
      window.open(src, "_blank");
    }
  };

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
        >
          {/* Top Bar */}
          <div className="absolute top-0 right-0 w-full p-6 flex justify-end z-10 pointer-events-none">
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors pointer-events-auto"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 stroke-white stroke-[2.5px]">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Media */}
          {src && isVideoUrl(src) ? (
            <motion.video
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={src}
              className="w-full h-full object-contain p-4 md:p-12"
              controls
              autoPlay
              loop
              playsInline
            />
          ) : (
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={src ?? undefined}
              alt="Fullscreen wallpaper"
              className="w-full h-full object-contain p-4 md:p-12"
            />
          )}

          {/* Bottom Bar */}
          <div className="absolute bottom-0 w-full p-8 flex justify-center z-10 pointer-events-none pb-12">
            <button
              onClick={handleDownload}
              className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black hover:scale-105 transition-transform shadow-[0_8px_30px_rgba(255,255,255,0.2)] font-bold text-lg pointer-events-auto"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 stroke-black stroke-[2.5px]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
