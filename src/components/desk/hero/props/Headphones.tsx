"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useDispose } from "./canvas";

/**
 * Over-ear headphones lying flat, cushions down: the cups' outer shells face the camera
 * and the headband arcs across the desk between them.
 */

const CUP_X = 0.98;
const CUP = { rx: 0.5, rz: 0.6 }; // oval cups
const SHELL_H = 0.3;

const matte = { color: "#2b2b2d", roughness: 0.68, sheen: 0.4, sheenRoughness: 0.7, sheenColor: "#5c5c60" } as const;
const metal = { color: "#b9b9bc", metalness: 1, roughness: 0.25 } as const;

/** `accent` colours the cups' outer shells (his pair is black with red cups). */
export function Headphones({ accent }: { accent?: string }) {
  const [sharedNormal] = useTexture(["/desk/textures/leather_nor_1k.webp"]);
  // own copy, so this tiling stays local to the headphones
  const leatherNormal = useMemo(() => {
    const t = sharedNormal.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.5, 0.5);
    t.offset.set(0.45, 0); // stay clear of the hide's seam
    return t;
  }, [sharedNormal]);

  const shell = useMemo(() => {
    // lathe profile, bottom → top so the faces point outward: side wall rounding into a flat-ish outer face
    const pts = [
      [0.97, 0.08],
      [1, 0.1],
      [1, SHELL_H - 0.16],
      [0.95, SHELL_H - 0.08],
      [0.82, SHELL_H - 0.02],
      [0.6, SHELL_H],
      [0, SHELL_H],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 64);
    g.scale(CUP.rx, 1, CUP.rz);
    return g;
  }, []);

  const cushion = useMemo(() => {
    const g = new THREE.TorusGeometry(0.82, 0.2, 18, 64);
    g.rotateX(Math.PI / 2);
    g.scale(CUP.rx, 0.55, CUP.rz);
    return g;
  }, []);

  const band = useMemo(() => {
    const path = new THREE.CatmullRomCurve3(
      [
        [-CUP_X - 0.05, 0, -0.42],
        [-CUP_X - 0.1, 0, -1.05],
        [-0.62, 0, -1.62],
        [0, 0, -1.8],
        [0.62, 0, -1.62],
        [CUP_X + 0.1, 0, -1.05],
        [CUP_X + 0.05, 0, -0.42],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    // flat band standing on its edge: thin radially, tall vertically
    const section = new THREE.Shape();
    const [t, h, r] = [0.05, 0.13, 0.04];
    section.moveTo(-t, -h + r);
    section.quadraticCurveTo(-t, -h, -t + r * 0.5, -h);
    section.lineTo(t - r * 0.5, -h);
    section.quadraticCurveTo(t, -h, t, -h + r);
    section.lineTo(t, h - r);
    section.quadraticCurveTo(t, h, t - r * 0.5, h);
    section.lineTo(-t + r * 0.5, h);
    section.quadraticCurveTo(-t, h, -t, h - r);
    const outer = new THREE.ExtrudeGeometry(section, { steps: 160, bevelEnabled: false, extrudePath: path });
    const padPath = new THREE.CatmullRomCurve3(path.getPoints(60).map((p) => p.clone().multiplyScalar(0.94)).slice(6, -6));
    const pad = new THREE.TubeGeometry(padPath, 120, 0.075, 12);
    pad.scale(1, 1.25, 1);
    return { outer, pad };
  }, []);
  useDispose(shell, cushion);
  useDispose(leatherNormal);
  useDispose(band.outer, band.pad);

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * CUP_X}>
          <mesh geometry={cushion} position-y={0.11}>
            <meshStandardMaterial color="#1c1c1d" roughness={0.75} normalMap={leatherNormal} normalScale={[0.6, 0.6]} />
          </mesh>
          <mesh geometry={shell} position-y={0.06}>
            <meshPhysicalMaterial {...matte} color={accent ?? matte.color} />
          </mesh>
          {/* metal ring + logo dot on the outer face */}
          <mesh position-y={0.06 + SHELL_H + 0.002} rotation-x={-Math.PI / 2} scale={[CUP.rx, CUP.rz, 1]}>
            <ringGeometry args={[0.62, 0.66, 64]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {/* slider from the cup up into the band */}
          <mesh position={[side * 0.03, 0.16, -0.56]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.035, 0.035, 0.32, 16]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh position={[0, 0.16, -0.47]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.12, 0.022, 10, 24, Math.PI]} />
            <meshStandardMaterial {...metal} />
          </mesh>
        </group>
      ))}
      <group position-y={0.14}>
        <mesh geometry={band.outer}>
          <meshPhysicalMaterial {...matte} />
        </mesh>
        <mesh geometry={band.pad} position-y={-0.02}>
          <meshStandardMaterial color="#202022" roughness={0.8} normalMap={leatherNormal} normalScale={[0.4, 0.4]} />
        </mesh>
      </group>
    </group>
  );
}
