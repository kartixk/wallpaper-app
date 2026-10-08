"use client";

import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

/* ------------------------- scanned stationery (Poly Haven, CC0) ------------------------- */

const STATIONERY = "/desk/models/stationery.glb";
export const SCALE = 10; // models are in metres, the desk is in 10 cm units

export type Part =
  | "pencilcup"
  | "eraser"
  | "pencil_new_a"
  | "pencil_new_b"
  | "pencil_used"
  | "pencil_old"
  | "pen_red"
  | "pen_fancy"
  | "pen_blue";

export function useStationery() {
  const { nodes } = useGLTF(STATIONERY);
  return (part: Part) => nodes[`stationery_supplies_${part}`] as THREE.Mesh;
}

/** A pencil or pen lying on its side; the scans run along x. */
export function LyingTool({ part, roll = 0 }: { part: Part; roll?: number }) {
  const mesh = useStationery()(part);
  const radius = mesh.geometry.boundingBox!.max.y; // GLTFLoader fills bounds from the accessors
  return (
    <mesh
      geometry={mesh.geometry}
      material={mesh.material}
      scale={SCALE}
      position-y={radius * SCALE}
      rotation-x={roll}
    />
  );
}

export function Eraser() {
  const mesh = useStationery()("eraser");
  return <mesh geometry={mesh.geometry} material={mesh.material} scale={SCALE} position-y={0.05} />;
}

useGLTF.preload(STATIONERY);
