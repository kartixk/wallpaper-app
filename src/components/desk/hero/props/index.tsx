"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ON_MAT, PROPS as p, SUN, type Placement } from "../layout";
import { flight } from "../flight";
import { CuttingMat, Ruler } from "./Surfaces";
import { BOOK_D, BOOK_W, Sketchbook } from "./Sketchbook";
import { cachedTexture } from "./canvas";
import { Eraser, LyingTool } from "./Objects";
import { Laptop } from "./Laptop";
import { BoomArm, Cables, ConeLamp, LedLamp } from "./Lamps";
import { BrushCup, ChaiGlass, MarkerBag, Tablet } from "./Supplies";
import { Bobblehead, PadminiWithRider, Remote, TapeDispenser } from "./Toys";
import { GTRCar, JeepCar, RoadsterCar } from "./Cars";
import { PaintJars, PaintTubes } from "./Paints";

export { ArtWall, Desk } from "./Room";

export function DeskProps() {
  return (
    <>
      {/* the work zone: green A2 mat dead centre */}
      <OnDesk at={p.mat}><CuttingMat /></OnDesk>
      <OnDesk at={p.sketchbook} y={ON_MAT}><LeavingSketchbook /></OnDesk>
      <RisingSketchbook />
      <FlightShadow />
      <OnDesk at={p.pencilA} y={ON_MAT}><LyingTool part="pencil_new_b" /></OnDesk>
      <OnDesk at={p.pencilB} y={ON_MAT}><LyingTool part="pencil_old" roll={1.1} /></OnDesk>
      <OnDesk at={p.ruler} y={ON_MAT}><Ruler /></OnDesk>
      <OnDesk at={p.eraser} y={ON_MAT}><Eraser /></OnDesk>

      {/* along the wall */}
      <OnDesk at={p.laptop}><Laptop /></OnDesk>
      <OnDesk at={p.coneLamp}><ConeLamp /></OnDesk>
      <OnDesk at={p.ledLamp}><LedLamp /></OnDesk>
      <OnDesk at={p.boomArm}><BoomArm /></OnDesk>
      <OnDesk at={{ pos: [0, 0] }}><Cables /></OnDesk>

      {/* left: supplies and the Spider-Man corner */}
      <OnDesk at={p.markers}><MarkerBag /></OnDesk>
      <OnDesk at={p.brushCup}><BrushCup /></OnDesk>
      <OnDesk at={p.tape}><TapeDispenser /></OnDesk>
      <OnDesk at={p.bobblehead}><Bobblehead /></OnDesk>
      <OnDesk at={p.padmini}><PadminiWithRider /></OnDesk>
      <OnDesk at={p.gtr}><GTRCar /></OnDesk>
      <OnDesk at={p.jeep}><JeepCar /></OnDesk>
      <OnDesk at={p.roadster}><RoadsterCar /></OnDesk>
      <OnDesk at={p.remote}><Remote /></OnDesk>

      {/* right: iPad, paints and chai */}
      <OnDesk at={p.tablet}><Tablet /></OnDesk>
      <OnDesk at={p.tubes}><PaintTubes /></OnDesk>
      <OnDesk at={p.jars}><PaintJars /></OnDesk>
      <OnDesk at={p.chai}><ChaiGlass /></OnDesk>
    </>
  );
}

/** The sketchbook on the mat; it hides once the overlay has picked it up to fly it down the page. */
function LeavingSketchbook() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ gl }) => {
    const g = ref.current;
    const onDesk = flight.progress <= 0;
    if (!g || g.visible === onDesk) return;
    g.visible = onDesk;
    gl.shadowMap.needsUpdate = true; // the shadow map is frozen; redraw it without (or with) the book
  });
  return (
    <group ref={ref}>
      <Sketchbook />
    </group>
  );
}

/**
 * The same sketchbook once it has taken off, while it is still wholly over the hero (the overlay
 * works out the pose; see `flight.book`). Drawn here rather than in the overlay so it keeps the
 * desk's light and grading and scrolls in exact step with it. Its shadow is `FlightShadow`.
 */
function RisingSketchbook() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const b = flight.book;
    const show = flight.progress > 0 && b.inHero;
    if (show) {
      g.position.fromArray(b.pos);
      g.quaternion.fromArray(b.quat);
    }
    g.visible = show;
    b.heroHasBook = show;
  });
  return (
    <group ref={ref} visible={false}>
      <Sketchbook />
    </group>
  );
}

/** Light direction, from the desk toward the sun. */
const TO_SUN = new THREE.Vector3(...SUN).normalize();
/** Share of the shadow texture the book's footprint fills; the rest is penumbra. */
const CORE = 0.6;

/**
 * The flying sketchbook's shadow on the desk, for its whole time over it (whichever canvas is
 * drawing the book). Cast along the window light like the real shadows, but soft: it spreads,
 * blurs and fades as the book climbs, and is gone by the time the book has left the hero.
 */
function FlightShadow() {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const map = useMemo(
    () =>
      cachedTexture("flight-shadow-penumbra", 256, 256, (ctx, w, h) => {
        // the book's footprint (the core) in warm brown-black, feathering out beyond it
        const img = ctx.createImageData(w, h);
        const fall = (t: number) => 1 - THREE.MathUtils.smoothstep(Math.abs(t * 2 - 1), CORE - 0.04, CORE + 0.3);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            img.data.set([36, 23, 11, Math.round(255 * fall((x + 0.5) / w) * fall((y + 0.5) / h))], (y * w + x) * 4);
          }
        }
        ctx.putImageData(img, 0, 0);
      }),
    [],
  );
  const v = useMemo(
    () => ({
      centre: new THREE.Vector3(),
      x: new THREE.Vector3(),
      z: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      basis: new THREE.Matrix4(),
    }),
    [],
  );

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const { centre, x, z, q, basis } = v;
    q.fromArray(flight.book.quat);
    // the middle of the book's thickness
    centre.fromArray(flight.book.pos).add(x.set(0, 0.1, 0).applyQuaternion(q));
    const h = Math.max(0, centre.y - ON_MAT);
    // contact-dark on the mat, thinning to nothing as the book climbs past the top of the frame
    const strength = (0.65 / (1 + 0.3 * h) ** 2) * (1 - THREE.MathUtils.smoothstep(h, 3, 5));
    m.visible = flight.progress > 0 && strength > 0.004;
    if (!m.visible) return;
    (m.material as THREE.MeshBasicMaterial).opacity = strength;

    // the book's footprint, thrown along the light onto the desk; wider and softer the higher it is
    const spread = (1 + 0.12 * h) / CORE;
    const onDesk = (a: THREE.Vector3) => a.addScaledVector(TO_SUN, -a.y / TO_SUN.y);
    onDesk(centre);
    onDesk(x.set(BOOK_W, 0, 0).applyQuaternion(q)).multiplyScalar(spread);
    onDesk(z.set(0, 0, BOOK_D).applyQuaternion(q)).multiplyScalar(spread);
    basis.makeBasis(x, THREE.Object3D.DEFAULT_UP, z).setPosition(centre.x, ON_MAT + 0.004, centre.z);
    m.matrix.copy(basis);
  });

  return (
    <mesh ref={ref} geometry={geo} matrixAutoUpdate={false} visible={false} renderOrder={1}>
      <meshBasicMaterial map={map} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
    </mesh>
  );
}

/** Places an object on the desk and lets its meshes cast and catch shadows. */
function OnDesk({ at, y = 0, children }: { at: Placement; y?: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  }, []);
  return (
    <group ref={ref} position={[at.pos[0], y, at.pos[1]]} rotation-y={-THREE.MathUtils.degToRad(at.rot ?? 0)}>
      {children}
    </group>
  );
}
