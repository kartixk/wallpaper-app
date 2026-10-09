import type { AboutContent } from "@/context/AboutContext";
import { cssFont, grain, rng } from "./canvas";
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

  pageNumber(ctx, w, h, "06", "left");
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
  pageNumber(ctx, w, h, "07", "right");
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

    const num = String(i + 1).padStart(2, "0");
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

  pageNumber(ctx, w, h, "08", "left");
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

  pageNumber(ctx, w, h, "09", "right");
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is widely supported on canvas now; older engines just ignore it
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}
