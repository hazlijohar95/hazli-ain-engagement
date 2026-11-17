import { useEffect, useRef, useState } from "react";
import { TabBar } from "./components/Chrome";
import { COVER_WRITING_MS, Cover, type CoverState } from "./components/Cover";
import { Closing, Details, Hero, Rsvp, Wishes } from "./components/Sections";
import { CalendarSheet, RsvpSheet, WishSheet } from "./components/Sheets";
import { loadRsvp, prefersReducedMotion, type SavedRsvp } from "./lib/hooks";
import { GESTURES, MusicBox } from "./lib/music";
import { listenForTaps, play, setSoundsEnabled } from "./lib/sfx";

type SheetId = "rsvp" | "wish" | "calendar" | null;

/** One player for the page; it builds nothing until the music first starts. */
const music = new MusicBox();

export default function App() {
  const [ready, setReady] = useState(false);
  const [cover, setCover] = useState<CoverState | "gone">("shown");
  const liftTimer = useRef<number | null>(null);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [saved, setSaved] = useState<SavedRsvp | null>(loadRsvp);
  const [playing, setPlaying] = useState(false);
  const playingNow = useRef(false);
  const wantsMusic = useRef(true);
  const resumeOnShow = useRef(false);

  useEffect(() => {
    playingNow.current = playing;
  }, [playing]);

  useEffect(listenForTaps, []);

  // While a sheet is open the page behind must hold still: snapping would fight the phone scrolling a
  // focused field into view above the keyboard.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-sheet-open", sheet !== null);
  }, [sheet]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-cover", cover !== "gone");
  }, [cover]);

  // The card lifts away with a paper swish, the music comes in, and the hero's entrance runs underneath.
  const liftCover = () => {
    if (liftTimer.current !== null) window.clearTimeout(liftTimer.current);
    liftTimer.current = null;
    setCover("leaving");
    setReady(true);
    play("paper");
    music.release();
    window.setTimeout(() => setCover("gone"), prefersReducedMotion() ? 320 : 800);
  };

  // Opening the cover is the guest's first tap, and browsers keep all sound locked until one. So the
  // music starts right here, inside the tap, but held silent while the pen writes (with its sounds);
  // it comes in as the card lifts. A second tap skips the writing.
  const openCover = () => {
    if (cover === "writing") return liftCover();
    if (cover !== "shown") return;
    void music.start({ held: true }).then((running) => wantsMusic.current && setPlaying(running));
    play("seal");
    setCover("writing");
    // With reduced motion the names appear at once, so the card only pauses long enough to be read.
    liftTimer.current = window.setTimeout(liftCover, prefersReducedMotion() ? 900 : COVER_WRITING_MS);
  };

  // A fallback once the page is open: if the browser still held the music back at the cover's tap,
  // the guest's next tap or key press starts it.
  useEffect(() => {
    if (cover !== "gone") return;
    const stopListening = () => GESTURES.forEach((type) => document.removeEventListener(type, onGesture, true));
    function onGesture(event: Event) {
      if (!wantsMusic.current || playingNow.current) return stopListening();
      // A tap on the music button is handled by the button itself.
      if (event.target instanceof Element && event.target.closest(".tab-music")) return;
      void music.start().then((running) => {
        if (!running || !wantsMusic.current) return;
        stopListening();
        setPlaying(true);
      });
    }
    GESTURES.forEach((type) => document.addEventListener(type, onGesture, true));
    return stopListening;
  }, [cover]);

  // Pause while the tab is hidden; pick up again on return if it was playing.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        resumeOnShow.current = playingNow.current;
        music.stop();
        setPlaying(false);
      } else if (resumeOnShow.current && wantsMusic.current) {
        void music.start().then(setPlaying);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // The button shows `playing`, so the toggle reads the same value: one source of truth for on/off.
  const toggleMusic = () => {
    const on = !playing;
    wantsMusic.current = on;
    setSoundsEnabled(on);
    setPlaying(on);
    if (on) void music.start().then((running) => wantsMusic.current && setPlaying(running));
    else music.stop();
  };

  const sheetProps = (id: Exclude<SheetId, null>) => ({
    open: sheet === id,
    onOpenChange: (next: boolean) => setSheet(next ? id : null),
  });

  return (
    <>
      {/* Behind the cover or an open sheet, the page is out of reach for screen readers and the keyboard alike. */}
      <div className="app" inert={sheet !== null || cover !== "gone"}>
        <main>
          <Hero ready={ready} />
          <Details onCalendar={() => setSheet("calendar")} />
          <Rsvp saved={saved} onOpen={() => setSheet("rsvp")} />
          <Wishes onWrite={() => setSheet("wish")} />
          <Closing />
        </main>
        <TabBar music={{ playing, onToggle: toggleMusic }} />
      </div>
      {cover !== "gone" && <Cover state={cover} onOpen={openCover} />}
      <RsvpSheet {...sheetProps("rsvp")} saved={saved} onSaved={setSaved} onAddToCalendar={() => setSheet("calendar")} />
      <WishSheet {...sheetProps("wish")} defaultName={saved?.name} />
      <CalendarSheet {...sheetProps("calendar")} />
    </>
  );
}
