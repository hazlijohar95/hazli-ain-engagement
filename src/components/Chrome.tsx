import { useEffect, useState } from "react";
import { IconLetter, IconMusic, IconMusicOff } from "./Icons";

/** Steps aside while the page's own RSVP section is in view, so the two buttons never sit together. */
function FloatingRsvp({ onOpen }: { onOpen: () => void }) {
  const [sectionInView, setSectionInView] = useState(false);

  useEffect(() => {
    const section = document.getElementById("rsvp");
    if (!section) return;
    const io = new IntersectionObserver(([entry]) => setSectionInView(entry.isIntersecting), { rootMargin: "-20% 0px -20% 0px" });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <button type="button" className="btn-brutal floating-rsvp" data-tone="jade" data-away={sectionInView || undefined} inert={sectionInView} onClick={onOpen}>
      <IconLetter size={20} /> RSVP
    </button>
  );
}

/**
 * The only controls that stay on screen: the music button, and a "RSVP" button for a guest who has
 * not replied yet (`rsvp` is null once they have).
 */
export function FloatingControls({ music, rsvp }: { music: { playing: boolean; onToggle: () => void }; rsvp: (() => void) | null }) {
  return (
    <div className="floating">
      {rsvp && <FloatingRsvp onOpen={rsvp} />}
      <button type="button" className="music-toggle" data-sound="none" onClick={music.onToggle} aria-pressed={music.playing} aria-label="Music">
        {/* Both icons stay mounted so the swap can cross-fade. */}
        <span className="music-icon" data-on="true" aria-hidden={!music.playing}>
          <IconMusic />
        </span>
        <span className="music-icon" data-on="false" aria-hidden={music.playing}>
          <IconMusicOff />
        </span>
        {music.playing && (
          <span className="eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
    </div>
  );
}
