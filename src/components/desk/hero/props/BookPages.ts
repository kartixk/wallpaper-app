import type { AboutContent } from "@/context/AboutContext";
import { cssFont, grain, rng } from "./canvas";
import type { CanvasTexture } from "three";
import { TOOLS } from "../../tools";

/**
 * The open sketchbook's two pages, drawn onto canvases: warm sketchbook paper with the
 * gutter shadow baked in, the yellow Pencil illustration pasted onto the left page and the
 * "Meet Pencil" copy printed on the right.
 */

export const PAGE_PX: [number, number] = [1400, 1900]; // 22 × 30 cm page, ~64 px/cm

const INK = "#1f1e1c";
const CLAY = "#b5664b";
const OCHRE = "#d4a24c";

const fonts = () => ({
  sans: cssFont("--font-general-sans", "sans-serif"),
  serif: cssFont("--font-instrument-serif", "serif"),
  mono: cssFont("--font-jetbrains-mono", "monospace"),
  marker: cssFont("--font-permanent-marker", "cursive"),
});

/** Sketchbook paper: warm off-white with tooth and fibres, shading into the gutter at `spine`. */
function paper(ctx: CanvasRenderingContext2D, w: number, h: number, spine: "left" | "right", seed: number) {
  ctx.fillStyle = "#f6f0e2";
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  // soft mottling
  for (let i = 0; i < 40; i++) {
    const x = r() * w;
    const y = r() * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 80 + r() * 260);
    g.addColorStop(0, r() < 0.5 ? "rgba(214,196,160,0.10)" : "rgba(255,252,244,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // fibres
  for (let i = 0; i < 1400; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI;
    const len = 3 + r() * 12;
    ctx.strokeStyle = r() < 0.6 ? "rgba(150,128,96,0.10)" : "rgba(255,255,250,0.35)";
    ctx.lineWidth = 0.6 + r() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  grain(ctx, w, h, 14, seed + 1);

  // the page curves down into the gutter: darker toward the spine, a little at the outer edge
  const gx = spine === "left" ? 0 : w;
  const dir = spine === "left" ? 1 : -1;
  const gutter = ctx.createLinearGradient(gx, 0, gx + dir * w * 0.22, 0);
  gutter.addColorStop(0, "rgba(92,70,40,0.38)");
  gutter.addColorStop(0.12, "rgba(92,70,40,0.12)");
  gutter.addColorStop(1, "rgba(92,70,40,0)");
  ctx.fillStyle = gutter;
  ctx.fillRect(0, 0, w, h);
  const outer = ctx.createLinearGradient(w - gx, 0, w - gx - dir * w * 0.05, 0);
  outer.addColorStop(0, "rgba(120,96,60,0.12)");
  outer.addColorStop(1, "rgba(120,96,60,0)");
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, w, h);
}

export function drawBlankPage(ctx: CanvasRenderingContext2D, w: number, h: number) {
  paper(ctx, w, h, "left", 61);
}

/* --------------------------------- left page --------------------------------- */

/** The yellow illustration, printed and pasted in with washi tape, with a few notes around it. */
export function drawLeftPage(ctx: CanvasRenderingContext2D, w: number, h: number, art: HTMLImageElement) {
  paper(ctx, w, h, "right", 23);
  const f = fonts();

  // the print: white border, glued flat (a tight, soft shadow), turned a touch
  const pw = w * 0.74;
  const ph = pw * (art.height / art.width);
  const border = w * 0.016;
  ctx.save();
  ctx.translate(w * 0.47, h * 0.4);
  ctx.rotate(-0.035);
  ctx.shadowColor = "rgba(60,40,20,0.28)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = "#fbf9f4";
  ctx.fillRect(-pw / 2 - border, -ph / 2 - border, pw + 2 * border, ph + 2 * border);
  ctx.shadowColor = "transparent";
  ctx.drawImage(art, -pw / 2, -ph / 2, pw, ph);
  // a faint sheen and the paper's tooth showing through the print
  const sheen = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
  sheen.addColorStop(0, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.06)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);

  // washi tape across two corners
  for (const [x, y, a, color] of [
    [-pw / 2 + 10, -ph / 2 - 6, -0.62, "rgba(226,182,104,0.78)"],
    [pw / 2 - 10, ph / 2 + 6, -0.62, "rgba(222,150,128,0.72)"],
  ] as const) {
    tape(ctx, x, y, a, w * 0.2, w * 0.05, color);
  }
  ctx.restore();

  // handwritten notes
  ctx.fillStyle = INK;
  ctx.font = `${w * 0.05}px ${f.marker}`;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.4 + ph / 2 + h * 0.08);
  ctx.rotate(-0.03);
  ctx.textAlign = "center";
  ctx.fillText("deal with it.", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(w * 0.62, h * 0.13);
  ctx.rotate(-0.08);
  ctx.fillStyle = CLAY;
  ctx.font = `${w * 0.045}px ${f.marker}`;
  ctx.fillText("that's me!", 0, 0);
  ctx.restore();
  // arrow down onto the print
  ctx.strokeStyle = CLAY;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.6, h * 0.135);
  ctx.bezierCurveTo(w * 0.5, h * 0.13, w * 0.47, h * 0.16, w * 0.5, h * 0.2);
  ctx.moveTo(w * 0.5, h * 0.2);
  ctx.lineTo(w * 0.475, h * 0.183);
  ctx.moveTo(w * 0.5, h * 0.2);
  ctx.lineTo(w * 0.515, h * 0.18);
  ctx.stroke();

  // a few graphite doodles in the margins
  ctx.strokeStyle = "rgba(60,58,54,0.45)";
  ctx.lineWidth = 3;
  star(ctx, w * 0.16, h * 0.12, w * 0.025);
  star(ctx, w * 0.82, h * 0.78, w * 0.018);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const y = h * 0.86 + i * 9;
    ctx.moveTo(w * 0.14, y);
    ctx.lineTo(w * 0.3 - i * 8, y - 4);
  }
  ctx.stroke();

  pageNumber(ctx, w, h, "i", "left");
}

function tape(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, tw: number, th: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath();
  // torn ends
  ctx.moveTo(-tw / 2, -th / 2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-tw / 2 + (i % 2 ? 6 : 0), -th / 2 + (i / 6) * th);
  ctx.lineTo(tw / 2, th / 2);
  for (let i = 6; i >= 0; i--) ctx.lineTo(tw / 2 - (i % 2 ? 6 : 0), -th / 2 + (i / 6) * th);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 5; i++) ctx.fillRect(-tw / 2 + 14 + i * (tw / 5), -th / 2, tw / 14, th);
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? s * 0.45 : s;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.stroke();
}

function pageNumber(ctx: CanvasRenderingContext2D, w: number, h: number, n: string, side: "left" | "right") {
  ctx.fillStyle = "rgba(31,30,28,0.45)";
  ctx.font = `500 ${w * 0.018}px ${fonts().mono}`;
  ctx.textAlign = side === "left" ? "left" : "right";
  ctx.fillText(n, side === "left" ? w * 0.08 : w * 0.92, h * 0.955);
  ctx.textAlign = "left";
}

/* --------------------------------- right page --------------------------------- */

type Run = { text: string; font: string; color: string; highlight?: boolean };

/** Lays words out left-to-right with wrapping; returns the y below the last line. */
function flow(ctx: CanvasRenderingContext2D, runs: Run[], x: number, y: number, maxW: number, lineH: number, draw: boolean) {
  let cx = x;
  let cy = y;
  ctx.textBaseline = "alphabetic";
  for (const run of runs) {
    ctx.font = run.font;
    const space = ctx.measureText(" ").width;
    const words = run.text.split(/(\s+)/).filter((t) => t.length && !/^\s+$/.test(t));
    words.forEach((word, i) => {
      const ww = ctx.measureText(word).width;
      if (cx > x && cx + ww > x + maxW) {
        cx = x;
        cy += lineH;
      }
      if (draw) {
        if (run.highlight) {
          // marker swipe behind the lower half of the word
          ctx.fillStyle = "rgba(236,211,160,0.9)";
          ctx.fillRect(cx - 4, cy - lineH * 0.34, ww + 8, lineH * 0.36);
        }
        ctx.fillStyle = run.color;
        ctx.fillText(word, cx, cy);
      }
      cx += ww;
      // keep punctuation glued to the word before it; otherwise add a space
      const next = words[i + 1];
      if (next !== undefined || run.text.endsWith(" ")) cx += space;
    });
  }
  return cy + lineH;
}

/** Prints the Meet Pencil copy, scaling the type down until it fits the page. */
export function drawRightPage(ctx: CanvasRenderingContext2D, w: number, h: number, about: AboutContent) {
  paper(ctx, w, h, "left", 47);
  const f = fonts();
  const left = w * 0.12;
  const right = w * 0.9;
  const maxW = right - left;
  const top = h * 0.1;
  const bottom = h * 0.92;
  const tools = about.toolkit
    .split(/,\s*(?:and\s+)?|\s+and\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const layout = (s: number, draw: boolean) => {
    let y = top;
    // eyebrow: 01 —— MEET PENCIL
    ctx.font = `700 ${30 * s}px ${f.mono}`;
    ctx.fillStyle = "rgba(31,30,28,0.6)";
    setSpacing(ctx, 9 * s);
    if (draw) ctx.fillText("01", left, y);
    const n = ctx.measureText("01 ").width;
    if (draw) ctx.fillRect(left + n + 6 * s, y - 10 * s, 70 * s, 3);
    ctx.font = `500 ${30 * s}px ${f.mono}`;
    if (draw) ctx.fillText("MEET PENCIL", left + n + 96 * s, y);
    setSpacing(ctx, 0);
    y += 150 * s;

    // Created to *create.*
    ctx.font = `600 ${128 * s}px ${f.sans}`;
    setSpacing(ctx, -5 * s);
    ctx.fillStyle = INK;
    const lead = "Created to ";
    if (draw) ctx.fillText(lead, left, y);
    const lw = ctx.measureText(lead).width;
    setSpacing(ctx, -2 * s);
    ctx.font = `italic 400 ${138 * s}px ${f.serif}`;
    if (draw) ctx.fillText("create.", left + lw, y);
    const cw = ctx.measureText("create.").width;
    setSpacing(ctx, 0);
    if (draw) {
      // the ochre pencil-stroke underline
      ctx.strokeStyle = OCHRE;
      ctx.lineWidth = 11 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      const ux = left + lw;
      const uy = y + 26 * s;
      ctx.moveTo(ux + 4, uy);
      ctx.bezierCurveTo(ux + cw * 0.2, uy - 12 * s, ux + cw * 0.45, uy - 14 * s, ux + cw * 0.62, uy - 6 * s);
      ctx.bezierCurveTo(ux + cw * 0.8, uy + 2 * s, ux + cw * 0.95, uy + 4 * s, ux + cw, uy - 10 * s);
      ctx.stroke();
    }
    y += 120 * s;

    // lead with the skills highlighted
    const body = (size: number, weight = 400) => `${weight} ${size * s}px ${f.sans}`;
    const runs: Run[] = [{ text: about.leadText + " ", font: body(46), color: INK }];
    about.skills.forEach((skill, i) => {
      runs.push({ text: skill, font: body(46, 600), color: INK, highlight: true });
      runs.push({ text: i < about.skills.length - 1 ? ", " : ".", font: body(46), color: INK });
    });
    y = flow(ctx, runs, left, y, maxW, 66 * s, draw);
    y += 24 * s;
    const soft = "rgba(31,30,28,0.75)";
    y = flow(ctx, [{ text: about.paragraph2, font: body(36), color: soft }], left, y, maxW, 54 * s, draw);
    y += 16 * s;
    y = flow(ctx, [{ text: about.paragraph3, font: body(36), color: soft }], left, y, maxW, 54 * s, draw);
    y += 46 * s;

    // IN THE PENCIL CASE + tool chips
    ctx.font = `500 ${26 * s}px ${f.mono}`;
    setSpacing(ctx, 8 * s);
    ctx.fillStyle = "rgba(31,30,28,0.55)";
    if (draw) ctx.fillText("IN THE PENCIL CASE", left, y);
    setSpacing(ctx, 0);
    y += 34 * s;
    ctx.font = `500 ${30 * s}px ${f.sans}`;
    const chipH = 58 * s;
    const padX = 22 * s;
    let cx = left;
    for (const t of tools) {
      const tw = ctx.measureText(t).width + padX * 2;
      if (cx > left && cx + tw > right) {
        cx = left;
        y += chipH + 14 * s;
      }
      if (draw) {
        ctx.fillStyle = "#fbf8f0";
        ctx.strokeStyle = "rgba(31,30,28,0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx, y, tw, chipH, chipH / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.fillText(t, cx + padX, y + chipH * 0.66);
      }
      cx += tw + 12 * s;
    }
    return y + chipH;
  };

  // shrink the type until everything fits above the page number
  let s = 1;
  while (s > 0.6 && layout(s, false) > bottom) s -= 0.04;
  layout(s, true);
  pageNumber(ctx, w, h, "ii", "right");
}

/* ------------------------------ the index spread ------------------------------ */

/** Left page after the turn: "Every tool has a job", laid out as the sketchbook's index. */
export function drawIndexPage(ctx: CanvasRenderingContext2D, w: number, h: number) {
  paper(ctx, w, h, "right", 71);
  const f = fonts();
  const left = w * 0.12;
  const right = w * 0.86;
  let y = h * 0.1;

  // eyebrow: 02 —— WHAT I DO
  ctx.font = `700 30px ${f.mono}`;
  ctx.fillStyle = "rgba(31,30,28,0.6)";
  setSpacing(ctx, 9);
  ctx.fillText("02", left, y);
  const n = ctx.measureText("02 ").width;
  ctx.fillRect(left + n + 6, y - 10, 70, 3);
  ctx.font = `500 30px ${f.mono}`;
  ctx.fillText("WHAT I DO", left + n + 96, y);
  setSpacing(ctx, 0);

  // Every tool has / a job.
  y += 160;
  ctx.fillStyle = INK;
  ctx.font = `600 112px ${f.sans}`;
  setSpacing(ctx, -4);
  ctx.fillText("Every tool has", left, y);
  y += 140;
  setSpacing(ctx, -2);
  ctx.font = `italic 400 128px ${f.serif}`;
  ctx.fillText("a job.", left, y);
  const jw = ctx.measureText("a job.").width;
  setSpacing(ctx, 0);
  ctx.strokeStyle = OCHRE;
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left + 4, y + 26);
  ctx.bezierCurveTo(left + jw * 0.2, y + 14, left + jw * 0.45, y + 12, left + jw * 0.62, y + 20);
  ctx.bezierCurveTo(left + jw * 0.8, y + 28, left + jw * 0.95, y + 30, left + jw, y + 16);
  ctx.stroke();

  // INDEX
  y += 150;
  ctx.font = `500 26px ${f.mono}`;
  ctx.fillStyle = "rgba(31,30,28,0.55)";
  setSpacing(ctx, 8);
  ctx.fillText("INDEX", left, y);
  setSpacing(ctx, 0);
  ctx.strokeStyle = "rgba(31,30,28,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y + 22);
  ctx.lineTo(right, y + 22);
  ctx.stroke();

  // one row per tool: discipline, the tool that makes it, a dotted leader, its number
  const rowH = Math.min(150, (h * 0.92 - y - 40) / TOOLS.length);
  y += 22;
  TOOLS.forEach((t, i) => {
    const base = y + rowH * 0.5;
    ctx.fillStyle = INK;
    ctx.font = `500 56px ${f.sans}`;
    ctx.fillText(t.discipline, left, base);
    const tw = ctx.measureText(t.discipline).width;

    ctx.font = `500 24px ${f.mono}`;
    ctx.fillStyle = "rgba(31,30,28,0.5)";
    setSpacing(ctx, 5);
    ctx.fillText(t.name.toUpperCase(), left, base + 36);
    setSpacing(ctx, 0);

    const num = pageOf(i);
    ctx.font = `600 44px ${f.mono}`;
    ctx.fillStyle = CLAY;
    ctx.textAlign = "right";
    ctx.fillText(num, right, base);
    ctx.textAlign = "left";
    const nw = ctx.measureText(num).width;

    ctx.strokeStyle = "rgba(31,30,28,0.35)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.setLineDash([0.1, 14]);
    ctx.beginPath();
    ctx.moveTo(left + tw + 24, base - 6);
    ctx.lineTo(right - nw - 24, base - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    y += rowH;
  });

  pageNumber(ctx, w, h, "iii", "left");
}

/** Right page after the turn: the invitation to the tool cup that follows. */
export function drawToolsPage(ctx: CanvasRenderingContext2D, w: number, h: number) {
  paper(ctx, w, h, "left", 83);
  const f = fonts();
  const left = w * 0.14;
  const maxW = w * 0.76;

  flow(
    ctx,
    [
      {
        text: "Here is the whole kit, spilled across the page. Each one makes something different — from graphite portraits to murals the size of a building.",
        font: `400 52px ${f.sans}`,
        color: INK,
      },
    ],
    left,
    h * 0.16,
    maxW,
    78,
    true,
  );

  // handwritten nudge
  ctx.save();
  ctx.translate(left, h * 0.36);
  ctx.rotate(-0.06);
  ctx.fillStyle = CLAY;
  ctx.font = `${w * 0.052}px ${f.marker}`;
  ctx.fillText("let's get to work!", 0, 0);
  ctx.restore();

  // (the tools are 3D, tossed onto this page by hero/FlyingBook)

  pageNumber(ctx, w, h, "iv", "right");
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is widely supported on canvas now; older engines just ignore it
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/* ------------------------- chapter pages: pencil sketches ------------------------- */

/**
 * Every chapter takes a two-page spread, so the index points at the first page of each: 01, 03, 05…
 * (the pages before it, the introduction and the index itself, are numbered in roman).
 */
export const pageOf = (chapter: number) => String(chapter * 2 + 1).padStart(2, "0");

/** The prints pasted onto the Pencil Sketches spread: the big one on page 01, three more on page 02. */
export const SKETCH_PRINTS = {
  left: ["/gallery-1.jpeg"],
  right: ["/pencilsketches/pencilsketches1.jpg", "/pencilsketches/pencilsketches2.jpeg", "/pencilsketches/pencilsketches3.webp"],
};

/** Page 01: the chapter title. The big print is pasted on by `paintSketchPrints` once it has loaded. */
export function drawSketchLeft(ctx: CanvasRenderingContext2D, w: number, h: number) {
  paper(ctx, w, h, "right", 91);
  const f = fonts();
  const left = w * 0.12;
  let y = h * 0.1;

  // eyebrow: 01 —— GRAPHITE PENCIL
  ctx.font = `700 30px ${f.mono}`;
  ctx.fillStyle = "rgba(31,30,28,0.6)";
  setSpacing(ctx, 9);
  ctx.fillText("01", left, y);
  const n = ctx.measureText("01 ").width;
  ctx.fillRect(left + n + 6, y - 10, 70, 3);
  ctx.font = `500 30px ${f.mono}`;
  ctx.fillText("GRAPHITE PENCIL", left + n + 96, y);
  setSpacing(ctx, 0);

  // Pencil / Sketches.
  y += 160;
  ctx.fillStyle = INK;
  ctx.font = `600 124px ${f.sans}`;
  setSpacing(ctx, -4);
  ctx.fillText("Pencil", left, y);
  y += 150;
  setSpacing(ctx, -2);
  ctx.font = `italic 400 142px ${f.serif}`;
  ctx.fillText("Sketches", left, y);
  setSpacing(ctx, 0);
  // (its ochre underline is not printed: the pencil draws it, see hero/underline)

  flow(
    ctx,
    [{ text: "Portraits and studies in graphite, built up one soft layer at a time.", font: `400 40px ${f.sans}`, color: "rgba(31,30,28,0.75)" }],
    left,
    y + 110,
    w * 0.68,
    58,
    true,
  );

  // a graphite doodle in the margin
  ctx.strokeStyle = "rgba(60,58,54,0.45)";
  ctx.lineWidth = 3;
  star(ctx, w * 0.84, h * 0.1, w * 0.02);

  pageNumber(ctx, w, h, "01", "left");
}

/** Page 02: room for the smaller prints, and a note in the margin. */
export function drawSketchRight(ctx: CanvasRenderingContext2D, w: number, h: number) {
  paper(ctx, w, h, "left", 93);
  const f = fonts();

  ctx.save();
  ctx.translate(w * 0.08, h * 0.945);
  ctx.rotate(-0.04);
  ctx.fillStyle = CLAY;
  ctx.font = `${w * 0.036}px ${f.marker}`;
  ctx.fillText("2B, 4B & a lot of erasing", 0, 0);
  ctx.restore();

  ctx.strokeStyle = "rgba(60,58,54,0.45)";
  ctx.lineWidth = 3;
  drawViewMore(ctx, w, h);

  pageNumber(ctx, w, h, "02", "right");
}

type PrintSpot = { x: number; y: number; w: number; h: number; rot: number; tape: [string, string]; note?: string };

const SPOTS: Record<"left" | "right", PrintSpot[]> = {
  left: [{ x: 0.48, y: 0.66, w: 0.7, h: 0.4, rot: -0.03, tape: ["rgba(226,182,104,0.78)", "rgba(222,150,128,0.72)"], note: "study no. 1" }],
  right: [
    { x: 0.36, y: 0.22, w: 0.46, h: 0.3, rot: 0.04, tape: ["rgba(222,150,128,0.72)", "rgba(226,182,104,0.78)"] },
    { x: 0.66, y: 0.5, w: 0.44, h: 0.3, rot: -0.05, tape: ["rgba(226,182,104,0.78)", "rgba(190,205,170,0.78)"] },
    { x: 0.36, y: 0.72, w: 0.46, h: 0.28, rot: 0.025, tape: ["rgba(190,205,170,0.78)", "rgba(222,150,128,0.72)"] },
  ],
};

/** Pastes the loaded prints onto a sketch page, each fitted into its spot, glued flat and taped at two corners. */
export function paintSketchPrints(ctx: CanvasRenderingContext2D, w: number, h: number, side: "left" | "right", imgs: HTMLImageElement[]) {
  const f = fonts();
  imgs.forEach((img, i) => {
    const s = SPOTS[side][i];
    if (!s) return;
    const fit = Math.min((s.w * w) / img.width, (s.h * h) / img.height);
    const pw = img.width * fit;
    const ph = img.height * fit;
    const border = w * 0.016;
    ctx.save();
    ctx.translate(s.x * w, s.y * h);
    ctx.rotate(s.rot);
    ctx.shadowColor = "rgba(60,40,20,0.28)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#fbf9f4";
    ctx.fillRect(-pw / 2 - border, -ph / 2 - border, pw + 2 * border, ph + 2 * border);
    ctx.shadowColor = "transparent";
    ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
    tape(ctx, -pw / 2 + 10, -ph / 2 - 6, -0.62, w * 0.17, w * 0.045, s.tape[0]);
    tape(ctx, pw / 2 - 10, ph / 2 + 6, -0.62, w * 0.17, w * 0.045, s.tape[1]);
    if (s.note) {
      ctx.fillStyle = INK;
      ctx.font = `${w * 0.042}px ${f.marker}`;
      ctx.textAlign = "center";
      ctx.fillText(s.note, 0, ph / 2 + border + h * 0.05);
      ctx.textAlign = "left";
    }
    ctx.restore();
  });
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((done) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });

/** Loads a sketch page's prints and pastes them onto its texture, once; resolves true if the texture changed. */
export async function pasteSketchPrints(tex: CanvasTexture, side: "left" | "right") {
  if (tex.userData.printed) return false;
  const imgs = (await Promise.all(SKETCH_PRINTS[side].map(loadImage))).filter((i): i is HTMLImageElement => !!i);
  if (!imgs.length || tex.userData.printed) return false;
  const canvas = tex.image as HTMLCanvasElement;
  paintSketchPrints(canvas.getContext("2d")!, canvas.width, canvas.height, side, imgs);
  tex.userData.printed = true;
  tex.needsUpdate = true;
  return true;
}

/* ---------------------- the underline the pencil draws on page 01 ---------------------- */

const TITLE_LEFT = 0.12; // × page width
const TITLE_BASELINE = (h: number) => h * 0.1 + 160 + 150;

const wordWidths = new Map<string, number>();
/** Width of a title's second word (set in the italic serif), measured once the fonts are in. */
function measureWord(word: string) {
  let width = wordWidths.get(word);
  if (!width) {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `italic 400 142px ${fonts().serif}`;
    setSpacing(ctx, -2);
    width = ctx.measureText(word).width;
    wordWidths.set(word, width);
  }
  return width;
}

export type Underline = {
  /** The box (in page pixels) the stroke is drawn into. */
  box: { x: number; y: number; w: number; h: number };
  /** A point along the stroke, 0 (its start) to 1 (its end), in page pixels. */
  at: (t: number, out: { x: number; y: number }) => void;
};

/** The ochre stroke under "Sketches": two curved strokes, the second a little lower, as drawn by hand. */
export function sketchUnderline(w: number, h: number, word = "Sketches"): Underline {
  const left = w * TITLE_LEFT;
  const y = TITLE_BASELINE(h);
  const sw = measureWord(word);
  const pts = [
    [left + 4, y + 28],
    [left + sw * 0.2, y + 16],
    [left + sw * 0.45, y + 14],
    [left + sw * 0.62, y + 22],
    [left + sw * 0.8, y + 30],
    [left + sw * 0.95, y + 32],
    [left + sw, y + 18],
  ];
  const cubic = (p0: number[], p1: number[], p2: number[], p3: number[], t: number, k: 0 | 1) => {
    const u = 1 - t;
    return u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k];
  };
  const at: Underline["at"] = (t, out) => {
    const first = t < 0.5;
    const s = first ? t * 2 : (t - 0.5) * 2;
    const [p0, p1, p2, p3] = first ? pts.slice(0, 4) : pts.slice(3, 7);
    out.x = cubic(p0, p1, p2, p3, s, 0);
    out.y = cubic(p0, p1, p2, p3, s, 1);
  };
  return { box: { x: left - 20, y: y - 10, w: sw + 44, h: 70 }, at };
}

/** The stroke itself, drawn into its own small canvas (its box in the page's pixels, one to one). */
export function drawUnderlineStroke(ctx: CanvasRenderingContext2D, underline: Underline) {
  const { box, at } = underline;
  ctx.clearRect(0, 0, box.w, box.h);
  ctx.strokeStyle = OCHRE;
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const p = { x: 0, y: 0 };
  for (let i = 0; i <= 60; i++) {
    at(i / 60, p);
    if (i) ctx.lineTo(p.x - box.x, p.y - box.y);
    else ctx.moveTo(p.x - box.x, p.y - box.y);
  }
  ctx.stroke();
}

/* ------------------- chapters 03 and 05: Digital Art and Wall Art ------------------- */

type Source = string | { video: string };
type ChapterSide = { prints: Source[]; spots: PrintSpot[] };
type Chapter = {
  n: string; // first page number
  eyebrow: string;
  title: [string, string];
  blurb: string;
  note: string; // handwritten note on the right-hand page
  caption: string; // handwritten caption under the first print
  seed: number;
  /** What fills the right-hand page when there are no prints for it: paint swatches. */
  swatches?: boolean;
  left: ChapterSide;
  right: ChapterSide;
};

const T = {
  gold: "rgba(226,182,104,0.78)",
  rose: "rgba(222,150,128,0.72)",
  sage: "rgba(190,205,170,0.78)",
  sky: "rgba(150,180,215,0.74)",
};

export const CHAPTERS = {
  digital: {
    n: "03",
    eyebrow: "STYLUS",
    title: ["Digital", "Art"],
    blurb: "Painted on a tablet: light, colour and a little bit of glow, one layer at a time.",
    note: "layers on layers on layers",
    caption: "fresh off the tablet",
    seed: 101,
    left: {
      prints: ["/digitalarts/digitalarts5.jpeg"],
      spots: [{ x: 0.48, y: 0.66, w: 0.7, h: 0.4, rot: 0.03, tape: [T.sky, T.rose], note: "fresh off the tablet" }],
    },
    right: {
      prints: ["/digitalarts/digitalarts1.webp", "/digitalarts/digitalarts2.webp", "/digitalarts/digitalarts3.webp"],
      spots: [
        { x: 0.38, y: 0.24, w: 0.46, h: 0.3, rot: -0.04, tape: [T.sky, T.gold] },
        { x: 0.66, y: 0.5, w: 0.44, h: 0.3, rot: 0.05, tape: [T.rose, T.sage] },
        { x: 0.36, y: 0.74, w: 0.46, h: 0.28, rot: -0.025, tape: [T.gold, T.sky] },
      ],
    },
  },
  wall: {
    n: "05",
    eyebrow: "WALL BRUSH",
    title: ["Wall", "Art"],
    blurb: "Murals the size of a building, painted by hand, in a day.",
    note: "tap play on the site!",
    caption: "the paradise",
    seed: 111,
    left: {
      prints: [{ video: "/wall-art-1.mp4" }],
      spots: [{ x: 0.48, y: 0.64, w: 0.7, h: 0.44, rot: -0.025, tape: [T.rose, T.gold], note: "the paradise" }],
    },
    right: {
      prints: [{ video: "/wall-art-2.mp4" }],
      spots: [{ x: 0.5, y: 0.42, w: 0.64, h: 0.5, rot: 0.03, tape: [T.gold, T.sage], note: "PEDDI" }],
    },
  },
  charcoal: {
    n: "07",
    eyebrow: "CHARCOAL",
    title: ["Charcoal", "Portraits"],
    blurb: "Soft, smudged and a little dramatic: faces built out of dark and light.",
    note: "smudges are on purpose",
    caption: "dust and dark",
    seed: 121,
    left: {
      prints: ["/gallery-3.jpg"],
      spots: [{ x: 0.48, y: 0.66, w: 0.7, h: 0.4, rot: -0.03, tape: [T.gold, T.rose], note: "dust and dark" }],
    },
    right: {
      prints: ["/pencilsketches/pencilsketches4.jpeg", "/pencilsketches/pencilsketches5.jpeg"],
      spots: [
        { x: 0.4, y: 0.3, w: 0.5, h: 0.34, rot: 0.04, tape: [T.rose, T.sage] },
        { x: 0.6, y: 0.68, w: 0.5, h: 0.34, rot: -0.05, tape: [T.gold, T.sky] },
      ],
    },
  },
  pen: {
    n: "09",
    eyebrow: "FINELINER",
    title: ["Pen", "Sketches"],
    blurb: "No eraser, no second chances: confident lines, laid down in one go.",
    note: "ink does not forgive",
    caption: "one take",
    seed: 131,
    left: {
      prints: ["/gallery-6.jpeg"],
      spots: [{ x: 0.48, y: 0.66, w: 0.7, h: 0.4, rot: 0.025, tape: [T.sage, T.gold], note: "one take" }],
    },
    right: {
      prints: ["/gallery-4.jpeg"],
      spots: [{ x: 0.5, y: 0.42, w: 0.62, h: 0.5, rot: -0.03, tape: [T.rose, T.sky], note: "acrylic & pen" }],
    },
  },
  watercolour: {
    n: "11",
    eyebrow: "ROUND BRUSH",
    title: ["Water", "colours"],
    blurb: "Wet on wet, and let it do its own thing: light, loose and a little unpredictable.",
    note: "wet on wet",
    caption: "let it bloom",
    seed: 141,
    swatches: true,
    left: {
      prints: ["/gallery-5.jpeg"],
      spots: [{ x: 0.48, y: 0.66, w: 0.7, h: 0.4, rot: -0.025, tape: [T.sky, T.sage], note: "let it bloom" }],
    },
    right: { prints: [], spots: [] },
  },
} satisfies Record<string, Chapter>;

export type ChapterId = keyof typeof CHAPTERS;
export const CHAPTER_IDS = Object.keys(CHAPTERS) as ChapterId[];

/** Left-hand page of a chapter: the title, a line about it, and the first print. */
export function drawChapterLeft(ctx: CanvasRenderingContext2D, w: number, h: number, id: ChapterId) {
  const c: Chapter = CHAPTERS[id];
  paper(ctx, w, h, "right", c.seed);
  const f = fonts();
  const left = w * 0.12;
  let y = h * 0.1;

  ctx.font = `700 30px ${f.mono}`;
  ctx.fillStyle = "rgba(31,30,28,0.6)";
  setSpacing(ctx, 9);
  ctx.fillText(c.n, left, y);
  const n = ctx.measureText(`${c.n} `).width;
  ctx.fillRect(left + n + 6, y - 10, 70, 3);
  ctx.font = `500 30px ${f.mono}`;
  ctx.fillText(c.eyebrow, left + n + 96, y);
  setSpacing(ctx, 0);

  y += 160;
  ctx.fillStyle = INK;
  ctx.font = `600 124px ${f.sans}`;
  setSpacing(ctx, -4);
  ctx.fillText(c.title[0], left, y);
  y += 150;
  setSpacing(ctx, -2);
  ctx.font = `italic 400 142px ${f.serif}`;
  ctx.fillText(c.title[1], left, y);
  setSpacing(ctx, 0);
  // (its ochre underline is not printed: the tool for this chapter draws it)

  flow(ctx, [{ text: c.blurb, font: `400 40px ${f.sans}`, color: "rgba(31,30,28,0.75)" }], left, y + 110, w * 0.68, 58, true);

  ctx.strokeStyle = "rgba(60,58,54,0.45)";
  ctx.lineWidth = 3;
  star(ctx, w * 0.84, h * 0.1, w * 0.02);
  pageNumber(ctx, w, h, c.n, "left");
}

/** Right-hand page of a chapter: room for the other prints, and a note in the margin. */
export function drawChapterRight(ctx: CanvasRenderingContext2D, w: number, h: number, id: ChapterId) {
  const c: Chapter = CHAPTERS[id];
  paper(ctx, w, h, "left", c.seed + 2);
  const f = fonts();
  ctx.save();
  ctx.translate(w * 0.08, h * 0.945);
  ctx.rotate(-0.04);
  ctx.fillStyle = CLAY;
  ctx.font = `${w * 0.036}px ${f.marker}`;
  ctx.fillText(c.note, 0, 0);
  ctx.restore();
  if (c.swatches) {
    // a few paint swatches, each a soft wash with a darker edge where the water gathered
    const washes: [number, number, number, string][] = [
      [0.34, 0.26, 0.17, "rgba(110,140,185,0.55)"],
      [0.64, 0.4, 0.15, "rgba(200,120,100,0.5)"],
      [0.38, 0.58, 0.14, "rgba(150,175,130,0.55)"],
      [0.66, 0.74, 0.17, "rgba(214,170,90,0.55)"],
    ];
    for (const [x, y, r, col] of washes) {
      const g = ctx.createRadialGradient(x * w, y * h, r * w * 0.2, x * w, y * h, r * w);
      g.addColorStop(0, col.replace(/[\d.]+\)$/, "0.22)"));
      g.addColorStop(0.85, col);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x * w, y * h, r * w, r * w * 0.85, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(60,58,54,0.45)";
  ctx.lineWidth = 3;
  drawViewMore(ctx, w, h);
  pageNumber(ctx, w, h, String(Number(c.n) + 1).padStart(2, "0"), "right");
}

type Pic = HTMLImageElement | HTMLCanvasElement;

/** The first frame of a video, as a picture (with a play button stamped on it). */
function loadFrame(src: string) {
  return new Promise<HTMLCanvasElement | null>((done) => {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    const fail = () => done(null);
    v.onerror = fail;
    v.onloadeddata = () => {
      v.onseeked = () => {
        const cv = document.createElement("canvas");
        cv.width = v.videoWidth;
        cv.height = v.videoHeight;
        cv.getContext("2d")!.drawImage(v, 0, 0);
        const g = cv.getContext("2d")!;
        const r = Math.min(cv.width, cv.height) * 0.1;
        g.fillStyle = "rgba(20,18,16,0.55)";
        g.beginPath();
        g.arc(cv.width / 2, cv.height / 2, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.moveTo(cv.width / 2 - r * 0.28, cv.height / 2 - r * 0.45);
        g.lineTo(cv.width / 2 + r * 0.52, cv.height / 2);
        g.lineTo(cv.width / 2 - r * 0.28, cv.height / 2 + r * 0.45);
        g.fill();
        done(cv);
      };
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.src = src;
    window.setTimeout(fail, 15000);
  });
}

/** Pastes a chapter page's prints onto its texture, once; resolves true if the texture changed. */
export async function pasteChapterPrints(tex: CanvasTexture, id: ChapterId, side: "left" | "right") {
  if (tex.userData.printed) return false;
  const part: ChapterSide = CHAPTERS[id][side];
  const pics = await Promise.all(part.prints.map((p) => (typeof p === "string" ? loadImage(p) : loadFrame(p.video))));
  if (tex.userData.printed || pics.every((p) => !p)) return false;
  const canvas = tex.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const f = fonts();
  pics.forEach((img: Pic | null, i) => {
    const s = part.spots[i];
    if (!img || !s) return;
    const fit = Math.min((s.w * canvas.width) / img.width, (s.h * canvas.height) / img.height);
    const pw = img.width * fit;
    const ph = img.height * fit;
    const border = canvas.width * 0.016;
    ctx.save();
    ctx.translate(s.x * canvas.width, s.y * canvas.height);
    ctx.rotate(s.rot);
    ctx.shadowColor = "rgba(60,40,20,0.28)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#fbf9f4";
    ctx.fillRect(-pw / 2 - border, -ph / 2 - border, pw + 2 * border, ph + 2 * border);
    ctx.shadowColor = "transparent";
    ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
    tape(ctx, -pw / 2 + 10, -ph / 2 - 6, -0.62, canvas.width * 0.17, canvas.width * 0.045, s.tape[0]);
    tape(ctx, pw / 2 - 10, ph / 2 + 6, -0.62, canvas.width * 0.17, canvas.width * 0.045, s.tape[1]);
    if (s.note) {
      ctx.fillStyle = INK;
      ctx.font = `${canvas.width * 0.042}px ${f.marker}`;
      ctx.textAlign = "center";
      ctx.fillText(s.note, 0, ph / 2 + border + canvas.height * 0.05);
      ctx.textAlign = "left";
    }
    ctx.restore();
  });
  tex.userData.printed = true;
  tex.needsUpdate = true;
  return true;
}

/* ------------------------------ "view more" on each chapter ------------------------------ */

/** Where the label sits on a chapter's right-hand page, as fractions of the page: its click area too. */
export const VIEW_MORE = { x: 0.56, y: 0.895, w: 0.3, h: 0.08 };

/** A hand-lettered "view more →" with a pencilled underline, in the bottom right-hand corner of the page. */
function drawViewMore(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const f = fonts();
  const right = (VIEW_MORE.x + VIEW_MORE.w) * w - w * 0.01;
  const base = (VIEW_MORE.y + VIEW_MORE.h * 0.62) * h;
  ctx.save();
  ctx.translate(right, base);
  ctx.rotate(-0.045);
  ctx.fillStyle = CLAY;
  ctx.font = `${w * 0.038}px ${f.marker}`;
  ctx.textAlign = "right";
  const arrow = w * 0.05;
  ctx.fillText("view more", -arrow, 0);
  const tw = ctx.measureText("view more").width;
  ctx.textAlign = "left";
  // a little pencilled arrow after it
  ctx.strokeStyle = CLAY;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-arrow * 0.8, -w * 0.011);
  ctx.bezierCurveTo(-arrow * 0.5, -w * 0.016, -arrow * 0.2, -w * 0.012, 0, -w * 0.012);
  ctx.moveTo(-w * 0.014, -w * 0.024);
  ctx.lineTo(0, -w * 0.012);
  ctx.lineTo(-w * 0.015, 0);
  ctx.stroke();
  // underline
  ctx.strokeStyle = OCHRE;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-arrow - tw, w * 0.012);
  ctx.bezierCurveTo(-arrow - tw * 0.7, w * 0.006, -arrow - tw * 0.35, w * 0.016, -arrow, w * 0.008);
  ctx.stroke();
  ctx.restore();
}
