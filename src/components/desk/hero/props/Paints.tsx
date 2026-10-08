"use client";

import { use, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { cachedTexture, cssFont, fontsReady, useDispose } from "./canvas";

/* ------------------------------- acrylic paint tubes ------------------------------- */

type Tube = {
  name: string;
  paint: string;
  /** Body radius; 0.2 is a fat 120 ml tube, 0.13 a 40 ml one. */
  r: number;
  len: number;
  ml: number;
  cap: string;
  /** How hard it's been squeezed (0 = new). */
  squeeze: number;
  at: [x: number, z: number];
  rot: number;
  y?: number;
};

const TUBES: Tube[] = [
  { name: "Titanium White", paint: "#f4f3ef", r: 0.2, len: 1.35, ml: 120, cap: "#f2f2f0", squeeze: 0.35, at: [-0.2, 0.05], rot: 14 },
  { name: "Ivory Black", paint: "#1b1b1c", r: 0.13, len: 0.85, ml: 40, cap: "#151515", squeeze: 0.2, at: [0.75, -0.35], rot: -28 },
  { name: "Crimson", paint: "#b3172b", r: 0.13, len: 0.85, ml: 40, cap: "#151515", squeeze: 0.7, at: [0.95, 0.45], rot: 64 },
  { name: "Ultramarine", paint: "#2a3fa8", r: 0.13, len: 0.85, ml: 40, cap: "#151515", squeeze: 0.1, at: [-0.5, 0.55], rot: -6 },
  // one left out on the cutting mat
  { name: "Yellow Ochre", paint: "#d39a2a", r: 0.13, len: 0.85, ml: 40, cap: "#151515", squeeze: 0.5, at: [-1.85, -0.35], rot: 152, y: 0.031 },
];

/** Tube body along +x (shoulder at 0, crimp at `len`): round at the shoulder, pinched flat at the crimp. */
function tubeGeometry(r: number, len: number, squeeze: number, seed: number) {
  const g = new THREE.CylinderGeometry(r, r, len, 48, 40, true);
  g.translate(0, len / 2, 0);
  g.rotateZ(-Math.PI / 2); // y → x
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = x / len;
    const flat = THREE.MathUtils.smoothstep(t, 0.3, 1);
    // squeezed tubes have dents and a rolled-up, flatter tail
    const dent = squeeze * 0.35 * Math.exp(-(((t - 0.45 - Math.sin(seed) * 0.1) / 0.12) ** 2));
    const ky = (1 - 0.9 * flat) * (1 - dent) * (1 - squeeze * 0.25 * flat);
    const kz = 1 + 0.5 * flat + dent * 0.3;
    p.setY(i, p.getY(i) * ky);
    p.setZ(i, p.getZ(i) * kz);
  }
  g.computeVertexNormals();
  return g;
}

function PaintTube({ tube, seed }: { tube: Tube; seed: number }) {
  const { r, len } = tube;
  const body = useMemo(() => tubeGeometry(r, len, tube.squeeze, seed), [r, len, tube.squeeze, seed]);
  const shoulder = useMemo(() => {
    const pts = [[r, 0], [r * 0.96, 0.04], [r * 0.7, 0.1], [r * 0.42, 0.15], [r * 0.4, 0.17]].map(
      ([a, b]) => new THREE.Vector2(a, b),
    );
    const g = new THREE.LatheGeometry(pts, 48);
    g.rotateZ(Math.PI / 2); // y → −x
    return g;
  }, [r]);

  // printed tube: label runs along the length, colour band round the shoulder end
  const label = useMemo(
    () =>
      cachedTexture(`tube-${tube.name}`, 512, 1024, (ctx, w, h) => {
        ctx.fillStyle = "#f1efe9";
        ctx.fillRect(0, 0, w, h);
        // canvas top is the crimp end, bottom the shoulder
        ctx.fillStyle = tube.paint;
        ctx.fillRect(0, h * 0.72, w, h * 0.2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(0, h * 0.72, w, 3);
        ctx.fillRect(0, h * 0.92 - 3, w, 3);
        ctx.save();
        ctx.translate(w * 0.875, h * 0.42);
        ctx.rotate(Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = "#1d1d1f";
        ctx.font = `700 ${w * 0.075}px ${cssFont("--font-general-sans", "sans-serif")}`;
        ctx.fillText(tube.name.toUpperCase(), 0, 0);
        ctx.font = `500 ${w * 0.045}px ${cssFont("--font-general-sans", "sans-serif")}`;
        ctx.fillStyle = "#5a5a5e";
        ctx.fillText(`ARTIST ACRYLIC COLOUR  ·  ${tube.ml} ml`, 0, w * 0.075);
        ctx.restore();
        // a smear of paint near the crimp from use
        if (tube.squeeze > 0.3) {
          ctx.fillStyle = tube.paint;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.ellipse(w * 0.6, h * 0.95, w * 0.12, h * 0.02, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }),
    [tube],
  );
  useDispose(body, shoulder);

  const foil = { metalness: 0.55, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 } as const;

  return (
    <group position={[tube.at[0], (tube.y ?? 0) + r * 0.92, tube.at[1]]} rotation-y={-THREE.MathUtils.degToRad(tube.rot)}>
      {/* rest the round end on the desk and let the flat tail lie a touch lower */}
      <group rotation-z={-Math.atan2(r * 0.8, len)} position-x={-len / 2}>
        <mesh geometry={body}>
          <meshPhysicalMaterial map={label} {...foil} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={shoulder}>
          <meshPhysicalMaterial color="#e7e5df" {...foil} />
        </mesh>
        {/* crimped seal: ridged flat end */}
        <RoundedBox args={[0.14, r * 0.16, r * 2.95]} radius={r * 0.06} position-x={len + 0.05}>
          <meshPhysicalMaterial color="#d9d7d0" metalness={0.7} roughness={0.35} />
        </RoundedBox>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[len + 0.01 + i * 0.04, 0, 0]}>
            <boxGeometry args={[0.012, r * 0.18, r * 2.9]} />
            <meshStandardMaterial color="#b9b7b0" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
        {/* ribbed screw cap */}
        <mesh position-x={-0.17 - r * 0.6} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[r * 0.62, r * 0.66, r * 1.2, 24]} />
          <meshPhysicalMaterial color={tube.cap} roughness={0.35} clearcoat={0.5} flatShading />
        </mesh>
        <mesh position-x={-0.17 - r * 1.2 - 0.004} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[r * 0.6, r * 0.6, 0.01, 24]} />
          <meshPhysicalMaterial color={tube.cap} roughness={0.3} clearcoat={0.6} />
        </mesh>
      </group>
    </group>
  );
}

export function PaintTubes() {
  use(fontsReady());
  return (
    <group>
      {TUBES.map((t, i) => (
        <PaintTube key={t.name} tube={t} seed={i * 1.7 + 0.4} />
      ))}
    </group>
  );
}

/* --------------------------------- acrylic paint jars --------------------------------- */

const JARS = [
  { at: [-0.3, -0.2], paint: "#d7262f", name: "Crimson" },
  { at: [0.22, -0.3], paint: "#f2c12e", name: "Lemon" },
  { at: [0.0, 0.25], paint: "#2b9a5a", name: "Viridian" },
] as const;

function PaintJar({ paint, name }: { paint: string; name: string }) {
  const label = useMemo(
    () =>
      cachedTexture(`jar-${name}`, 1024, 256, (ctx, w, h) => {
        ctx.fillStyle = "#f7f7f5";
        ctx.fillRect(0, 0, w, h);
        // label wraps the front: thetaStart = π puts u = 0.5 facing the room
        ctx.fillStyle = paint;
        ctx.fillRect(w * 0.3, h * 0.16, w * 0.4, h * 0.68);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = `700 ${h * 0.2}px ${cssFont("--font-general-sans", "sans-serif")}`;
        ctx.fillText("ACRYLIC", w * 0.5, h * 0.45);
        ctx.font = `500 ${h * 0.14}px ${cssFont("--font-general-sans", "sans-serif")}`;
        ctx.fillText(name.toUpperCase(), w * 0.5, h * 0.68);
      }),
    [paint, name],
  );

  return (
    <group>
      <mesh position-y={0.24}>
        <cylinderGeometry args={[0.22, 0.22, 0.48, 40, 1, false, Math.PI]} />
        <meshPhysicalMaterial map={label} roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position-y={0.52}>
        <cylinderGeometry args={[0.2, 0.21, 0.1, 40]} />
        <meshPhysicalMaterial color={paint} roughness={0.25} clearcoat={1} />
      </mesh>
      {/* dried drip down the side */}
      <mesh position={[0.12, 0.42, 0.17]} scale={[0.6, 1.8, 0.4]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshPhysicalMaterial color={paint} roughness={0.2} clearcoat={1} />
      </mesh>
    </group>
  );
}

export function PaintJars() {
  use(fontsReady());
  return (
    <group>
      {JARS.map((j) => (
        <group key={j.name} position={[j.at[0], 0, j.at[1]]}>
          <PaintJar paint={j.paint} name={j.name} />
        </group>
      ))}
    </group>
  );
}
