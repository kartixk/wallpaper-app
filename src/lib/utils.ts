import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "avi", "mkv"];

export function isVideoUrl(url: string): boolean {
  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
}

const OPTIMIZABLE_WIDTHS = [64, 128, 192, 256, 384, 640, 750, 828, 1080];

export function thumbUrl(url: string, targetWidth = 256, quality = 70): string {
  if (isVideoUrl(url) || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const width = OPTIMIZABLE_WIDTHS.find((w) => w >= targetWidth) ?? OPTIMIZABLE_WIDTHS[OPTIMIZABLE_WIDTHS.length - 1];
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}
