import * as THREE from "three";
import { PAGE_PX, type Underline } from "./props/BookPages";
import { LEAF_D, LEAF_W, SPINE_X, pageHeightAt } from "./props/Sketchbook";
import { TOOL_SCALE } from "./toolFall";

/**
 * On each chapter page its tool (the graphite pencil, the stylus, the wall brush) comes back and draws the underline beneath the
 * title: it flies in, touches down at the start of the stroke, draws it (the ink appears exactly
 * as far as the tip has gone), then lifts off and comes to rest in the middle of the book, lying in
 * the gutter with its tip toward the top of the page. Played in real time once the page has landed.
 * When the book is scrolled on from, the pencil rolls off the page (see `rollPencilOut`).
 *
 * The ink is part of the page's own material (see `Sketchbook`), so it can never drift against the
 * words even if the paper is still settling; only the pencil is placed in space, and the page is
 * let to come to rest before it starts.
 *
 * Book units, as in toolFall. The page it draws on is the left-hand one: its image's left edge is
 * the fore-edge, its right edge the spine, its top the top of the page.
 */

const [PW, PH] = PAGE_PX;
const pageX = (px: number) => SPINE_X - LEAF_W + (px / PW) * LEAF_W;
const pageZ = (py: number) => -LEAF_D / 2 + (py / PH) * LEAF_D;

/** The tip this far above the sheet it draws on (the sheet itself lies `lift` above the bowed page under it). */
const TIP_AIR = 0.014;
const surfaceY = (x: number, lift: number) => pageHeightAt(x) + lift;

/** How long each part takes, in seconds: let the page settle, fly in, draw, fly over to its resting place. */
export const WRITE = { delay: 0.6, enter: 0.9, draw: 1.3, settle: 1.0 };
export const WRITE_TOTAL = WRITE.delay + WRITE.enter + WRITE.draw + WRITE.settle;

const UP = new THREE.Vector3(0, 1, 0);
/** Tip → base: the pencil held for writing (leaning back up the page and to the right), and as it flies. */
const HELD = new THREE.Vector3(0.55, 0.7, -0.45).normalize();
const FLYING = new THREE.Vector3(0.2, 1, -0.3).normalize();
/** Where it comes in from: above the top-right of the spread. */
const ENTRY = new THREE.Vector3(0.9, 2.4, -1.7);
/**
 * Where it ends up: lying in the gutter, along the spine, in the middle of the book, tip toward the
 * top of the page (so tip → base runs down it). The gutter is flat, so it simply lies on the paper.
 */
const REST_DIR = new THREE.Vector3(0, 0, 1);
const REST_MID_Z = 0.05;
const REST_CLEAR = 0.045; // its radius, and a little air

const ease = (t: number) => t * t * (3 - 2 * t);
const outCubic = (t: number) => 1 - (1 - t) ** 3;
/** Slow in, slow out, with no sudden change of speed anywhere (a hand drawing a line). */
const sine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/** Sets how much of the stroke the material shows. */
export function setReveal(reveal: { value: number }, to: number) {
  reveal.value = to;
}

/** The ink, as the page's material draws it: the stroke's picture, where on the page, and how far along. */
export type InkLayer = { map: THREE.Texture; min: THREE.Vector2; size: THREE.Vector2; reveal: { value: number } };

/** Where the stroke's box lies on the page, in the page's own 0–1 coordinates. */
export function inkLayer(u: Underline, map: THREE.Texture, reveal: { value: number }): InkLayer {
  const { box } = u;
  return {
    map,
    min: new THREE.Vector2(box.x / PW, 1 - (box.y + box.h) / PH),
    size: new THREE.Vector2(box.w / PW, box.h / PH),
    reveal,
  };
}

export type WriterPlan = {
  tip: (f: number, out: THREE.Vector3) => void;
  reveal: (f: number) => number;
  /** The tool's length (book units), and how far above the bowed page the sheet it draws on lies. */
  length: number;
  lift: number;
};

/**
 * The stroke walked at an even pace: `f` (0–1) is the fraction of its length, not of the curve's own
 * parameter, so the tip does not speed up and slow down as the curve bends.
 */
export function planWriter(u: Underline, lift: number, toolLength: number): WriterPlan {
  const p = { x: 0, y: 0 };
  const N = 240;
  const length = new Float32Array(N + 1);
  let prevX = 0;
  let prevZ = 0;
  for (let i = 0; i <= N; i++) {
    u.at(i / N, p);
    const x = pageX(p.x);
    const z = pageZ(p.y);
    length[i] = i ? length[i - 1] + Math.hypot(x - prevX, z - prevZ) : 0;
    prevX = x;
    prevZ = z;
  }
  const total = length[N];
  const param = (f: number) => {
    const target = THREE.MathUtils.clamp(f, 0, 1) * total;
    let lo = 0;
    let hi = N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (length[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = length[hi] - length[lo] || 1;
    return (lo + (target - length[lo]) / span) / N;
  };
  return {
    length: toolLength,
    lift,
    // where the tip is when it is `f` of the way along the stroke, just touching the paper
    tip: (f, out) => {
      u.at(param(f), p);
      const x = pageX(p.x);
      out.set(x, surfaceY(x, lift) + TIP_AIR, pageZ(p.y));
    },
    // how much of the picture of the stroke the tip has uncovered by then
    reveal: (f) => {
      u.at(param(f), p);
      return (p.x - u.box.x) / u.box.w;
    },
  };
}

const tmp = {
  tip: new THREE.Vector3(),
  from: new THREE.Vector3(),
  rest: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  roll: new THREE.Quaternion(),
};

/**
 * Poses the pencil `t` seconds after the page lands and returns how much of the underline is drawn
 * (0–1). Before it begins the pencil is not touched (the caller keeps it hidden); from then on it is
 * shown, and once it has settled it simply stays at rest.
 */
export function poseWriter(obj: THREE.Object3D, plan: WriterPlan, t: number) {
  const { tip, from, rest, dir, q, roll } = tmp;
  const k = t - WRITE.delay;
  if (t < 0 || k < 0) return 0;

  const LENGTH = plan.length;
  rest.set(SPINE_X, surfaceY(SPINE_X, plan.lift) + REST_CLEAR, REST_MID_Z - LENGTH / 2);

  let reveal = 0;
  dir.copy(HELD);
  if (k < WRITE.enter) {
    // in from above the spread to the start of the stroke, tipping over into a writing grip
    const e = k / WRITE.enter;
    plan.tip(0, from);
    tip.lerpVectors(ENTRY, from, outCubic(e));
    tip.y += 0.35 * Math.sin(Math.PI * e);
    dir.lerpVectors(FLYING, HELD, ease(e)).normalize();
  } else if (k < WRITE.enter + WRITE.draw) {
    // along the stroke at an even pace, easing in and out the way a hand does, grip held steady
    const f = sine((k - WRITE.enter) / WRITE.draw);
    plan.tip(f, tip);
    reveal = plan.reveal(f);
  } else {
    // lifts off the end of the line and sets itself down in the middle of the book
    const e = Math.min(1, (k - WRITE.enter - WRITE.draw) / WRITE.settle);
    plan.tip(1, from);
    reveal = 1;
    tip.lerpVectors(from, rest, sine(e));
    tip.y += 0.4 * Math.sin(Math.PI * e);
    dir.lerpVectors(HELD, REST_DIR, sine(e)).normalize();
  }
  obj.visible = true;
  q.setFromUnitVectors(UP, dir.negate());
  dir.negate();
  q.multiply(roll.setFromAxisAngle(UP, 0.4)); // turned a little about its own length, so a flat face is not square to the page
  obj.quaternion.copy(q);
  obj.position.copy(tip).addScaledVector(dir, LENGTH);
  obj.scale.setScalar(TOOL_SCALE);
  return THREE.MathUtils.clamp(reveal, 0, 1);
}

/* ------------------------------ rolling off the page ------------------------------ */

/** How far it rolls (book units, to the right: off the fore-edge and out of the book) and the radius it turns on. */
const ROLL_DISTANCE = 3.4;
const ROLL_RADIUS = 0.07;
const SPIN = new THREE.Quaternion();
const DEPTH_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Rolls the pencil lying in the gutter off to the right, turning along its own length as it goes,
 * the way a pencil really rolls: it starts gently and picks up speed, follows the bow of the page,
 * and drops away over the edge. Gone once `e` reaches 1.
 */
export function rollPencilOut(obj: THREE.Object3D, e: number) {
  if (!obj.visible || e <= 0) return;
  if (e >= 1) {
    obj.visible = false;
    return;
  }
  const d = ROLL_DISTANCE * e * e;
  const x0 = obj.position.x;
  const x = x0 + d;
  // along the page it keeps its height over the paper; past the fore-edge there is no page, and it falls
  const edge = SPINE_X + LEAF_W;
  const page = pageHeightAt(Math.min(x, edge)) - pageHeightAt(x0);
  const over = Math.max(0, x - edge);
  obj.position.set(x, obj.position.y + page - 2.2 * over * over, obj.position.z);
  // rolling to the right turns it clockwise seen from the front: about the page's depth axis, by distance / radius
  obj.quaternion.premultiply(SPIN.setFromAxisAngle(DEPTH_AXIS, -d / ROLL_RADIUS));
  obj.scale.multiplyScalar(1 - THREE.MathUtils.smoothstep(e, 0.8, 1));
}

/** A point on a chapter's left-hand page (its picture's pixels) in book space, on the sheet lying `lift` above the page beneath. */
export function pageToBook(px: number, py: number, lift: number, out: THREE.Vector3) {
  const x = pageX(px);
  return out.set(x, surfaceY(x, lift), pageZ(py));
}

/** A point on a chapter's right-hand page (its picture's pixels) in book space, on the sheet lying `lift` above the bowed page. */
export function rightPageToBook(px: number, py: number, lift: number, out: THREE.Vector3) {
  const x = SPINE_X + (px / PW) * LEAF_W;
  return out.set(x, pageHeightAt(x) + lift, pageZ(py));
}
