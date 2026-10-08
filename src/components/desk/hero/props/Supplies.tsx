"use client";

import { use, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox, useTexture } from "@react-three/drei";
import { cachedTexture, cssFont, fontsReady, rng, useDispose } from "./canvas";
import { SCALE, useStationery, type Part } from "./Objects";

/* ----------------------------- 80-piece alcohol marker bag ----------------------------- */

const BAG = { rx: 0.92, rz: 0.72, h: 1.45 };
const MARKER_R = 0.066;
const CAP_COLORS = [
  "#e8413c", "#f08a2c", "#f4c531", "#9ccf4a", "#3fae6a", "#2fb3b0", "#3b8fd9", "#4b5fc8",
  "#8a5bd0", "#d65aa6", "#f2a3b5", "#c8a27a", "#7a5232", "#9aa3ad", "#f6e7a8", "#b9e3f2",
];

export function MarkerBag() {
  use(fontsReady());
  const bodies = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);

  // hex-pack the markers inside the oval mouth of the bag
  const spots = useMemo(() => {
    const r = rng(8);
    const out: { x: number; z: number; h: number; color: string }[] = [];
    const step = MARKER_R * 2.15;
    for (let row = -10; row <= 10; row++) {
      for (let col = -10; col <= 10; col++) {
        const x = (col + (row % 2 ? 0.5 : 0)) * step;
        const z = row * step * 0.87;
        if ((x / (BAG.rx - 0.1)) ** 2 + (z / (BAG.rz - 0.1)) ** 2 > 1) continue;
        out.push({ x, z, h: BAG.h + 0.06 + r() * 0.1, color: CAP_COLORS[Math.floor(r() * CAP_COLORS.length)] });
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      m.makeTranslation(s.x, s.h / 2, s.z);
      bodies.current?.setMatrixAt(i, m);
      m.makeTranslation(s.x, s.h + 0.07, s.z);
      caps.current?.setMatrixAt(i, m);
      caps.current?.setColorAt(i, c.set(s.color));
    });
    for (const im of [bodies.current, caps.current]) {
      if (!im) continue;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }, [spots]);

  const label = useMemo(
    () =>
      cachedTexture("marker-bag", 1024, 256, (ctx, w, h) => {
        ctx.fillStyle = "#151517";
        ctx.fillRect(0, 0, w, h);
        // woven fabric
        for (let y = 0; y < h; y += 3) {
          ctx.fillStyle = `rgba(255,255,255,${y % 6 ? 0.015 : 0.035})`;
          ctx.fillRect(0, y, w, 1);
        }
        ctx.fillStyle = "#e9e9e9";
        ctx.font = `600 ${h * 0.11}px ${cssFont("--font-general-sans", "sans-serif")}`;
        ctx.textAlign = "center";
        ctx.fillText("80pcs", w / 2, h * 0.7);
      }),
    [],
  );

  return (
    <group>
      {/* thetaStart = π puts u = 0.5 (the label's centre) on the front */}
      <mesh position-y={BAG.h / 2} scale={[BAG.rx, 1, BAG.rz]}>
        <cylinderGeometry args={[1, 1.02, BAG.h, 48, 1, true, Math.PI]} />
        <meshPhysicalMaterial map={label} roughness={0.85} sheen={0.6} sheenColor="#4a4a50" side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.01} scale={[BAG.rx, 1, BAG.rz]}>
        <cylinderGeometry args={[1.02, 1.02, 0.02, 48]} />
        <meshStandardMaterial color="#151517" roughness={0.9} />
      </mesh>
      {/* the zip-lid, flopped open behind */}
      <mesh position={[0, BAG.h + 0.05, -BAG.rz - 0.15]} rotation-x={-1.15} scale={[BAG.rx, BAG.rz, 1]}>
        <cylinderGeometry args={[1, 1, 0.08, 40]} />
        <meshPhysicalMaterial color="#18181a" roughness={0.85} sheen={0.6} sheenColor="#4a4a50" />
      </mesh>
      <instancedMesh ref={bodies} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[MARKER_R, MARKER_R, 1, 14]} />
        <meshStandardMaterial color="#1e1e20" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[MARKER_R * 1.02, MARKER_R * 1.05, 0.14, 14]} />
        <meshPhysicalMaterial roughness={0.3} clearcoat={0.6} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------ quilted black brush cup with a gold rim ------------------------ */

const CUP = { r: 0.42, h: 1.05 };
const IN_CUP: { part: Part; angle: number; lean: number }[] = [
  { part: "pencil_new_a", angle: 0.4, lean: 0.14 },
  { part: "pencil_used", angle: 2.2, lean: 0.2 },
  { part: "pen_blue", angle: 3.7, lean: 0.12 },
];
const BRUSHES = [
  { angle: 1.3, lean: 0.24, len: 1.9, tip: "#3a2a1e" },
  { angle: 5.0, lean: 0.18, len: 1.7, tip: "#e6dccb" },
  { angle: 2.9, lean: 0.28, len: 1.6, tip: "#2b2420" },
];

export function BrushCup() {
  const get = useStationery();
  const quilt = useMemo(
    () =>
      cachedTexture("brush-cup", 512, 256, (ctx, w, h) => {
        ctx.fillStyle = "#1b1b1d";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 3;
        const s = 32;
        for (let i = -h; i < w + h; i += s) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + h, h);
          ctx.moveTo(i, h);
          ctx.lineTo(i + h, 0);
          ctx.stroke();
        }
      }),
    [],
  );

  return (
    <group>
      <mesh position-y={CUP.h / 2}>
        <cylinderGeometry args={[CUP.r, CUP.r * 0.97, CUP.h, 40, 1, true]} />
        <meshPhysicalMaterial map={quilt} bumpMap={quilt} bumpScale={2} roughness={0.55} sheen={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.02}>
        <cylinderGeometry args={[CUP.r * 0.97, CUP.r * 0.97, 0.04, 40]} />
        <meshStandardMaterial color="#1b1b1d" />
      </mesh>
      <mesh position-y={CUP.h} rotation-x={Math.PI / 2}>
        <torusGeometry args={[CUP.r, 0.028, 12, 48]} />
        <meshStandardMaterial color="#d4a93c" metalness={1} roughness={0.22} />
      </mesh>
      {IN_CUP.map(({ part, angle, lean }) => {
        const m = get(part);
        const box = m.geometry.boundingBox!;
        const half = ((box.max.x - box.min.x) / 2) * SCALE;
        return (
          <group key={part} rotation-y={angle}>
            <group position={[0.12, 0.05, 0]} rotation-z={-lean}>
              <mesh geometry={m.geometry} material={m.material} scale={SCALE} position-y={half} rotation-z={Math.PI / 2} />
            </group>
          </group>
        );
      })}
      {BRUSHES.map((b, i) => (
        <group key={i} rotation-y={b.angle}>
          <group position={[0.14, 0.05, 0]} rotation-z={-b.lean}>
            <mesh position-y={b.len / 2}>
              <cylinderGeometry args={[0.022, 0.032, b.len, 12]} />
              <meshPhysicalMaterial color={i === 1 ? "#c43a2f" : "#222"} roughness={0.25} clearcoat={1} />
            </mesh>
            <mesh position-y={b.len + 0.08}>
              <cylinderGeometry args={[0.03, 0.022, 0.16, 12]} />
              <meshStandardMaterial color="#c9c9c9" metalness={1} roughness={0.25} />
            </mesh>
            <mesh position-y={b.len + 0.26}>
              <coneGeometry args={[0.035, 0.22, 12]} />
              <meshStandardMaterial color={b.tip} roughness={0.9} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ----------------------- iPad on a keyboard folio, Pencil on top ----------------------- */

const KB = { w: 2.6, d: 1.85, t: 0.06 };
const PAD = { w: 2.48, h: 1.78, t: 0.06, lean: 26 };

export function Tablet() {
  // one of his paintings open on the iPad, mid-session
  const art = useTexture("/desk/wall/digitalarts1.webp", (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  const keys = useMemo(
    () =>
      cachedTexture("ipad-keys", 1040, 740, (ctx, w, h) => {
        ctx.fillStyle = "#2d2e31";
        ctx.fillRect(0, 0, w, h);
        const u = w / 14.6;
        ctx.fillStyle = "#1a1b1d";
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 14; c++) {
            if (r === 4 && c > 3 && c < 9) continue;
            ctx.beginPath();
            ctx.roundRect(u * 0.3 + c * u, h * 0.28 + r * u * 0.96, u * 0.86, u * 0.84, 8);
            ctx.fill();
          }
        }
        ctx.beginPath();
        ctx.roundRect(u * 4.3, h * 0.28 + 4 * u * 0.96, u * 4.86, u * 0.84, 8);
        ctx.fill();
      }),
    [],
  );
  const lean = THREE.MathUtils.degToRad(PAD.lean);
  const grooveZ = -KB.d / 2 + 0.45;

  return (
    <group>
      <RoundedBox args={[KB.w, KB.t, KB.d]} radius={0.025} smoothness={2} position-y={KB.t / 2}>
        <meshStandardMaterial color="#2a2b2e" roughness={0.85} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position={[0, KB.t + 0.001, 0.12]}>
        <planeGeometry args={[KB.w - 0.12, KB.d - 0.3]} />
        <meshStandardMaterial map={keys} roughness={0.8} />
      </mesh>
      {/* the iPad leaning back in the groove, folio cover on its back */}
      <group position={[0, KB.t, grooveZ]} rotation-x={-lean}>
        <RoundedBox args={[PAD.w, PAD.h, PAD.t]} radius={0.025} smoothness={3} position={[0, PAD.h / 2, 0]}>
          <meshStandardMaterial color="#b9bbbe" metalness={1} roughness={0.32} />
        </RoundedBox>
        <mesh position={[0, PAD.h / 2, PAD.t / 2 + 0.001]}>
          <planeGeometry args={[PAD.w - 0.04, PAD.h - 0.04]} />
          <meshPhysicalMaterial
            color="#000000"
            emissive="#ffffff"
            emissiveMap={art}
            emissiveIntensity={0.75}
            roughness={0.06}
            clearcoat={1}
            clearcoatRoughness={0.03}
          />
        </mesh>
        <RoundedBox args={[PAD.w + 0.02, PAD.h, 0.035]} radius={0.015} position={[0, PAD.h / 2, -PAD.t / 2 - 0.02]}>
          <meshStandardMaterial color="#2a2b2e" roughness={0.85} />
        </RoundedBox>
        {/* Apple Pencil snapped to the top edge */}
        <mesh position={[-0.2, PAD.h + 0.045, 0]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.042, 1.55, 4, 12]} />
          <meshPhysicalMaterial color="#f6f6f4" roughness={0.3} clearcoat={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------- cutting chai in a glass ------------------------------- */

export function ChaiGlass() {
  const glass = useMemo(() => {
    const pts = [[0, 0], [0.27, 0], [0.29, 0.03], [0.36, 0.86], [0.345, 0.865], [0.275, 0.07], [0, 0.07]].map(
      ([x, y]) => new THREE.Vector2(x, y),
    );
    // the classic cutting-chai glass is faceted, not round
    return new THREE.LatheGeometry(pts, 14);
  }, []);
  useDispose(glass);

  return (
    <group>
      <mesh geometry={glass}>
        {/* see-through via plain transparency (transmission re-renders the whole scene every frame) */}
        <meshPhysicalMaterial
          color="#eef4f3"
          transparent
          opacity={0.28}
          depthWrite={false}
          roughness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.02}
          flatShading
        />
      </mesh>
      <mesh position-y={0.36}>
        <cylinderGeometry args={[0.322, 0.278, 0.58, 14]} />
        <meshPhysicalMaterial color="#9b6331" roughness={0.3} clearcoat={0.4} />
      </mesh>
      <mesh position-y={0.652} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.322, 14]} />
        <meshStandardMaterial color="#c49565" roughness={0.6} />
      </mesh>
    </group>
  );
}
