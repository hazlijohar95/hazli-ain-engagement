import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { EVENT } from "../event";
import { prefersReducedMotion } from "../lib/hooks";
import { play } from "../lib/sfx";
import { Arrow, HEART } from "./Doodles";

/**
 * The cover the guest opens, like a sealed card. Browsers keep every sound locked until the first
 * tap, so the tap comes first: it unlocks the audio, then a pen writes the couple's names letter by
 * letter (with its scratch), a pink stitch sews in under them, and the card lifts away as the music
 * comes in.
 *
 *   shown    the sealed card: a heart sketched in ink, "You're invited", and the button
 *   writing  after the tap: the names are written and stitched
 *   leaving  the card lifts off the page
 */
export type CoverState = "shown" | "writing" | "leaving";

/** When the pen starts, after the tap: long enough for the button to clear out of its way. */
const WRITE_AT = 250;
const PEN_LEAD = 250;
const STITCH = 650;
/** A breath after the stitch, so the guest sees the finished card before it lifts. */
const ADMIRE = 650;

type Stroke = { char: string; start: number; duration: number };

/**
 * A pen's timing for each letter: wider and curlier letters take longer, the "&" longest, and the
 * pen pauses between words. A small fixed wobble keeps it from feeling metronomic.
 */
function strokes(text: string): { letters: Stroke[]; total: number } {
  let t = 0;
  const letters = [...text].map((char, i): Stroke => {
    const wobble = [0, 18, -10, 12, -6, 22, -14, 8][i % 8];
    const duration = char === " " ? 0 : char === "&" ? 320 : /[mwHA]/.test(char) ? 200 + wobble : /[il]/.test(char) ? 110 + wobble : 160 + wobble;
    const stroke = { char, start: t, duration };
    t += char === " " ? 170 : duration + 30;
    return stroke;
  });
  return { letters, total: t };
}

const NAMES = strokes(EVENT.couple.short);

/** From the tap to the card lifting, when nothing skips ahead and the pen is animated. */
export const COVER_WRITING_MS = WRITE_AT + NAMES.total + 80 + STITCH + ADMIRE;

export function Cover({ state, onOpen }: { state: CoverState; onOpen: () => void }) {
  const titleId = useId();
  const [fontsReady, setFontsReady] = useState(false);
  const scriptRef = useRef<HTMLSpanElement>(null);
  const penRef = useRef<SVGSVGElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
    // Draw nothing until the handwriting font is in, or the names would be measured in the fallback.
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 1200));
    let cancelled = false;
    void Promise.race([document.fonts.load("500 64px Caveat"), timeout]).then(() => !cancelled && setFontsReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Writing: the pen travels the letters as they appear (down into each one, up through its middle,
  // out at its right edge) and scratches once per stroke. Measured from the laid-out letters, so it
  // fits any width. Skipping ahead (a second tap) cancels it all.
  useLayoutEffect(() => {
    const script = scriptRef.current;
    const pen = penRef.current;
    if (state !== "writing" || !script || !pen || prefersReducedMotion()) return;

    const scratch = () => play("pen", { jitter: { volume: 0.25, playbackRate: 0.15 } });
    const timers = NAMES.letters.flatMap(({ char, start, duration }) => {
      if (char === " ") return [];
      const at = WRITE_AT + start;
      // A long letter is two strokes of the pen, so it scratches twice.
      return duration > 180 ? [window.setTimeout(scratch, at), window.setTimeout(scratch, at + duration * 0.55)] : [window.setTimeout(scratch, at)];
    });

    const box = script.getBoundingClientRect();
    const span = NAMES.total + PEN_LEAD * 2;
    const at = (ms: number) => Math.min(1, (ms + PEN_LEAD) / span);
    const frames: Keyframe[] = [];
    script.querySelectorAll<HTMLElement>("[data-ink]").forEach((letter, i) => {
      const { start, duration } = NAMES.letters[Number(letter.dataset.ink)];
      const r = letter.getBoundingClientRect();
      const x = r.left - box.left;
      const w = r.width;
      const mid = box.height * 0.62;
      const lift = i % 2 ? -0.16 : 0.12;
      frames.push(
        { offset: at(start), transform: `translate(${x}px, ${mid}px)`, opacity: 1 },
        { offset: at(start + duration * 0.4), transform: `translate(${x + w * 0.45}px, ${mid + box.height * lift}px)`, opacity: 1 },
        { offset: at(start + duration), transform: `translate(${x + w}px, ${mid + box.height * 0.08}px)`, opacity: 1 },
      );
    });
    const last = frames[frames.length - 1]?.transform ?? "none";
    frames.push({ offset: 1, transform: `${last} translate(26px, -34px)`, opacity: 0 });
    frames.unshift({ offset: 0, transform: `${frames[0]?.transform ?? "none"} translate(-18px, -20px)`, opacity: 0 });
    // Keyframe offsets must rise; a space puts two frames on the same moment.
    let previous = 0;
    for (const frame of frames) {
      frame.offset = Math.max(previous, typeof frame.offset === "number" ? frame.offset : previous);
      previous = frame.offset;
    }
    const animation = pen.animate(frames, { duration: span, delay: WRITE_AT - PEN_LEAD, easing: "linear", fill: "both" });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      animation.cancel();
    };
  }, [state]);

  return (
    <div
      className="cover"
      data-state={state}
      data-play={fontsReady}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ "--write-at": `${WRITE_AT}ms`, "--written": `${WRITE_AT + NAMES.total}ms` } as CSSProperties}
      // A tap anywhere opens it, and a second tap skips the writing; the button is the same action
      // for keyboards and screen readers.
      onClick={onOpen}
    >
      <div className="cover-sheet">
        <div className="cover-body">
          <svg className="cover-heart" viewBox="0 0 40 38" aria-hidden="true">
            <path className="cover-heart-shadow" d={HEART} transform="translate(5 5)" />
            <path className="cover-heart-fill" d={HEART} transform="translate(2 2)" />
            <path className="cover-heart-line" d={HEART} transform="translate(2 2)" pathLength={1} />
          </svg>

          <p className="tag cover-tag">You're invited</p>

          {/* The button and the names share one spot: the tap clears the button and the pen writes there. */}
          <div className="cover-stage">
            <h2 className="cover-names" id={titleId}>
              <span className="visually-hidden">{EVENT.couple.short}</span>
              <span className="cover-script" ref={scriptRef} aria-hidden="true">
                {NAMES.letters.map(({ char, start, duration }, i) =>
                  char === " " ? (
                    <span key={i} className="cover-space" />
                  ) : (
                    <span
                      key={i}
                      className="cover-ink"
                      data-ink={i}
                      data-amp={char === "&" || undefined}
                      style={{ "--t": `${start}ms`, "--d": `${duration}ms` } as CSSProperties}
                    >
                      {char}
                    </span>
                  ),
                )}
                {/* A fountain pen held at a writer's slant, its nib at (0, 40): the point that touches the paper. */}
                <svg className="cover-pen" ref={penRef} viewBox="0 0 34 42" aria-hidden="true">
                  <path d="M0 40L6 27L10.8 30.6Z" fill="var(--ink)" />
                  <path
                    d="M4.8 26.1L12 31.5L31.2 5.9C32.4 4.3 31.6 2.1 29.9 1.1L28.3 0.2C26.8 -0.6 25 -0.1 24 1.2Z"
                    fill="var(--teal)"
                    stroke="var(--ink)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M7.2 22.9L14.4 28.3L16.2 25.9L9 20.5Z" fill="var(--gold-light)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M15 17L26 2.6" stroke="var(--on-teal)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                </svg>
              </span>
            </h2>

            <button
              ref={buttonRef}
              className="btn-brutal cover-open"
              data-tone="jade"
              data-sound="none"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              Open invitation
            </button>
          </div>

          <svg className="cover-stitch" viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <mask id={`${titleId}-sew`} maskUnits="userSpaceOnUse">
                <path className="cover-stitch-sew" d="M6 8C46 4 92 11 130 7C160 4 190 6 214 8" pathLength={1} />
              </mask>
            </defs>
            <path className="cover-stitch-thread" d="M6 8C46 4 92 11 130 7C160 4 190 6 214 8" mask={`url(#${titleId}-sew)`} />
          </svg>

          <p className="note cover-note" aria-hidden="true">
            <Arrow className="note-arrow cover-arrow" />
            tap to open
          </p>
        </div>
      </div>
    </div>
  );
}
