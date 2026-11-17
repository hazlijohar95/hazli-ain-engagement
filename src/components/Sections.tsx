import type { CSSProperties, ReactNode } from "react";
import { APPLE_MAPS_URL, EVENT, MAPS_URL } from "../event";
import { HoopMark } from "../logo/HoopMark";
import { useDaysToGo, useReveal, type SavedRsvp } from "../lib/hooks";
import { Arrow, SketchHeart, Sparkle, Underline } from "./Doodles";
import { BrandLogo, IconCalendar, IconCheck, IconChevron } from "./Icons";
import { WishWall } from "./WishWall";

const HERO_MARK = 176;

/** A short run of pink stitching on a gentle wave, used either side of the heart. */
function Thread() {
  return (
    <svg className="divider-thread" viewBox="0 0 90 12" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 6C17 1 30 11 45 6S73 1 88 6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

function Section({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: ReactNode }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section id={id} className="section" ref={ref} aria-labelledby={`${id}-title`}>
      <SketchHeart className="sec-mark" />
      {eyebrow && <p className="eyebrow tag">{eyebrow}</p>}
      <h2 className="section-title" id={`${id}-title`}>
        {title}
        <Underline className="title-underline" />
      </h2>
      {children}
    </section>
  );
}

export function Hero({ ready }: { ready: boolean }) {
  const { first, second } = EVENT.couple;
  return (
    <header id="home" className="hero" data-ready={ready}>
      <div className="hero-body">
        <div className="hero-mark stagger" style={stagger(0)}>
          <HoopMark size={HERO_MARK} className="monogram" />
        </div>
        <p className="tag stagger" style={stagger(1)}>
          {EVENT.occasion}
        </p>
        <h1 className="names">
          <span className="name stagger" style={stagger(2)}>
            <span className="name-given">{first.given}</span>
            <span className="name-lineage">{first.lineage}</span>
          </span>
          <span className="amp-block stagger" style={stagger(3)} aria-label="and">
            &amp;
          </span>
          <span className="name stagger" style={stagger(4)}>
            <span className="name-given">{second.given}</span>
            <span className="name-lineage">{second.lineage}</span>
          </span>
        </h1>
        <div className="divider stagger" style={stagger(5)} aria-hidden="true">
          <Thread />
          <SketchHeart className="divider-mark" />
          <Thread />
        </div>
        <p className="date-block stagger" style={stagger(6)}>
          <span className="date-block-day">{EVENT.weekday}</span>
          <span className="date-block-date">{EVENT.dateShort}</span>
          <span className="date-block-venue">{EVENT.venue.label}</span>
        </p>
        <span className="note note-hero stagger" style={stagger(7)} aria-hidden="true">
          <Arrow className="note-arrow" />
          see you there!
        </span>
      </div>
      <a className="scroll-cue stagger" style={stagger(8)} href="#details" aria-label="Scroll to details">
        <IconChevron />
      </a>
    </header>
  );
}

function Countdown() {
  const days = useDaysToGo();
  const ref = useReveal<HTMLDivElement>();
  const [value, label] =
    days > 1 ? [String(days), "days to go"] : days === 1 ? ["1", "day to go"] : days === 0 ? ["Today", "is the day"] : ["♡", "with gratitude"];
  return (
    <div className="countdown" ref={ref} role="timer" aria-live="off">
      <Sparkle className="doodle doodle-countdown" />
      <span className="countdown-num">{value}</span>
      <p className="countdown-label">{label}</p>
    </div>
  );
}

export function Details({ onCalendar }: { onCalendar: () => void }) {
  return (
    <Section id="details" title="Join us">
      <Countdown />
      <div className="ticket">
        <div className="ticket-part">
          <p className="tag">{EVENT.weekday}</p>
          <p className="frame-display">{EVENT.dateDay}</p>
          {EVENT.time && <p className="frame-note">{EVENT.time}</p>}
        </div>
        <div className="ticket-part ticket-tear">
          <p className="frame-venue">
            {EVENT.venue.name}
            <span className="frame-venue-by">{EVENT.venue.byline}</span>
          </p>
          <address className="frame-note">
            {EVENT.venue.address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
        </div>
        <div className="ticket-part ticket-tear">
          <div className="frame-actions">
            <button className="frame-action" type="button" onClick={onCalendar}>
              <IconCalendar size={26} />
              <span>Calendar</span>
            </button>
            <a className="frame-action" href={MAPS_URL} target="_blank" rel="noreferrer">
              <BrandLogo brand="google-maps" />
              <span>Google Maps</span>
            </a>
            <a className="frame-action" href={APPLE_MAPS_URL} target="_blank" rel="noreferrer">
              <BrandLogo brand="apple" />
              <span>Apple Maps</span>
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Rsvp({ saved, onOpen }: { saved: SavedRsvp | null; onOpen: () => void }) {
  return (
    <Section id="rsvp" eyebrow="Kindly respond" title={saved ? "You've replied" : "Will you join us?"}>
      <div className="brutal-card">
        {saved ? (
          <>
            <span className="brutal-mark">
              <IconCheck size={26} />
            </span>
            <p className="frame-display">{saved.attending === "yes" ? "Coming" : "Not coming"}</p>
            <p className="frame-note">
              {saved.name}
              {saved.attending === "yes" && ` · ${saved.guests === 1 ? "1 guest" : `${saved.guests} guests`}`}
            </p>
            <button className="btn-brutal" type="button" onClick={onOpen}>
              Change response
            </button>
          </>
        ) : (
          <>
            <p className="frame-lede">
              <span>Your presence means the world.</span>
              <span>Kindly let us know below.</span>
            </p>
            {EVENT.rsvpBy && <p className="frame-note">Kindly reply by {EVENT.rsvpBy}</p>}
            <button className="btn-brutal" data-tone="jade" type="button" onClick={onOpen}>
              RSVP now
            </button>
          </>
        )}
      </div>
    </Section>
  );
}

export function Wishes({ onWrite }: { onWrite: () => void }) {
  return (
    <Section id="wishes" eyebrow="Wishes" title="Words of love">
      <WishWall onWrite={onWrite} />
    </Section>
  );
}

export function Closing() {
  const ref = useReveal<HTMLElement>();
  return (
    <footer id="thanks" className="closing" ref={ref}>
      <svg className="thread" viewBox="0 0 320 60" aria-hidden="true">
        <path
          d="M10,40 C50,10 80,52 120,30 C150,14 170,16 186,30 C196,40 210,40 218,30"
          stroke="var(--ink)"
          strokeWidth={2.5}
          fill="none"
          strokeDasharray="7 5"
          strokeLinecap="square"
        />
        <path
          d="M150,30 C150,22 162,20 162,30 C162,20 174,22 174,30 C174,38 162,44 162,48 C162,44 150,38 150,30Z"
          style={{ fill: "var(--pink)", stroke: "var(--ink)", strokeWidth: 2.5, strokeLinejoin: "round" }}
          transform="translate(-6,-12)"
        />
        <g transform="translate(222,30) rotate(-18)">
          <rect x={0} y={-3} width={92} height={6} style={{ fill: "var(--ink)" }} />
          <rect x={6} y={-1} width={10} height={2} fill="#F6F1E8" />
          <path d="M92,-3 L104,0 L92,3Z" style={{ fill: "var(--ink)" }} />
        </g>
      </svg>
      <div className="thanks-card">
        <Sparkle className="doodle doodle-thanks-a" />
        <Sparkle className="doodle doodle-thanks-b" />
        <p className="thanks">Thank you</p>
        <p className="signature">
          <span className="visually-hidden">Love, </span>
          {EVENT.couple.short}
        </p>
        <p className="thanks-strip">{EVENT.tagline}</p>
      </div>
    </footer>
  );
}
