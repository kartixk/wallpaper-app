"use client";

import { Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import { useAbout, type AboutContent } from "@/context/AboutContext";
import { ON_MAT, PROPS } from "./layout";
import { flight } from "./flight";
import { TOOLS } from "../tools";
import { ToolModel } from "../ToolCup";
import { planFall, poseTool } from "./toolFall";
import { BOOK_W, Sketchbook } from "./props/Sketchbook";
import { PAGE_PX, drawIndexPage, drawLeftPage, drawRightPage, drawToolsPage } from "./props/BookPages";
import { cachedTexture, fontsReady } from "./props/canvas";

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

  // stop rendering (and hide the last frame) once the book's last stop has scrolled away above
  const [active, setActive] = useState(true);
  useEffect(() => {
    const update = () => {
      const r = (flight.spread ?? slot.current)?.getBoundingClientRect();
      setActive(!r || r.bottom > -80);
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
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-40 ${active ? "" : "invisible"}`}>
      <Canvas
        frameloop={active ? "always" : "never"}
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
          <directionalLight position={[13, 15, 9]} intensity={2.7} color="#fff3e2" />
          <Flight slot={slot} about={about} />
        </Suspense>
      </Canvas>
    </div>,
    document.body,
  );
}

/** Once the page has landed on the index, the tools drop on their own clock (not the scroll's): this long each, staggered. */
const DROP_SECONDS = 0.9;
const DROP_STAGGER = 3; // × each tool's delay fraction, in seconds
/** How far the page must have turned to trigger the drop, and to re-arm it again. */
const LANDED = 0.9;
const REARM = 0.5;

const easeInOut =(t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => THREE.MathUtils.clamp(t, 0, 1);
const smooth = THREE.MathUtils.smoothstep;

const X_AXIS = new THREE.Vector3(1, 0, 0);

function Flight({ slot, about }: Props & { about: AboutContent }) {
  use(fontsReady());
  const book = useRef<THREE.Group>(null);
  const open = useRef(0);
  const turn = useRef(0);
  const tools = useRef<THREE.Group>(null);
  const plans = useMemo(() => planFall(), []);
  const drop = useRef({ start: -1 });
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
      pitch: new THREE.Quaternion(),
      roll: new THREE.Quaternion(),
      // beside the manifesto: a slight turn so the spine shows, and a jaunty tilt
      standing: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.07, -0.38, "YZX")),
      // open: lying back a little, as if on a table in front of you
      lying: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)),
    }),
    [],
  );

  useFrame(({ camera, size }) => {
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
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(src.fov) / 2);

    // 1. progress along each leg: a leg ends when its slot sits mid-screen
    const a = el.getBoundingClientRect();
    const endA = Math.max(1, a.top + sy + a.height / 2 - size.height / 2);
    const pA = clamp01(sy / endA);
    const b = flight.spread?.getBoundingClientRect();
    // the spread is pinned, so its own rect drifts while pinned: the book is centred when the pin's top reaches the page top
    const pin = flight.pin?.getBoundingClientRect();
    const endB = pin ? pin.top + sy : b ? b.top + sy + b.height / 2 - size.height / 2 : Infinity;
    const pB = b ? clamp01((sy - endA) / Math.max(1, endB - endA)) : 0;
    // leg 3: pinned and lying open; the leaf turns over to the index mid-way, then it rests there
    const pinned = pin ? Math.max(1, pin.height - size.height) : 1;
    const pC = pin ? clamp01((sy - endB) / pinned) : 0;
    turn.current = easeInOut(smooth(pC, 0.1, 0.55));

    // the moment the page has landed on the index spread, the tools drop, once, in real time;
    // turning back past the re-arm point puts them away so they drop again next time
    // (the browser's clock, not three's: that one is reset to zero each time the canvas is paused and
    // resumed, which happens whenever the book scrolls away and back, and would hide the tools)
    const now = performance.now() / 1000;
    const d = drop.current;
    if (d.start < 0 && turn.current >= LANDED) d.start = now;
    else if (d.start >= 0 && turn.current < REARM) d.start = -1;
    const since = d.start < 0 ? -1 : now - d.start;
    if (tools.current) {
      tools.current.children.forEach((obj, i) => {
        poseTool(obj, plans[i], clamp01((since - plans[i].delay * DROP_STAGGER) / DROP_SECONDS));
      });
    }
    flight.progress = pA;

    // 2. the camera: the hero's, shifted with the page; on the second leg it turns to face the viewport
    const straighten = smooth(pB, 0, 0.5);
    const below = ((sy + size.height / 2) / hh) * 2 - 1; // viewport centre, in the hero's NDC (down = +)
    cam.position.copy(src.position);
    cam.quaternion.copy(src.quaternion).multiply(t.pitch.setFromAxisAngle(X_AXIS, -straighten * Math.atan(below * tanHalf)));
    cam.fov = src.fov;
    cam.near = src.near;
    cam.far = src.far;
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

    g.visible = pA > 0;
    if (pB <= 0) {
      // leg 1: lift off the mat and arc toward the viewer on the way down to the manifesto
      const e = easeInOut(pA);
      const lift = Math.sin(Math.PI * e);
      g.position.lerpVectors(start.pos, t.slotPos, e).addScaledVector(t.toward, lift * 2.2);
      g.position.y += lift * 0.8;
      t.roll.setFromAxisAngle(t.toward, lift * 0.5);
      g.quaternion.slerpQuaternions(start.quat, t.slotQuat, e).premultiply(t.roll);
      open.current = 0;
    } else {
      // leg 2: glide down to the spread, settling back as it falls open
      const e = easeInOut(pB);
      g.position.lerpVectors(t.slotPos, t.spreadPos, e).addScaledVector(t.toward, Math.sin(Math.PI * e) * 1.2);
      g.quaternion.slerpQuaternions(t.slotQuat, t.spreadQuat, e);
      open.current = easeInOut(smooth(pB, 0.3, 0.97));
    }

    // soft shadows under each slot, faded in as the book arrives (only touch the DOM on change)
    const slotShadow = Math.round(pA * (1 - smooth(pB, 0, 0.15)) * 100) / 100;
    if (slotShadow !== shadows.current.slot) {
      shadows.current.slot = slotShadow;
      el.style.setProperty("--book", String(slotShadow));
    }
    const spreadShadow = Math.round(smooth(pB, 0.8, 1) * 100) / 100;
    if (flight.spread && spreadShadow !== shadows.current.spread) {
      shadows.current.spread = spreadShadow;
      flight.spread.style.setProperty("--book", String(spreadShadow));
    }
  });

  return (
    <group ref={book} visible={false}>
      <Sketchbook open={open} leftPage={leftPage} rightPage={rightPage} turn={turn} turnedPage={indexPage} nextPage={toolsPage}>
        {/* the tool cup, standing up off the right-hand page */}
        {/* the tools: loose, posed in book space; hidden until they are dropped */}
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
