import { useMutation } from "convex/react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Drawer } from "vaul";
import { api } from "../../convex/_generated/api";
import { EVENT, MAX_GUESTS } from "../event";
import { googleCalendarUrl, outlookCalendarUrl } from "../lib/calendar";
import { errorMessage, loadRsvp, saveRsvp, type SavedRsvp } from "../lib/hooks";
import { play } from "../lib/sfx";
import { SketchHeart, Underline } from "./Doodles";
import { BrandLogo, IconArrow, IconCalendar, IconCheck, IconMinus, IconPlus, type Brand } from "./Icons";

function Sheet({
  open,
  onOpenChange,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    // repositionInputs off: vaul resizes the sheet whenever the visible height changes, and on phones that
    // height changes while typing (the suggestion bar, Android's resizing keyboard), so it jumps mid-word.
    // The browser's own scroll-into-view handles the keyboard cleanly.
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <Drawer.Handle className="sheet-handle" />
          <div className="sheet-scroll">
            <header className="sheet-head">
              <SketchHeart className="sheet-mark" />
              <p className="tag">{eyebrow}</p>
              <Drawer.Title className="sheet-title">
                {title}
                <Underline className="title-underline" />
              </Drawer.Title>
            </header>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type Field = "attending" | "name" | "phone" | "guests" | "dietary" | "wish";
type FormError = { message: string; field?: Field };

/** Server errors arrive as text; route each to the field it is about so focus and aria-invalid land there. */
function fieldFor(message: string): Field | undefined {
  if (/name/i.test(message)) return "name";
  if (/phone/i.test(message)) return "phone";
  if (/guest/i.test(message)) return "guests";
  if (/dietary/i.test(message)) return "dietary";
  if (/wish/i.test(message)) return "wish";
  return undefined;
}

/** The aria-invalid / aria-describedby pair for a field: its hint always, plus the error when the error is about it. */
function describer(error: FormError | null, errorId: string) {
  return (field: Field, hintId?: string) => {
    const invalid = error?.field === field;
    const ids = [hintId, invalid ? errorId : undefined].filter((v): v is string => Boolean(v)).join(" ");
    return { "aria-invalid": invalid || undefined, "aria-describedby": ids || undefined };
  };
}

type RsvpState = { kind: "editing" } | { kind: "sending" } | { kind: "done"; rsvp: SavedRsvp };

export function RsvpSheet({
  open,
  onOpenChange,
  saved,
  onSaved,
  onAddToCalendar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The guest's last response, which prefills the form when they come back to change it. */
  saved: SavedRsvp | null;
  onSaved: (rsvp: SavedRsvp) => void;
  onAddToCalendar: () => void;
}) {
  const [name, setName] = useState(saved?.name ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");
  const [attending, setAttending] = useState<"yes" | "no" | null>(saved?.attending ?? null);
  const [guests, setGuests] = useState(saved && saved.guests > 0 ? saved.guests : 1);
  const [dietary, setDietary] = useState(saved?.dietary ?? "");
  const [wish, setWish] = useState("");
  const [state, setState] = useState<RsvpState>({ kind: "editing" });
  const [error, setError] = useState<FormError | null>(null);
  const id = useId();
  const attendingRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const guestsRef = useRef<HTMLButtonElement>(null);
  const dietaryRef = useRef<HTMLTextAreaElement>(null);
  const wishRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const target = { attending: attendingRef, name: nameRef, phone: phoneRef, guests: guestsRef, dietary: dietaryRef, wish: wishRef };
    if (error?.field) target[error.field].current?.focus();
  }, [error]);
  const errorId = `${id}-error`;
  const describe = describer(error, errorId);
  const submit = useMutation(api.rsvps.submit);
  const addWish = useMutation(api.wishes.add);

  // Once the sheet has slid away, the next open shows the form again (not the thank-you).
  const resetAfterClose = () => window.setTimeout(() => setState({ kind: "editing" }), 400);
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next && state.kind === "done") resetAfterClose();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!attending) {
      setError({ message: "Choose Coming or Not coming.", field: "attending" });
      play("error");
      return;
    }
    setError(null);
    setState({ kind: "sending" });
    try {
      const rsvp: SavedRsvp = {
        name: name.trim(),
        phone: phone.trim(),
        attending,
        guests: attending === "yes" ? guests : 0,
        dietary: attending === "yes" && dietary.trim() ? dietary.trim() : undefined,
      };
      await submit(rsvp);
      if (wish.trim()) await addWish({ name, message: wish });
      saveRsvp(rsvp);
      onSaved(rsvp);
      setWish("");
      setState({ kind: "done", rsvp });
      play("success");
    } catch (err) {
      const message = errorMessage(err);
      setError({ message, field: fieldFor(message) });
      play("error");
      setState({ kind: "editing" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} eyebrow="RSVP" title={state.kind === "done" ? "Thank you" : "Are you coming?"}>
      {state.kind === "done" ? (
        <div className="done">
          <div className="done-mark">
            <IconCheck size={30} />
          </div>
          <p className="done-text">
            {state.rsvp.attending === "yes"
              ? `Can't wait to see you, ${state.rsvp.name.split(" ")[0]}!`
              : `Thank you for letting us know, ${state.rsvp.name.split(" ")[0]}. You will be missed.`}
          </p>
          {state.rsvp.attending === "yes" && (
            <p className="done-sub">
              {state.rsvp.guests === 1 ? "1 seat" : `${state.rsvp.guests} seats`} saved · {EVENT.dateLong}
            </p>
          )}
          {state.rsvp.attending === "yes" && (
            <button
              className="btn-brutal"
              data-tone="jade"
              type="button"
              onClick={() => {
                onAddToCalendar();
                resetAfterClose();
              }}
            >
              <IconCalendar size={20} /> Add to calendar
            </button>
          )}
          {/* Jade when it is the only action; plain when "Add to calendar" is the primary one. */}
          <button
            className="btn-brutal"
            data-tone={state.rsvp.attending === "yes" ? undefined : "jade"}
            type="button"
            onClick={() => handleOpenChange(false)}
          >
            Done
          </button>
        </div>
      ) : (
        <form className="form" data-vaul-no-drag onSubmit={onSubmit} noValidate>
          <fieldset className="choice" aria-label="Are you coming?" aria-describedby={error?.field === "attending" ? errorId : undefined}>
            {(
              [
                ["yes", "Coming"],
                ["no", "Not coming"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="choice-item" data-value={value} data-checked={attending === value}>
                <input
                  ref={value === "yes" ? attendingRef : undefined}
                  type="radio"
                  name="attending"
                  value={value}
                  checked={attending === value}
                  onChange={() => {
                    setAttending(value);
                    play(value === "yes" ? "coming" : "notComing");
                  }}
                />
                <SketchHeart className="choice-heart" empty={value === "no"} />
                <span className="choice-label">{label}</span>
                <span className="choice-check" aria-hidden="true">
                  <IconCheck size={14} />
                </span>
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span className="field-label">Your name</span>
            <input
              ref={nameRef}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={80}
              required
              {...describe("name")}
            />
          </label>

          <label className="field">
            <span className="field-label">Phone number</span>
            <input
              ref={phoneRef}
              className="input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="012 345 6789"
              enterKeyHint="next"
              maxLength={20}
              required
              {...describe("phone", `${id}-phone-hint`)}
            />
            <span className="field-hint" id={`${id}-phone-hint`}>So we can reach you if plans change.</span>
          </label>

          <div className="reveal-row" data-show={attending === "yes"} inert={attending !== "yes"}>
            <div className="reveal-inner">
              <div className="stitched">
                <div className="field">
                  <span className="field-label" id="guests-label">
                    How many people, including you?
                  </span>
                  <div className="stepper" role="group" aria-labelledby="guests-label">
                    <button
                      type="button"
                      className="stepper-btn"
                      data-sound="stepDown"
                      aria-label="Fewer guests"
                      disabled={guests <= 1}
                      onClick={() => setGuests((g) => g - 1)}
                    >
                      <IconMinus />
                    </button>
                    <output className="stepper-value" aria-live="polite">
                      {guests}
                    </output>
                    <button
                      ref={guestsRef}
                      type="button"
                      className="stepper-btn"
                      data-sound="stepUp"
                      aria-label="More guests"
                      disabled={guests >= MAX_GUESTS}
                      onClick={() => setGuests((g) => g + 1)}
                    >
                      <IconPlus />
                    </button>
                  </div>
                </div>
                <label className="field dietary">
                  <span className="field-label">
                    Any dietary needs or allergies? <span className="optional">optional</span>
                  </span>
                  <textarea
                    ref={dietaryRef}
                    className="input textarea"
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    rows={2}
                    maxLength={200}
                    placeholder="e.g. vegetarian, nut allergy"
                    {...describe("dietary", `${id}-dietary-hint`)}
                  />
                  <span className="field-hint" id={`${id}-dietary-hint`}>
                    For everyone in your party.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <label className="field">
            <span className="field-label">
              Do you have a wish for the couple? <span className="optional">optional</span>
            </span>
            <textarea
              ref={wishRef}
              className="input textarea"
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              rows={3}
              maxLength={400}
              {...describe("wish", `${id}-wish-hint`)}
            />
            <span className="field-hint" id={`${id}-wish-hint`}>
              Shown on the wishes wall.
            </span>
          </label>

          {error && (
            <p className="form-error" role="alert" id={errorId}>
              {error.message}
            </p>
          )}

          <button className="btn-brutal" data-tone="jade" data-sound="none" type="submit" disabled={state.kind === "sending"}>
            {state.kind === "sending" ? "Sending…" : saved ? "Update response" : "Send response"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

export function WishSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState(() => loadRsvp()?.name ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (error?.field === "name") nameRef.current?.focus();
    else if (error?.field === "wish") messageRef.current?.focus();
  }, [error]);
  const errorId = `${id}-error`;
  const describe = describer(error, errorId);
  const add = useMutation(api.wishes.add);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await add({ name, message });
      play("success");
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      const message = errorMessage(err);
      setError({ message, field: fieldFor(message) });
      play("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow="Wishes" title="Leave a wish">
      <form className="form" data-vaul-no-drag onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="field-label">Your name</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={80}
            {...describe("name")}
          />
        </label>
        <label className="field">
          <span className="field-label">Your wish</span>
          <textarea
            ref={messageRef}
            className="input textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={400}
            {...describe("wish", `${id}-count`)}
          />
          <span className="field-hint" id={`${id}-count`}>
            {400 - message.length} characters left
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert" id={errorId}>
            {error.message}
          </p>
        )}
        <button className="btn-brutal" data-tone="jade" data-sound="none" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Post my wish"}
        </button>
      </form>
    </Sheet>
  );
}

const CALENDARS: readonly { brand: Brand; label: string; href: () => string; external: boolean }[] = [
  { brand: "google-calendar", label: "Google Calendar", href: googleCalendarUrl, external: true },
  { brand: "apple", label: "Apple Calendar", href: () => "/engagement.ics", external: false },
  { brand: "outlook", label: "Outlook", href: outlookCalendarUrl, external: true },
];

export function CalendarSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow={EVENT.dateLong} title="Save the date">
      <div className="action-list">
        {CALENDARS.map(({ brand, label, href, external }) => (
          <a
            key={brand}
            className="action-row"
            href={href()}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            onClick={() => onOpenChange(false)}
          >
            <BrandLogo brand={brand} size={28} />
            <span>{label}</span>
            <IconArrow />
          </a>
        ))}
      </div>
    </Sheet>
  );
}
