"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { DESK, WALL_Z, layoutFor, type DeskLayout } from "./layout";
import { ArtWall, Desk, DeskProps } from "./props";
import { flight } from "./flight";

const FOV = 24; // a longer lens, like a product shot

type Props = {
  running: boolean;
  /** Element whose pointer moves drive the lamp and camera sway (the hero section). */
  eventSource: React.RefObject<HTMLElement | null>;
  onReady?: () => void;
};

export default function DeskScene({ running, eventSource, onReady }: Props) {
  // nothing renders until the shaders are compiled, so the first frame doesn't stall the page
  const [compiled, setCompiled] = useState(false);
  // drop to 1× pixels if the machine can't keep up
  const [maxDpr, setMaxDpr] = useState(1.5);
  const handleReady = useCallback(() => {
    setCompiled(true);
    onReady?.();
  }, [onReady]);

  return (
    <Canvas
      frameloop={running && compiled ? "always" : "never"}
      dpr={[1, maxDpr]}
      shadows="percentage"
      camera={{ fov: FOV, near: 1, far: 150, position: [0, 30, 15] }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      eventSource={eventSource}
      // the hero starts at the top of the page, so page coords == coords within the canvas
      eventPrefix="page"
    >
      <color attach="background" args={["#2a2623"]} />
      <PerformanceMonitor onDecline={() => setMaxDpr(1)} />
      <Suspense fallback={null}>
        <Scene />
        <Ready onReady={handleReady} />
      </Suspense>
      <Effects />
    </Canvas>
  );
}

/**
 * Mounts once everything inside the Suspense boundary has loaded. Compiles every material's
 * shader in the background (KHR_parallel_shader_compile where available) instead of on the
 * first frame, then reports ready and, a moment later, freezes the shadow map.
 */
function Ready({ onReady }: { onReady?: () => void }) {
  const get = useThree((s) => s.get);
  const callback = useRef(onReady);
  useEffect(() => {
    callback.current = onReady;
  });

  useEffect(() => {
    const { gl, scene, camera } = get();
    let alive = true;
    let id = 0;
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .then(() => {
        if (!alive) return;
        callback.current?.();
        // nothing on the desk moves on its own, so render shadows for a moment and then stop
        id = window.setTimeout(() => (gl.shadowMap.autoUpdate = false), 500);
      });
    return () => {
      alive = false;
      clearTimeout(id);
      gl.shadowMap.autoUpdate = true;
    };
  }, [get]);
  return null;
}

function Scene() {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const layout = useMemo(() => layoutFor(aspect), [aspect]);

  return (
    <>
      <CameraRig layout={layout} />
      <Lights />
      <Desk />
      <ArtWall />
      <DeskProps />
    </>
  );
}

/** Space kept clear under the fixed nav, in px. */
const NAV_CLEARANCE = 96;

/**
 * Finds the camera distance and look-at point that fit the desk's front edge *and* the
 * art wall up to `wallTop` on screen, below the nav. A few rounds of scale-and-recentre converge.
 */
function fitCamera(layout: DeskLayout, width: number, height: number) {
  const t = THREE.MathUtils.degToRad(layout.tilt);
  const dir = new THREE.Vector3(0, Math.cos(t), Math.sin(t));
  const [fx, fz] = layout.focus;
  const w = layout.frameW;

  const points = [
    // front edge of the desk
    [fx - w / 2, 0, DESK.d / 2], [fx + w / 2, 0, DESK.d / 2],
    // as far up the art wall as the layout wants
    [fx - w / 2, layout.wallTop, WALL_Z], [fx + w / 2, layout.wallTop, WALL_Z],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));

  const cam = new THREE.PerspectiveCamera(FOV, width / height, 0.5, 200);
  const target = new THREE.Vector3(fx, 0, fz);
  const top = 1 - (2 * NAV_CLEARANCE) / height; // NDC y just under the nav
  const bottom = -0.98;
  let dist = 40;
  const v = new THREE.Vector3();

  for (let i = 0; i < 12; i++) {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      v.copy(p).project(cam);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    // grow/shrink so the content just fits, then slide the target so it sits in the free band
    dist *= Math.max((maxX - minX) / 1.96, (maxY - minY) / (top - bottom));
    const offsetY = (maxY + minY) / 2 - (top + bottom) / 2;
    const metresPerNdc = dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    target.z -= (offsetY * metresPerNdc) / Math.cos(t);
  }

  cam.position.copy(target).addScaledVector(dir, dist);
  return { position: cam.position.clone(), target };
}

/** Frames the desk for the current viewport, low enough that the art wall reads. */
function CameraRig({ layout }: { layout: DeskLayout }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const base = useMemo(() => fitCamera(layout, width, height), [layout, width, height]);

  // A small, damped sway toward the pointer — enough to feel the depth of the desk
  useFrame(({ camera, pointer }, delta) => {
    const { position: p, target } = base;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, p.x + pointer.x * 0.3, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, p.y, 3, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, p.z - pointer.y * 0.18, 3, delta);
    camera.lookAt(target);
    // the flying sketchbook's overlay renders through this same camera
    flight.camera = camera as THREE.PerspectiveCamera;
    flight.size.width = width;
    flight.size.height = height;
  });

  return null;
}

function Lights() {
  const lamp = useRef<THREE.PointLight>(null);
  const desk = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const wall = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -WALL_Z), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(0, 3.4, 0), []);

  // A warm lamp pool that follows the pointer: across the desk, or up onto the drawings
  useFrame(({ raycaster, pointer, camera }, delta) => {
    if (!lamp.current) return;
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(desk, hit) && hit.z > WALL_Z + 0.6) goal.set(hit.x, 3.4, hit.z);
    else if (raycaster.ray.intersectPlane(wall, hit)) goal.set(hit.x, Math.max(hit.y, 1), WALL_Z + 2.6);
    const p = lamp.current.position;
    p.x = THREE.MathUtils.damp(p.x, goal.x, 4, delta);
    p.y = THREE.MathUtils.damp(p.y, goal.y, 4, delta);
    p.z = THREE.MathUtils.damp(p.z, goal.z, 4, delta);
  });

  return (
    <>
      {/* the room itself: soft fill and real reflections in the screens, glass and paint */}
      <Environment files="/desk/textures/studio_512.hdr" environmentIntensity={0.6} environmentRotation={[0, 1.2, 0]} />
      {/* daylight from the window on the right: shadows rake left across the desk and up the wall */}
      <directionalLight
        position={[13, 15, 9]}
        intensity={2.7}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-radius={8}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      <pointLight ref={lamp} position={[0, 3.4, 0]} intensity={6} distance={8} decay={1.6} color="#ffd29a" />
    </>
  );
}

function Effects() {
  const small = useThree((s) => s.size.width < 768);
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.45} distanceFalloff={0.6} intensity={2.4} quality={small ? "low" : "medium"} halfRes={small} />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.35} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
      <Vignette offset={0.3} darkness={0.5} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.2} />
    </EffectComposer>
  );
}
