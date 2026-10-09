import * as THREE from "three";
import { TOOLS, type Tool } from "../tools";
import { TOOL_HEIGHT } from "../ToolCup";
import { pageHeightAt } from "./props/Sketchbook";
import { rng } from "./props/canvas";

/**
 * When the sketchbook's page turns to the index (pages 08–09), the tools are dropped onto the
 * paper, one after another, and tumble to rest at random. Everything here is a pure function of
 * scroll progress, so it plays backwards just as well.
 *
 * Book units: x runs along the spread (the spine is at x = -1.1, the right page is x −1.1…1.1),
 * z runs down the page, y lifts off it toward the reader.
 */

/** Size of a tool relative to its model (a pencil is 1.1 book units long when lying down). */
export const TOOL_SCALE = 0.38;

/** Where each tool ends up: the centre of where it lies (x, z) and which way it points (degrees). */
const LANDING: Record<Tool["id"], [x: number, z: number, deg: number]> = {
  pencil: [0.05, 0.42, 14],
  wallbrush: [-0.3, 0.82, 172],
  stylus: [0.38, 1.02, -9],
  charcoal: [0.58, 0.62, 68],
  fineliner: [-0.12, 1.25, 193],
  roundbrush: [0.2, 0.06, -4], // right under the "let's get to work!" note
};

/** Book-x of the gutter, where the tools spring from (the spine of the open spread). */
const GUTTER_X = -1.1;

/** How far above the page a tool is when it first appears in the gutter. */
const GUTTER_LIFT = 0.06;

/** Radius of a tool lying on the page, so it rests on it rather than sinking in. */
const REST = 0.05;

export type FallPlan = {
  /** Where it pops up: out of the gutter, in the middle of the spread. */
  from: THREE.Vector3;
  /** How high it springs before it falls. */
  hop: number;
  /** Where it ends up. */
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  /** Fraction of the whole sequence to wait before this one pops. */
  delay: number;
};

export function planFall(): FallPlan[] {
  const r = rng(11);
  const up = new THREE.Vector3(0, 1, 0);
  return TOOLS.map((tool, i) => {
    const [cx, cz, deg] = LANDING[tool.id];
    // a little jitter so it never looks laid out by a ruler
    const x = cx + (r() - 0.5) * 0.12;
    const z = cz + (r() - 0.5) * 0.1;
    const yaw = THREE.MathUtils.degToRad(deg + (r() - 0.5) * 16);
    const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    // tools stand on their base: lay it so the middle of the tool is at the landing spot
    const half = (TOOL_HEIGHT[tool.id] * TOOL_SCALE) / 2;
    // a tool lies flat, so it must clear the highest point of the bowed page along its whole length
    const rest = Math.max(pageHeightAt(x - dir.x * half), pageHeightAt(x), pageHeightAt(x + dir.x * half)) + REST;
    const pos = new THREE.Vector3(x - dir.x * half, rest, z - dir.z * half);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    quat.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, r() * Math.PI * 2));
    const sx = GUTTER_X + 0.1 + r() * 0.35;
    const sz = -0.25 + r() * 0.8;
    return {
      // it comes up from just above the page, not out of it: a thin handle on the surface itself
      // would be half-buried (and cut off by the page bowing up beside it)
      from: new THREE.Vector3(sx, Math.max(pageHeightAt(sx), pageHeightAt(sx + 0.6)) + REST + GUTTER_LIFT, sz),
      hop: 0.8 + r() * 0.5,
      pos,
      quat,
      delay: [0.0, 0.35, 0.15, 0.5, 0.25, 0.6][i % 6] * 0.2,
    };
  });
}

/** Where the hop ends and the fall begins, as a fraction of a tool's sequence. */
const HOP = 0.3;

/** Overshooting ease-out: springs past 1 and settles back. */
const backOut = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

/**
 * Poses one tool; `f` is how far through its sequence it is: 0 = still hidden in the gutter,
 * then it springs up and drops onto the page, 1 = lying where it landed. It never rotates: it
 * lies the way it will rest from the moment it appears.
 */
export function poseTool(obj: THREE.Object3D, plan: FallPlan, f: number) {
  obj.visible = f > 0;
  if (f <= 0) return;
  const hop = THREE.MathUtils.clamp(f / HOP, 0, 1);
  const fall = THREE.MathUtils.clamp((f - HOP) / (1 - HOP), 0, 1);

  // out of the gutter it drifts only a little; the fall carries it the rest of the way, fast at first
  const drift = 0.12 * hop + 0.88 * (1 - (1 - fall) ** 2);
  const peak = plan.from.y + plan.hop;
  const y = fall === 0 ? plan.from.y + plan.hop * backOut(hop) : THREE.MathUtils.lerp(peak, plan.pos.y, fall * fall);
  obj.position.set(
    THREE.MathUtils.lerp(plan.from.x, plan.pos.x, drift),
    y,
    THREE.MathUtils.lerp(plan.from.z, plan.pos.z, drift),
  );
  obj.quaternion.copy(plan.quat);
  // it grows out of the gutter, rather than blinking into existence
  obj.scale.setScalar(TOOL_SCALE * (0.15 + 0.85 * THREE.MathUtils.smoothstep(hop, 0, 1)));
}
