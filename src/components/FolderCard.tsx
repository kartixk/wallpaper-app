"use client";

import React from "react";
import { Folder } from "@/context/FolderContext";
import { cn, isVideoUrl, thumbUrl } from "@/lib/utils";
import { motion } from "framer-motion";

interface FolderCardProps {
  folder: Folder;
  className?: string;
  onClick?: () => void;
  layoutIdPrefix?: string;
}

export function FolderCard({ folder, className, onClick, layoutIdPrefix = "folder" }: FolderCardProps) {
  // Convert hex color to rgba for the glass overlay
  const hexToRgba = (hex: string, alpha: number) => {
    hex = hex.replace(/^#/, "");
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const glassColor = hexToRgba(folder.color, 0.45);

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
    const isLight = luminance > 140;

    let tr, tg, tb;
    if (isLight) {
      // Darken the color significantly for light backgrounds
      const factor = 0.35;
      tr = Math.floor(r * factor);
      tg = Math.floor(g * factor);
      tb = Math.floor(b * factor);
    } else {
      // Lighten the color significantly for dark backgrounds
      const factor = 0.85;
      tr = Math.floor(r + (255 - r) * factor);
      tg = Math.floor(g + (255 - g) * factor);
      tb = Math.floor(b + (255 - b) * factor);
    }

    return `rgb(${tr}, ${tg}, ${tb})`;
  };

  return (
    <motion.div
      layoutId={`${layoutIdPrefix}-${folder.id}-container`}
      onClick={onClick}
      className={cn(
        "relative flex flex-col w-[360px] h-[190px] rounded-[36px] p-2 shadow-[0_14px_35px_rgba(0,0,0,0.08),inset_0_2px_0_rgba(255,255,255,0.4)] overflow-visible",
        onClick && "cursor-pointer hover:scale-[1.02] transition-transform duration-200",
        className
      )}
      style={{ backgroundColor: folder.color }}
    >
      {/* Irregular Image Stack Wrapper */}
      <motion.div layoutId={`${layoutIdPrefix}-${folder.id}-stack`} className="absolute inset-2 overflow-visible z-[1]">
        {folder.images.slice(0, 4).map((src, index) => {
          let styles: React.CSSProperties = {};
          let rotate = 0;
          if (index === 0) {
            styles = { left: "-2%", top: "2%", zIndex: 2 };
            rotate = -10;
          } else if (index === 1) {
            styles = { left: "23%", top: "-5%", zIndex: 1 };
            rotate = 4;
          } else if (index === 2) {
            styles = { left: "48%", top: "4%", zIndex: 3 };
            rotate = -3;
          } else if (index === 3) {
            styles = { left: "74%", top: "-3%", zIndex: 4 };
            rotate = 10;
          }

          const mediaClassName = "absolute w-[28%] h-[95%] object-cover rounded-[20px] border-2 border-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] cursor-pointer hover:!z-20";
          const mediaLayoutId = `${layoutIdPrefix}-${folder.id}-image-${index}`;
          const mediaMotionProps = {
            style: { ...styles, transformOrigin: "center" as const },
            initial: { rotate: 0 },
            animate: { rotate },
            whileHover: { y: -10, scale: 1.05 },
            transition: { type: "spring" as const, stiffness: 400, damping: 25 },
          };

          return isVideoUrl(src) ? (
            <motion.video
              layoutId={mediaLayoutId}
              key={index}
              src={src}
              className={mediaClassName}
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
              onMouseLeave={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                v.pause();
                v.currentTime = 0;
              }}
              {...mediaMotionProps}
            />
          ) : (
            <motion.img
              layoutId={mediaLayoutId}
              key={index}
              src={thumbUrl(src, 192)}
              alt={`Memory ${index + 1}`}
              className={mediaClassName}
              loading="lazy"
              decoding="async"
              {...mediaMotionProps}
            />
          );
        })}
      </motion.div>

      {/* Bottom Glassmorphism Wave Overlay */}
      <motion.div
        layoutId={`${layoutIdPrefix}-${folder.id}-glass`}
        className="absolute bottom-2 left-2 right-2 h-[55%] rounded-[28px] border-t border-white/50 border-l border-white/20 flex items-center justify-between pl-6 pr-5 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md"
        style={{ backgroundColor: glassColor }}
      >
        <motion.h3
          layoutId={`${layoutIdPrefix}-${folder.id}-title`}
          className="font-bold text-xl drop-shadow-sm line-clamp-1 flex-1 pr-4 tracking-tight"
          style={{ color: getTextColor(folder.color) }}
        >
          {folder.name}
        </motion.h3>
        <button
          className="w-12 h-12 flex-shrink-0 rounded-full bg-white border-none flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] cursor-pointer transition-transform duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-110"
          aria-label="Image count"
        >
          <span className="text-[#111] font-bold text-[19px] leading-none">{folder.images.length}</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
