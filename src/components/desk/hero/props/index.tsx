"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ON_MAT, PROPS as p, type Placement } from "../layout";
import { flight } from "../flight";
import { CuttingMat, Ruler } from "./Surfaces";
import { Sketchbook } from "./Sketchbook";
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
