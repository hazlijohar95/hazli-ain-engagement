import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { EVENT } from "../event";
import { prefersReducedMotion } from "../lib/hooks";
import { Arrow, HEART } from "./Doodles";

/**
 * The cover the guest opens, like a card out of its envelope. Its tap is also the gesture browsers
 * need before any sound, so every guest hears the music from the first page.
 *
 * The opening is drawn by hand: a heart sketched in ink and filled, the couple's names written
 * letter by letter with a pen that travels along them, then a pink running stitch underneath.
 */

/** When the pen starts writing, in ms after the fonts are ready. Everything else hangs off this. */
const WRITE_AT = 950;
const PEN_LEAD = 250;

type Stroke = { char: string; start: number; duration: number };

/**
 * A pen's timing for each letter: wider and curlier letters take longer, the "&" longest, and the
 * pen pauses between words. A small fixed wobble keeps it from feeling metronomic.
 */
function strokes(text: string): { letters: Stroke[]; total: number } {
  let t = 0;
  const letters = [...text].map((char, i): Stroke => {
    const wobble = [0, 18, -10, 12, -6, 22, -14, 8][i % 8];
    const duration = char === " " ? 0 : char === "&" ? 300 : /[mwHA]/.test(char) ? 190 + wobble : /[il]/.test(char) ? 100 + wobble : 150 + wobble;
    const stroke = { char, start: t, duration };
    t += char === " " ? 150 : duration + 25;
    return stroke;
  });
  return { letters, total: t };
}

const NAMES = strokes(EVENT.couple.short);

export function Cover({ state, onOpen }: { state: "shown" | "leaving"; onOpen: () => void }) {
  const titleId = useId();
  const [play, setPlay] = useState(false);
  const scriptRef = useRef<HTMLSpanElement>(null);
  const penRef = useRef<SVGSVGElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
    // Write only once the handwriting font is in, or the letters would be traced in the fallback and swap.
    const fontReady = document.fonts.load("500 64px Caveat");
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 1200));
    let cancelled = false;
    void Promise.race([fontReady, timeout]).then(() => !cancelled && setPlay(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // The pen follows the letters as they are written: down into each one, up through its middle, out
  // at its right edge, then lifts away. Measured from the laid-out letters, so it fits any width.
  useLayoutEffect(() => {
    const script = scriptRef.current;
    const pen = penRef.current;
    if (!play || !script || !pen || prefersReducedMotion()) return;
    const box = script.getBoundingClientRect();
    const spans = [...script.querySelectorAll<HTMLElement>("[data-ink]")];
    const frames: Keyframe[] = [];
    // The pen arrives PEN_LEAD before the first letter and lifts away over PEN_LEAD after the last.
    const span = NAMES.total + PEN_LEAD * 2;
    const at = (ms: number) => Math.min(1, (ms + PEN_LEAD) / span);
    spans.forEach((letter, i) => {
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
    // Keyframe offsets must rise; letters that share a moment (a space) collapse onto the same offset.
    let previous = 0;
    for (const frame of frames) {
      frame.offset = Math.max(previous, typeof frame.offset === "number" ? frame.offset : previous);
      previous = frame.offset;
    }
    const animation = pen.animate(frames, { duration: span, delay: WRITE_AT - PEN_LEAD, easing: "linear", fill: "both" });
    return () => animation.cancel();
  }, [play]);

  return (
    <div
      className="cover"
      data-state={state}
      data-play={play}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ "--write-at": `${WRITE_AT}ms`, "--written": `${WRITE_AT + NAMES.total}ms` } as CSSProperties}
      // A tap anywhere opens it; the button is the same action for keyboards and screen readers.
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
                <path d="M4.8 26.1L12 31.5L31.2 5.9C32.4 4.3 31.6 2.1 29.9 1.1L28.3 0.2C26.8 -0.6 25 -0.1 24 1.2Z" fill="var(--teal)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M7.2 22.9L14.4 28.3L16.2 25.9L9 20.5Z" fill="var(--gold-light)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M15 17L26 2.6" stroke="var(--on-teal)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
              </svg>
            </span>
          </h2>

          <svg className="cover-stitch" viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <mask id={`${titleId}-sew`} maskUnits="userSpaceOnUse">
                <path className="cover-stitch-sew" d="M6 8C46 4 92 11 130 7C160 4 190 6 214 8" pathLength={1} />
              </mask>
            </defs>
            <path className="cover-stitch-thread" d="M6 8C46 4 92 11 130 7C160 4 190 6 214 8" mask={`url(#${titleId}-sew)`} />
          </svg>

          <p className="cover-when">
            {EVENT.dateLong}
            <br />
            {EVENT.venue.label}
          </p>

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
          <p className="note cover-note" aria-hidden="true">
            <Arrow className="note-arrow cover-arrow" />
            tap to open, music on ♪
          </p>
        </div>
      </div>
    </div>
  );
}
