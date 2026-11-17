// Extracts H, & and A from Cal Sans into src/logo/hoopGlyphs.ts, laid out inside the embroidery hoop's fabric.
// Run with: node scripts/extract-hoop-glyphs.mjs
import opentype from "opentype.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const buf = readFileSync(join(root, "scripts/fonts/CalSans-Regular.ttf"));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const CENTER_X = 100;
const CENTER_Y = 108; // the hoop's centre
const WIDTH = 100; // the word's width, sized to sit comfortably inside the fabric circle
const GAP = 0.09; // space between letters, as a fraction of cap height

const glyphs = ["H", "&", "A"].map((ch) => font.charToGlyph(ch));
const capHeight = font.tables.os2.sCapHeight;

// Width scales linearly with font size, so measure at 1 unit and solve for the size that hits WIDTH.
const measure = (size) => {
  const boxes = glyphs.map((g) => g.getPath(0, 0, size).getBoundingBox());
  const cap = (capHeight / font.unitsPerEm) * size;
  const total = boxes.reduce((w, b) => w + (b.x2 - b.x1), 0) + 2 * GAP * cap;
  return { boxes, cap, total };
};
const unit = measure(100);
const size = (100 * WIDTH) / unit.total;
const { boxes, cap } = measure(size);
const baseline = CENTER_Y + cap / 2;

// Written out by hand: opentype's toPathData emits NaN for some whole-number coordinates.
const n = (v) => String(Math.round(v * 100) / 100);
const toD = (commands) =>
  commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === "Q") return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === "C") return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      return "Z";
    })
    .join("");

/* ---------- optical spacing ----------
 * Equal bounding-box gaps look uneven: the A's slanted side opens a wedge of space that the H's straight
 * stem does not. So measure each gap row by row across the cap height, cap how deep an open wedge may
 * count, and space the letters so every pair carries the same average gap. */

/** Each glyph's outline as polygons (curves sampled), drawn with its left edge at x = 0. */
const polygons = glyphs.map((g, i) => {
  const polys = [];
  let cur = [];
  let last = [0, 0];
  for (const c of g.getPath(-boxes[i].x1, baseline, size).commands) {
    if (c.type === "M") {
      if (cur.length) polys.push(cur);
      cur = [[c.x, c.y]];
    } else if (c.type === "L") cur.push([c.x, c.y]);
    else if (c.type === "Q" || c.type === "C") {
      for (let k = 1; k <= 16; k++) {
        const t = k / 16;
        const u = 1 - t;
        cur.push(
          c.type === "Q"
            ? [u * u * last[0] + 2 * u * t * c.x1 + t * t * c.x, u * u * last[1] + 2 * u * t * c.y1 + t * t * c.y]
            : [
                u ** 3 * last[0] + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x,
                u ** 3 * last[1] + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y,
              ],
        );
      }
    }
    if (c.type !== "Z") last = [c.x, c.y];
  }
  if (cur.length) polys.push(cur);
  return polys;
});

/** Leftmost and rightmost ink of a glyph on the horizontal line y, or null where it has none. */
function extent(polys, y) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const poly of polys)
    for (let k = 0; k < poly.length; k++) {
      const [x1, y1] = poly[k];
      const [x2, y2] = poly[(k + 1) % poly.length];
      if (y1 === y2 || y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
      const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  return lo === Infinity ? null : [lo, hi];
}

const ROWS = Array.from({ length: 160 }, (_, k) => baseline - cap + (cap * (k + 0.5)) / 160);
const profiles = polygons.map((polys) => ROWS.map((y) => extent(polys, y)));
const DEPTH = 0.3 * cap; // open space deeper than this past the closest point stops counting

/** The gap between glyph i at xi and glyph j at xj on every row where both have ink. */
function gaps(i, xi, j, xj) {
  return ROWS.flatMap((_, k) => {
    const a = profiles[i][k];
    const b = profiles[j][k];
    return a && b ? [b[0] + xj - (a[1] + xi)] : [];
  });
}

/** Narrowest gap between glyph i at xi and glyph j at xj. */
const closest = (i, xi, j, xj) => Math.min(...gaps(i, xi, j, xj));

/** Average optical gap: open space deeper than DEPTH past the closest point stops counting. */
function optical(i, xi, j, xj) {
  const g = gaps(i, xi, j, xj);
  const near = Math.min(...g);
  return g.reduce((sum, v) => sum + Math.min(v, near + DEPTH), 0) / g.length;
}

/** The x in [lo, lo + 200] where the increasing function f(x) reaches target. */
function bisect(f, target, lo) {
  let hi = lo + 200;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// The & and the A interlock at the baseline (the &'s tail under the A's leg), so that pair is set by a
// minimum clearance. The H then gets the same optical gap, which centres the & between its neighbours.
const CLEARANCE = 0.1 * cap;
const ampToA = bisect((x) => closest(1, 0, 2, x), CLEARANCE, 0);
const target = optical(1, 0, 2, ampToA);
const xs = [0, bisect((x) => optical(0, 0, 1, x), target, 0)];
xs[2] = xs[1] + ampToA;
const widths = boxes.map((b) => b.x2 - b.x1);
const naive = [0, widths[0] + GAP * cap, widths[0] + widths[1] + 2 * GAP * cap];
console.log(
  "optical gaps before",
  optical(0, naive[0], 1, naive[1]).toFixed(2),
  optical(1, naive[1], 2, naive[2]).toFixed(2),
  "after",
  optical(0, xs[0], 1, xs[1]).toFixed(2),
  optical(1, xs[1], 2, xs[2]).toFixed(2),
  "closest after",
  closest(0, xs[0], 1, xs[1]).toFixed(2),
  closest(1, xs[1], 2, xs[2]).toFixed(2),
);

// Everything is linear in font size: scale so the word is WIDTH wide again, then centre it.
const ratio = WIDTH / (xs[2] + widths[2]);
const finalSize = size * ratio;
const finalCap = cap * ratio;
const finalBaseline = CENTER_Y + finalCap / 2;
const placed = glyphs.map((g, i) => {
  const x = CENTER_X - WIDTH / 2 + xs[i] * ratio - boxes[i].x1 * ratio;
  const p = g.getPath(x, finalBaseline, finalSize);
  return { d: toD(p.commands), box: p.getBoundingBox() };
});

const box = (b) => `{ x1: ${b.x1.toFixed(2)}, y1: ${b.y1.toFixed(2)}, x2: ${b.x2.toFixed(2)}, y2: ${b.y2.toFixed(2)} }`;
const [H, AMP, A] = placed;

writeFileSync(
  join(root, "src/logo/hoopGlyphs.ts"),
  `// Generated by scripts/extract-hoop-glyphs.mjs from Cal Sans (OFL). Do not edit by hand.
export const HOOP_H = "${H.d}";
export const HOOP_AMP = "${AMP.d}";
export const HOOP_A = "${A.d}";
export const HOOP_AMP_BOX = ${box(AMP.box)};
/** The hoop's centre, where the word was laid out. */
export const HOOP_CX = ${CENTER_X};
export const HOOP_CY = ${CENTER_Y};
`,
);
console.log("H", box(H.box), "&", box(AMP.box), "A", box(A.box), "cap", finalCap.toFixed(2));
