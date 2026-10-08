/**
 * Abishek's real desk: a white-topped study table pushed against a wall that's
 * papered floor-to-eye-level with his own sketches.
 *
 * Units: 1 = 10 cm, so the desk is 130 × 75 cm and the A2 cutting mat is 6 × 4.5.
 * Axes: x → right, z → towards the viewer, y → up off the desk.
 * `rot` is the yaw (degrees, clockwise seen from above) of an object on the desk.
 */

export const DESK = { w: 13, d: 7.5 };
/** The wall the desk is pushed against. */
export const WALL_Z = -DESK.d / 2;
/** Height of the cutting mat's surface, for things lying on it. */
export const ON_MAT = 0.031;

export type PropId =
  | "mat"
  | "sketchbook"
  | "pencilA"
  | "pencilB"
  | "ruler"
  | "eraser"
  | "laptop"
  | "coneLamp"
  | "ledLamp"
  | "boomArm"
  | "markers"
  | "brushCup"
  | "tape"
  | "bobblehead"
  | "padmini"
  | "gtr"
  | "jeep"
  | "roadster"
  | "remote"
  | "tablet"
  | "chai"
  | "tubes"
  | "jars";

export type Placement = { pos: [x: number, z: number]; rot?: number };

/**
 * Left of the mat: markers, brush cup and the Spider-Man / die-cast corner.
 * Centre: the green cutting mat with the sketchbook, laptop on its cooling stand behind.
 * Right: iPad on its keyboard folio and a glass of chai.
 */
export const PROPS: Record<PropId, Placement> = {
  mat: { pos: [0, 1.5] },
  sketchbook: { pos: [-1.2, 1.65], rot: 7 },
  pencilA: { pos: [1.15, 1.3], rot: -64 },
  pencilB: { pos: [1.55, 1.7], rot: -78 },
  ruler: { pos: [0.7, 3.15], rot: -3 },
  eraser: { pos: [2.05, 2.5], rot: 24 },

  // far enough forward that the open lid clears the wall
  laptop: { pos: [0, -1.95] },
  coneLamp: { pos: [-2.55, -2.95], rot: -18 },
  ledLamp: { pos: [2.55, -2.95], rot: 14 },
  boomArm: { pos: [-6.1, -3.2] },

  markers: { pos: [-5.0, -2.2] },
  brushCup: { pos: [-3.7, -1.55] },
  tape: { pos: [-5.35, 0.25], rot: -20 },
  bobblehead: { pos: [-4.15, 0.5] },
  padmini: { pos: [-4.85, 1.55], rot: -10 },
  gtr: { pos: [-4.4, 2.6], rot: -4 },
  jeep: { pos: [-3.65, 2.05], rot: 6 },
  roadster: { pos: [-5.25, 2.75], rot: -16 },
  remote: { pos: [-5.7, 3.3], rot: 8 },

  tablet: { pos: [4.7, 0.15], rot: -5 },
  chai: { pos: [5.6, 2.75] },
  tubes: { pos: [4.1, 1.85] },
  jars: { pos: [3.45, -1.75] },
};

export type DeskLayout = {
  /** Point on the desk the camera looks at. */
  focus: [x: number, z: number];
  /** Width of the desk's front edge that must stay in frame. */
  frameW: number;
  /** Height up the wall that must stay in frame. */
  wallTop: number;
  /** Camera angle off straight-down, degrees. */
  tilt: number;
};

/** Landscape: the whole desk, edge to edge, with the art wall rising behind it. */
const wide: DeskLayout = { focus: [0, 0], frameW: 13.2, wallTop: 6.6, tilt: 60 };

/** Portrait: crop in on the mat and laptop; the toys and iPad bleed off the sides. */
const tall: DeskLayout = { focus: [0, 0.3], frameW: 7.6, wallTop: 7.4, tilt: 54 };

export function layoutFor(aspect: number): DeskLayout {
  return aspect >= 1.05 ? wide : tall;
}
