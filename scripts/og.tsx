import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HEART } from "../src/components/Doodles";
import { HoopMark } from "../src/logo/HoopMark";
import { EVENT } from "../src/event";
export { icsText } from "../src/lib/calendar";

const PAPER = "#F6F1E8";
const INK = "#2F2620";
const TEAL = "#0F6E70";
const PINK = "#D9668E";
const GOLD = "#A9832F";

/** Renders SVG children inside an <svg> so React treats them as SVG, then returns only the inner markup. */
function inner(node: ReactNode): string {
  return renderToStaticMarkup(<svg>{node}</svg>).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

/** The hoop mark as a nested <svg> placed at (x, y). */
function hoopAt(x: number, y: number, size: number, variant: "full" | "icon"): string {
  return `<g transform="translate(${x},${y})">${renderToStaticMarkup(<HoopMark size={size} variant={variant} />)}</g>`;
}

export function ogImage(): string {
  const right = inner(
    <g textAnchor="middle">
      <text x={850} y={168} fontFamily="Paper Mono" fontWeight={500} fontSize={19} letterSpacing={6} fill={GOLD}>
        YOU ARE INVITED TO
      </text>
      <text x={850} y={204} fontFamily="Paper Mono" fontWeight={500} fontSize={19} letterSpacing={6} fill={GOLD}>
        THE ENGAGEMENT OF
      </text>
      <text x={850} y={318} fontFamily="Cal Sans" fontSize={104} letterSpacing={-2} fill={TEAL}>
        {EVENT.couple.first.short}
        <tspan fill={PINK} dx={14}>
          &amp;
        </tspan>
        <tspan dx={14}>{EVENT.couple.second.short}</tspan>
      </text>
      <path d="M720 382H820M880 382H980" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={HEART} transform="translate(831 366) scale(1.15)" fill={PINK} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <text x={850} y={468} fontFamily="Cal Sans" fontSize={48} letterSpacing={1} fill="#0B5254">
        {EVENT.dateShort}
      </text>
      <text x={850} y={516} fontFamily="Paper Mono" fontWeight={500} fontSize={17} letterSpacing={5} fill={GOLD}>
        {`${EVENT.weekday} · ${EVENT.venue.label}`.toUpperCase()}
      </text>
    </g>,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${PAPER}"/>
<rect x="24" y="24" width="1152" height="582" fill="none" stroke="${INK}" stroke-width="3"/>
${hoopAt(70, 55, 520, "full")}
${right}
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
