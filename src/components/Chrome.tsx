import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../lib/hooks";
import { IconCalendar, IconHeart, IconInvite, IconLetter, IconMusic, IconMusicOff } from "./Icons";

const TABS = [
  { id: "home", label: "Invite", Icon: IconInvite },
  { id: "details", label: "Details", Icon: IconCalendar },
  { id: "rsvp", label: "RSVP", Icon: IconLetter },
  { id: "wishes", label: "Wishes", Icon: IconHeart },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function TabBar({ music }: { music: { playing: boolean; onToggle: () => void } }) {
  const [active, setActive] = useState<TabId>("home");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // The thank-you page has no tab of its own; it belongs with the wishes.
          const id = entry.target.id === "thanks" ? "wishes" : entry.target.id;
          if (TABS.some((t) => t.id === id)) setActive(id as TabId);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const id of [...TABS.map((t) => t.id), "thanks"]) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const go = (id: TabId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="tab" aria-current={active === id ? "true" : undefined} onClick={() => go(id)}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        className="tab-music"
        data-sound="none"
        onClick={music.onToggle}
        aria-pressed={music.playing}
        aria-label="Music"
      >
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
    </nav>
  );
}
