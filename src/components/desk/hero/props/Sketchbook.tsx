"use client";

import { use, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBox, useTexture } from "@react-three/drei";
import { cachedTexture, cssFont, fontsReady, grain, rng, useDispose } from "./canvas";
import { drawBlankPage } from "./BookPages";

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
  /** Things standing on the book's right-hand page (in the book's own units). */
  children?: React.ReactNode;
};

/** The turning leaf rides this far above the page it lies on, clear of z-fighting. */
const LEAF_LIFT = 0.0025;

export function Sketchbook({ open, leftPage, rightPage, turn, turnedPage, nextPage, children }: Props = {}) {
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
  const leaf = useRef<THREE.Group>(null);
  const leafFront = useRef<THREE.Mesh>(null);
  const leafBack = useRef<THREE.Mesh>(null);
  // R3F hands the geometry over after construction, so size the morph influences by hand
  useLayoutEffect(() => {
    leftMesh.current?.updateMorphTargets();
    rightMesh.current?.updateMorphTargets();
    leafFront.current?.updateMorphTargets();
    leafBack.current?.updateMorphTargets();
  }, [leftGeo, rightGeo]);
  useFrame(() => {
    const o = open?.current ?? 0;
    const bowOpen = THREE.MathUtils.smoothstep(o, 0.6, 1);
    // the leaf: hinged on the spine like the cover, flat on the right until it is turned
    const l = leaf.current;
    if (l) {
      const t = turn?.current ?? 0;
      l.rotation.z = Math.PI * t;
      l.visible = o > 0; // while the book is shut it is part of the block
      // its pages bow with the book, the bow flipping over as the leaf does
      const flip = Math.cos(Math.PI * t) * bowOpen;
      if (leafFront.current?.morphTargetInfluences) leafFront.current.morphTargetInfluences[0] = flip;
      if (leafBack.current?.morphTargetInfluences) leafBack.current.morphTargetInfluences[0] = -flip;
    }
    if (front.current) front.current.rotation.z = Math.PI * o;
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
  const paperMat = (map: THREE.Texture) => (
    <meshStandardMaterial map={map} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.22} roughness={0.92} />
  );

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
        {paperMat((turnedPage ? nextPage : undefined) ?? rightPage ?? blank)}
      </mesh>
      {/* the page that turns: front is the old right-hand page, back the new left-hand one */}
      {turnedPage && (
        <group ref={leaf} position={[-W / 2, MID + LEAF_LIFT, 0]} visible={false}>
          <mesh ref={leafFront} geometry={rightGeo} position-x={PAGE_W / 2} rotation-x={-Math.PI / 2}>
            {paperMat(rightPage ?? blank)}
          </mesh>
          <mesh ref={leafBack} geometry={leftGeo} position-x={PAGE_W / 2} rotation={[-Math.PI / 2, Math.PI, 0]}>
            {paperMat(turnedPage)}
          </mesh>
        </group>
      )}
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
              {paperMat(leftPage ?? blank)}
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
  const u = THREE.MathUtils.clamp(Math.abs(x + W / 2) / PAGE_W, 0, 1);
  return MID + 0.07 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 1.15))), 0.7) * (1 - 0.55 * u);
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
    // (clamped: a sine a hair below zero at the edges would make the power NaN)
    const lift = 0.07 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 1.15))), 0.7) * (1 - 0.55 * u);
    bowed.set([x, p.getY(i), lift], i * 3);
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
