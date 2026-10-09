"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/** How far an open page bows up out of the gutter at `u` (0 = spine, 1 = fore-edge), in book units. */
export function gutterLift(u: number) {
  // (clamped: a sine a hair below zero at the edges would make the power NaN)
  return 0.07 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 1.15))), 0.7) * (1 - 0.55 * u);
}

/**
 * The shade a lifted leaf casts on a page lying under it, as shader uniforms: how dark, and how far
 * out from the spine (0–1 of the page) it reaches. `spine` is the page's u at the spine (0 or 1).
 */
export type PageShade = {
  strength: { value: number };
  edge: { value: number };
  spine: { value: number };
};
export const makeShade = (spine: 0 | 1): PageShade => ({
  strength: { value: 0 },
  edge: { value: 0 },
  spine: { value: spine },
});

function setShade(shade: PageShade, strength: number, edge: number) {
  shade.strength.value = strength;
  shade.edge.value = edge;
}

/** Patches a page material to darken under the leaf (see `PageShade`). */
export function shadeMaterial(shade: PageShade) {
  return {
    onBeforeCompile: (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.uniforms.uShade = shade.strength;
      s.uniforms.uShadeEdge = shade.edge;
      s.uniforms.uSpine = shade.spine;
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uShade;\nuniform float uShadeEdge;\nuniform float uSpine;")
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
          float dSpine = abs(uSpine - vMapUv.x);
          gl_FragColor.rgb *= 1.0 - uShade * (1.0 - smoothstep(uShadeEdge - 0.05, uShadeEdge + 0.35, dSpine));`,
        );
    },
    customProgramCacheKey: () => "page-shade",
  };
}

// grid resolution: along the page (where it bends) and down it (where it twists)
const NS = 40;
const NZ = 12;

// the root swings toward where the scroll says the page should be, a touch underdamped
const ROOT_K = 70;
const ROOT_C = 2 * Math.sqrt(ROOT_K) * 0.85;
// the free edge is springy paper: it trails while the leaf moves, then sways past and settles
const BEND_K = 38;
const BEND_C = 2 * Math.sqrt(BEND_K) * 0.2;
/** How much extra damping the free edge gets once the leaf is lying on the page (× its usual). */
const LAND_DAMP = 5;
/** Air on the page's face: radians of trail per rad/s of swing. */
const DRAG = 0.055;
/** How much the root's acceleration throws the edge the other way. */
const INERTIA = 0.3;
/** How hard the free edge droops toward whichever side the page leans. */
const GRAVITY = 0.9;
/** The bottom corner leads the turn, the way a page lifted by its corner does. */
const TWIST = 0.22;
const STEPS = 4;
const AT_REST = 1e-3;

type Props = {
  /** Page width (spine to fore-edge) and height, in book units. */
  width: number;
  depth: number;
  /** Where the leaf should be, 0 = lying on the right, 1 = turned over to the left. */
  turn: React.RefObject<number>;
  /** How far the book is open, 0–1; the leaf shows (and bows with the pages) once it is. */
  open?: React.RefObject<number>;
  front: React.ReactNode;
  back: React.ReactNode;
  shade: { left: PageShade; right: PageShade };
};

/**
 * A single leaf of paper hinged at its spine (the group origin), lying along +x. It is simulated,
 * not keyframed: the root follows `turn` on a spring, and the sheet bends behind it under drag,
 * inertia and gravity, so it trails through the turn, flops over and settles with a little sway.
 */
export function TurningLeaf({ width, depth, turn, open, front, back, shade }: Props) {
  const invalidate = useThree((s) => s.invalidate);
  const group = useRef<THREE.Group>(null);
  const frontMesh = useRef<THREE.Mesh>(null);
  const backMesh = useRef<THREE.Mesh>(null);
  const sim = useRef<{ a: number; av: number; b: number; bv: number } | null>(null);

  const { frontGeo, backGeo } = useMemo(() => {
    const count = (NS + 1) * (NZ + 1);
    const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const geo = (isBack: boolean) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", position);
      const uv = new Float32Array(count * 2);
      const index: number[] = [];
      const v = (i: number, j: number) => j * (NS + 1) + i;
      for (let j = 0; j <= NZ; j++) {
        for (let i = 0; i <= NS; i++) {
          // the back reads from the spine side once it's over on the left
          uv[v(i, j) * 2] = isBack ? 1 - i / NS : i / NS;
          uv[v(i, j) * 2 + 1] = 1 - j / NZ;
          if (i < NS && j < NZ) {
            const [a, b, c, e] = [v(i, j), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1)];
            // front faces up while it lies on the right, back faces up once it's turned
            if (isBack) index.push(a, b, c, b, e, c);
            else index.push(a, c, b, b, c, e);
          }
        }
      }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(index);
      return g;
    };
    return { frontGeo: geo(false), backGeo: geo(true) };
  }, []);
  useEffect(
    () => () => {
      frontGeo.dispose();
      backGeo.dispose();
    },
    [frontGeo, backGeo],
  );

  useFrame((_, rawDelta) => {
    const o = open?.current ?? 1;
    const g = group.current;
    const fm = frontMesh.current;
    const bm = backMesh.current;
    if (g) g.visible = o > 0; // while the book is shut it is part of the block
    if (!g || !fm || !bm || o <= 0) return;

    const target = Math.PI * THREE.MathUtils.clamp(turn.current ?? 0, 0, 1);
    const s = (sim.current ??= { a: target, av: 0, b: 0, bv: 0 });

    // 1. step the springs (a few small steps: stable however long the frame was)
    const dt = Math.min(rawDelta, 1 / 30) / STEPS;
    for (let k = 0; k < STEPS; k++) {
      const av0 = s.av;
      s.av += (ROOT_K * (target - s.a) - ROOT_C * s.av) * dt;
      s.a += s.av * dt;
      // it lands on the page under it and stops dead there; the edge carries on and flops
      if (s.a < 0 || s.a > Math.PI) {
        s.a = THREE.MathUtils.clamp(s.a, 0, Math.PI);
        s.av = 0;
      }
      const rootAcc = (s.av - av0) / dt;
      const sag = -GRAVITY * Math.sin(s.a) * Math.cos(s.a) - DRAG * s.av;
      // once it has come down on the page its edge is let to settle fast, rather than sway on for a while
      const down = THREE.MathUtils.smoothstep(s.a, 2.6, Math.PI);
      s.bv += (BEND_K * (sag - s.b) - BEND_C * (1 + LAND_DAMP * down) * s.bv - INERTIA * rootAcc) * dt;
      s.b = THREE.MathUtils.clamp(s.b + s.bv * dt, -1.4, 1.4);
    }
    const moving =
      Math.abs(target - s.a) > AT_REST || Math.abs(s.av) > AT_REST || Math.abs(s.b) > AT_REST || Math.abs(s.bv) > AT_REST;
    if (moving) invalidate();

    // 2. lay the sheet out: march out from the spine, each strip turned a little more (or less)
    const rest = THREE.MathUtils.smoothstep(o, 0.6, 1) * Math.cos(s.a) ** 2; // bowed only while lying down
    const twist = TWIST * Math.tanh(s.av / 4);
    const ds = width / NS;
    const position = fm.geometry.attributes.position as THREE.BufferAttribute;
    const p = position.array as Float32Array;
    for (let j = 0; j <= NZ; j++) {
      const zn = (j / NZ) * 2 - 1;
      const z = (zn * depth) / 2;
      let x = 0;
      let y = 0;
      p.set([0, 0, z], j * (NS + 1) * 3);
      for (let i = 0; i < NS; i++) {
        const m = (i + 0.5) / NS;
        // never through the pages it lies on, either side
        const th = THREE.MathUtils.clamp(s.a + s.b * m ** 1.5 + twist * zn * m, 0, Math.PI);
        x += Math.cos(th) * ds;
        y += Math.sin(th) * ds;
        p.set([x, y + gutterLift((i + 1) / NS) * rest, z], (j * (NS + 1) + i + 1) * 3);
      }
    }
    position.needsUpdate = true;
    fm.geometry.computeVertexNormals();
    bm.geometry.computeVertexNormals();

    // 3. the shade it casts on whichever page it hangs over
    const c = Math.cos(s.a);
    const lifted = 0.3 * Math.sin(s.a);
    setShade(shade.right, lifted * THREE.MathUtils.smoothstep(c, -0.2, 0.3), Math.max(c, 0));
    setShade(shade.left, lifted * THREE.MathUtils.smoothstep(-c, -0.2, 0.3), Math.max(-c, 0));
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={frontMesh} geometry={frontGeo} frustumCulled={false}>
        {front}
      </mesh>
      <mesh ref={backMesh} geometry={backGeo} frustumCulled={false}>
        {back}
      </mesh>
    </group>
  );
}
