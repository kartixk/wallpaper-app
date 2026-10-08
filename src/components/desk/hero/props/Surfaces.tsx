"use client";

import { use, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { cachedTexture, cssFont, fontsReady, grain, rng } from "./canvas";

/* ----------------------- green self-healing cutting mat ----------------------- */

const MAT_CM: [number, number] = [60, 45];

export function CuttingMat() {
  use(fontsReady());

  const map = useMemo(() => {
    const px = 40; // pixels per cm
    return cachedTexture("cutting-mat", MAT_CM[0] * px, MAT_CM[1] * px, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.45, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
      g.addColorStop(0, "#2f7150");
      g.addColorStop(1, "#285f44");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 10, 7);

      const m = 1.5 * px; // printed border
      // 1 cm grid, heavier every 5 cm
      for (let cm = 0; cm <= MAT_CM[0] - 3; cm++) {
        const x = m + cm * px;
        ctx.strokeStyle = cm % 5 === 0 ? "rgba(236,246,232,0.55)" : "rgba(226,240,224,0.22)";
        ctx.lineWidth = cm % 5 === 0 ? 2.6 : 1.4;
        ctx.beginPath();
        ctx.moveTo(x, m);
        ctx.lineTo(x, h - m);
        ctx.stroke();
      }
      for (let cm = 0; cm <= MAT_CM[1] - 3; cm++) {
        const y = m + cm * px;
        ctx.strokeStyle = cm % 5 === 0 ? "rgba(236,246,232,0.55)" : "rgba(226,240,224,0.22)";
        ctx.lineWidth = cm % 5 === 0 ? 2.6 : 1.4;
        ctx.beginPath();
        ctx.moveTo(m, y);
        ctx.lineTo(w - m, y);
        ctx.stroke();
      }

      // 45° and 60° guides from the bottom-left corner
      ctx.save();
      ctx.beginPath();
      ctx.rect(m, m, w - 2 * m, h - 2 * m);
      ctx.clip();
      ctx.strokeStyle = "rgba(240,226,140,0.45)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([14, 10]);
      for (const deg of [30, 45, 60]) {
        const a = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(m, h - m);
        ctx.lineTo(m + Math.cos(a) * w * 2, h - m - Math.sin(a) * w * 2);
        ctx.stroke();
      }
      ctx.restore();

      // ruler numbers in the border
      ctx.fillStyle = "rgba(244,224,128,0.9)";
      ctx.font = `600 ${0.62 * px}px ${cssFont("--font-jetbrains-mono", "monospace")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let cm = 0; cm <= MAT_CM[0] - 3; cm += 1) {
        if (cm % 2) continue;
        ctx.fillText(String(cm), m + cm * px, m * 0.5);
      }
      ctx.save();
      for (let cm = 2; cm <= MAT_CM[1] - 3; cm += 2) ctx.fillText(String(cm), m * 0.5, m + cm * px);
      ctx.restore();

      ctx.fillStyle = "rgba(236,246,232,0.55)";
      ctx.font = `500 ${0.5 * px}px ${cssFont("--font-jetbrains-mono", "monospace")}`;
      ctx.textAlign = "right";
      ctx.fillText("SELF-HEALING CUTTING MAT  ·  A2  ·  60 × 45 cm", w - m, h - m * 0.5);

      // knife scores — lots of faint short ones, a few long straight ones
      const r = rng(42);
      for (let i = 0; i < 260; i++) {
        const x = (0.15 + r() * 0.7) * w;
        const y = (0.15 + r() * 0.7) * h;
        const len = (1 + r() * 9) * px;
        const a = r() < 0.6 ? Math.round(r() * 4) * (Math.PI / 4) + (r() - 0.5) * 0.04 : r() * Math.PI;
        ctx.strokeStyle = `rgba(200,232,212,${0.04 + r() * 0.1})`;
        ctx.lineWidth = 0.8 + r();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
    });
  }, []);

  const [w, d] = [MAT_CM[0] / 10, MAT_CM[1] / 10];
  return (
    <group>
      <RoundedBox args={[w, 0.03, d]} radius={0.012} smoothness={2} position-y={0.015}>
        <meshStandardMaterial color="#285f44" roughness={0.85} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position-y={0.0305}>
        <planeGeometry args={[w - 0.01, d - 0.01]} />
        <meshStandardMaterial map={map} roughness={0.82} />
      </mesh>
    </group>
  );
}

/* ------------------------------ steel ruler, 30 cm ------------------------------ */

export function Ruler() {
  use(fontsReady());

  const map = useMemo(
    () =>
      cachedTexture("steel-ruler", 3000, 300, (ctx, w, h) => {
        ctx.fillStyle = "#f2f2f2";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#3a3936";
        const mm = w / 300;
        for (let i = 0; i <= 290; i++) {
          const x = 50 + i * mm;
          const len = i % 10 === 0 ? 0.36 : i % 5 === 0 ? 0.26 : 0.16;
          ctx.fillRect(x - 1, 0, 2, h * len);
        }
        ctx.font = `600 ${h * 0.2}px ${cssFont("--font-general-sans", "sans-serif")}`;
        ctx.textAlign = "center";
        for (let cm = 0; cm <= 29; cm++) ctx.fillText(String(cm), 50 + cm * 10 * mm, h * 0.6);
        ctx.font = `500 ${h * 0.12}px ${cssFont("--font-jetbrains-mono", "monospace")}`;
        ctx.textAlign = "left";
        ctx.fillText("STAINLESS · 300 mm", 60, h * 0.88);
      }),
    [],
  );

  return (
    <mesh position-y={0.006} castShadow>
      <boxGeometry args={[3.0, 0.012, 0.3]} />
      <meshPhysicalMaterial map={map} color="#a9a8a5" metalness={1} roughness={0.26} anisotropy={0.8} />
    </mesh>
  );
}
