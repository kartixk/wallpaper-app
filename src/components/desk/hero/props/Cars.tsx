"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useDispose } from "./canvas";

/**
 * Die-cast cars built from their side silhouettes: the profile is extruded across the
 * car's width with a fat bevel, so every edge is rounded like a real toy casting.
 * Profiles run rear (x = −0.5) → nose (x = 0.5), in units of the car's length; the car points +x.
 */

type Pt = [number, number];

type CarSpec = {
  length: number;
  width: number;
  /** Painted body, from the rear bumper over the top to the nose (the underside and arches are added). */
  body: Pt[];
  /** Glasshouse, rear → front along its top; closed along its base. */
  cabin?: Pt[];
  /** Painted roof panel sitting on the glasshouse. */
  roof?: Pt[];
  cabinWidth?: number;
  wheelX: [rear: number, front: number];
  wheelR: number;
  paint: string;
  roofPaint?: string;
  hub: "chrome" | "dark" | "spoke";
  whitewall?: boolean;
  headlights: { y: number; kind: "round" | "slim" };
  bumpers: "chrome" | "black" | "none";
};

const CHROME = { color: "#e3e3e3", metalness: 1, roughness: 0.12 } as const;
const GLASS = { color: "#11161b", roughness: 0.04, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 } as const;

/** A smooth closed silhouette through `top`, with a flat floor at `floorY` and wheel arches cut into it. */
function silhouette(top: Pt[], L: number, floorY: number, arches: { x: number; r: number; y: number }[]) {
  const s = new THREE.Shape();
  const pts = top.map(([x, y]) => new THREE.Vector2(x * L, y * L));
  s.moveTo(pts[0].x, floorY);
  s.lineTo(pts[0].x, pts[0].y);
  s.splineThru(pts.slice(1));
  s.lineTo(pts[pts.length - 1].x, floorY);
  // underside, front → rear, hopping over each wheel
  for (const a of [...arches].sort((p, q) => q.x - p.x)) {
    s.lineTo(a.x + a.r, floorY);
    s.lineTo(a.x + a.r, a.y);
    s.absarc(a.x, a.y, a.r, 0, Math.PI, false);
    s.lineTo(a.x - a.r, floorY);
  }
  s.closePath();
  return s;
}

function closedProfile(top: Pt[], L: number) {
  const s = new THREE.Shape();
  const pts = top.map(([x, y]) => new THREE.Vector2(x * L, y * L));
  s.moveTo(pts[0].x, pts[0].y);
  s.splineThru(pts.slice(1));
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    // round the edges inward so the silhouette keeps its size
    bevelOffset: -bevel * 0.9,
    bevelSegments: 5,
    curveSegments: 24,
  });
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  g.computeVertexNormals();
  return g;
}

/** Rounded tyre: a lathe around y, turned to roll along x. */
function useTyre(r: number, w: number) {
  const g = useMemo(() => {
    const pts = [
      [r * 0.6, -w / 2], [r * 0.9, -w / 2], [r * 0.98, -w * 0.38], [r, -w * 0.15],
      [r, w * 0.15], [r * 0.98, w * 0.38], [r * 0.9, w / 2], [r * 0.6, w / 2],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const lathe = new THREE.LatheGeometry(pts, 40);
    lathe.rotateX(Math.PI / 2);
    return lathe;
  }, [r, w]);
  useDispose(g);
  return g;
}

function Wheel({ r, side, hub, whitewall }: { r: number; side: 1 | -1; hub: CarSpec["hub"]; whitewall?: boolean }) {
  const w = r * 0.75;
  const tyre = useTyre(r, w);
  const face = side * (w / 2 + 0.002);
  return (
    <group>
      <mesh geometry={tyre}>
        <meshStandardMaterial color="#161616" roughness={0.85} />
      </mesh>
      {whitewall && (
        <mesh position-z={face} rotation-y={side === 1 ? 0 : Math.PI}>
          <ringGeometry args={[r * 0.62, r * 0.84, 40]} />
          <meshStandardMaterial color="#f2f0ea" roughness={0.6} />
        </mesh>
      )}
      {/* hubcap: a shallow dome */}
      <mesh position-z={face - side * 0.004} rotation-x={side * Math.PI / 2} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[r * 0.58, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {hub === "dark" ? (
          <meshStandardMaterial color="#3a3b3e" metalness={0.8} roughness={0.35} />
        ) : (
          <meshStandardMaterial {...CHROME} />
        )}
      </mesh>
      {hub === "spoke" &&
        Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position-z={face} rotation-z={(i / 8) * Math.PI}>
            <boxGeometry args={[r * 1.15, r * 0.06, 0.006]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
        ))}
    </group>
  );
}

function ProfileCar({ spec }: { spec: CarSpec }) {
  const { length: L, width: W, wheelR: r } = spec;
  const floorY = r * 0.55;

  const { body, cabin, roof } = useMemo(() => {
    const arches = spec.wheelX.map((x) => ({ x: x * L, r: r * 1.1, y: r }));
    return {
      body: extrude(silhouette(spec.body, L, floorY, arches), W, W * 0.17),
      cabin: spec.cabin ? extrude(closedProfile(spec.cabin, L), W * (spec.cabinWidth ?? 0.8), W * 0.12) : null,
      roof: spec.roof ? extrude(closedProfile(spec.roof, L), W * (spec.cabinWidth ?? 0.8) * 0.94, W * 0.08) : null,
    };
  }, [spec, L, W, r, floorY]);
  useDispose(body, cabin ?? undefined);
  useDispose(roof ?? body);

  const paint = { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.25 } as const;
  const nose = spec.body[spec.body.length - 1][0] * L;
  const tail = spec.body[0][0] * L;
  const lightY = spec.headlights.y * L;
  const bumper = spec.bumpers === "chrome" ? CHROME : { color: "#1a1a1a", roughness: 0.6 };

  return (
    <group>
      <mesh geometry={body}>
        <meshPhysicalMaterial {...paint} color={spec.paint} />
      </mesh>
      {cabin && (
        <mesh geometry={cabin}>
          <meshPhysicalMaterial {...GLASS} />
        </mesh>
      )}
      {roof && (
        <mesh geometry={roof}>
          <meshPhysicalMaterial {...paint} color={spec.roofPaint ?? spec.paint} />
        </mesh>
      )}

      {spec.wheelX.map((x) =>
        ([-1, 1] as const).map((side) => (
          <group key={`${x}${side}`} position={[x * L, r, side * (W / 2 - r * 0.3)]}>
            <Wheel r={r} side={side} hub={spec.hub} whitewall={spec.whitewall} />
          </group>
        )),
      )}

      {/* headlights */}
      {[-1, 1].map((side) =>
        spec.headlights.kind === "round" ? (
          <group key={side} position={[nose - 0.004, lightY, side * W * 0.3]} rotation-z={-Math.PI / 2}>
            <mesh>
              <cylinderGeometry args={[W * 0.1, W * 0.1, 0.03, 24]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
            <mesh position-y={0.016} scale={[1, 0.4, 1]}>
              <sphereGeometry args={[W * 0.082, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshPhysicalMaterial color="#fffbe8" emissive="#fff3c4" emissiveIntensity={0.25} roughness={0.05} clearcoat={1} />
            </mesh>
          </group>
        ) : (
          <mesh key={side} position={[nose - 0.01, lightY, side * W * 0.32]} rotation-y={side * 0.35}>
            <boxGeometry args={[0.02, W * 0.07, W * 0.22]} />
            <meshPhysicalMaterial color="#f6f8ff" emissive="#e8eeff" emissiveIntensity={0.3} roughness={0.05} />
          </mesh>
        ),
      )}
      {/* tail lights */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[tail + 0.004, lightY, side * W * 0.33]}>
          <boxGeometry args={[0.02, W * 0.08, W * 0.14]} />
          <meshPhysicalMaterial color="#b0121a" emissive="#5a0508" roughness={0.1} clearcoat={1} />
        </mesh>
      ))}
      {/* grille */}
      <mesh position={[nose + 0.002, lightY - W * 0.04, 0]}>
        <boxGeometry args={[0.012, W * 0.12, W * 0.32]} />
        <meshStandardMaterial {...(spec.bumpers === "chrome" ? CHROME : { color: "#202020", roughness: 0.5 })} />
      </mesh>
      {spec.bumpers !== "none" &&
        [nose, tail].map((x, i) => (
          <RoundedBox
            key={i}
            args={[0.05, floorY * 0.7, W * 0.98]}
            radius={0.018}
            smoothness={3}
            position={[x + (i ? -0.012 : 0.012), floorY + floorY * 0.25, 0]}
          >
            <meshStandardMaterial {...bumper} />
          </RoundedBox>
        ))}
    </group>
  );
}

/* ------------------------------------- the fleet ------------------------------------- */

const PADMINI: CarSpec = {
  length: 1.9,
  width: 0.78,
  body: [[-0.5, 0.08], [-0.5, 0.15], [-0.47, 0.2], [-0.36, 0.222], [-0.15, 0.232], [0.2, 0.23], [0.38, 0.218], [0.48, 0.19], [0.505, 0.14], [0.5, 0.08]],
  cabin: [[-0.34, 0.215], [-0.2, 0.32], [-0.13, 0.338], [0.03, 0.338], [0.11, 0.315], [0.25, 0.215]],
  roof: [[-0.16, 0.33], [-0.12, 0.352], [0.03, 0.352], [0.07, 0.33]],
  wheelX: [-0.31, 0.31],
  wheelR: 0.16,
  paint: "#c52a1f",
  roofPaint: "#f3f1ea",
  hub: "chrome",
  whitewall: true,
  headlights: { y: 0.165, kind: "round" },
  bumpers: "chrome",
};
/** Height of the Padmini's roof, for the Spider-Man riding on it. */
export const PADMINI_ROOF_Y = 0.352 * PADMINI.length;

const GTR: CarSpec = {
  length: 0.85,
  width: 0.38,
  body: [[-0.5, 0.08], [-0.5, 0.17], [-0.46, 0.215], [-0.3, 0.225], [0.05, 0.215], [0.3, 0.19], [0.46, 0.15], [0.5, 0.1]],
  cabin: [[-0.42, 0.21], [-0.2, 0.29], [-0.05, 0.31], [0.06, 0.305], [0.22, 0.21]],
  roof: [[-0.18, 0.298], [-0.05, 0.318], [0.04, 0.314], [0.08, 0.3]],
  wheelX: [-0.32, 0.32],
  wheelR: 0.068,
  paint: "#f2f2ee",
  hub: "dark",
  headlights: { y: 0.15, kind: "slim" },
  bumpers: "black",
};

const JEEP: CarSpec = {
  length: 0.8,
  width: 0.42,
  body: [[-0.5, 0.1], [-0.5, 0.3], [-0.47, 0.325], [0.28, 0.325], [0.47, 0.305], [0.5, 0.26], [0.5, 0.1]],
  cabin: [[-0.47, 0.31], [-0.465, 0.55], [-0.44, 0.565], [0.04, 0.565], [0.07, 0.55], [0.17, 0.31]],
  roof: [[-0.475, 0.545], [-0.46, 0.585], [0.05, 0.585], [0.075, 0.545]],
  cabinWidth: 0.9,
  wheelX: [-0.3, 0.3],
  wheelR: 0.095,
  paint: "#ecebe6",
  roofPaint: "#17181a",
  hub: "dark",
  headlights: { y: 0.25, kind: "round" },
  bumpers: "black",
};

const ROADSTER: CarSpec = {
  length: 0.8,
  width: 0.32,
  body: [[-0.5, 0.1], [-0.5, 0.19], [-0.43, 0.245], [-0.2, 0.25], [-0.12, 0.215], [0.04, 0.215], [0.1, 0.255], [0.42, 0.245], [0.49, 0.2], [0.5, 0.12]],
  wheelX: [-0.32, 0.32],
  wheelR: 0.082,
  paint: "#7e1a20",
  hub: "spoke",
  headlights: { y: 0.24, kind: "round" },
  bumpers: "chrome",
};

export function Padmini({ children }: { children?: React.ReactNode }) {
  return (
    <group>
      <ProfileCar spec={PADMINI} />
      {/* chrome strip along the flanks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.2 * PADMINI.length, s * (PADMINI.width / 2 + 0.004)]}>
          <boxGeometry args={[PADMINI.length * 0.86, 0.018, 0.008]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
      ))}
      {children}
    </group>
  );
}

export function GTRCar() {
  const { length: L, width: W } = GTR;
  return (
    <group>
      <ProfileCar spec={GTR} />
      {/* rear wing on two struts */}
      <RoundedBox args={[0.1, 0.014, W * 0.95]} radius={0.006} position={[-0.45 * L, 0.29 * L, 0]}>
        <meshPhysicalMaterial color="#1a1a1c" roughness={0.3} clearcoat={1} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.45 * L, 0.255 * L, s * W * 0.3]}>
          <boxGeometry args={[0.03, 0.06, 0.012]} />
          <meshStandardMaterial color="#1a1a1c" />
        </mesh>
      ))}
      {/* racing stripe */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.13 * L, s * (W / 2 + 0.002)]}>
          <boxGeometry args={[L * 0.7, 0.025, 0.004]} />
          <meshStandardMaterial color="#1f5fbf" roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function JeepCar() {
  const { length: L, wheelR: r } = JEEP;
  const tyre = useTyre(r, r * 0.75);
  return (
    <group>
      <ProfileCar spec={JEEP} />
      {/* spare wheel on the tailgate */}
      <group position={[-0.5 * L - r * 0.4, 0.3 * L, 0]} rotation-y={Math.PI / 2}>
        <mesh geometry={tyre}>
          <meshStandardMaterial color="#161616" roughness={0.85} />
        </mesh>
      </group>
      {/* roof rails */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.2 * L, 0.6 * L, s * JEEP.width * 0.38]}>
          <boxGeometry args={[L * 0.45, 0.015, 0.015]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export function RoadsterCar() {
  const { length: L, width: W } = ROADSTER;
  return (
    <group>
      <ProfileCar spec={ROADSTER} />
      {/* windscreen frame */}
      <mesh position={[0.06 * L, 0.3 * L, 0]} rotation-z={0.25}>
        <boxGeometry args={[0.008, 0.07, W * 0.8]} />
        <meshPhysicalMaterial color="#cfe3ee" roughness={0.05} transparent opacity={0.4} />
      </mesh>
      {/* seats in the open cockpit */}
      <RoundedBox args={[0.1, 0.06, W * 0.7]} radius={0.02} position={[-0.06 * L, 0.22 * L, 0]}>
        <meshStandardMaterial color="#2a1a14" roughness={0.6} />
      </RoundedBox>
    </group>
  );
}
