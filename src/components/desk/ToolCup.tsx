"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer } from "@react-three/drei";
import { TOOLS, type Tool } from "./tools";

// Palette shared with the page (globals.css)
const C = {
  ochre: "#d4a24c",
  wood: "#e3c79c",
  walnut: "#6e4a32",
  graphite: "#2a2926",
  clay: "#b5664b",
  sage: "#8a9682",
  dusk: "#6f7f95",
  paper: "#f3f0ea",
  metal: "#c9c4ba",
};

const FLOOR = 0.13; // inside floor of the cup

type Props = {
  active: Tool["id"] | null;
  onActive: (id: Tool["id"] | null) => void;
  onSelect: (tool: Tool) => void;
  running: boolean;
};

export default function ToolCup({ active, onActive, onSelect, running }: Props) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ position: [0, 2.9, 9.4], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 1.9, 0)}
      onPointerMissed={() => onActive(null)}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[-3, 6, 4]} intensity={1.6} color="#fff4e0" />
      <directionalLight position={[4, 3, -2]} intensity={0.5} color="#dfe6f0" />

      {/* Local studio reflections — no HDR download */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -4]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 2, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffe2b0" position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>

      <Scene active={active} onActive={onActive} onSelect={onSelect} />

      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={6} blur={2.6} far={3} color="#3a2f22" />
    </Canvas>
  );
}

function Scene({ active, onActive, onSelect }: Omit<Props, "running">) {
  const group = useRef<THREE.Group>(null);

  // Gentle idle sway plus a little parallax toward the pointer
  useFrame(({ clock, pointer }, delta) => {
    if (!group.current) return;
    const target = Math.sin(clock.elapsedTime * 0.25) * 0.35 + pointer.x * 0.35;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target, 2, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -pointer.y * 0.06, 2, delta);
  });

  const n = TOOLS.length;

  return (
    <group ref={group}>
      {TOOLS.map((tool, i) => {
        const angle = (i / n) * Math.PI * 2 + 0.3;
        return (
          <group key={tool.id} rotation-y={-angle}>
            <ToolSlot
              tool={tool}
              lean={0.13 + (i % 3) * 0.05}
              radius={0.5}
              isActive={active === tool.id}
              onActive={onActive}
              onSelect={onSelect}
            />
          </group>
        );
      })}
      <Cup />
    </group>
  );
}

/** Where tool `i` of `TOOLS` stands in the cup, as a matrix in the cup's own frame (y = 0 is its base). */
export function slotMatrix(i: number) {
  const angle = (i / TOOLS.length) * Math.PI * 2 + 0.3;
  const lean = 0.13 + (i % 3) * 0.05;
  const m = new THREE.Matrix4().makeRotationY(-angle);
  m.multiply(new THREE.Matrix4().makeTranslation(0.5, FLOOR, 0));
  return m.multiply(new THREE.Matrix4().makeRotationZ(-lean));
}

function ToolSlot({
  tool,
  lean,
  radius,
  isActive,
  onActive,
  onSelect,
}: {
  tool: Tool;
  lean: number;
  radius: number;
  isActive: boolean;
  onActive: Props["onActive"];
  onSelect: Props["onSelect"];
}) {
  const lift = useRef<THREE.Group>(null);
  const height = TOOL_HEIGHT[tool.id];

  useFrame((_, delta) => {
    if (!lift.current) return;
    lift.current.position.y = THREE.MathUtils.damp(lift.current.position.y, isActive ? 0.7 : 0, 6, delta);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // On touch, first tap pulls the tool out; second tap opens the work.
    const touch = (e.nativeEvent as PointerEvent).pointerType === "touch";
    if (touch && !isActive) onActive(tool.id);
    else onSelect(tool);
  };

  return (
    <group position={[radius, FLOOR, 0]} rotation-z={-lean}>
      {/* Fixed hit area covering the tool and its lifted position, so hover doesn't flicker */}
      <mesh
        position={[0, (height + 0.75) / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onActive(tool.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onActive(null);
          document.body.style.cursor = "";
        }}
        onClick={handleClick}
      >
        <cylinderGeometry args={[0.15, 0.15, height + 0.75, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={lift}>
        <ToolModel id={tool.id} />
        {isActive && (
          <Html position={[0, height + 0.25, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-ink/90 px-3 py-1.5 text-center text-[13px] font-medium text-paper shadow-lg backdrop-blur">
              {tool.discipline} <span className="text-paper/50">→</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

export const TOOL_HEIGHT: Record<Tool["id"], number> = {
  pencil: 2.95,
  stylus: 3.05,
  wallbrush: 3.3,
  charcoal: 2.35,
  fineliner: 2.8,
  roundbrush: 3.2,
};

/* ----------------------------- the cup ----------------------------- */

/** The empty glass: frosted body, rim and thick base. */
export function Cup() {
  const geometry = useMemo(() => {
    const p = [
      [0, 0], [0.8, 0], [0.84, 0.04], [0.96, 2.0], [0.955, 2.03], [0.925, 2.04], [0.9, 2.0],
      [0.79, 0.17], [0.75, FLOOR], [0, FLOOR],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 96);
  }, []);

  return (
    <group>
      {/* frosted, translucent body */}
      <mesh geometry={geometry} renderOrder={2}>
        <meshPhysicalMaterial
          color="#f6efe2"
          transparent
          opacity={0.32}
          roughness={0.28}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.15}
          envMapIntensity={1.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* brighter rim so the edge reads like thick glass */}
      <mesh position={[0, 2.02, 0]} rotation-x={Math.PI / 2} renderOrder={3}>
        <torusGeometry args={[0.93, 0.022, 12, 96]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.55} roughness={0.1} clearcoat={1} depthWrite={false} />
      </mesh>
      {/* thick glass base */}
      <mesh position={[0, FLOOR / 2, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.79, 0.81, FLOOR, 64]} />
        <meshPhysicalMaterial color="#efe4cf" transparent opacity={0.55} roughness={0.2} clearcoat={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ----------------------------- the tools ----------------------------- */
// Each model stands on y = 0 and points up.

export function ToolModel({ id }: { id: Tool["id"] }) {
  switch (id) {
    case "pencil":
      return <GraphitePencil />;
    case "stylus":
      return <Stylus />;
    case "wallbrush":
      return <WallBrush />;
    case "charcoal":
      return <Charcoal />;
    case "fineliner":
      return <Fineliner />;
    case "roundbrush":
      return <RoundBrush />;
  }
}

const Metal = () => <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.28} />;

function GraphitePencil() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.16, 24]} />
        <meshStandardMaterial color={C.clay} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.14, 24]} />
        <Metal />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 2.2, 6]} />
        <meshStandardMaterial color={C.ochre} roughness={0.35} flatShading />
      </mesh>
      <mesh position={[0, 2.64, 0]}>
        <cylinderGeometry args={[0.03, 0.09, 0.28, 24]} />
        <meshStandardMaterial color={C.wood} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.82, 0]}>
        <coneGeometry args={[0.03, 0.09, 16]} />
        <meshStandardMaterial color={C.graphite} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Stylus() {
  return (
    <group>
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.075, 24, 16]} />
        <meshPhysicalMaterial color={C.paper} roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 2.56, 32]} />
        <meshPhysicalMaterial color={C.paper} roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 2.78, 0]}>
        <cylinderGeometry args={[0.022, 0.075, 0.3, 32]} />
        <meshPhysicalMaterial color={C.paper} roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 2.96, 0]}>
        <sphereGeometry args={[0.022, 16, 12]} />
        <meshStandardMaterial color="#9a958c" roughness={0.5} />
      </mesh>
    </group>
  );
}

function WallBrush() {
  return (
    <group>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.1, 0.06, 2.0, 24]} />
        <meshStandardMaterial color={C.walnut} roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.18, 0]} scale={[1.7, 1, 0.6]}>
        <cylinderGeometry args={[0.1, 0.1, 0.36, 24]} />
        <Metal />
      </mesh>
      <mesh position={[0, 2.56, 0]}>
        <boxGeometry args={[0.32, 0.4, 0.1]} />
        <meshStandardMaterial color="#d9c7a8" roughness={1} />
      </mesh>
      <mesh position={[0, 2.86, 0]}>
        <boxGeometry args={[0.31, 0.2, 0.095]} />
        <meshStandardMaterial color={C.clay} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Charcoal() {
  return (
    <group>
      <mesh position={[0, 1.15, 0]} rotation-y={0.4}>
        <cylinderGeometry args={[0.075, 0.085, 2.3, 7]} />
        <meshStandardMaterial color="#1b1a19" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 2.32, 0]}>
        <cylinderGeometry args={[0.03, 0.075, 0.08, 7]} />
        <meshStandardMaterial color="#1b1a19" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function Fineliner() {
  return (
    <group>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.075, 0.07, 1.9, 32]} />
        <meshStandardMaterial color={C.graphite} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 32]} />
        <meshStandardMaterial color={C.sage} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.68, 32]} />
        <meshStandardMaterial color={C.graphite} roughness={0.45} />
      </mesh>
      <mesh position={[0.085, 2.3, 0]}>
        <boxGeometry args={[0.025, 0.5, 0.05]} />
        <Metal />
      </mesh>
      <mesh position={[0, 2.72, 0]}>
        <sphereGeometry args={[0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={C.graphite} roughness={0.45} />
      </mesh>
    </group>
  );
}

function RoundBrush() {
  const bristles = useMemo(() => {
    const p = [[0, 0], [0.06, 0.02], [0.075, 0.12], [0.06, 0.3], [0.025, 0.45], [0, 0.52]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 24);
  }, []);
  return (
    <group>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.07, 0.045, 2.2, 24]} />
        <meshPhysicalMaterial color={C.dusk} roughness={0.25} clearcoat={1} />
      </mesh>
      <mesh position={[0, 2.37, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.34, 24]} />
        <Metal />
      </mesh>
      <mesh geometry={bristles} position={[0, 2.54, 0]}>
        <meshStandardMaterial color="#3a352e" roughness={0.9} />
      </mesh>
    </group>
  );
}
