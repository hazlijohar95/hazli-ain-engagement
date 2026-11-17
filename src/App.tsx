import { useEffect, useRef, useState } from "react";
import { TabBar } from "./components/Chrome";
import { Closing, Details, Hero, Rsvp, Wishes } from "./components/Sections";
import { CalendarSheet, RsvpSheet, WishSheet } from "./components/Sheets";
import { loadRsvp, type SavedRsvp } from "./lib/hooks";
import { GESTURES, MusicBox } from "./lib/music";
import { listenForTaps, setSoundsEnabled } from "./lib/sfx";

type SheetId = "rsvp" | "wish" | "calendar" | null;

/** One player for the page; it builds nothing until the music first starts. */
const music = new MusicBox();

export default function App() {
  const [ready, setReady] = useState(false);
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

  // Let the first frame paint, then run the hero's entrance.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Browsers keep sound locked until the guest taps or presses a key, so the music starts on that first gesture.
  useEffect(() => {
    const stopListening = () => GESTURES.forEach((type) => document.removeEventListener(type, onGesture, true));
    function onGesture(event: Event) {
      if (!wantsMusic.current) return stopListening();
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
  }, []);

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
      {/* Behind an open sheet the page is out of reach for screen readers and the keyboard alike. */}
      <div className="app" inert={sheet !== null}>
        <main>
          <Hero ready={ready} />
          <Details onCalendar={() => setSheet("calendar")} />
          <Rsvp saved={saved} onOpen={() => setSheet("rsvp")} />
          <Wishes onWrite={() => setSheet("wish")} />
          <Closing />
        </main>
        <TabBar music={{ playing, onToggle: toggleMusic }} />
      </div>
      <RsvpSheet {...sheetProps("rsvp")} saved={saved} onSaved={setSaved} onAddToCalendar={() => setSheet("calendar")} />
      <WishSheet {...sheetProps("wish")} defaultName={saved?.name} />
      <CalendarSheet {...sheetProps("calendar")} />
    </>
  );
}
