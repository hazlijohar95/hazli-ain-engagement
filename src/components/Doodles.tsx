import { useId } from "react";

/**
 * Hand-drawn marks that make the neo-brutalist parts feel human: slightly uneven paths,
 * a second pen pass where a person would go over a line twice. All decorative (aria-hidden).
 */

/** The sketch heart outline (37 x 35 box), also drawn into the link-preview image. */
export const HEART =
  "M17 28.5C15.8 27.6 3.4 19.6 3.1 11.4C2.9 6.6 6.4 3.6 10.2 3.9C13.3 4.1 15.6 6.4 16.9 9.2C18.2 6.1 20.8 3.6 24.3 3.7C28.3 3.9 31.2 7.2 30.8 11.9C30.2 19.8 18.4 27.7 17 28.5Z";

/** A sketchy heart: pink fill (or paper, when `empty`), inked outline, a second loose pen pass and a solid offset shadow. */
export function SketchHeart({ className, empty = false }: { className: string; empty?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 37 35" aria-hidden="true">
      <path d={HEART} transform="translate(3 3)" style={{ fill: "var(--ink)" }} />
      <path
        d={HEART}
        style={{ fill: empty ? "var(--card)" : "var(--pink)", stroke: "var(--ink)", strokeWidth: 2.2, strokeLinejoin: "round" }}
      />
      <path
        d="M16.4 27.4C11.2 24 4.6 18.1 4 12.1M29.9 12.9C29 18.6 23.3 24 18.4 27.3"
        style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 1, strokeLinecap: "round", opacity: 0.55 }}
      />
      <path d="M8.6 8.6C9.5 7.4 11 7 12.2 7.4" style={{ fill: "none", stroke: "var(--on-teal)", strokeWidth: 1.6, strokeLinecap: "round" }} />
    </svg>
  );
}

/**
 * A line of pink running stitch that can sew itself in: the thread is masked by a solid stroke along
 * the same path, and drawing the mask in reveals the stitches one after another.
 */
export function Stitch({ className, viewBox, d, stretch = false }: { className?: string; viewBox: string; d: string; stretch?: boolean }) {
  const id = useId();
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio={stretch ? "none" : undefined} aria-hidden="true">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse">
          <path className="stitch-sew" d={d} pathLength={1} />
        </mask>
      </defs>
      <path className="stitch-thread" d={d} mask={`url(#${id})`} />
    </svg>
  );
}

/** A brush-pen underline that draws itself in when its section arrives. */
export function Underline({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 160 14" aria-hidden="true" preserveAspectRatio="none">
      <path className="underline-stroke" pathLength={1} d="M3 9.5C28 5.8 52 4.6 79 5.6C104 6.5 127 8.2 157 6.2" />
      <path className="underline-echo" pathLength={1} d="M14 11.4C46 9 90 8.6 138 9.8" />
    </svg>
  );
}

/** A freehand four-point sparkle (24 x 24 box), also drawn into the logo. */
export const SPARKLE =
  "M12 2.5C12.6 8.4 14.1 10.6 21.5 12C14.3 13.2 12.7 15.5 12 21.5C11.2 15.6 9.6 13.3 2.5 12.1C9.8 10.7 11.3 8.6 12 2.5Z";

/** A loose hand-drawn arrow; point it with CSS rotate. */
export function Arrow({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" aria-hidden="true">
      <path pathLength={1} d="M3 19C10 10 21 5.5 35 7.5" style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 1.8, strokeLinecap: "round" }} />
      <path pathLength={1} d="M29.5 3.2L35.4 7.6L30.6 13" style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }} />
    </svg>
  );
}
