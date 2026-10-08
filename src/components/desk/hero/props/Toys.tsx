"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { cachedTexture, useDispose } from "./canvas";
import { Padmini, PADMINI_ROOF_Y } from "./Cars";

const RED = "#c8161d";
const BLACK = "#121216";
const vinyl = {
  roughness: 0.34,
  clearcoat: 0.7,
  clearcoatRoughness: 0.25,
} as const;

/* ------------------------------------ Spider-Man ------------------------------------ */

/** Black webbing over whatever is drawn: strands down the length, sagging rungs across. */
function webbing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strands: number,
  rungs: number,
  line: number,
) {
  ctx.strokeStyle = "#140808";
  ctx.lineWidth = line;
  for (let i = 0; i < strands; i++) {
    const x = ((i + 0.5) / strands) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 1; j < rungs; j++) {
    ctx.beginPath();
    for (let i = 0; i <= strands * 2; i++) {
      const x = (i / (strands * 2)) * w;
      const y =
        (j / rungs) * h +
        Math.abs(Math.sin((i / 2) * Math.PI)) * (h / rungs) * 0.22;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

/**
 * The suit, drawn once. Sphere UVs: u = 0.25 faces +z. The body textures are drawn
 * symmetric (chest at u = 0.25 and 0.75, black at 0 and 0.5) so they read from either side.
 */
function useSuit() {
  const textures = useMemo(() => {
    const mask = cachedTexture("spidey-mask", 1024, 512, (ctx, w, h) => {
      ctx.fillStyle = RED;
      ctx.fillRect(0, 0, w, h);
      // shading toward the jaw keeps the head from reading as a ball
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0.15)");
      g.addColorStop(0.45, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(40,0,0,0.3)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // radiating from the face: strands converge at the poles, so meridians are perfect
      webbing(ctx, w, h, 30, 11, 3.5);
      // the big lenses, angled down toward the nose
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(w * 0.25 + s * w * 0.064, h * 0.47);
        ctx.scale(s, 1);
        ctx.rotate(-0.6);
        ctx.beginPath();
        // teardrop: round outer end, pointed toward the nose
        ctx.moveTo(-w * 0.012, h * 0.13);
        ctx.bezierCurveTo(
          w * 0.07,
          h * 0.12,
          w * 0.07,
          -h * 0.13,
          -w * 0.005,
          -h * 0.13,
        );
        ctx.bezierCurveTo(
          -w * 0.04,
          -h * 0.12,
          -w * 0.05,
          h * 0.06,
          -w * 0.012,
          h * 0.13,
        );
        ctx.fillStyle = "#f5f6f4";
        ctx.fill();
        ctx.lineWidth = 20;
        ctx.strokeStyle = BLACK;
        ctx.stroke();
        ctx.restore();
      }
    });

    const torso = cachedTexture("spidey-torso", 1024, 512, (ctx, w, h) => {
      ctx.fillStyle = RED;
      ctx.fillRect(0, 0, w, h);
      webbing(ctx, w, h, 32, 10, 3);
      // black side panels (Far From Home suit)
      ctx.fillStyle = BLACK;
      for (const c of [0, 0.5, 1]) {
        ctx.beginPath();
        ctx.ellipse(c * w, h * 0.58, w * 0.09, h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // spider emblem on the chest (and the back)
      for (const c of [0.25, 0.75]) {
        ctx.save();
        ctx.translate(w * c, h * 0.32);
        ctx.fillStyle = BLACK;
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.014, h * 0.07, 0, 0, Math.PI * 2);
        ctx.ellipse(0, -h * 0.085, w * 0.009, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const s of [-1, 1]) {
          for (const [ax, ay, bx, by] of [
            [0.01, -0.02, 0.05, -0.12],
            [0.01, 0, 0.06, -0.04],
            [0.01, 0.02, 0.06, 0.06],
            [0.01, 0.04, 0.045, 0.14],
          ]) {
            ctx.beginPath();
            ctx.moveTo(s * ax * w, ay * h);
            ctx.quadraticCurveTo(
              s * bx * w,
              (ay + by) * 0.5 * h - h * 0.04,
              s * bx * w,
              by * h,
            );
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    });

    const limb = cachedTexture("spidey-limb", 512, 512, (ctx, w, h) => {
      ctx.fillStyle = RED;
      ctx.fillRect(0, 0, w, h);
      webbing(ctx, w, h, 16, 8, 3);
      // a black stripe down the outside of each limb
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, w * 0.06, h);
      ctx.fillRect(w * 0.44, 0, w * 0.12, h);
      ctx.fillRect(w * 0.94, 0, w * 0.06, h);
    });
    return { mask, torso, limb };
  }, []);
  return textures;
}

type Suit = ReturnType<typeof useSuit>;

function Limb({
  from,
  to,
  r,
  suit,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r: number;
  suit: Suit;
}) {
  const { mid, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    return {
      mid: a.add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        d.clone().normalize(),
      ),
      len: d.length(),
    };
  }, [from, to]);
  return (
    <mesh position={mid} quaternion={quat}>
      <capsuleGeometry args={[r, len, 8, 20]} />
      <meshPhysicalMaterial map={suit.limb} {...vinyl} />
    </mesh>
  );
}

function Hand({ at, suit }: { at: [number, number, number]; suit: Suit }) {
  return (
    <mesh position={at} scale={[0.9, 1.1, 0.75]}>
      <sphereGeometry args={[0.068, 20, 14]} />
      <meshPhysicalMaterial map={suit.limb} {...vinyl} />
    </mesh>
  );
}

function Boot({ at, suit }: { at: [number, number, number]; suit: Suit }) {
  return (
    <group position={at}>
      <mesh scale={[0.85, 0.6, 1.45]} position={[0, 0.04, 0.04]}>
        <sphereGeometry args={[0.1, 24, 14]} />
        <meshPhysicalMaterial map={suit.limb} {...vinyl} />
      </mesh>
      <mesh position={[0, 0.006, 0.04]} scale={[0.85, 1, 1.45]}>
        <cylinderGeometry args={[0.098, 0.098, 0.012, 24]} />
        <meshStandardMaterial color={BLACK} roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * A big-headed vinyl Spider-Man. Standing, the feet are at y = 0;
 * sitting, the seat is at y = 0 and the legs dangle forward over the edge.
 */
export function Spidey({
  pose = "stand",
  bobble = false,
}: {
  pose?: "stand" | "sit";
  bobble?: boolean;
}) {
  const suit = useSuit();
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!bobble || !head.current) return;
    const t = clock.elapsedTime;
    head.current.rotation.z = Math.sin(t * 2.1) * 0.05;
    head.current.rotation.x = Math.sin(t * 1.7 + 1) * 0.035;
  });

  const sit = pose === "sit";
  const hip = sit ? 0.09 : 0.74;
  const shoulder = hip + 0.44;

  return (
    <group>
      {sit ? (
        [-1, 1].map((s) => (
          <group key={s}>
            <Limb
              from={[s * 0.1, hip, 0]}
              to={[s * 0.13, hip + 0.02, 0.4]}
              r={0.078}
              suit={suit}
            />
            <Limb
              from={[s * 0.13, hip + 0.02, 0.4]}
              to={[s * 0.14, hip - 0.36, 0.48]}
              r={0.07}
              suit={suit}
            />
            <Boot at={[s * 0.14, hip - 0.44, 0.47]} suit={suit} />
          </group>
        ))
      ) : (
        <>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Limb
                from={[s * 0.1, 0.12, 0]}
                to={[s * 0.1, hip, 0]}
                r={0.078}
                suit={suit}
              />
              <Boot at={[s * 0.11, 0, 0]} suit={suit} />
            </group>
          ))}
        </>
      )}
      {/* torso: hips → chest, broader at the shoulders */}
      <mesh position-y={hip + 0.22} scale={[1.15, 1, 0.8]}>
        <capsuleGeometry args={[0.165, 0.24, 8, 24]} />
        <meshPhysicalMaterial map={suit.torso} {...vinyl} />
      </mesh>
      {/* arms: one down by the side, one held out a little */}
      <Limb
        from={[-0.22, shoulder, 0]}
        to={[-0.3, hip + 0.06, sit ? 0.14 : 0.05]}
        r={0.058}
        suit={suit}
      />
      <Hand at={[-0.31, hip + 0.0, sit ? 0.16 : 0.06]} suit={suit} />
      <Limb
        from={[0.22, shoulder, 0]}
        to={[0.38, hip + 0.16, 0.12]}
        r={0.058}
        suit={suit}
      />
      <Hand at={[0.41, hip + 0.1, 0.15]} suit={suit} />
      <group ref={head} position-y={shoulder + 0.02}>
        {/* neck spring for the bobble */}
        <mesh position-y={0.04}>
          <cylinderGeometry args={[0.05, 0.06, 0.08, 16]} />
          <meshPhysicalMaterial color={RED} {...vinyl} />
        </mesh>
        <mesh position-y={0.36} scale={[1, 1.1, 0.96]}>
          <sphereGeometry args={[0.36, 64, 40]} />
          <meshPhysicalMaterial map={suit.mask} {...vinyl} clearcoat={0.9} />
        </mesh>
      </group>
    </group>
  );
}

/** The bobblehead on its black display base. */
export function Bobblehead() {
  return (
    <group>
      <mesh position-y={0.035}>
        <cylinderGeometry args={[0.48, 0.52, 0.07, 48]} />
        <meshPhysicalMaterial color="#121214" roughness={0.25} clearcoat={1} />
      </mesh>
      <group position-y={0.07}>
        <Spidey bobble />
      </group>
    </group>
  );
}

/** The red Padmini with a little Spider-Man riding on the roof. */
export function PadminiWithRider() {
  return (
    <Padmini>
      <group
        position={[-0.1, PADMINI_ROOF_Y, -0.06]}
        rotation-y={0.3}
        scale={0.5}
      >
        <Spidey pose="sit" />
      </group>
    </Padmini>
  );
}

/* --------------------------------- tape dispenser --------------------------------- */

/** The classic snail-shell desk dispenser: two side cheeks, the roll between them, a serrated blade up front. */
export function TapeDispenser() {
  const cheek = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.56, 0);
    s.lineTo(0.48, 0);
    s.quadraticCurveTo(0.56, 0, 0.56, 0.08);
    s.lineTo(0.55, 0.2);
    s.quadraticCurveTo(0.4, 0.26, 0.22, 0.4);
    s.bezierCurveTo(0.18, 0.95, -0.62, 0.98, -0.58, 0.42);
    s.quadraticCurveTo(-0.6, 0.1, -0.56, 0);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 32,
    });
    g.translate(0, 0, -0.03);
    return g;
  }, []);
  const roll = useMemo(() => {
    const pts = [
      [0.17, -0.17],
      [0.3, -0.17],
      [0.31, -0.16],
      [0.31, 0.16],
      [0.3, 0.17],
      [0.17, 0.17],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 48);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  useDispose(cheek, roll);

  const shell = {
    color: "#d9442a",
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  } as const;
  const rollCentre: [number, number, number] = [0, 0.48, -0.15];

  return (
    // the profile runs along x, so the snail-shell silhouette faces the room
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={cheek} position-z={s * 0.22}>
          <meshPhysicalMaterial {...shell} />
        </mesh>
      ))}
      {/* weighted base between the cheeks */}
      <RoundedBox
        args={[1.05, 0.16, 0.42]}
        radius={0.04}
        position={[0, 0.08, 0]}
      >
        <meshPhysicalMaterial {...shell} />
      </RoundedBox>
      <RoundedBox
        args={[0.3, 0.22, 0.42]}
        radius={0.04}
        position={[0.4, 0.15, 0]}
      >
        <meshPhysicalMaterial {...shell} />
      </RoundedBox>
      {/* the roll: glossy tape around a card core */}
      <group
        position={[rollCentre[2], rollCentre[1], 0]}
        rotation-y={Math.PI / 2}
      >
        <mesh geometry={roll}>
          <meshPhysicalMaterial
            color="#efe3c8"
            roughness={0.12}
            clearcoat={1}
          />
        </mesh>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.17, 0.17, 0.33, 32, 1, true]} />
          <meshStandardMaterial
            color="#b8956a"
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* tape running down to the blade */}
      <mesh position={[0.42, 0.33, 0]} rotation-z={-0.62}>
        <boxGeometry args={[0.36, 0.004, 0.32]} />
        <meshPhysicalMaterial
          color="#f3ead6"
          roughness={0.1}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh position={[0.57, 0.22, 0]} rotation-z={-0.2}>
        <boxGeometry args={[0.02, 0.07, 0.4]} />
        <meshStandardMaterial color="#b5b5b5" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* -------------------------------------- remote -------------------------------------- */

export function Remote() {
  return (
    <group>
      <RoundedBox
        args={[0.95, 0.12, 0.42]}
        radius={0.045}
        smoothness={4}
        position-y={0.06}
      >
        <meshPhysicalMaterial color="#1c2534" roughness={0.3} clearcoat={0.6} />
      </RoundedBox>
      {[-0.3, -0.1, 0.1].map((x) =>
        [-0.08, 0.08].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.122, z]} scale={[1, 0.35, 1]}>
            <sphereGeometry
              args={[0.045, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshPhysicalMaterial
              color="#5d8fd6"
              roughness={0.25}
              clearcoat={1}
            />
          </mesh>
        )),
      )}
      <mesh position={[0.32, 0.122, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.06, 24]} />
        <meshStandardMaterial color="#d84a3a" emissive="#5a1008" />
      </mesh>
    </group>
  );
}
