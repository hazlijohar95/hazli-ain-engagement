import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HEART, SPARKLE } from "../src/components/Doodles";
import { HoopMark } from "../src/logo/HoopMark";
import { EVENT } from "../src/event";
export { icsText } from "../src/lib/calendar";

const PAPER = "#F6F1E8";
const CARD = "#FFFDF8";
const INK = "#2F2620";
const INK_2 = "#6E5A4A";
/** The site's teal and pink, lightened so the names stay friendly inside their ink outline. */
const TEAL_LIGHT = "#4FA7A2";
const PINK_LIGHT = "#EE8CAF";
const PINK = "#D9668E";
const GOLD_LIGHT = "#F3D58A";

/** Renders SVG children inside an <svg> so React treats them as SVG, then returns only the inner markup. */
function inner(node: ReactNode): string {
  return renderToStaticMarkup(<svg>{node}</svg>).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

/** The hoop mark as a nested <svg> placed at (x, y). */
function hoopAt(x: number, y: number, size: number, variant: "full" | "icon"): string {
  return `<g transform="translate(${x},${y})">${renderToStaticMarkup(<HoopMark size={size} variant={variant} />)}</g>`;
}

/** A heart with a face: ink outline, a hard shadow, two eyes, a smile and a blush. Drawn on the heart's own 37 x 35 board. */
function HeartPal({ x, y, tilt, fill, blush }: { x: number; y: number; tilt: number; fill: string; blush: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt} 71 63) scale(4.2)`}>
      <path d={HEART} transform="translate(2.2 2.2)" fill={INK} />
      <path d={HEART} fill={fill} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      <circle cx={9.2} cy={16.6} r={1.9} fill={blush} />
      <circle cx={24.8} cy={16.6} r={1.9} fill={blush} />
      <circle cx={12.6} cy={13.4} r={1.25} fill={INK} />
      <circle cx={21.4} cy={13.4} r={1.25} fill={INK} />
      <path d="M14 17.4Q17 20.6 20 17.4" fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

function Spark({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <path d={SPARKLE} transform={`translate(${x} ${y}) scale(${scale})`} fill={GOLD_LIGHT} stroke={INK} strokeWidth={3 / scale} strokeLinejoin="round" />
  );
}

/**
 * The link preview, in the page's soft-brutalist drawing style: ink outlines, hard shadows, and two
 * heart pals holding the pink thread. Chat apps show it small, so the names carry it.
 */
export function ogImage(): string {
  const names = (
    <>
      {EVENT.couple.first.short}
      <tspan fill="inherit" dx={22}>
        &amp;
      </tspan>
      <tspan dx={22}>{EVENT.couple.second.short}</tspan>
    </>
  );
  const art = inner(
    <g textAnchor="middle">
      <Spark x={150} y={96} scale={2.4} />
      <Spark x={1010} y={70} scale={1.7} />
      <Spark x={1066} y={250} scale={1.2} />

      <rect x={424} y={58} width={352} height={50} rx={25} fill={GOLD_LIGHT} stroke={INK} strokeWidth={3.5} />
      <text x={602} y={91} fontFamily="Paper Mono" fontWeight={500} fontSize={19} letterSpacing={4} fill={INK}>
        THE ENGAGEMENT OF
      </text>

      {/* The names as a sticker: an ink shadow, then the letters with an ink edge. */}
      <g fontFamily="Cal Sans" fontSize={156} letterSpacing={3}>
        <text x={607} y={299} fill={INK} stroke={INK} strokeWidth={7} strokeLinejoin="round">
          {names}
        </text>
        <text x={600} y={292} fill={TEAL_LIGHT} stroke={INK} strokeWidth={7} strokeLinejoin="round" paintOrder="stroke">
          {EVENT.couple.first.short}
          <tspan fill={PINK_LIGHT} dx={22}>
            &amp;
          </tspan>
          <tspan dx={22}>{EVENT.couple.second.short}</tspan>
        </text>
      </g>

      <path d="M222 470C330 520 450 424 600 462S880 520 978 470" fill="none" stroke={PINK} strokeWidth={5} strokeLinecap="round" strokeDasharray="15 12" />
      <HeartPal x={86} y={392} tilt={-9} fill={PINK} blush="#F7B6CB" />
      <HeartPal x={958} y={392} tilt={9} fill={TEAL_LIGHT} blush="#F7B6CB" />

      <g transform="rotate(-2 600 446)">
        <rect x={398} y={408} width={420} height={92} rx={20} fill={INK} />
        <rect x={390} y={400} width={420} height={92} rx={20} fill={CARD} stroke={INK} strokeWidth={4} />
        <text x={600} y={464} fontFamily="Cal Sans" fontSize={50} letterSpacing={2} fill={INK}>
          {EVENT.dateShort}
        </text>
      </g>
      <text x={600} y={566} fontFamily="Paper Mono" fontWeight={500} fontSize={21} letterSpacing={2} fill={INK_2}>
        {`${EVENT.weekday} · ${EVENT.venue.label}`}
      </text>
    </g>,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${PAPER}"/>
${art}
</svg>`;
}

export function touchIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
<rect width="180" height="180" fill="${PAPER}"/>
${hoopAt(10, 10, 160, "icon")}
</svg>`;
}

/** The favicon: the compact hoop, so browser tabs show the same mark as the hero. */
export function iconSvg(): string {
  return renderToStaticMarkup(<HoopMark size={200} variant="icon" />);
}
