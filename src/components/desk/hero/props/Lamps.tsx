"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { Headphones } from "./Headphones";
import { useDispose } from "./canvas";

const plastic = { color: "#f1efea", roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 } as const;
const blackSteel = { color: "#151517", metalness: 0.5, roughness: 0.45 } as const;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function useTube(points: THREE.Vector3[], radius: number) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, radius, 12), [points, radius]);
  useDispose(g);
  return g;
}

/* ------------------------- white gooseneck lamp with a cone shade ------------------------- */

const CONE_NECK = [v(0, 0.35, 0), v(0, 1.4, 0.02), v(0.02, 2.5, -0.05), v(0.08, 3.3, 0.15), v(0.12, 3.7, 0.6)];

export function ConeLamp() {
  const neck = useTube(CONE_NECK, 0.055);
  const shade = useMemo(() => {
    const pts = [[0.07, 0.05], [0.12, 0], [0.2, -0.3], [0.32, -0.75], [0.4, -1.05], [0.38, -1.06], [0.3, -0.75]].map(
      ([x, y]) => new THREE.Vector2(x, y),
    );
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  const foot = useMemo(() => {
    const pts = [[0, 0], [0.5, 0], [0.54, 0.05], [0.52, 0.22], [0.36, 0.36], [0, 0.4]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  useDispose(shade, foot);
  const end = CONE_NECK[CONE_NECK.length - 1];

  return (
    <group>
      <mesh geometry={foot}>
        <meshPhysicalMaterial {...plastic} />
      </mesh>
      <mesh geometry={neck}>
        <meshPhysicalMaterial {...plastic} />
      </mesh>
      {/* shade points down at the mat */}
      <group position={end} rotation-x={-0.85}>
        <mesh geometry={shade}>
          <meshPhysicalMaterial {...plastic} side={THREE.DoubleSide} />
        </mesh>
        <mesh position-y={-0.55}>
          <sphereGeometry args={[0.13, 20, 16]} />
          <meshStandardMaterial color="#fff6e6" emissive="#ffe2b0" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------- white LED lamp: pen-holder base, round head ------------------- */

const LED_NECK = [v(0, 0.55, -0.1), v(0, 1.6, -0.12), v(0, 2.7, -0.05), v(0, 3.3, 0.25), v(0, 3.45, 0.75)];

export function LedLamp() {
  const neck = useTube(LED_NECK, 0.05);
  const end = LED_NECK[LED_NECK.length - 1];
  return (
    <group>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.62, 0.64, 0.08, 48]} />
        <meshPhysicalMaterial {...plastic} />
      </mesh>
      <RoundedBox args={[0.7, 0.55, 0.45]} radius={0.08} smoothness={3} position={[0, 0.33, 0.05]}>
        <meshPhysicalMaterial {...plastic} />
      </RoundedBox>
      <mesh position={[0, 0.605, 0.05]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.55, 0.3]} />
        <meshStandardMaterial color="#9c9a95" roughness={0.9} />
      </mesh>
      <mesh geometry={neck}>
        <meshPhysicalMaterial {...plastic} />
      </mesh>
      <group position={end} rotation-x={0.3}>
        <mesh position-z={0.42}>
          <cylinderGeometry args={[0.55, 0.55, 0.1, 48]} />
          <meshPhysicalMaterial {...plastic} />
        </mesh>
        <mesh position={[0, -0.051, 0.42]} rotation-x={Math.PI / 2}>
          <ringGeometry args={[0.2, 0.46, 48]} />
          <meshStandardMaterial color="#ffffff" emissive="#f4f6ff" emissiveIntensity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/* --------------- black scissor boom arm clamped to the desk, headphones hung on it --------------- */

const POST_TOP = v(0, 1.3, 0);
const ELBOW = v(1.25, 5.3, 0.35);
const TIP = v(3.0, 4.35, 1.1);
const HP_SCALE = 0.58;

class Helix extends THREE.Curve<THREE.Vector3> {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  turns: number;
  constructor(from: THREE.Vector3, to: THREE.Vector3, radius: number, turns: number) {
    super();
    this.from = from;
    this.to = to;
    this.radius = radius;
    this.turns = turns;
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const axis = this.to.clone().sub(this.from);
    const side = new THREE.Vector3(0, 0, 1).cross(axis).normalize();
    const up = axis.clone().cross(side).normalize();
    const a = t * this.turns * Math.PI * 2;
    return target
      .copy(this.from)
      .addScaledVector(axis, t)
      .addScaledVector(side, Math.cos(a) * this.radius)
      .addScaledVector(up, Math.sin(a) * this.radius);
  }
}

/** A pair of thin parallel rods between two joints. */
function ArmSegment({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const { mid, quat, len } = useMemo(() => {
    const dir = to.clone().sub(from);
    return {
      mid: from.clone().add(to).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [from, to]);
  return (
    <group position={mid} quaternion={quat}>
      {[-0.07, 0.07].map((o) => (
        <mesh key={o} position-x={o}>
          <cylinderGeometry args={[0.035, 0.035, len, 10]} />
          <meshStandardMaterial {...blackSteel} />
        </mesh>
      ))}
    </group>
  );
}

export function BoomArm() {
  const spring = useMemo(() => {
    const from = POST_TOP.clone().lerp(ELBOW, 0.12);
    const to = POST_TOP.clone().lerp(ELBOW, 0.45);
    return new THREE.TubeGeometry(new Helix(from.add(v(0.12, 0, 0)), to.add(v(0.12, 0, 0)), 0.05, 26), 400, 0.012, 6);
  }, []);
  useDispose(spring);
  const hook = TIP.clone().lerp(ELBOW, 0.55);

  return (
    <group>
      {/* clamp + post */}
      <RoundedBox args={[0.45, 0.35, 0.6]} radius={0.04} position-y={0.17}>
        <meshStandardMaterial {...blackSteel} />
      </RoundedBox>
      <mesh position-y={0.65}>
        <cylinderGeometry args={[0.08, 0.09, 1.3, 16]} />
        <meshStandardMaterial {...blackSteel} />
      </mesh>
      <ArmSegment from={POST_TOP} to={ELBOW} />
      <ArmSegment from={ELBOW} to={TIP} />
      <mesh geometry={spring}>
        <meshStandardMaterial {...blackSteel} metalness={0.8} />
      </mesh>
      {[POST_TOP, ELBOW].map((p, i) => (
        <mesh key={i} position={p} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.1, 0.1, 0.26, 16]} />
          <meshStandardMaterial {...blackSteel} />
        </mesh>
      ))}
      {/* phone holder on the tip */}
      <RoundedBox args={[0.5, 0.28, 0.2]} radius={0.04} position={TIP}>
        <meshStandardMaterial {...blackSteel} />
      </RoundedBox>
      {/* headphones hanging by their band, cups facing the room */}
      <group position={[hook.x, hook.y - 0.08 - 1.8 * HP_SCALE, hook.z]} rotation-z={-0.08} scale={HP_SCALE}>
        <group rotation-x={Math.PI / 2}>
          <Headphones accent="#b5232a" />
        </group>
      </group>
    </group>
  );
}

/* ------------------------- power cables, running off the back of the desk ------------------------- */

const CABLES: { color: string; points: [number, number, number][] }[] = [
  // cone lamp
  { color: "#f0eee8", points: [[-2.35, 0.05, -3.15], [-2.15, 0.035, -3.45], [-1.7, 0.035, -3.62], [-1.5, 0.0, -3.7], [-1.45, -0.6, -3.72]] },
  // LED lamp
  { color: "#f0eee8", points: [[2.75, 0.05, -3.15], [3.05, 0.035, -3.5], [3.5, 0.035, -3.62], [3.7, 0.0, -3.7], [3.75, -0.6, -3.72]] },
  // laptop charger, looping out to the right
  { color: "#1a1a1c", points: [[1.85, 0.5, -1.6], [2.15, 0.04, -1.45], [2.35, 0.035, -2.0], [1.95, 0.035, -2.9], [1.25, 0.035, -3.55], [1.05, 0.0, -3.7], [1.0, -0.6, -3.72]] },
];

export function Cables() {
  const geometries = useMemo(
    () =>
      CABLES.map(
        (c) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c.points.map(([x, y, z]) => v(x, y, z))), 120, 0.032, 8),
      ),
    [],
  );
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={CABLES[i].color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}
