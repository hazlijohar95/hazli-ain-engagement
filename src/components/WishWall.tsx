import { useQuery } from "convex/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { api } from "../../convex/_generated/api";
import { Arrow } from "./Doodles";
import { IconQuill } from "./Icons";

const PREVIEW_COUNT = 6;
/** Cards cycle through three papers and lean like notes pinned to a board. */
const TONES = ["paper", "jade", "paper", "pink", "paper", "pink"] as const;
const TILTS = [-1.1, 0.8, -0.5, 1.2, -0.8, 0.4];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 60],
  ["day", 24],
  ["week", 7],
  ["month", 4.35],
  ["year", 12],
];

function ago(time: number): string {
  let value = (time - Date.now()) / 1000 / 60;
  if (Math.abs(value) < 1) return "just now";
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  for (let i = 1; i < STEPS.length && Math.abs(value) >= STEPS[i][1]; i++) {
    value /= STEPS[i][1];
    unit = STEPS[i][0];
  }
  return rtf.format(Math.round(value), unit);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Ids that appeared after the wall first loaded, so a wish arriving live gets its entrance.
 * Takes the ids joined into one string so the effect re-runs only when the list really changes.
 */
function useArrivals(idList: string | undefined): ReadonlySet<string> {
  const known = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (idList === undefined) return;
    const ids = idList ? idList.split(",") : [];
    if (known.current === null) {
      known.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !known.current?.has(id));
    added.forEach((id) => known.current?.add(id));
    if (added.length === 0) return;
    setFresh(new Set(added));
    const timer = window.setTimeout(() => setFresh(new Set()), 1800);
    return () => window.clearTimeout(timer);
  }, [idList]);
  return fresh;
}

export function WishWall({ onWrite }: { onWrite: () => void }) {
  const wishes = useQuery(api.wishes.list);
  const [expanded, setExpanded] = useState(false);
  const fresh = useArrivals(wishes?.map((w) => w._id).join(","));

  const count = wishes?.length ?? 0;
  const shown = wishes ? (expanded ? wishes : wishes.slice(0, PREVIEW_COUNT)) : [];

  return (
    <div className="wall">
      <div className="wall-count" aria-live="polite">
        <span className="wall-num">{pad(count)}</span>
        <span className="wall-cap">
          {count === 1 ? "wish" : "wishes"}
          <br />
          &amp; counting
        </span>
      </div>

      <div className="wall-cta">
        <button className="btn-brutal" type="button" onClick={onWrite}>
          <IconQuill /> Write a wish
        </button>
        <p className="note note-wall" aria-hidden="true">
          <Arrow className="note-arrow" />
          we read every single one
        </p>
      </div>

      {wishes === undefined ? (
        <ul className="wall-list" aria-busy="true" aria-label="Loading wishes">
          {[0, 1, 2].map((i) => (
            <li key={i} className="wish wish-skeleton" style={{ "--tilt": `${TILTS[i]}deg` } as CSSProperties} />
          ))}
        </ul>
      ) : count === 0 ? (
        <div className="wall-empty">
          <p className="wall-empty-title">No wishes yet.</p>
          <p>Yours could be the first.</p>
        </div>
      ) : (
        <>
          <ul className="wall-list">
            {shown.map((w, i) => {
              // Numbered from the oldest, so a card keeps its number, colour and tilt when new wishes land on top.
              const n = count - i;
              return (
              <li
                key={w._id}
                className="wish"
                data-tone={TONES[n % TONES.length]}
                data-new={fresh.has(w._id) || undefined}
                data-more={i >= PREVIEW_COUNT || undefined}
                style={
                  {
                    "--tilt": `${TILTS[n % TILTS.length]}deg`,
                    // "Show all" cards count their stagger from the first newly shown card.
                    "--i": Math.min(i >= PREVIEW_COUNT ? i - PREVIEW_COUNT : i, 8),
                  } as CSSProperties
                }
              >
                <div className="wish-top">
                  <span className="wish-no">№ {pad(n)}</span>
                  <time dateTime={new Date(w._creationTime).toISOString()}>{ago(w._creationTime)}</time>
                </div>
                <p className="wish-text">{w.message}</p>
                <p className="wish-name">{w.name}</p>
              </li>
              );
            })}
          </ul>
          {count > PREVIEW_COUNT && (
            <button className="wall-more" type="button" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Show fewer" : `Show all ${count} wishes`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
