import type * as THREE from "three";

/**
 * Shared between the hero's desk scene and the overlay that flies the sketchbook
 * down into the manifesto section. Plain mutable state, read and written inside frame loops.
 */
export const flight = {
  /** The hero's live camera, and the size of the canvas it renders to. */
  camera: null as THREE.PerspectiveCamera | null,
  size: { width: 1, height: 1 },
  /** 0 = lying on the desk, 1 = docked in its slot beside the manifesto. */
  progress: 0,
  /** Where the book finally lies open (the Meet Pencil spread); registered by that section. */
  spread: null as HTMLElement | null,
  /**
   * The tall wrapper the spread is pinned inside (position: sticky). Its top is where the book
   * is centred; the scroll left in it, once the book has landed, turns the page to the index.
   */
  pin: null as HTMLElement | null,
  /**
   * The sketchbook's pose on its first leg, in the desk's world space (written by the overlay).
   * While `inHero` the hero scene draws it, in the desk's own light, shadows and grading and
   * scrolling in step with the desk; once it crosses the hero's bottom edge the overlay does.
   * `heroHasBook` is whether the hero actually drew it this frame, so the hand-over never blinks.
   */
  book: {
    pos: [0, 0, 0] as [number, number, number],
    quat: [0, 0, 0, 1] as [number, number, number, number],
    inHero: false,
    heroHasBook: false,
  },
  /** Set once the hero scene has compiled and faded in; READY_EVENT fires at the same time. */
  ready: false,
};

export const READY_EVENT = "desk:ready";

/** Runs `fn` once the hero desk is up and the browser is idle (immediately if it already is). */
export function afterDeskReady(fn: () => void) {
  let idle = 0;
  const run = () => {
    idle = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200)))(fn, { timeout: 1500 });
  };
  if (flight.ready) run();
  else window.addEventListener(READY_EVENT, run, { once: true });
  return () => {
    window.removeEventListener(READY_EVENT, run);
    (window.cancelIdleCallback ?? window.clearTimeout)(idle);
  };
}

