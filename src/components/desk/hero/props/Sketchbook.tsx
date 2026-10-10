"use client";

import { use, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBox, useTexture } from "@react-three/drei";
import { cachedTexture, cssFont, fontsReady, grain, rng, useDispose } from "./canvas";
import { drawBlankPage } from "./BookPages";
import { TurningLeaf, gutterLift, makeShade, shadeMaterial } from "./PageLeaf";
import type { InkLayer } from "../underline";

// A4-ish hardback: 22 × 30 cm, 2 cm thick
const W = 2.2;
const D = 3.0;
const T = 0.2;
const BOARD = 0.025;
/** Where the two halves meet: the hinge line, and where the open pages lie. */
const MID = T / 2;
const GAP = 0.002;

/** A page runs from the spine itself (so the two meet in the gutter) to just inside the fore-edge. */
const PAGE_W = W - 0.02;

/** The open spread is twice the cover's width; this is the cover width, in desk units. */
export const BOOK_W = W;
export const BOOK_D = D;

const KRAFT = "#c4a073";

type Props = {
  /** How far open, 0–1 (eased by the caller). Omit for a book that stays shut. */
  open?: React.RefObject<number>;
  leftPage?: THREE.Texture;
  rightPage?: THREE.Texture;
  /**
   * Turns the right-hand page over to the left, 0–1. The leaf's front is `rightPage`, its back
   * `turnedPage`; `nextPage` is what's underneath, on the right, once it has gone.
   */
  turn?: React.RefObject<number>;
  turnedPage?: THREE.Texture;
  nextPage?: THREE.Texture;
  /**
   * A second leaf under the first: `nextPage` is its front (the page on the right once the first
   * has turned), `sketchLeft` its back and `sketchRight` the page under it, on the right, once it
   * too has gone.
   */
  turn2?: React.RefObject<number>;
  /** Ink drawn into the back of that second leaf (page 01) as part of its material: the underline. */
  ink?: InkLayer;
  sketchLeft?: THREE.Texture;
  sketchRight?: THREE.Texture;
  /**
   * Further leaves, each under the one before: its front is the page the previous leaf left on the
   * right, `back` is the page it turns onto the left, and `under` the page on the right after it.
   */
  more?: { turn: React.RefObject<number>; back: THREE.Texture; under: THREE.Texture; ink?: InkLayer }[];
  /** Things standing on the book's right-hand page (in the book's own units). */
  children?: React.ReactNode;
};

/**
 * The turning leaves ride this far above the page they lie on, clear of z-fighting. The second leaf
 * lies under the first while on the right, and over it once turned onto the left.
 */
const LEAF_LIFT = 0.004;
/**
 * Each leaf lies a little lower than the one before while on the right (it is under it), and a
 * little higher once on the left (it has been laid over it): index → [on the right, on the left].
 */
const LIFTS: [onRight: number, onLeft: number][] = Array.from({ length: 8 }, (_, i) => (i === 0 ? [0.004, 0.004] : [0.0035 - 0.0005 * i, 0.004 + 0.003 * i]));

/** Height of leaf `i`'s hinge for a given turn (0–1), in book units. */
export const leafHingeY = (i: number, turn: number) => MID + THREE.MathUtils.lerp(LIFTS[i][0], LIFTS[i][1], THREE.MathUtils.smoothstep(turn, 0.3, 0.6));

/** The leaf's width and depth, for sampling its sheet. */
export const LEAF_W = PAGE_W;
export const LEAF_D = D - 0.08;
/** Book-x of the spine, where the leaves are hinged. */
export const SPINE_X = -W / 2;

/** Records how a leaf is (a plain function, so a leaf's frame loop may write to the book's bookkeeping). */
function setLeafState(st: { a: number; b: number; tw: number }, a: number, b: number, tw: number) {
  st.a = a;
  st.b = b;
  st.tw = tw;
}

export function Sketchbook({
  open,
  leftPage,
  rightPage,
  turn,
  turnedPage,
  nextPage,
  turn2,
  ink,
  sketchLeft,
  sketchRight,
  more,
  children,
}: Props = {}) {
  use(fontsReady());
  const [logo, character] = useTexture(["/desk/logo-abishek.webp", "/desk/pencil-hoodie.webp"]);

  const cover = useMemo(() => {
    const logoImg = logo.image as HTMLImageElement;
    const charImg = character.image as HTMLImageElement;
    return cachedTexture("sketchbook-cover", 1100, 1500, (ctx, w, h) => {
      // kraft board: base, mottling, fibres
      ctx.fillStyle = KRAFT;
      ctx.fillRect(0, 0, w, h);
      const r = rng(11);
      for (let i = 0; i < 60; i++) {
        const g = ctx.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 80 + r() * 220);
        const dark = r() < 0.5;
        g.addColorStop(0, dark ? "rgba(120,84,44,0.07)" : "rgba(236,214,170,0.08)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      for (let i = 0; i < 2600; i++) {
        const x = r() * w;
        const y = r() * h;
        const a = r() * Math.PI;
        const len = 4 + r() * 16;
        ctx.strokeStyle = r() < 0.5 ? "rgba(98,66,32,0.16)" : "rgba(240,222,186,0.18)";
        ctx.lineWidth = 0.7 + r() * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      grain(ctx, w, h, 16, 12);

      // printed wordmark — multiply so the ink sits *in* the board
      ctx.globalCompositeOperation = "multiply";
      const lw = w * 0.72;
      const lh = lw * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, (w - lw) / 2 - w * 0.02, h * 0.12, lw, lh);

      // graphite sketch of Pencil
      const sw = w * 0.46;
      const sh = sw * (charImg.height / charImg.width);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(pencilSketch(charImg, Math.round(sw), Math.round(sh)), (w - sw) / 2, h * 0.47, sw, sh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // handwritten volume number, bottom-right
      ctx.fillStyle = "rgba(38,36,34,0.82)";
      ctx.font = `${w * 0.05}px ${cssFont("--font-permanent-marker", "cursive")}`;
      ctx.save();
      ctx.translate(w * 0.62, h * 0.93);
      ctx.rotate(-0.05);
      ctx.fillText("sketchbook no. 7", 0, 0);
      ctx.restore();

      // handled edges: darker, a bit scuffed
      const edge = ctx.createLinearGradient(0, 0, w, 0);
      edge.addColorStop(0, "rgba(70,46,22,0.22)");
      edge.addColorStop(0.04, "rgba(70,46,22,0)");
      edge.addColorStop(0.96, "rgba(70,46,22,0)");
      edge.addColorStop(1, "rgba(70,46,22,0.25)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, w, h);
      const edgeY = ctx.createLinearGradient(0, 0, 0, h);
      edgeY.addColorStop(0, "rgba(70,46,22,0.2)");
      edgeY.addColorStop(0.03, "rgba(70,46,22,0)");
      edgeY.addColorStop(0.97, "rgba(70,46,22,0)");
      edgeY.addColorStop(1, "rgba(70,46,22,0.22)");
      ctx.fillStyle = edgeY;
      ctx.fillRect(0, 0, w, h);
    });
  }, [logo, character]);

  const pages = useMemo(
    () =>
      cachedTexture("sketchbook-pages", 64, 256, (ctx, w, h) => {
        ctx.fillStyle = "#efe6d2";
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) {
          ctx.fillStyle = `rgba(150,130,100,${0.12 + ((y * 37) % 11) / 60})`;
          ctx.fillRect(0, y, w, 1);
        }
      }),
    [],
  );

  const blank = useMemo(() => cachedTexture("sketchbook-blank-page", 512, 700, drawBlankPage), []);
  const leftGeo = useMemo(() => pageGeometry("max"), []);
  const rightGeo = useMemo(() => pageGeometry("min"), []);
  useDispose(leftGeo, rightGeo);

  // open: 0 = shut, 1 = lying open; read every frame so scrolling never re-renders React
  const front = useRef<THREE.Group>(null);
  const elastic = useRef<THREE.Group>(null);
  const leftMesh = useRef<THREE.Mesh>(null);
  const rightMesh = useRef<THREE.Mesh>(null);
  // the shade the turning leaf casts on the pages under it
  const shade = useMemo(() => ({ left: makeShade(1), right: makeShade(0) }), []);
  const shade2 = useMemo(() => ({ left: makeShade(1), right: makeShade(0) }), []);
  // the shade each further leaf casts on whatever lies under it (leaf i+2 casts shades[i])
  const shades = useMemo(() => Array.from({ length: 8 }, () => ({ left: makeShade(1), right: makeShade(0) })), []);
  const moreRefs = useRef<(THREE.Group | null)[]>([]);
  // how each leaf is right now, so the one under it can keep clear of it (leaf i is states[i])
  const [states] = useState(() => Array.from({ length: 9 }, () => ({ a: 0, b: 0, tw: 0 })));
  const stack = (i: number) => ({
    above: i > 0 ? () => states[i - 1] : undefined,
    onState: (a: number, b: number, tw: number) => setLeafState(states[i], a, b, tw),
  });
  const leaf2 = useRef<THREE.Group>(null);
  // R3F hands the geometry over after construction, so size the morph influences by hand
  useLayoutEffect(() => {
    leftMesh.current?.updateMorphTargets();
    rightMesh.current?.updateMorphTargets();
  }, [leftGeo, rightGeo]);
  useFrame(() => {
    const o = open?.current ?? 0;
    const bowOpen = THREE.MathUtils.smoothstep(o, 0.6, 1);
    if (front.current) front.current.rotation.z = Math.PI * o;
    // the second leaf passes from under the first to over it as it crosses the spine
    if (leaf2.current) leaf2.current.position.y = leafHingeY(1, turn2?.current ?? 0);
    more?.forEach((m, k) => {
      const g = moreRefs.current[k];
      if (g) g.position.y = leafHingeY(k + 2, m.turn.current);
    });
    // the elastic is slipped off over the edge first, then tucked out of sight under the back cover
    const slip = THREE.MathUtils.smoothstep(o, 0, 0.25);
    const e = elastic.current;
    if (e) {
      e.position.set(W / 2 - 0.24 + Math.sin(Math.PI * slip) * 0.42, -slip * (T + 0.012), 0);
      for (const strap of e.children.slice(1)) strap.scale.y = Math.max(0.001, 1 - slip);
      e.visible = slip < 1; // fully tucked away: nothing left to see
    }
    // the pages bow up out of the gutter as the book lies open
    const bow = bowOpen;
    for (const m of [leftMesh.current, rightMesh.current]) if (m?.morphTargetInfluences) m.morphTargetInfluences[0] = bow;
  });

  const block = <meshStandardMaterial map={pages} roughness={0.95} />;
  const kraft = <meshStandardMaterial color={KRAFT} roughness={0.9} />;
  const cloth = <meshStandardMaterial color="#5a3b2b" roughness={0.85} />;
  const paperMat = (map: THREE.Texture, shaded?: (typeof shade)["left"], inked?: InkLayer) => (
    <meshStandardMaterial
      map={map}
      emissive="#ffffff"
      emissiveMap={map}
      emissiveIntensity={0.22}
      roughness={0.92}
      {...(shaded && shadeMaterial(shaded))}
      {...(inked && inkMaterial(inked))}
    />
  );
  const turning = !!(turn && turnedPage);
  const turning2 = turning && !!(turn2 && sketchLeft && sketchRight);
  const chain = turning2 ? (more ?? []) : [];
  // the page lying on the right underneath them all, and the shade cast on it by the last leaf
  const lastShade = chain.length ? shades[chain.length - 1] : shade2;
  const rightUnder = chain.length ? chain[chain.length - 1].under : sketchRight;

  return (
    <group>
      {/* ---- back half: stays put ---- */}
      <RoundedBox args={[W, BOARD, D]} radius={0.01} smoothness={2} position-y={BOARD / 2}>
        {kraft}
      </RoundedBox>
      <mesh position={[0.03, (BOARD + MID - GAP) / 2, 0]}>
        <boxGeometry args={[W - 0.1, MID - GAP - BOARD, D - 0.08]} />
        {block}
      </mesh>
      <mesh ref={rightMesh} geometry={rightGeo} position={[-W / 2 + PAGE_W / 2, MID, 0]} rotation-x={-Math.PI / 2}>
        {paperMat(
          (turning2 ? rightUnder : turning ? nextPage : undefined) ?? rightPage ?? blank,
          turning2 ? lastShade.right : turning ? shade.right : undefined,
        )}
      </mesh>
      {/* the page that turns: front is the old right-hand page, back the new left-hand one */}
      {turning && (
        <group position={[-W / 2, MID + LEAF_LIFT, 0]}>
          <TurningLeaf
            width={PAGE_W}
            depth={D - 0.08}
            turn={turn!}
            open={open}
            front={paperMat(rightPage ?? blank)}
            back={paperMat(turnedPage!, turning2 ? shade2.left : undefined)}
            shade={shade}
            {...stack(0)}
          />
        </group>
      )}
      {/* …and under it, the next one: the tools page, over the first page of the Pencil Sketches */}
      {turning2 && (
        <group ref={leaf2} position={[-W / 2, MID + LIFTS[1][0], 0]}>
          <TurningLeaf
            width={PAGE_W}
            depth={D - 0.08}
            turn={turn2!}
            open={open}
            front={paperMat(nextPage ?? blank, shade.right)}
            back={paperMat(sketchLeft!, chain.length ? shades[0].left : undefined, ink)}
            shade={shade2}
            {...stack(1)}
          />
        </group>
      )}
      {chain.map((m, k) => (
        <group
          key={k}
          ref={(el) => {
            moreRefs.current[k] = el;
          }}
          position={[-W / 2, MID + LIFTS[k + 2][0], 0]}
        >
          <TurningLeaf
            width={PAGE_W}
            depth={D - 0.08}
            turn={m.turn}
            open={open}
            front={paperMat(k ? chain[k - 1].under : sketchRight!, k ? shades[k - 1].right : shade2.right)}
            back={paperMat(m.back, k + 1 < chain.length ? shades[k + 1].left : undefined, m.ink)}
            shade={shades[k]}
            {...stack(k + 2)}
          />
        </group>
      ))}
      <RoundedBox args={[0.13, MID - 0.006, D + 0.004]} radius={0.04} smoothness={4} position={[-W / 2 + 0.05, (MID - 0.006) / 2, 0]}>
        {cloth}
      </RoundedBox>
      {children}
      {/* ribbon bookmark trailing out of the bottom */}
      <mesh position={[0.35, 0.004, D / 2 + 0.2]} rotation={[-Math.PI / 2, 0, -0.12]}>
        <planeGeometry args={[0.06, 0.48]} />
        <meshStandardMaterial color="#9e3426" roughness={0.38} side={THREE.DoubleSide} />
      </mesh>

      {/* ---- front half: hinged along the spine, swings over to the left ---- */}
      <group position={[-W / 2, MID, 0]}>
        <group ref={front}>
          <group position-x={W / 2}>
            <mesh position={[0.03, (GAP + MID - BOARD) / 2, 0]}>
              <boxGeometry args={[W - 0.1, MID - GAP - BOARD, D - 0.08]} />
              {block}
            </mesh>
            {/* the left-hand page faces down while shut, up once the cover has gone over */}
            <mesh ref={leftMesh} geometry={leftGeo} position-x={PAGE_W / 2 - W / 2} rotation={[-Math.PI / 2, Math.PI, 0]}>
              {paperMat(leftPage ?? blank, turning ? shade.left : undefined)}
            </mesh>
            <RoundedBox args={[W, BOARD, D]} radius={0.01} smoothness={2} position-y={MID - BOARD / 2}>
              {kraft}
            </RoundedBox>
            <mesh rotation-x={-Math.PI / 2} position-y={MID + 0.0006}>
              <planeGeometry args={[W - 0.012, D - 0.012]} />
              <meshStandardMaterial map={cover} bumpMap={cover} bumpScale={1.2} roughness={0.88} />
            </mesh>
          </group>
          <RoundedBox args={[0.13, MID - 0.006, D + 0.004]} radius={0.04} smoothness={4} position={[0.05, MID - (MID - 0.006) / 2, 0]}>
            {cloth}
          </RoundedBox>
        </group>
      </group>

      {/* elastic closure (belongs to the back cover) */}
      <group ref={elastic} position-x={W / 2 - 0.24}>
        <mesh position-y={T + 0.005}>
          <boxGeometry args={[0.07, 0.008, D + 0.012]} />
          <meshPhysicalMaterial color="#26201e" roughness={0.6} sheen={0.6} sheenColor="#5a4a44" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, T / 2, s * (D / 2 + 0.006)]}>
            <boxGeometry args={[0.07, T + 0.01, 0.008]} />
            <meshPhysicalMaterial color="#26201e" roughness={0.6} sheen={0.6} sheenColor="#5a4a44" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Height of the open book's page surface at book-x, bowed up out of the gutter (matches `pageGeometry`). */
export function pageHeightAt(x: number) {
  return MID + gutterLift(THREE.MathUtils.clamp(Math.abs(x + W / 2) / PAGE_W, 0, 1));
}

/**
 * A page surface (W−0.1 × D−0.08) with a morph target that bows it up out of the gutter, the
 * way an open book's pages do: flat at the spine, highest about a third of the way across.
 */
function pageGeometry(spineAt: "min" | "max") {
  const pw = PAGE_W;
  const g = new THREE.PlaneGeometry(pw, D - 0.08, 48, 1);
  const p = g.attributes.position;
  const bowed = new Float32Array(p.array.length);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const u = THREE.MathUtils.clamp(spineAt === "min" ? (x + pw / 2) / pw : (pw / 2 - x) / pw, 0, 1); // 0 at the spine
    bowed.set([x, p.getY(i), gutterLift(u)], i * 3);
  }
  g.morphAttributes.position = [new THREE.BufferAttribute(bowed, 3)];
  g.computeVertexNormals();
  return g;
}

/**
 * Turns a colour illustration into a graphite pencil sketch (the classic "colour dodge of
 * a blurred negative" trick), returned as dark strokes on a transparent canvas.
 */
export function pencilSketch(img: HTMLImageElement, w: number, h: number) {
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const s = src.getContext("2d", { willReadFrequently: true })!;
  s.fillStyle = "#fff";
  s.fillRect(0, 0, w, h);
  s.drawImage(img, 0, 0, w, h);
  const gray = s.getImageData(0, 0, w, h);
  const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) {
    const d = gray.data;
    g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  }

  // blur the negative by downscaling and back up (works everywhere, unlike ctx.filter)
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(w / 7));
  small.height = Math.max(1, Math.round(h / 7));
  const neg = s.createImageData(w, h);
  for (let i = 0; i < g.length; i++) {
    const v = 255 - g[i];
    neg.data.set([v, v, v, 255], i * 4);
  }
  s.putImageData(neg, 0, 0);
  const sm = small.getContext("2d")!;
  sm.imageSmoothingQuality = "high";
  sm.drawImage(src, 0, 0, small.width, small.height);
  s.imageSmoothingQuality = "high";
  s.drawImage(small, 0, 0, w, h);
  const blurred = s.getImageData(0, 0, w, h).data;

  const out = s.createImageData(w, h);
  for (let i = 0; i < g.length; i++) {
    const dodge = Math.min(255, (g[i] * 255) / Math.max(1, 255 - blurred[i * 4]));
    // darker tone underneath the lines so it reads as shaded, not just outlined
    const tone = Math.min(255, dodge * 0.82 + g[i] * 0.18);
    const ink = Math.min(1, Math.pow(1 - tone / 255, 0.7) * 1.15);
    out.data.set([44, 43, 41, Math.round(ink * 255)], i * 4);
  }
  s.clearRect(0, 0, w, h);
  s.putImageData(out, 0, 0);
  return src;
}

/**
 * Patches a page material to print a second picture (the ink of the underline) over it, up to
 * `reveal` of the way along it. It is drawn by the page itself, in the page's own coordinates, so
 * it stays exactly under the words however the paper moves.
 */
function inkMaterial(ink: InkLayer) {
  return {
    onBeforeCompile: (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.uniforms.uInk = { value: ink.map };
      s.uniforms.uInkMin = { value: ink.min };
      s.uniforms.uInkSize = { value: ink.size };
      s.uniforms.uInkReveal = ink.reveal;
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform sampler2D uInk;\nuniform vec2 uInkMin;\nuniform vec2 uInkSize;\nuniform float uInkReveal;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          vec2 inkUv = (vMapUv - uInkMin) / uInkSize;
          if (inkUv.x > 0.0 && inkUv.x < 1.0 && inkUv.y > 0.0 && inkUv.y < 1.0 && uInkReveal > 0.0) {
            vec4 inkTex = texture2D(uInk, inkUv);
            float inked = inkTex.a * (1.0 - smoothstep(uInkReveal - 0.012, uInkReveal, inkUv.x));
            diffuseColor.rgb = mix(diffuseColor.rgb, inkTex.rgb, inked);
          }`,
        );
    },
    customProgramCacheKey: () => "page-ink",
  };
}
