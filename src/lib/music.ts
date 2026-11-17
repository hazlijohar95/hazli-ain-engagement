import { getMasterBus } from "@web-kits/audio";

/**
 * Background music: a violin cover of "Binks' Sake" (`public/music/binks-sake.mp3`), cut to start
 * at 0:40 of the original and run to its end (1:20), looped without the trailing silence.
 *
 * The file only starts downloading when the music first starts, so guests who never hear it
 * spend no data on it. It plays through Web Audio rather than the <audio> element's own volume,
 * because iOS ignores `volume`, and fades need a gain we control. It shares the interface sounds'
 * AudioContext, so pausing the music idles the one audio thread the page uses.
 */

const SRC = "/music/binks-sake.mp3";
/** The cut averages -20.9 dB; this sits it at about -24 dB, calm under the page and above the button sounds. */
const LEVEL = 0.7;
const FADE_IN = 2.5;
const FADE_OUT = 0.6;

/** The events that count as a user gesture for unlocking audio (pointerdown only counts for a mouse). */
export const GESTURES = ["pointerdown", "pointerup", "touchend", "keydown"] as const;

type Graph = { ctx: AudioContext; audio: HTMLAudioElement; gain: GainNode };

export class MusicBox {
  private graph: Graph | null = null;
  private active = false;
  /** False once stop() is called, so a start still settling doesn't fade back in. */
  private wanted = false;
  /** Started but kept silent until release(): the cover unlocks the music, the page brings it in. */
  private held = false;
  private pauseTimer: number | null = null;

  /**
   * Call from inside a user gesture (a tap or key press): browsers keep audio locked until one.
   * Resolves true once sound is actually running, false while the browser still holds it back.
   * With `held`, the track runs silently until release().
   */
  start({ held = false }: { held?: boolean } = {}): Promise<boolean> {
    this.wanted = true;
    this.held = held;
    playThroughSilentSwitch();
    const { ctx, audio } = (this.graph ??= this.setup());
    unlock(ctx);
    if (this.pauseTimer !== null) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    // iOS lets play() through only inside a tap, and one touch fires pointerdown (which it refuses)
    // before touchend (which it allows). So every call tries again instead of waiting on an earlier
    // attempt that may be failing, and the result is read from the player, whichever attempt won.
    return Promise.all([ctx.resume(), audio.play()])
      .catch(() => undefined)
      .then(() => {
        if (!this.wanted) {
          audio.pause();
          return false;
        }
        const running = ctx.state === "running" && !audio.paused;
        if (running && !this.active) {
          this.active = true;
          if (!this.held) this.fadeTo(LEVEL, FADE_IN);
        }
        return running;
      });
  }

  /** Brings in music started with `held`, from the top of the track. */
  release(): void {
    if (!this.held) return;
    this.held = false;
    // Still starting: start() fades in when it settles, now that nothing holds it.
    if (!this.graph || !this.active) return;
    this.graph.audio.currentTime = 0;
    this.fadeTo(LEVEL, FADE_IN);
  }

  stop(): void {
    this.wanted = false;
    silentAudio?.pause();
    if (!this.graph || !this.active) return;
    this.active = false;
    this.fadeTo(0, FADE_OUT);
    const { ctx, audio } = this.graph;
    this.pauseTimer = window.setTimeout(() => {
      this.pauseTimer = null;
      if (this.active) return;
      audio.pause();
      void ctx.suspend();
    }, FADE_OUT * 1000 + 100);
  }

  private fadeTo(level: number, seconds: number): void {
    if (!this.graph) return;
    const { ctx, gain } = this.graph;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(level, now + seconds);
  }

  private setup(): Graph {
    const ctx = getMasterBus().context;
    if (!(ctx instanceof AudioContext)) throw new Error("Music needs a real-time AudioContext.");
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    // iOS suspends ("interrupts") the context for calls, Siri or switching apps. Start again on the next gesture.
    ctx.addEventListener("statechange", () => {
      if (!this.active || ctx.state === "running") return;
      this.active = false;
      const retry = () => {
        void this.start().then((running) => {
          if (running) GESTURES.forEach((type) => document.removeEventListener(type, retry, true));
        });
      };
      GESTURES.forEach((type) => document.addEventListener(type, retry, true));
    });
    return { ctx, audio, gain };
  }
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let silentAudio: HTMLAudioElement | null = null;

/**
 * iPhones mute Web Audio when the ring/silent switch is on. Safari 17+ lets a page declare
 * itself media playback; older iOS is switched into the same mode by a looping silent <audio>.
 */
function playThroughSilentSwitch(): void {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (session) {
    session.type = "playback";
    return;
  }
  if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) return;
  silentAudio ??= Object.assign(new Audio(silentWavUrl()), { loop: true, volume: 0 });
  silentAudio.setAttribute("playsinline", "");
  void silentAudio.play().catch(() => undefined);
}

/** A one-sample buffer played inside the tap: the classic way to fully unlock audio on older WebKit. */
function unlock(ctx: AudioContext): void {
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination);
  source.start(0);
}

function silentWavUrl(): string {
  const sampleRate = 8000;
  const samples = sampleRate / 2;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const text = (offset: number, str: string) => [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  new Uint8Array(buffer, 44).fill(128);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
