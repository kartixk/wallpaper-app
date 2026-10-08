"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { cachedTexture } from "./canvas";

const deg = THREE.MathUtils.degToRad;

// 15.6" gaming laptop on a cooling stand, lid opened a little past upright
const BASE = { w: 3.6, d: 2.55, t: 0.22 };
const LID = { h: 2.35, t: 0.07, lean: 18 };
const SCREEN = { w: 3.42, h: 1.92 };
const STAND = { w: 3.9, d: 2.75, tilt: 8, lift: 0.35 };

const shell = { color: "#3a3c40", metalness: 0.6, roughness: 0.42 } as const;

export function Laptop() {
  // keyboard deck: full-size keys with a numpad, touchpad off-centre like the real one
  const deck = useMemo(
    () =>
      cachedTexture("laptop-deck", 1440, 1020, (ctx, w, h) => {
        ctx.fillStyle = "#34363a";
        ctx.fillRect(0, 0, w, h);
        const u = w / 21.5;
        const rows = [15, 14.5, 14.5, 13.5, 13, 11];
        ctx.fillStyle = "#18191b";
        rows.forEach((n, r) => {
          const y = h * 0.06 + r * u * 0.98;
          const kh = r === 0 ? u * 0.55 : u * 0.86;
          for (let i = 0; i < Math.floor(n); i++) {
            const kw = r === 5 && i === 3 ? u * 5.2 : u * 0.86;
            const x = u * 0.5 + (r === 5 && i > 3 ? i + 4.4 : i) * u;
            if (x + kw > u * 16.6) break;
            ctx.beginPath();
            ctx.roundRect(x, y, kw, kh, 6);
            ctx.fill();
          }
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.roundRect(u * 17 + i * u, y, u * 0.86, kh, 6);
            ctx.fill();
          }
        });
        ctx.strokeStyle = "#4a4d52";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(w * 0.3, h * 0.66, w * 0.3, h * 0.3, 12);
        ctx.stroke();
      }),
    [],
  );

  return (
    <group>
      <CoolingStand />
      <group position-y={STAND.lift} rotation-x={deg(STAND.tilt)}>
        <group position-y={0.06}>
          <RoundedBox args={[BASE.w, BASE.t, BASE.d]} radius={0.05} smoothness={3} position-y={BASE.t / 2}>
            <meshPhysicalMaterial {...shell} />
          </RoundedBox>
          <mesh rotation-x={-Math.PI / 2} position-y={BASE.t + 0.001}>
            <planeGeometry args={[BASE.w - 0.12, BASE.d - 0.12]} />
            <meshStandardMaterial map={deck} bumpMap={deck} bumpScale={-3} roughness={0.6} metalness={0.3} />
          </mesh>
          {/* hinge barrel */}
          <mesh position={[0, BASE.t, -BASE.d / 2 + 0.06]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.06, 0.06, BASE.w * 0.7, 20]} />
            <meshPhysicalMaterial {...shell} color="#2a2c30" />
          </mesh>
          {/* the lid, hinged along the back edge */}
          <group position={[0, BASE.t, -BASE.d / 2 + 0.06]} rotation-x={-deg(LID.lean)}>
            <group position-y={LID.h / 2}>
              <RoundedBox args={[BASE.w, LID.h, LID.t]} radius={0.03} smoothness={3} position-z={-LID.t / 2}>
                <meshPhysicalMaterial {...shell} />
              </RoundedBox>
              <mesh position-z={0.001}>
                <planeGeometry args={[BASE.w - 0.06, LID.h - 0.06]} />
                <meshPhysicalMaterial color="#09090a" roughness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
              </mesh>
              {/* webcam */}
              <mesh position={[0, LID.h / 2 - 0.07, 0.003]}>
                <circleGeometry args={[0.025, 16]} />
                <meshPhysicalMaterial color="#1c2430" roughness={0.05} clearcoat={1} />
              </mesh>
              <VideoScreen />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Black plastic slab with a front lip, raised at the back. */
function CoolingStand() {
  const backY = STAND.lift + Math.sin(deg(STAND.tilt)) * (STAND.d / 2);
  return (
    <group>
      <group position-y={STAND.lift} rotation-x={deg(STAND.tilt)}>
        <RoundedBox args={[STAND.w, 0.08, STAND.d]} radius={0.03} smoothness={2}>
          <meshStandardMaterial color="#141416" roughness={0.55} />
        </RoundedBox>
        <mesh position={[0, 0.08, STAND.d / 2 - 0.05]}>
          <boxGeometry args={[STAND.w * 0.8, 0.1, 0.06]} />
          <meshStandardMaterial color="#141416" roughness={0.55} />
        </mesh>
      </group>
      {/* feet */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (STAND.w / 2 - 0.25), backY / 2, -STAND.d / 2 + 0.2]}>
            <boxGeometry args={[0.18, backY, 0.18]} />
            <meshStandardMaterial color="#141416" roughness={0.55} />
          </mesh>
          <mesh position={[s * (STAND.w / 2 - 0.25), 0.1, STAND.d / 2 - 0.25]}>
            <boxGeometry args={[0.18, 0.2, 0.18]} />
            <meshStandardMaterial color="#141416" roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * A small 16:9 cut of the showreel (public/desk/laptop-reel.mp4, ~1 MB) on a plain
 * VideoTexture. drei's useVideoTexture would pull in hls.js (1.7 MB) for an mp4.
 */
function VideoScreen() {
  const video = useMemo(() => {
    const el = document.createElement("video");
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    return el;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);
  // attach the source here (not when creating the element) so a remount gets it back
  useEffect(() => {
    video.setAttribute("src", "/desk/laptop-reel.mp4");
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [video]);
  // no texture.dispose() here: it cancels the texture's frame callback for good, which breaks
  // a remount; the texture goes with the canvas's GL context anyway

  // stop decoding while the hero is scrolled away (the canvas stops rendering then too)
  const rendering = useThree((s) => s.frameloop !== "never");
  useEffect(() => {
    if (rendering) video.play().catch(() => {});
    else video.pause();
  }, [video, rendering]);
  return <Screen map={texture} />;
}

/** The lit panel, sitting a little below centre of the lid like a real laptop's. */
function Screen({ map }: { map?: THREE.Texture }) {
  return (
    <mesh position={[0, 0.06, 0.003]}>
      <planeGeometry args={[SCREEN.w, SCREEN.h]} />
      <meshStandardMaterial
        color="#000000"
        emissive={map ? "#ffffff" : "#1a2230"}
        emissiveMap={map ?? null}
        emissiveIntensity={map ? 0.95 : 0.6}
        roughness={0.06}
      />
    </mesh>
  );
}
