"use client";

import { Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import { useAbout, type AboutContent } from "@/context/AboutContext";
import { ON_MAT, PROPS, SUN } from "./layout";
import { flight } from "./flight";
import { TOOLS } from "../tools";
import { TOOL_HEIGHT, ToolModel } from "../ToolCup";
import { TOOL_SCALE, exitProgress, exitTool, planFall, poseTool, poseToolShadow, toolShadowTexture } from "./toolFall";
import { BOOK_D, BOOK_W, Sketchbook } from "./props/Sketchbook";
import {
  PAGE_PX,
  VIEW_MORE,
  drawIndexPage,
  drawLeftPage,
  drawRightPage,
  CHAPTER_IDS,
  drawChapterLeft,
  drawChapterRight,
  drawSketchLeft,
  drawUnderlineStroke,
  sketchUnderline,
  drawSketchRight,
  drawToolsPage,
  pasteChapterPrints,
  pasteSketchPrints,
} from "./props/BookPages";
import { cachedTexture, fontsReady } from "./props/canvas";
import { WRITE_TOTAL, inkLayer, rightPageToBook, planWriter, poseWriter, rollPencilOut, setReveal } from "./underline";
import { useRouter } from "next/navigation";
import { workHref } from "../data";

type Props = {
  /** Where the book first comes to rest beside the manifesto: a box with the cover's aspect ratio. */
  slot: React.RefObject<HTMLElement | null>;
};

/**
 * A transparent canvas over the whole viewport that carries the sketchbook down the page:
 * off the desk, into `slot` beside the manifesto, then on into the Meet Pencil spread
 * (`flight.spread`), where it falls open.
 *
 * It starts out rendering through the hero's own camera, with the view shifted down by the
 * scroll offset, so at the top of the page its book sits exactly on the desk's. On the second
 * leg the camera turns to look straight at the viewport, so the open book isn't stretched by
 * sitting far off-axis.
 */
export default function FlyingBook({ slot }: Props) {
  const { about } = useAbout();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const router = useRouter();
  // the pages the buttons lead to are fetched ahead, so the click lands instantly
  useEffect(() => {
    for (const t of TOOLS) router.prefetch(workHref(t.category));
  }, [router]);

  // stop rendering (and hide the last frame) once the book's last stop has scrolled away above
  const [active, setActive] = useState(true);
  useEffect(() => {
    const update = () => {
      const r = (flight.spread ?? slot.current)?.getBoundingClientRect();
      // (not until the hanging ribbon and the shadow are clear too, or they would pop out of sight)
      setActive(!r || r.bottom > -260);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slot]);

  return createPortal(
    <>
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-40 ${active ? "" : "invisible"}`}>
      <Canvas
        // drawn only when something moves: scrolling, the leaf settling, the tools dropping
        frameloop={active ? "demand" : "never"}
        // never below 1.5×: the thin pens and brushes lying on the page show stair-stepped edges on
        // GPUs that skip MSAA, and rendering above the screen's resolution smooths them anyway
        dpr={[1.5, 2]}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          // match the hero's neutral tone mapping so the hand-over doesn't shift colour
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
        camera={{ fov: 24, near: 1, far: 150 }}
      >
        <Suspense fallback={null}>
          <Environment files="/desk/textures/studio_512.hdr" environmentIntensity={0.6} environmentRotation={[0, 1.2, 0]} />
          <directionalLight position={SUN} intensity={2.7} color="#fff3e2" />
          <Flight slot={slot} about={about} active={active} buttons={buttons} />
        </Suspense>
      </Canvas>
    </div>
    {/* each chapter's "view more": an invisible button laid over the label printed on its page (see Flight) */}
    <div className={`pointer-events-none fixed inset-0 z-40 ${active ? "" : "invisible"}`}>
      {SCRIBES.map((sc, k) => (
        <button
          key={sc.key}
          ref={(el) => {
            buttons.current[k] = el;
          }}
          type="button"
          tabIndex={-1}
          aria-label={`View more ${TOOLS[k].discipline} on its own page`}
          onClick={() => router.push(workHref(TOOLS[k].category))}
          className="absolute left-0 top-0 rounded-full bg-transparent opacity-0 outline-none transition-[opacity,background-color] duration-300 hover:bg-[#d4a24c]/10 focus-visible:ring-2 focus-visible:ring-[#d4a24c]"
          style={{ pointerEvents: "none", cursor: "pointer" }}
        />
      ))}
    </div>
    </>,
    document.body,
  );
}

/**
 * How far the page must have turned to throw the tools (they then land on their own clock, not
 * the scroll's), and how far back it must go to re-arm the throw.
 */
const LANDED = 0.9;
const REARM = 0.5;

/** The tools sweep off the page over this stretch of the pin (it ends before the next leaf lifts). */
const SWEEP: [from: number, to: number] = [0.1, 0.16];
/**
 * Once the next page has landed the pencil comes back to underline the title (in real time); turning
 * back past the re-arm point rubs it out again.
 */
const WRITE_AT = 0.97;
/** The page springs over after the scroll reaches it: the pencil waits this long (s) for it to land and be still. */
const LAND_WAIT = 1.6;
const WRITE_REARM = 0.6;
/**
 * Turning the page back: the pencil is gone from the gutter by the time the page has turned this
 * far back (and it only starts to go once the page has lifted off the paper).
 */
const PAGE_BACK: [gone: number, resting: number] = [WRITE_REARM, 0.95];
/**
 * Each chapter has its tool, which comes back once its page has landed and draws the line under the
 * title (the word it is under, and how far the sheet it draws on lies above the page beneath).
 */
const SCRIBES = [
  { tool: "pencil", key: "sketch", word: "Sketches", lift: 0.007 },
  { tool: "stylus", key: "digital", word: "Art", lift: 0.01 },
  { tool: "wallbrush", key: "wall", word: "Art", lift: 0.013 },
  { tool: "charcoal", key: "charcoal", word: "Portraits", lift: 0.016 },
  { tool: "fineliner", key: "pen", word: "Sketches", lift: 0.019 },
  { tool: "roundbrush", key: "watercolour", word: "colours", lift: 0.022 },
] as const;
/**
 * Where in the pinned scroll (0–1) each chapter's page is turned to, one after another, and how long the
 * turn takes. The first, Pencil Sketches, follows the page of tools; the rest are evenly spaced.
 */
const TURN_LEN = 0.035;
const TURN_AT = SCRIBES.map((_, k) => (0.17 + k * 0.13));

/** Lays a button over the given screen box (or hides it): plain function, so the frame loop may touch the DOM. */
function placeButton(el: HTMLButtonElement | null, box: { x: number; y: number; w: number; h: number } | null) {
  if (!el) return;
  if (!box) {
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.tabIndex = -1;
    return;
  }
  el.style.transform = `translate(${box.x}px, ${box.y}px)`;
  el.style.width = `${box.w}px`;
  el.style.height = `${box.h}px`;
  el.style.opacity = "1";
  el.style.pointerEvents = "auto";
  el.tabIndex = 0;
}

/** Sets where a leaf should be (a plain function, so the scene's frame loop may write to state objects). */
function setTurn(ref: { current: number }, to: number) {
  ref.current = to;
}

/** A soft start and finish, for the take-off: half the peak speed of the cubic below. */
const sineInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const easeInOut =(t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => THREE.MathUtils.clamp(t, 0, 1);
const smooth = THREE.MathUtils.smoothstep;

const X_AXIS = new THREE.Vector3(1, 0, 0);
/** How far the book leans back, and how much smaller it gets, as it scrolls away (radians; fraction). */
const LEAN_AWAY = 0.3;
const SHRINK_AWAY = 0.07;
/** Toward the light, in world space. */
const TO_SUN = new THREE.Vector3(...SUN).normalize();
/** The shut book's bounds in its own space, ribbon included: what must clear the hero before the overlay takes it. */
const BOOK_CORNERS = [-1, 1].flatMap((x) =>
  [0, 0.25].flatMap((y) => [-BOOK_D / 2, BOOK_D / 2 + 0.45].map((z) => new THREE.Vector3((x * BOOK_W) / 2, y, z))),
);
/**
 * How quickly the book catches up with the scroll (per second). A wheel moves the page in
 * jumps; reading progress off a smoothed scroll turns those into one glide.
 */
const SCROLL_EASE = 7;

function Flight({ slot, about, active, buttons }: Props & { about: AboutContent; active: boolean; buttons: React.RefObject<(HTMLButtonElement | null)[]> }) {
  use(fontsReady());
  const invalidate = useThree((s) => s.invalidate);
  const smoothY = useRef<number | null>(null);
  // the canvas draws on demand: every scroll asks for a frame
  useEffect(() => {
    if (!active) return;
    const kick = () => invalidate();
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    return () => window.removeEventListener("scroll", kick);
  }, [active, invalidate]);
  const book = useRef<THREE.Group>(null);
  const open = useRef(0);
  const turn = useRef(0);
  // where each chapter's leaf should be (0 = on the right, 1 = turned over), set from the scroll
  const [turnRefs] = useState(() => SCRIBES.map(() => ({ current: 0 })));
  const tools = useRef<THREE.Group>(null);
  const toolShadows = useRef<THREE.Group>(null);
  const shadowMap = useMemo(() => toolShadowTexture(), []);
  const shadowPlane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const plans = useMemo(() => planFall(), []);
  const drop = useRef({ start: -1 });
  const write = useRef(SCRIBES.map(() => ({ start: -1 })));
  // when each chapter's page became the one on show (so its button waits for the page to stop swinging)
  const shownSince = useRef(SCRIBES.map(() => 0));
  const shadows = useRef({ slot: -1, spread: -1 });

  // the two inside pages: the pasted-in illustration, and the Meet Pencil copy
  const art = useTexture("/desk/pencil-shades.webp");
  const leftPage = useMemo(
    () => cachedTexture("page-left", ...PAGE_PX, (ctx, w, h) => drawLeftPage(ctx, w, h, art.image as HTMLImageElement)),
    [art],
  );
  const rightPage = useMemo(
    () => cachedTexture(`page-right:${JSON.stringify(about)}`, ...PAGE_PX, (ctx, w, h) => drawRightPage(ctx, w, h, about)),
    [about],
  );
  // the page that turns in after it: the index, facing the page the tools drop onto
  const indexPage = useMemo(() => cachedTexture("page-index", ...PAGE_PX, drawIndexPage), []);
  const toolsPage = useMemo(() => cachedTexture("page-tools", ...PAGE_PX, drawToolsPage), []);
  // and the next chapter after that: Pencil Sketches, pages 01 and 02 (prints are pasted on as they load)
  const sketchLeft = useMemo(() => cachedTexture("page-sketch-left:v4", ...PAGE_PX, drawSketchLeft), []);
  const sketchRight = useMemo(() => cachedTexture("page-sketch-right:v4", ...PAGE_PX, drawSketchRight), []);
  // the chapters after it: Digital Art (03, 04) and Wall Art (05, 06)
  const chapterPages = useMemo(
    () =>
      CHAPTER_IDS.map((id) => ({
        id,
        left: cachedTexture(`page-${id}-left:v4`, ...PAGE_PX, (ctx, w, h) => drawChapterLeft(ctx, w, h, id)),
        right: cachedTexture(`page-${id}-right:v4`, ...PAGE_PX, (ctx, w, h) => drawChapterRight(ctx, w, h, id)),
      })),
    [],
  );
  // the ochre underlines, drawn live: a strip of ink revealed along its length as the tool's tip moves
  const scribes = useMemo(
    () =>
      SCRIBES.map((sc) => {
        const underline = sketchUnderline(...PAGE_PX, sc.word);
        const reveal = { value: 0 };
        return {
          ...sc,
          index: TOOLS.findIndex((t) => t.id === sc.tool),
          reveal,
          writer: planWriter(underline, sc.lift, TOOL_HEIGHT[sc.tool] * TOOL_SCALE),
          ink: inkLayer(
            underline,
            cachedTexture(`underline-stroke:${sc.key}`, Math.ceil(underline.box.w), Math.ceil(underline.box.h), (ctx) => drawUnderlineStroke(ctx, underline)),
            reveal,
          ),
        };
      }),
    [],
  );
  const more = useMemo(
    () => chapterPages.map((c, k) => ({ turn: turnRefs[k + 1], back: c.left, under: c.right, ink: scribes[k + 1].ink })),
    [chapterPages, turnRefs, scribes],
  );
  useEffect(() => {
    let alive = true;
    for (const c of chapterPages) {
      pasteChapterPrints(c.left, c.id, "left").then((changed) => changed && alive && invalidate());
      pasteChapterPrints(c.right, c.id, "right").then((changed) => changed && alive && invalidate());
    }
    return () => {
      alive = false;
    };
  }, [chapterPages, invalidate]);
  useEffect(() => {
    let alive = true;
    for (const [tex, side] of [[sketchLeft, "left"], [sketchRight, "right"]] as const) {
      pasteSketchPrints(tex, side).then((changed) => changed && alive && invalidate());
    }
    return () => {
      alive = false;
    };
  }, [sketchLeft, sketchRight, invalidate]);

  // compile the book's shaders now, while it's hidden, not on the first frame it flies
  const get = useThree((s) => s.get);
  useEffect(() => {
    const g = book.current;
    if (!g) return;
    const { gl, scene, camera } = get();
    g.visible = true;
    gl.compileAsync(scene, camera).catch(() => {});
    g.visible = false; // compileAsync gathers its objects synchronously
  }, [get]);

  // where it lies on the desk, exactly as the hero places it
  const start = useMemo(() => {
    const { pos, rot = 0 } = PROPS.sketchbook;
    return {
      pos: new THREE.Vector3(pos[0], ON_MAT, pos[1]),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -THREE.MathUtils.degToRad(rot), 0)),
    };
  }, []);

  const t = useMemo(
    () => ({
      slotPos: new THREE.Vector3(),
      slotQuat: new THREE.Quaternion(),
      spreadPos: new THREE.Vector3(),
      spreadQuat: new THREE.Quaternion(),
      toward: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      up: new THREE.Vector3(),
      x: new THREE.Vector3(),
      y: new THREE.Vector3(),
      z: new THREE.Vector3(),
      right: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      pt: new THREE.Vector3(),
      pitch: new THREE.Quaternion(),
      depart: new THREE.Quaternion(),
      roll: new THREE.Quaternion(),
      // beside the manifesto: a slight turn so the spine shows, and a jaunty tilt
      standing: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.07, -0.38, "YZX")),
      // open: lying back a little, as if on a table in front of you
      lying: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)),
      light: new THREE.Vector3(),
      inverse: new THREE.Quaternion(),
    }),
    [],
  );

  useFrame(({ camera, size }, delta) => {
    const g = book.current;
    const src = flight.camera;
    const el = slot.current;
    if (!g) return;
    if (!src || !el) {
      g.visible = false;
      return;
    }
    const cam = camera as THREE.PerspectiveCamera;
    const { width: hw, height: hh } = flight.size;
    const sy = window.scrollY;
    // progress runs off the smoothed scroll; anything pinned to the page (camera, slots) off the real one
    let ys = smoothY.current ?? sy;
    ys = Math.abs(sy - ys) > size.height * 2 ? sy : THREE.MathUtils.damp(ys, sy, SCROLL_EASE, Math.min(delta, 1 / 30));
    if (Math.abs(sy - ys) < 0.5) ys = sy;
    else invalidate();
    smoothY.current = ys;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(src.fov) / 2);

    // 1. progress along each leg: a leg ends when its slot sits mid-screen
    const a = el.getBoundingClientRect();
    const endA = Math.max(1, a.top + sy + a.height / 2 - size.height / 2);
    const pA = clamp01(ys / endA);
    const b = flight.spread?.getBoundingClientRect();
    // the spread is pinned, so its own rect drifts while pinned: the book is centred when the pin's top reaches the page top
    const pin = flight.pin?.getBoundingClientRect();
    const endB = pin ? pin.top + sy : b ? b.top + sy + b.height / 2 - size.height / 2 : Infinity;
    const pB = b ? clamp01((ys - endA) / Math.max(1, endB - endA)) : 0;
    // leg 3: pinned and lying open; the leaf turns over to the index mid-way, then it rests there
    const pinned = pin ? Math.max(1, pin.height - size.height) : 1;
    const pC = pin ? clamp01((ys - endB) / pinned) : 0;
    // and once the pin is done and the page scrolls on: how far the book has gone (0 → 1 over most of a screen)
    const pD = pin ? clamp01((ys - endB - pinned) / (size.height * 0.9)) : 0;
    // where the leaf should be; the leaf itself (props/PageLeaf) springs after it like paper
    turn.current = smooth(pC, 0.03, 0.09);
    // …and later, with the tools lying on it, the next leaf turns over to the Pencil Sketches
    // then, after a good while on each spread, the next chapter's page
    SCRIBES.forEach((_, k) => setTurn(turnRefs[k], smooth(pC, TURN_AT[k], TURN_AT[k] + TURN_LEN)));

    // the moment the page has landed on the index spread, the tools drop, once, in real time;
    // turning back past the re-arm point puts them away so they drop again next time
    // (the browser's clock, not three's: that one is reset to zero each time the canvas is paused and
    // resumed, which happens whenever the book scrolls away and back, and would hide the tools)
    const now = performance.now() / 1000;
    const d = drop.current;
    if (d.start < 0 && turn.current >= LANDED) d.start = now;
    else if (d.start >= 0 && turn.current < REARM) d.start = -1;
    const since = d.start < 0 ? -1 : now - d.start;
    const lastLands = Math.max(...plans.map((p) => p.delay + p.duration));
    if (since >= 0 && since < lastLands) invalidate();
    // the page after it is coming: the tools are swept off this one…
    const sweep = smooth(pC, SWEEP[0], SWEEP[1]);
    // …and once each chapter's page has landed, its tool comes back to underline the title
    const turns = turnRefs;
    const writings = scribes.map((_, k) => {
      const w = write.current[k];
      const landed = turns[k].current;
      if (w.start < 0 && landed >= WRITE_AT) w.start = now + LAND_WAIT;
      else if (w.start >= 0 && landed < WRITE_REARM) w.start = -1;
      return w.start < 0 ? -1 : now - w.start;
    });
    if (writings.some((x) => x > -LAND_WAIT && x < WRITE_TOTAL)) invalidate();
    // each tool, at rest in the middle of the book, rolls away when the next page lifts over it (the last
    // one when the book is scrolled on from); and when its page is turned back it rolls out the same way
    const leaving = scribes.map((_, k) => (k + 1 < scribes.length ? smooth(turnRefs[k + 1].current, 0, 0.3) : smooth(pC, 0.93, 0.99)));
    const outs = scribes.map((_, k) => (writings[k] >= 0 ? Math.max(leaving[k], 1 - smooth(turns[k].current, PAGE_BACK[0], PAGE_BACK[1])) : 0));
    if (tools.current) {
      tools.current.children.forEach((obj, i) => {
        poseTool(obj, plans[i], since < 0 ? -1 : since - plans[i].delay);
        if (sweep > 0) exitTool(obj, exitProgress(i, sweep));
      });
      scribes.forEach((sc, k) => {
        const tool = tools.current!.children[sc.index];
        setReveal(sc.reveal, poseWriter(tool, sc.writer, writings[k]));
        if (outs[k] > 0) rollPencilOut(tool, outs[k]);
      });
      // their shadows on the page, cast by the same light (brought into the book's own space)
      t.light.copy(TO_SUN).applyQuaternion(t.inverse.copy(g.quaternion).invert());
      if (t.light.y < 0.3) t.light.setY(0.3).normalize(); // never stretched out to the horizon
      toolShadows.current?.children.forEach((s, i) => {
        const shadow = s as THREE.Mesh;
        poseToolShadow(shadow, tools.current!.children[i], plans[i], t.light);
        // a tool being swept off takes its shadow with it. A tool that has come back to write is on the
        // page again and keeps its own shadow until it is swept off in turn
        const k = scribes.findIndex((sc) => sc.index === i);
        const gone = k >= 0 && writings[k] >= 0 ? outs[k] : sweep > 0 ? exitProgress(i, sweep) : 0;
        if (gone > 0) {
          const keep = 1 - Math.min(1, gone * 3);
          shadow.visible = shadow.visible && keep > 0;
          (shadow.material as THREE.MeshBasicMaterial).opacity *= keep;
        }
      });
    }
    flight.progress = pA;

    // 2. the camera: the hero's, shifted with the page; on the second leg it turns to face the viewport
    const straighten = smooth(pB, 0, 0.5);
    const below = ((sy + size.height / 2) / hh) * 2 - 1; // viewport centre, in the hero's NDC (down = +)
    cam.position.copy(src.position);
    cam.quaternion.copy(src.quaternion).multiply(t.pitch.setFromAxisAngle(X_AXIS, -straighten * Math.atan(below * tanHalf)));
    cam.fov = src.fov;
    // the hero's near and far planes are wide (1 … 150); the book is never nearer than a few units, and the
    // sheets of paper lie thousandths of a unit apart, so a tighter range keeps them from fighting over depth
    // the hero's near and far planes are wide (1 … 150); the book is never nearer than a few units, and the
    // sheets of paper lie thousandths of a unit apart, so a tighter range keeps them from fighting over depth
    cam.near = Math.max(src.near, 5);
    cam.far = Math.min(src.far, 80);
    cam.aspect = hw / hh;
    cam.setViewOffset(hw, hh, 0, THREE.MathUtils.lerp(sy, (hh - size.height) / 2, straighten), size.width, size.height);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    /** A pose centred on `r` (viewport px), facing the camera, at the depth where `span` units fill its width. */
    const poseFor = (r: DOMRect, span: number, extra: THREE.Quaternion, pos: THREE.Vector3, quat: THREE.Quaternion) => {
      const ndcX = ((r.left + r.width / 2) / size.width) * 2 - 1;
      const ndcY = 1 - ((r.top + r.height / 2) / size.height) * 2;
      t.dir.set(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position).normalize();
      t.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      const depth = (span * hh) / (2 * tanHalf * r.width);
      pos.copy(cam.position).addScaledVector(t.dir, depth / t.dir.dot(t.fwd));
      // cover (+y) toward the camera, the cover's top edge (−z) up the screen
      t.y.copy(cam.position).sub(pos).normalize();
      t.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      t.z.copy(t.up).addScaledVector(t.y, -t.up.dot(t.y)).normalize().negate();
      t.x.crossVectors(t.y, t.z);
      t.basis.makeBasis(t.x, t.y, t.z);
      quat.setFromRotationMatrix(t.basis).multiply(extra);
    };

    if (b) {
      poseFor(b, 2 * BOOK_W, t.lying, t.spreadPos, t.spreadQuat);
      // the spread's centre is the spine, half a cover to the left of the book's origin
      t.right.copy(t.x);
      t.spreadPos.addScaledVector(t.right, BOOK_W / 2);
    }
    poseFor(a, BOOK_W, t.standing, t.slotPos, t.slotQuat);
    t.toward.copy(cam.position).sub(t.slotPos).normalize();

    // over the desk, the book rides the hero's camera, which sways after the pointer on its own clock
    if (pA > 0 && pB <= 0) invalidate();
    g.scale.setScalar(1);
    if (pB <= 0) {
      // leg 1: lift off the mat and arc toward the viewer on the way down to the manifesto
      const e = sineInOut(pA);
      const lift = Math.sin(Math.PI * e);
      g.position.lerpVectors(start.pos, t.slotPos, e).addScaledVector(t.toward, lift * 1.3);
      g.position.y += lift * 0.6;
      t.roll.setFromAxisAngle(t.toward, lift * 0.35);
      g.quaternion.slerpQuaternions(start.quat, t.slotQuat, e).premultiply(t.roll);
      open.current = 0;
      // still wholly over the hero? then the hero draws it, shadow and all (see props/RisingSketchbook)
      let lowest = -Infinity;
      for (const c of BOOK_CORNERS) {
        t.y.copy(c).applyQuaternion(g.quaternion).add(g.position).project(cam);
        lowest = Math.max(lowest, ((1 - t.y.y) / 2) * size.height);
      }
      flight.book.inHero = lowest < hh - sy - 2;
      g.position.toArray(flight.book.pos);
      g.quaternion.toArray(flight.book.quat);
    } else {
      // leg 2: glide down to the spread, settling back as it falls open
      const e = easeInOut(pB);
      g.position.lerpVectors(t.slotPos, t.spreadPos, e).addScaledVector(t.toward, Math.sin(Math.PI * e) * 1.2);
      g.quaternion.slerpQuaternions(t.slotQuat, t.spreadQuat, e);
      open.current = easeInOut(smooth(pB, 0.3, 0.97));
      flight.book.inHero = false;
      // taking its leave: as the page scrolls on it leans back a little and draws away, rather than just riding up
      const away = smooth(pD, 0, 1);
      if (away > 0) g.quaternion.multiply(t.depart.setFromAxisAngle(X_AXIS, -LEAN_AWAY * away));
      g.scale.setScalar(1 - SHRINK_AWAY * away);
    }
    // hidden only once the hero has really picked it up, so the hand-over never leaves a gap
    g.visible = pA > 0 && !(flight.book.inHero && flight.book.heroHasBook);

    // soft shadows under each slot, faded in as the book arrives (only touch the DOM on change)
    const slotShadow = Math.round(pA * (1 - smooth(pB, 0, 0.15)) * 100) / 100;
    if (slotShadow !== shadows.current.slot) {
      shadows.current.slot = slotShadow;
      el.style.setProperty("--book", String(slotShadow));
    }
    // each chapter's "view more": a button laid over the label printed on its page (it follows the book)
    g.updateMatrixWorld(true);
    const nowMs = performance.now();
    SCRIBES.forEach((_, k) => {
      const onShow = turnRefs[k].current >= 0.97 && (k + 1 >= SCRIBES.length || turnRefs[k + 1].current <= 0.02) && g.visible && pD < 0.2;
      const since = shownSince.current;
      if (!onShow) since[k] = 0;
      else if (!since[k]) since[k] = nowMs;
      if (!onShow || nowMs - since[k] < 1100) return placeButton(buttons.current[k], null);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [fx, fy] of [[VIEW_MORE.x, VIEW_MORE.y], [VIEW_MORE.x + VIEW_MORE.w, VIEW_MORE.y], [VIEW_MORE.x, VIEW_MORE.y + VIEW_MORE.h], [VIEW_MORE.x + VIEW_MORE.w, VIEW_MORE.y + VIEW_MORE.h]]) {
        rightPageToBook(fx * PAGE_PX[0], fy * PAGE_PX[1], k + 2 < 8 && k + 1 < SCRIBES.length ? 0.0035 - 0.0005 * (k + 2) : 0, t.pt).applyMatrix4(g.matrixWorld).project(cam);
        const px = ((t.pt.x + 1) / 2) * size.width;
        const py = ((1 - t.pt.y) / 2) * size.height;
        x0 = Math.min(x0, px);
        y0 = Math.min(y0, py);
        x1 = Math.max(x1, px);
        y1 = Math.max(y1, py);
      }
      placeButton(buttons.current[k], { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    });
    const spreadShadow = Math.round(smooth(pB, 0.8, 1) * (1 - smooth(pD, 0, 0.8)) * 100) / 100;
    if (flight.spread && spreadShadow !== shadows.current.spread) {
      shadows.current.spread = spreadShadow;
      flight.spread.style.setProperty("--book", String(spreadShadow));
    }
  });

  return (
    <group ref={book} visible={false}>
      <Sketchbook open={open} leftPage={leftPage} rightPage={rightPage} turn={turn} turnedPage={indexPage} nextPage={toolsPage} turn2={turnRefs[0]} ink={scribes[0].ink} sketchLeft={sketchLeft} sketchRight={sketchRight} more={more}>
        {/* the tool cup, standing up off the right-hand page */}
        {/* the tools: loose, posed in book space; hidden until they are dropped */}
        {/* the tools' shadows on the page, under the tools themselves */}
        <group ref={toolShadows}>
          {TOOLS.map((tool) => (
            <mesh key={tool.id} geometry={shadowPlane} matrixAutoUpdate={false} visible={false} renderOrder={1}>
              <meshBasicMaterial map={shadowMap} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
            </mesh>
          ))}
        </group>
        <group ref={tools}>
          {TOOLS.map((tool) => (
            <group key={tool.id}>
              <ToolModel id={tool.id} />
            </group>
          ))}
        </group>
      </Sketchbook>
    </group>
  );
}
