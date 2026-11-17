import { defineSound, type Layer } from "@web-kits/audio";

/**
 * Interface sounds: soft, quiet sine tones built only from C, D, F and G. The background
 * track (a violin "Binks' Sake") centres on C with no clear third, and these four notes fit it
 * either way, so taps and chimes sit inside the music instead of clashing. Nothing plays while typing.
 * They follow the music button: when a guest turns the music off, these go quiet too.
 */

const NOTE = { f4: 349.23, g4: 392, c5: 523.25, d5: 587.33, f5: 698.46, g5: 783.99, c6: 1046.5 } as const;

const ROOM = { type: "reverb", decay: 1.2, damping: 0.6, mix: 0.22 } as const;

/** A music-box bell: a sine with a faint octave above and a gentle onset, `delay` seconds into the sound. */
function bell(frequency: number, decay: number, gain: number, delay = 0): Layer[] {
  return [
    { source: { type: "sine", frequency }, envelope: { attack: 0.004, decay }, gain, delay },
    { source: { type: "sine", frequency: frequency * 2 }, envelope: { attack: 0.004, decay: decay * 0.5 }, gain: gain * 0.18, delay },
  ];
}

/** A short, soft tick. */
function tick(frequency: number | { start: number; end: number }, gain = 0.07): Layer {
  return { source: { type: "sine", frequency }, envelope: { attack: 0.002, decay: 0.08 }, gain };
}

// Each sound gets one shared room (reverb) rather than one per note: the library builds a fresh
// impulse response for every reverb on every play.
const sounds = {
  /** Buttons, tabs and links: a soft, rounded tick that falls slightly in pitch. */
  tap: defineSound({ ...tick({ start: NOTE.g5, end: NOTE.d5 }), filter: { type: "lowpass", frequency: 2400 }, envelope: { attack: 0.002, decay: 0.07 } }),
  /** Choosing "Coming": a warm bell. */
  coming: defineSound({ layers: bell(NOTE.g5, 0.45, 0.09), effects: [ROOM] }),
  /** Choosing "Not coming": the same bell, lower and gentler. */
  notComing: defineSound({ layers: bell(NOTE.c5, 0.4, 0.08), effects: [ROOM] }),
  stepUp: defineSound(tick(NOTE.f5)),
  stepDown: defineSound(tick(NOTE.c5)),
  /** RSVP or wish sent: a rising C-D-G-C chime, open enough to sit over the song. */
  success: defineSound({
    layers: [
      ...bell(NOTE.c5, 0.9, 0.08, 0),
      ...bell(NOTE.d5, 0.9, 0.08, 0.09),
      ...bell(NOTE.g5, 0.9, 0.08, 0.18),
      ...bell(NOTE.c6, 1.2, 0.07, 0.27),
    ],
    effects: [ROOM],
  }),
  /** Something to fix: two soft falling notes, a hum rather than a buzzer. */
  error: defineSound({
    layers: [
      { source: { type: "triangle", frequency: NOTE.g4 }, envelope: { attack: 0.01, decay: 0.22 }, gain: 0.06 },
      { source: { type: "triangle", frequency: NOTE.f4 }, envelope: { attack: 0.01, decay: 0.3 }, gain: 0.06, delay: 0.12 },
    ],
  }),
};

type SoundName = keyof typeof sounds;

const isSoundName = (name: string): name is SoundName => name in sounds;

let enabled = true;

/** Follows the music button. */
export function setSoundsEnabled(on: boolean): void {
  enabled = on;
}

export function play(name: SoundName): void {
  if (!enabled || document.hidden) return;
  try {
    sounds[name]();
  } catch {
    // Audio is a nicety: an unavailable or locked AudioContext must never break a tap.
  }
}

/**
 * Plays a sound for every button and link the guest presses, from one listener. An element (or an
 * ancestor) can name its sound with `data-sound="coming"`, or opt out with `data-sound="none"` when
 * its result plays one instead (a submit button's success or error). Typing never fires a click,
 * so text fields stay silent.
 */
export function listenForTaps(): () => void {
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const el = event.target.closest("button, a[href]");
    if (!el) return;
    const name = el.closest<HTMLElement>("[data-sound]")?.dataset.sound ?? "tap";
    if (isSoundName(name)) play(name);
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
