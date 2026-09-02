"use client";

import { useRef, useState } from "react";
import { isVideoUrl, thumbUrl } from "@/lib/utils";

export function MediaThumb({
  src,
  className,
  alt = "media",
  width = 256,
}: {
  src: string;
  className?: string;
  alt?: string;
  width?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errored, setErrored] = useState(false);

  if (!isVideoUrl(src)) {
    return (
      <img
        src={errored ? src : thumbUrl(src, width)}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      loop
      playsInline
      preload="metadata"
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    />
  );
}
