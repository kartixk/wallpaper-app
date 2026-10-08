import { useEffect } from "react";
import * as THREE from "three";

type Disposable = { dispose(): void };

/** Frees GPU resources a component built itself (canvas textures, geometries). */
export function useDispose(a: Disposable, b?: Disposable) {
  useEffect(
    () => () => {
      a.dispose();
      b?.dispose();
    },
    [a, b],
  );
}

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * `canvasTexture`, drawn once per page under `key` and kept. The desk scene suspends several
 * times while it loads (fonts, images, models) and React re-runs every useMemo on each retry;
 * the overlay canvas draws the same sketchbook again. Without this, the big textures were
 * being painted ten-odd times over on the main thread.
 */
export function cachedTexture(key: string, ...args: Parameters<typeof canvasTexture>) {
  let tex = cache.get(key);
  if (!tex) cache.set(key, (tex = canvasTexture(...args)));
  return tex;
}

/** Draws into a fresh canvas and wraps it as a texture (colour data unless `linear`). */
export function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  { linear = false, repeat }: { linear?: boolean; repeat?: [number, number] } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
}

/** Sprinkles per-pixel noise over what's already drawn — paper fibre, mat grain. */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 1) {
  const rand = rng(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Small deterministic PRNG so textures look the same on every load. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** The page's next/font families, resolved from their CSS variables. */
export function cssFont(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || fallback;
}

let fontsPromise: Promise<unknown> | null = null;

/** Resolves once the fonts canvas textures draw with have loaded (for React's `use`). */
export function fontsReady() {
  fontsPromise ??= Promise.all([
    document.fonts.load(`40px ${cssFont("--font-permanent-marker", "cursive")}`),
    document.fonts.load(`500 40px ${cssFont("--font-general-sans", "sans-serif")}`),
    document.fonts.load(`40px ${cssFont("--font-jetbrains-mono", "monospace")}`),
    // the open sketchbook's printed page
    document.fonts.load(`400 40px ${cssFont("--font-general-sans", "sans-serif")}`),
    document.fonts.load(`600 40px ${cssFont("--font-general-sans", "sans-serif")}`),
    document.fonts.load(`700 40px ${cssFont("--font-jetbrains-mono", "monospace")}`),
    document.fonts.load(`italic 40px ${cssFont("--font-instrument-serif", "serif")}`),
  ]).catch(() => undefined);
  return fontsPromise;
}
