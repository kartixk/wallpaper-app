import * as THREE from "three";
import { TOOLS, type Tool } from "../tools";
import { TOOL_HEIGHT } from "../ToolCup";
import { pageHeightAt } from "./props/Sketchbook";
import { cachedTexture, rng } from "./props/canvas";

/**
 * When the sketchbook's page turns to the index (pages 08–09), the whole kit is tossed onto the
 * paper in one handful: the tools leave one fist together, just above the top of the frame, fan
 * out on falling arcs (each tumbling its own way once it is clear of the others), strike the page
 * end-first, slap down with a bounce or two, and roll and slide to rest, scattered across the
 * page. Each pose is a pure function of the seconds since the throw.
 *
 * Book units: x runs along the spread (the spine is at x = -1.1, the right page is x −1.1…1.1),
 * z runs down the page, y lifts off it toward the reader. A tool's origin is its base.
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

/** Radius of a tool lying on the page, so it rests on it rather than sinking in. */
const REST = 0.05;

/** The fist: up off the page and just above the top of the frame. */
const HAND = new THREE.Vector3(0.1, 3.3, -2.0);
/** How far apart the tools sit in it, side by side. */
const SPACING = 0.17;
/** All let go within this long of each other, in seconds. */
const RELEASE = 0.04;
/** How long they keep the angle they were held at before each starts to tumble its own way. */
const CLEAR = 0.2;

/** How fast things fall, in book units/s² (a little under real gravity, so the toss reads). */
const G = 30;

/** Once it has hit the page: how long until it lies still, and how quickly each motion dies. */
const SETTLE = 1.3;
const BOUNCE_W = 15; // rad/s: how fast it slaps down and rebounds
const BOUNCE_DECAY = 5.5;
const SLIDE_DECAY = 16; // how quickly friction takes the sideways speed it landed with

export type FallPlan = {
  /** Where its middle lies when it has come to rest, which way it points, and its resting attitude. */
  centre: THREE.Vector3;
  dir: THREE.Vector3;
  quat: THREE.Quaternion;
  /** Half its length, in book units. */
  half: number;
  /** Seconds after the throw before it leaves the hand, and from then until it lies still. */
  delay: number;
  duration: number;
  /** In the hand: where its middle is and how it is held. */
  from: THREE.Vector3;
  held: THREE.Quaternion;
  /** In the air: how long it falls, and the sideways speed it carries (book units/s). */
  airtime: number;
  vel: THREE.Vector3;
  /** Its tumble: about which axis, how fast (rad/s). */
  spinAxis: THREE.Vector3;
  spin: number;
  /** How it strikes the page: tipped up (rad; the sign picks which end hits first), yawed and rolled off its rest. */
  tilt: number;
  yaw: number;
  roll: number;
};

const UP = new THREE.Vector3(0, 1, 0);
const ACROSS = new THREE.Vector3(1, 0, 0);

export function planFall(): FallPlan[] {
  const r = rng(11);

  // held side by side, pointing across the page: three abreast, two deep
  const grip = new THREE.Quaternion().setFromUnitVectors(UP, ACROSS);
  const slots = [0, 1, 2, 3, 4, 5].map((k) => new THREE.Vector2(((k % 3) - 1) * SPACING, Math.floor(k / 3) * SPACING));
  // whoever is headed furthest down the page sits nearest the front of the fist, so no two cross on the way
  const byReach = [...TOOLS].sort((a, b) => LANDING[a.id][1] - LANDING[b.id][1] || LANDING[a.id][0] - LANDING[b.id][0]);
  slots.sort((a, b) => a.x - b.x || a.y - b.y);
  const slotOf = new Map(byReach.map((t, k) => [t.id, slots[k]]));

  // where each lands: a little jitter so it never looks laid out by a ruler, then nudged so none touch
  const spots = TOOLS.map((tool) => {
    const [cx, cz, deg] = LANDING[tool.id];
    const yaw = THREE.MathUtils.degToRad(deg + (r() - 0.5) * 16);
    return {
      mid: new THREE.Vector2(cx + (r() - 0.5) * 0.12, cz + (r() - 0.5) * 0.1),
      dir: new THREE.Vector2(Math.cos(yaw), Math.sin(yaw)),
      half: (TOOL_HEIGHT[tool.id] * TOOL_SCALE) / 2,
    };
  });
  keepApart(spots);

  return TOOLS.map((tool, i) => {
    const { mid, dir: d, half } = spots[i];
    const x = mid.x;
    const z = mid.y;
    const dir = new THREE.Vector3(d.x, 0, d.y);
    // a tool lies flat, so it must clear the highest point of the bowed page along its whole length
    const rest = Math.max(pageHeightAt(x - dir.x * half), pageHeightAt(x), pageHeightAt(x + dir.x * half)) + REST;
    // tools stand on their base (model +y runs base → tip); lay that along `dir`, rolled at random
    const quat = new THREE.Quaternion()
      .setFromUnitVectors(UP, dir)
      .premultiply(new THREE.Quaternion().setFromAxisAngle(dir, r() * Math.PI * 2));

    const slot = slotOf.get(tool.id)!;
    const from = HAND.clone().add(new THREE.Vector3((r() - 0.5) * 0.2, slot.y, slot.x));
    const held = grip.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, r() * Math.PI * 2));
    const centre = new THREE.Vector3(x, rest, z);
    // the further it has to go, the longer it is in the air
    const reach = Math.hypot(x - from.x, z - from.z);
    const airtime = 0.42 + reach * 0.05 + r() * 0.04;
    const tilt = (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.25);

    return {
      centre,
      dir,
      quat,
      half,
      delay: r() * RELEASE,
      duration: airtime + SETTLE,
      from,
      held,
      airtime,
      // sideways speed: enough to reach its spot on time, landing a slide short of it
      vel: new THREE.Vector3(x - from.x, 0, z - from.z).divideScalar(airtime + 1 / SLIDE_DECAY),
      spinAxis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
      spin: 6 + r() * 5,
      tilt,
      yaw: (r() - 0.5) * 0.5,
      roll: (r() - 0.5) * 2.4,
    };
  });
}

/** Closest room two tools lying on the page must leave between their centre lines. */
const CLEARANCE = 0.11;

type Spot = { mid: THREE.Vector2; dir: THREE.Vector2; half: number };

/** Nudges tools lying too close (seen from above) apart, a little each round, until none are. */
function keepApart(spots: Spot[]) {
  const pa = new THREE.Vector2();
  const pb = new THREE.Vector2();
  const push = new THREE.Vector2();
  for (let round = 0; round < 40; round++) {
    let moved = false;
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i];
        const b = spots[j];
        const gap = closest(a, b, pa, pb);
        if (gap >= CLEARANCE) continue;
        // off the end of one: straight apart. Alongside or across it: square off its line, each toward
        // the side its own middle is on (the nearest points flip sides when sticks cross)
        const along = pb.clone().sub(b.mid).dot(b.dir);
        if (Math.abs(along) >= b.half - 1e-3) push.copy(pa).sub(pb);
        else push.set(-b.dir.y, b.dir.x).multiplyScalar(Math.sign(a.mid.clone().sub(b.mid).dot(push.set(-b.dir.y, b.dir.x))) || 1);
        if (push.lengthSq() < 1e-8) push.set(-b.dir.y, b.dir.x);
        push.setLength((CLEARANCE - gap) / 2 + 0.005);
        a.mid.add(push);
        b.mid.sub(push);
        moved = true;
      }
    if (!moved) return;
  }
}

/** Distance between two tools' centre lines, and the nearest points on each (into `pa`, `pb`). */
function closest(a: Spot, b: Spot, pa: THREE.Vector2, pb: THREE.Vector2) {
  // sample one along its length against the other's segment: plenty for six sticks
  let best = Infinity;
  const p = new THREE.Vector2();
  const q = new THREE.Vector2();
  for (let k = 0; k <= 24; k++) {
    p.copy(a.dir).multiplyScalar(a.half * (k / 12 - 1)).add(a.mid);
    const t = THREE.MathUtils.clamp(q.copy(p).sub(b.mid).dot(b.dir), -b.half, b.half);
    q.copy(b.dir).multiplyScalar(t).add(b.mid);
    const d = p.distanceTo(q);
    if (d < best) {
      best = d;
      pa.copy(p);
      pb.copy(q);
    }
  }
  return best;
}

const tmp = {
  centre: new THREE.Vector3(),
  axis: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  hit: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  r: new THREE.Quaternion(),
  base: new THREE.Vector3(),
};

/**
 * Poses one tool `t` seconds after it leaves the hand (before that it is hidden). Its pose is
 * worked out for its middle, then the model (whose origin is its base) is placed to match.
 */
export function poseTool(obj: THREE.Object3D, plan: FallPlan, t: number) {
  obj.visible = t >= 0;
  if (t < 0) return;
  const { centre, axis, dir, hit, q, r } = tmp;
  const s = Math.max(0, t - plan.airtime); // time since it hit the page

  // on the page: one end strikes first and the rest slaps down after it, bouncing a few times
  // (|cos| keeps it on the paper's side); it rolls, swings round and slides to a stop
  const fade = (k: number) => Math.exp(-k * s);
  const tilt = plan.tilt * fade(BOUNCE_DECAY) * Math.abs(Math.cos(BOUNCE_W * s));
  const hop = 0.1 * fade(BOUNCE_DECAY + 1) * Math.abs(Math.sin(BOUNCE_W * 0.8 * s));
  const slide = fade(SLIDE_DECAY) / SLIDE_DECAY; // × landing speed = distance still to slide

  q.copy(plan.quat).multiply(r.setFromAxisAngle(UP, plan.roll * fade(5))); // roll about its own length
  r.setFromAxisAngle(UP, plan.yaw * fade(6));
  q.premultiply(r);
  dir.copy(plan.dir).applyQuaternion(r);
  axis.crossVectors(UP, dir).normalize();
  q.premultiply(r.setFromAxisAngle(axis, tilt));
  centre
    .copy(plan.centre)
    .addScaledVector(plan.vel, -slide)
    .addScaledVector(UP, plan.half * Math.abs(Math.sin(tilt)) + hop);

  if (t < plan.airtime) {
    // in the air: a falling arc from the hand to where it strikes the page
    hit.copy(centre);
    const k = t / plan.airtime;
    const drop = hit.y - plan.from.y;
    centre.lerpVectors(plan.from, hit, k);
    // same start and end, but bowed by gravity: up and over at first, then falling ever faster
    centre.y = plan.from.y + drop * k - 0.5 * G * t * (t - plan.airtime);
    // tumbling on the way down; held as it was in the hand until it is clear of the others
    q.premultiply(r.setFromAxisAngle(plan.spinAxis, plan.spin * (plan.airtime - t)));
    q.slerpQuaternions(plan.held, q, THREE.MathUtils.smoothstep(t, 0, CLEAR));
  }

  obj.quaternion.copy(q);
  obj.position.copy(centre).sub(tmp.base.set(0, plan.half, 0).applyQuaternion(q));
  obj.scale.setScalar(TOOL_SCALE);
}

/** Thickness of a tool lying down (its shadow's width before any blur), in book units. */
const GIRTH = 0.07;

/** A soft stadium: dark along a tool's length, feathered at its sides and ends. */
export function toolShadowTexture() {
  return cachedTexture("tool-shadow", 256, 64, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const along = Math.abs(((x + 0.5) / w) * 2 - 1);
        const across = Math.abs(((y + 0.5) / h) * 2 - 1);
        const a = (1 - THREE.MathUtils.smoothstep(along, 0.8, 1)) * (1 - THREE.MathUtils.smoothstep(across, 0.25, 1));
        img.data.set([36, 26, 16, Math.round(255 * a)], (y * w + x) * 4);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

const sh = {
  mid: new THREE.Vector3(),
  axis: new THREE.Vector3(),
  along: new THREE.Vector3(),
  across: new THREE.Vector3(),
  basis: new THREE.Matrix4(),
};

/**
 * Lays `shadow` (a unit plane in x–z, matrixAutoUpdate off) on the page under `tool`, thrown along
 * `light` (book space, pointing toward the light): long, faint and soft while the tool is high,
 * drawing in dark and sharp as it comes down, a contact shadow once it lies on the page.
 */
export function poseToolShadow(shadow: THREE.Mesh, tool: THREE.Object3D, plan: FallPlan, light: THREE.Vector3) {
  shadow.visible = tool.visible;
  if (!tool.visible) return;
  const { mid, axis, along, across, basis } = sh;
  axis.set(0, 1, 0).applyQuaternion(tool.quaternion);
  mid.copy(tool.position).addScaledVector(axis, plan.half);
  const above = mid.y - pageHeightAt(mid.x);
  const h = Math.max(0, above - GIRTH / 2); // clear air under it

  // its middle and its length, thrown along the light onto the page
  mid.addScaledVector(light, -above / light.y);
  axis.addScaledVector(light, -axis.y / light.y).setY(0).multiplyScalar(plan.half * 2);
  const length = axis.length();
  along.copy(axis).normalize();
  if (length < 1e-4) along.set(1, 0, 0);
  across.set(-along.z, 0, along.x);

  const blur = 0.04 + 0.16 * h;
  along.multiplyScalar(length + 2 * blur);
  across.multiplyScalar(GIRTH + 2 * blur);
  // sits on the highest point of the bowed page under it, so it never sinks into the paper
  const ends = (s: number) => pageHeightAt(mid.x + (along.x / 2) * s);
  basis.makeBasis(along, THREE.Object3D.DEFAULT_UP, across).setPosition(mid.x, Math.max(ends(-1), ends(0), ends(1)) + 0.012, mid.z);
  shadow.matrix.copy(basis);
  (shadow.material as THREE.MeshBasicMaterial).opacity = 0.5 / (1 + 1.6 * h) ** 2;
}

/* ------------------------- leaving the page, for the next one ------------------------- */

/** Which way the tools are swept (off the right-hand edge, a little up the page) and how far. */
const EXIT_DIR = new THREE.Vector3(1, 0, -0.35).normalize();
const EXIT_DIST = 3.6;
/** Each tool sets off a little after the one before (fractions of the sweep, by tool). */
const EXIT_STAGGER = [0, 0.15, 0.3, 0.45, 0.2, 0.1];

/** How far through its leaving tool `i` is, when the sweep as a whole is `sweep` (0–1) through. */
export const exitProgress = (i: number, sweep: number) => THREE.MathUtils.clamp(sweep * 1.6 - EXIT_STAGGER[i % EXIT_STAGGER.length], 0, 1);

/** Slides a tool lying on the page off it: slowly at first, then away, lifting as it goes. Gone once `e` reaches 1. */
export function exitTool(obj: THREE.Object3D, e: number) {
  if (!obj.visible || e <= 0) return;
  if (e >= 1) {
    obj.visible = false;
    return;
  }
  const k = e * e;
  obj.position.addScaledVector(EXIT_DIR, k * EXIT_DIST);
  obj.position.y += 0.5 * Math.sin(Math.PI * e) + 0.9 * k;
}
