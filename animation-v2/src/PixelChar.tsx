/**
 * PixelChar — pixel-art character inspired by pixel-agents sprite style
 *
 * Each character is drawn as a 16×24 grid of SVG rects (scaled up).
 * Colors: dark-hair, skin, shirt (agent color), dark pants, near-black shoes.
 *
 * Animations: idle / walk / type / celebrate / error / sleep
 */

import React from "react";
import { COLORS } from "./types";

type CharAnim = "idle" | "walk" | "type" | "celebrate" | "error" | "sleep";

type Props = {
  x: number;       // center x
  y: number;       // bottom y
  color: string;   // shirt color
  anim: CharAnim;
  frame: number;
  flip?: boolean;
  hat?: boolean;
  size?: number;
};

// Each "pixel" in the 16×24 sprite grid = PX svg units
const PX = 3;

// ─── Color palette ────────────────────────────────────────────────────────────
// Fixed colors (shirt/pants injected at render)
const PAL: Record<string, string> = {
  O: "#2a1518",   // dark outline / hair shadow
  H: "#8f6439",   // hair mid-brown
  L: "#b18649",   // hair highlight
  S: "#e9a384",   // skin
  s: "#fbbf97",   // skin highlight
  F: "#c5896e",   // skin shadow
  E: "#000000",   // eye
  W: "#ffffff",   // white (eye-whites, collar)
  g: "#4f4f4f",   // grey
  P: "#0f3052",   // pants dark
  p: "#1a4a7a",   // pants mid
  K: "#040605",   // shoes
  N: "#493e38",   // neutral outline (neck/shoulder)
  // C = shirt color (injected)
  // D = shirt dark shade (injected)
};

function col(token: string, shirt: string): string {
  if (token === "_") return "transparent";
  if (token === "C") return shirt;
  if (token === "D") {
    // slightly darker version of shirt — blend with black at 30%
    const r = parseInt(shirt.slice(1, 3), 16);
    const g2 = parseInt(shirt.slice(3, 5), 16);
    const b = parseInt(shirt.slice(5, 7), 16);
    const dr = Math.round(r * 0.7).toString(16).padStart(2, "0");
    const dg = Math.round(g2 * 0.7).toString(16).padStart(2, "0");
    const db = Math.round(b * 0.7).toString(16).padStart(2, "0");
    return `#${dr}${dg}${db}`;
  }
  return PAL[token] ?? "#ff00ff";
}

// ─── Pixel maps (16 cols) ─────────────────────────────────────────────────────
// Each character string encodes one row of 16 pixels.
// Legend: _ transparent, O dark-outline, H hair-mid, L hair-hi,
//         S skin, s skin-hi, F skin-shadow, E eye, W white, g grey
//         C shirt, D shirt-dark, P pants-dark, p pants-mid, K shoe, N neutral

// Head + face (rows 0–16)  — same for all anim states
const HEAD = [
  "________________",  // 0
  "________________",  // 1
  "____OOOOOOO_____",  // 2
  "___OHHHLOLOOO___",  // 3  (two O at right = hair on right side too)
  "__OHHHLHOHHHHO__",  // 4
  "_OLHHHHHOHHHHO__",  // 5
  "_OLHHHHHHHHHHO__",  // 6
  "_OLHHHHHHHHHHO__",  // 7
  "_OLHHHHHHHHHHO__",  // 8
  "_OLHHHHHHHHHHO__",  // 9
  "_OHHHLLLLHLLHO__",  // 10
  "_OHHHHOOHOHHHO__",  // 11
  "_OHHOOSSPSSOO__",  // 12  (eye whites area — will be overridden)
  "__OOSSSSSSFO___",  // 13  (face)
  "___NsWESSEWsN___",  // 14  (eyes)
  "___NsWgssGWsN___",  // 15  (mouth)
  "____NFsSSsFN____",  // 16  (chin)
];

// Corrected head rows with proper eye/mouth rendering
const HEAD_ROWS: string[] = [
  "________________",  // 0
  "________________",  // 1
  "____OOOOOOO_____",  // 2
  "___OHHHLOHHO____",  // 3
  "__OHHHHLHHHHHHO_",  // 4
  "_OLHHHHHOHHHHO__",  // 5
  "_OLHHHHHHHHHO___",  // 6
  "_OLHHHHHHHHHO___",  // 7
  "_OLHHHHHHHHHO___",  // 8
  "_OLHHHHHHHHHO___",  // 9
  "_OHHHLLLOHLHO___",  // 10
  "_OHHHHOOHOHHHO__",  // 11 — brow ridge
  "_OHHOOSSPSSOO___",  // 12 — eye area
  "__OOSSESSESOo___",  // 13 — eyes row
  "___NsWESSEWsN___",  // 14
  "___NsWgSSgWsN___",  // 15
  "____NFsSSsFN____",  // 16
];

// Arms + shirt body (rows 17–21) — default idle
const ARMS_IDLE: string[] = [
  "___NCNNSSNNDN___",  // 17 collar
  "__NCDDDWKKWDDN__",  // 18 upper shirt
  "__NDDDWKKWDDCN__",  // 19
  "__sWDDWKKWNSSN__",  // 20 lower shirt + arms at side
  "__NSNDDWKKWSFN__",  // 21
];

// Arms for typing — both arms angled down/forward
const ARMS_TYPE: string[] = [
  "___NCNNSSNNDN___",  // 17
  "__NCDDDWKKWDDN__",  // 18
  "_NDDDWKKKKWDDNs_",  // 19 arms wide
  "_NSSsDDWKKWNSsN_",  // 20
  "_NsSSNDKKKKNSSN_",  // 21 hands reach forward
];

// Arms for celebrate — both arms raised high
const ARMS_CELEBRATE: string[] = [
  "sNNNCNNSSNNCNNs_",  // 17 arms up
  "NsNCDDDWKKWDDsN_",  // 18
  "___NDDDWKKWDDD__",  // 19
  "__ssDDDWKKWNss__",  // 20
  "___NSNKKKKKNSN__",  // 21
];

// Arms for sleep — drooped
const ARMS_SLEEP: string[] = [
  "___NCNNSSNNDN___",  // 17
  "__NCDDDWKKWDDN__",  // 18
  "__NDDDKKKKKDDNs_",  // 19
  "__NSDDKKKKKNSp__",  // 20
  "___SpNpppppNS___",  // 21
];

// Legs (rows 22–23) — various states
const LEGS_IDLE: string[] = [
  "__NFNpWKKWDNN___",  // 22
  "___NNpWWWWpN____",  // 23
];

const LEGS_WALK_A: string[] = [  // left leg forward
  "__NFNpKppKDNN___",
  "___KppK___pKN___",
];

const LEGS_WALK_B: string[] = [  // right leg forward
  "__NFNpKppKDNN___",
  "___NppK___KpK___",
];

const LEGS_TYPE: string[] = [
  "__NFNpWKKWDNN___",
  "___NpKK___KpN___",
];

const LEGS_CELEBRATE: string[] = [
  "__NpNpKKKKKpNN__",
  "_NKppK_____KppKN",
];

// ─── Render helper ────────────────────────────────────────────────────────────

function pixelRow(
  rowStr: string,
  rowIndex: number,
  bx: number,
  by: number,
  px: number,
  shirt: string,
  keyPrefix: string,
): React.ReactNode[] {
  const rects: React.ReactNode[] = [];
  for (let ci = 0; ci < rowStr.length; ci++) {
    const token = rowStr[ci];
    if (token === "_" || token === " ") continue;
    // map lowercase 'o' and 'G' to existing tokens
    const t = token === "o" ? "O" : token === "G" ? "g" : token;
    const fill = col(t, shirt);
    rects.push(
      <rect
        key={`${keyPrefix}${rowIndex}_${ci}`}
        x={bx + ci * px}
        y={by + rowIndex * px}
        width={px}
        height={px}
        fill={fill}
      />
    );
  }
  return rects;
}

// ─── PixelChar component ──────────────────────────────────────────────────────

export function PixelChar({
  x, y, color, anim, frame, flip = false, hat = false, size = 1,
}: Props) {
  const px = Math.round(PX * size);
  const charW = 16 * px;
  const charH = 24 * px;

  // Animation offsets
  const typeBounce = anim === "type" ? (Math.floor(frame / 6) % 2 === 0 ? -px : 0) : 0;
  const celebJump = anim === "celebrate"
    ? Math.round(Math.abs(Math.sin(frame / 30 * Math.PI * 4)) * px * 6)
    : 0;

  const bx = x - charW / 2;
  const by = y - charH + typeBounce - celebJump;

  const walkPhase = Math.floor(frame / 8) % 2 === 0;

  // Choose arm and leg rows
  const armRows =
    anim === "type" ? ARMS_TYPE
    : anim === "celebrate" ? ARMS_CELEBRATE
    : anim === "sleep" ? ARMS_SLEEP
    : ARMS_IDLE;

  const legRows =
    anim === "walk" ? (walkPhase ? LEGS_WALK_A : LEGS_WALK_B)
    : anim === "celebrate" ? LEGS_CELEBRATE
    : anim === "type" ? LEGS_TYPE
    : LEGS_IDLE;

  const rects: React.ReactNode[] = [];

  // ── Hat (orchestrator crown)
  if (hat) {
    rects.push(
      <rect key="hat-brim" x={bx + px} y={by + px * 2} width={14 * px} height={px * 2} fill={color} />,
      <rect key="hat-body" x={bx + 3 * px} y={by - px * 3} width={10 * px} height={px * 4} fill={color} />,
      <rect key="hat-star" x={bx + 7 * px} y={by - px * 2} width={2 * px} height={2 * px} fill="#f59e0b" />,
    );
  }

  // ── Head rows 0–16
  HEAD_ROWS.forEach((row, ri) => {
    rects.push(...pixelRow(row, ri, bx, by, px, color, "h"));
  });

  // ── Arm/shirt rows 17–21
  armRows.forEach((row, ri) => {
    rects.push(...pixelRow(row, 17 + ri, bx, by, px, color, "a"));
  });

  // ── Leg rows 22–23
  legRows.forEach((row, ri) => {
    rects.push(...pixelRow(row, 22 + ri, bx, by, px, color, "g"));
  });

  // ── Overlays
  const zzzEl = anim === "sleep" ? (
    <text key="zzz" x={x + charW * 0.35} y={by - px} fontSize={px * 5}
      fill="#c0caf5" fontFamily="monospace" opacity={0.85}>Zzz</text>
  ) : null;

  const errorEl = anim === "error" && Math.floor(frame / 10) % 2 === 0 ? (
    <g key="err">
      <circle cx={x} cy={by - px * 5} r={px * 4} fill="#f7768e" opacity={0.9} />
      <text x={x - px} y={by - px * 2} fontSize={px * 6} fill="white"
        fontWeight="bold" fontFamily="monospace">!</text>
    </g>
  ) : null;

  const starEls = anim === "celebrate"
    ? (
      [[-5, -8], [5, -10], [0, -14], [-9, -5], [9, -6]].map(([dx, dy], i) => (
        <text
          key={`star${i}`}
          x={x + dx * px}
          y={by + dy * px}
          fontSize={px * 4}
          fill={["#f59e0b", "#4ade80", "#4a9eff", "#f472b6", "#a78bfa"][i]}
          fontFamily="monospace"
          opacity={0.7 + Math.sin(frame / 30 * Math.PI * 3 + i) * 0.3}
        >★</text>
      ))
    ) : null;

  const flipTransform = flip ? `translate(${x * 2}, 0) scale(-1, 1)` : undefined;

  return (
    <g transform={flipTransform} style={{ imageRendering: "pixelated" }}>
      {rects}
      {zzzEl}
      {errorEl}
      {starEls}
    </g>
  );
}

// ─── SpeechBubble ─────────────────────────────────────────────────────────────

export function SpeechBubble({
  x, y, text, color = COLORS.bubbleBg, textColor = COLORS.bubbleText,
}: {
  x: number; y: number; text: string; color?: string; textColor?: string;
}) {
  const maxW = 160;
  const pad = 8;
  const fontSize = 11;
  const lines = text.length > 22 ? [text.slice(0, 22), text.slice(22, 44)] : [text];
  const bH = lines.length * (fontSize + 4) + pad * 2;

  return (
    <g>
      <rect x={x - maxW / 2} y={y - bH - 10} width={maxW} height={bH} fill={color} rx={6} opacity={0.95} />
      <polygon points={`${x - 5},${y - 10} ${x + 5},${y - 10} ${x},${y - 2}`} fill={color} />
      {lines.map((line, i) => (
        <text key={i} x={x} y={y - bH - 10 + pad + fontSize + i * (fontSize + 4)}
          textAnchor="middle" fontSize={fontSize} fill={textColor}
          fontFamily="monospace" fontWeight={600}>{line}</text>
      ))}
    </g>
  );
}
