import { useId } from "react";
import { SPARKLE } from "../components/Doodles";
import { HOOP_A, HOOP_AMP, HOOP_AMP_BOX, HOOP_CX, HOOP_CY, HOOP_H } from "./hoopGlyphs";

/**
 * The embroidery-hoop mark: H & A satin-stitched onto linen, held in a wooden hoop with a brass screw,
 * the spare fabric gathered round the outside, and the pink thread running from the "&" to its needle.
 * Drawn on a 200 × 200 board.
 */

// The hoop is centred where the letters were laid out (see scripts/extract-hoop-glyphs.mjs).
const CX = HOOP_CX;
const CY = HOOP_CY;
const R_OUTER = 74; // outside edge of the outer hoop
const R_BAND = 66; // inside edge of the outer hoop
const R_INNER = 62; // inside edge of the inner hoop, where the fabric shows

const INK = "#2f2620";
const WOOD = "#f0cf86";
const WOOD_INNER = "#ddb361";
const GRAIN = "#c4923a";
const BRASS = "#d9b25a";
const LINEN = "#fbf6ec";
const LINEN_OUT = "#f1e7d5";
const WEAVE = "#ece2d0";
const STEEL = "#d9dde0";
const PINK = "#d9668e";
const PINK_LIGHT = "#f6b9cf";

const THREADS = {
  teal: { base: "#0f6e70", light: "#4fa3a0", dark: "#0a4c4e" },
  pink: { base: PINK, light: "#f4aac4", dark: "#a8456c" },
} as const;

const polar = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const pt = ([x, y]: [number, number]) => `${x.toFixed(2)} ${y.toFixed(2)}`;

/** An arc of radius r from angle a to b (degrees, clockwise from 3 o'clock). */
function arc(r: number, a: number, b: number): string {
  return `M${pt(polar(r, a))}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${pt(polar(r, b))}`;
}

/** The spare fabric around the hoop: a soft, rippled circle, smoothed with Catmull-Rom curves. */
const RUFFLE = (() => {
  const n = 30;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = 85 + 3.6 * Math.sin(5 * t + 0.7) + 1.8 * Math.sin(11 * t + 2.1);
    return [CX + r * Math.cos(t), CY + r * Math.sin(t)] as [number, number];
  });
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return `${d}Z`;
})();

/** Folds where the gathered fabric bunches against the hoop: short curves running outward. */
const FOLDS = [24, 70, 98, 142, 166, 205, 318, 344]
  .map((deg) => `M${pt(polar(R_OUTER + 1.5, deg))}Q${pt(polar(R_OUTER + 5, deg + 2.5))} ${pt(polar(R_OUTER + 8, deg + 1))}`)
  .join("");

/** Wood grain on the outer hoop: broken arcs at slightly different radii. */
const GRAIN_ARCS = [
  [68.4, 110, 168],
  [68.4, 196, 238],
  [70.6, 128, 206],
  [70.6, 300, 352],
  [72.2, 18, 74],
  [72.2, 150, 184],
  [68.4, 6, 52],
  [70.6, 222, 258],
]
  .map(([r, a, b]) => arc(r, a, b))
  .join("");

const AMP_TAIL: [number, number] = [HOOP_AMP_BOX.x2 - 3.2, HOOP_AMP_BOX.y2 - 2.4];
const EYE: [number, number] = [166, 170];
const TIP: [number, number] = [190, 194];

function SatinLetter({ d, thread, fillId }: { d: string; thread: keyof typeof THREADS; fillId: string }) {
  const c = THREADS[thread];
  return (
    <g>
      {/* Raised thread casts a small shadow on the linen. */}
      <path d={d} transform="translate(0.7 1.1)" fill={c.dark} opacity={0.3} />
      <path d={d} fill={c.base} />
      <path d={d} fill={`url(#${fillId})`} />
      {/* Split-stitch outline. */}
      <path d={d} fill="none" stroke={c.dark} strokeWidth={0.9} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c.light} strokeWidth={0.45} strokeDasharray="1.4 1.1" opacity={0.7} />
    </g>
  );
}

function Satin({ id, thread, angle }: { id: string; thread: keyof typeof THREADS; angle: number }) {
  const c = THREADS[thread];
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={1.8} height={8} patternTransform={`rotate(${angle})`}>
      <rect x={0} y={0} width={0.7} height={8} fill={c.light} opacity={0.6} />
      <rect x={1.35} y={0} width={0.35} height={8} fill={c.dark} opacity={0.4} />
    </pattern>
  );
}

function Sparkle({ x, y, size }: { x: number; y: number; size: number }) {
  const k = size / 24;
  return (
    <path
      d={SPARKLE}
      transform={`translate(${x - 12 * k} ${y - 12 * k}) scale(${k})`}
      fill="#f3d58a"
      stroke={INK}
      strokeWidth={1.8 / k}
      strokeLinejoin="round"
    />
  );
}

/**
 * `full` is the illustration. `icon` crops to the hoop and drops the loose fabric, needle and sparkles,
 * so H&A stays legible at favicon and home-screen sizes.
 */
export function HoopMark({ size, className, variant = "full" }: { size: number; className?: string; variant?: "full" | "icon" }) {
  const full = variant === "full";
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { weave: `${uid}w`, teal: `${uid}t`, pink: `${uid}p`, fabric: `${uid}f` };
  const thread = `M${pt(AMP_TAIL)}C${AMP_TAIL[0] + 10} ${AMP_TAIL[1] + 16} ${EYE[0] - 34} ${EYE[1] - 2} ${pt(EYE)}`;
  const tail = `M${pt(EYE)}C${EYE[0] + 6} ${EYE[1] - 6} ${EYE[0] + 13} ${EYE[1] - 3} ${EYE[0] + 12} ${EYE[1] + 6}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      viewBox={full ? "0 0 200 200" : `${CX - 80} ${CY - 88} 160 160`}
      role="img"
      aria-label="H & A embroidered in an embroidery hoop"
    >
      <defs>
        <pattern id={ids.weave} patternUnits="userSpaceOnUse" width={2.4} height={2.4}>
          <path d="M0 0.6H2.4M1.8 0V2.4" stroke={WEAVE} strokeWidth={0.55} />
        </pattern>
        <Satin id={ids.teal} thread="teal" angle={-38} />
        <Satin id={ids.pink} thread="pink" angle={-38} />
        <clipPath id={ids.fabric}>
          <circle cx={CX} cy={CY} r={R_INNER} />
        </clipPath>
      </defs>

      {full && (
        <>
          {/* Spare fabric gathered round the hoop. */}
          <path d={RUFFLE} fill={LINEN_OUT} />
          <path d={RUFFLE} fill={`url(#${ids.weave})`} opacity={0.5} />
          <path d={FOLDS} fill="none" stroke={GRAIN} strokeWidth={1} strokeLinecap="round" opacity={0.35} />
          <path d={RUFFLE} fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        </>
      )}

      {/* Taut linen inside the hoop, with the hoop's shadow round its edge. */}
      <circle cx={CX} cy={CY} r={R_INNER} fill={LINEN} />
      <g clipPath={`url(#${ids.fabric})`}>
        {full && <rect x={CX - R_INNER} y={CY - R_INNER} width={R_INNER * 2} height={R_INNER * 2} fill={`url(#${ids.weave})`} />}
        <circle cx={CX + 1} cy={CY + 2} r={R_INNER} fill="none" stroke={INK} strokeWidth={5} opacity={0.07} />
      </g>

      <SatinLetter d={HOOP_H} thread="teal" fillId={ids.teal} />
      <SatinLetter d={HOOP_A} thread="teal" fillId={ids.teal} />
      <SatinLetter d={HOOP_AMP} thread="pink" fillId={ids.pink} />

      {/* Inner hoop, then the outer hoop over it. */}
      <circle cx={CX} cy={CY} r={(R_INNER + R_BAND) / 2} fill="none" stroke={WOOD_INNER} strokeWidth={R_BAND - R_INNER} />
      <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke={INK} strokeWidth={1.8} />
      <circle cx={CX} cy={CY} r={(R_BAND + R_OUTER) / 2} fill="none" stroke={WOOD} strokeWidth={R_OUTER - R_BAND} />
      <path d={GRAIN_ARCS} fill="none" stroke={GRAIN} strokeWidth={0.7} strokeLinecap="round" opacity={0.75} />
      <path d={arc(72.4, 196, 252)} fill="none" stroke="#fff8e6" strokeWidth={1.3} strokeLinecap="round" opacity={0.9} />
      <circle cx={CX} cy={CY} r={R_BAND} fill="none" stroke={INK} strokeWidth={2} />
      <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke={INK} strokeWidth={2.4} />

      {/* The outer hoop splits at the top into two blocks, drawn together by a brass screw. */}
      <rect x={96.6} y={CY - R_OUTER - 1} width={6.8} height={R_OUTER - R_BAND + 2} fill={WOOD_INNER} />
      <path d={`M96.6 ${CY - R_OUTER - 1}V${CY - R_BAND + 1}M103.4 ${CY - R_OUTER - 1}V${CY - R_BAND + 1}`} stroke={INK} strokeWidth={1.6} />
      {[87.5, 104].map((x) => (
        <rect key={x} x={x} y={20} width={8.5} height={17} rx={2.2} fill={WOOD} stroke={INK} strokeWidth={2} />
      ))}
      <rect x={82} y={26.4} width={36} height={4.2} rx={1.2} fill={BRASS} stroke={INK} strokeWidth={1.5} />
      <path d="M84 27.6H116" stroke="#fbe7b0" strokeWidth={0.8} strokeLinecap="round" />
      <path d="M79 24.5L83 24.5L85 28.5L83 32.5L79 32.5L77 28.5Z" fill={BRASS} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={122} cy={28.5} r={5.4} fill={BRASS} stroke={INK} strokeWidth={1.8} />
      <path d="M120 25.6L124 31.4" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />

      {full && (
        <>
          {/* Thread from the "&" over the hoop to the needle, plied with a lighter twist.
              The class names let the hero sew it in on first load; everywhere else it is static. */}
          <g className="hoop-sewing">
            <path className="hoop-thread" pathLength={1} d={thread} fill="none" stroke={PINK} strokeWidth={2.3} strokeLinecap="round" />
            <path
              className="hoop-ply"
              d={thread}
              fill="none"
              stroke={PINK_LIGHT}
              strokeWidth={0.8}
              strokeDasharray="1.6 1.6"
              strokeLinecap="round"
            />

            {/* Needle: a tapered steel shaft with its eye. */}
            <g className="hoop-needle">
              <path
                d={`M${EYE[0] - 2.3} ${EYE[1] + 2.3}L${pt(TIP)}L${EYE[0] + 2.3} ${EYE[1] - 2.3}C${EYE[0] - 1} ${EYE[1] - 6.5} ${EYE[0] - 6.5} ${EYE[1] - 1} ${EYE[0] - 2.3} ${EYE[1] + 2.3}Z`}
                fill={STEEL}
                stroke={INK}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              <ellipse cx={EYE[0] + 0.6} cy={EYE[1] + 0.6} rx={0.9} ry={2.6} transform={`rotate(-45 ${EYE[0] + 0.6} ${EYE[1] + 0.6})`} fill={INK} />
              <path d={`M${EYE[0] + 4} ${EYE[1] + 1}L${TIP[0] - 4} ${TIP[1] - 5}`} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" opacity={0.9} />
            </g>
            <path className="hoop-tail" d={tail} fill="none" stroke={PINK} strokeWidth={2.1} strokeLinecap="round" />
          </g>

          <Sparkle x={20} y={24} size={15} />
          <Sparkle x={182} y={30} size={11} />
        </>
      )}
    </svg>
  );
}
