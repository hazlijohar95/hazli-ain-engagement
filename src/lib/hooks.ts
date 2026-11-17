import { useEffect, useRef, useState } from "react";
import { EVENT } from "../event";

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds `data-in` to an element once it scrolls into view, for the CSS entrance animation. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Whole days from today (in Malaysia) to the event date. Negative once it has passed. */
export function useDaysToGo(): number {
  const compute = () => {
    const today = Date.parse(`${todayIn(EVENT.timeZone)}T00:00:00Z`);
    const day = Date.parse(`${EVENT.date}T00:00:00Z`);
    return Math.round((day - today) / 86_400_000);
  };
  const [days, setDays] = useState(compute);
  useEffect(() => {
    const id = window.setInterval(() => setDays(compute()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return days;
}

/** Per-device memory of this guest's RSVP, so a returning guest sees their answer. Never authoritative. */
export type SavedRsvp = { name: string; phone: string; attending: "yes" | "no"; guests: number; dietary?: string };
const RSVP_KEY = "hazli-ain:rsvp";

function isSavedRsvp(v: unknown): v is SavedRsvp {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.name === "string" && typeof r.phone === "string" && (r.attending === "yes" || r.attending === "no") && typeof r.guests === "number" && (r.dietary === undefined || typeof r.dietary === "string");
}

export function loadRsvp(): SavedRsvp | null {
  try {
    const raw = localStorage.getItem(RSVP_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isSavedRsvp(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveRsvp(rsvp: SavedRsvp): void {
  try {
    localStorage.setItem(RSVP_KEY, JSON.stringify(rsvp));
  } catch {
    /* private mode: the confirmation still shows for this visit */
  }
}

export function errorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err && typeof err.data === "string") return err.data;
  return "Unable to send. Check your connection and try again.";
}
