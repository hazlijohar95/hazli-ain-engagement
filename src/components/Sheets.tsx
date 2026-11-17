import { useMutation } from "convex/react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { Drawer } from "vaul";
import { api } from "../../convex/_generated/api";
import { PHONE_MESSAGE, emptyMessage, phoneDigits } from "../../convex/limits";
import { EVENT, INVITERS, MAX_GUESTS, type Inviter } from "../event";
import { googleCalendarUrl, outlookCalendarUrl } from "../lib/calendar";
import { RSVP_BUTTON_ID, errorMessage, partySize, saveRsvp, type SavedRsvp } from "../lib/hooks";
import { play } from "../lib/sfx";
import { SketchHeart, Underline } from "./Doodles";
import { BrandLogo, IconArrow, IconCalendar, IconCheck, IconMinus, IconPlus, type Brand } from "./Icons";

/** The page control that opened the first sheet, kept for a sheet opened from inside another one. */
let lastPageOpener: HTMLElement | null = null;

/**
 * Where focus goes when a sheet closes. A sheet opened from the page returns to its button. One opened
 * from another sheet (Add to calendar after an RSVP) returns to the page button that started the chain,
 * because the button that opened it has gone with the first sheet.
 */
function openerOnPage(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest(".sheet")) return lastPageOpener;
  // Safari does not focus a tapped button, so a tap leaves nothing to return to.
  lastPageOpener = active instanceof HTMLElement && active !== document.body ? active : null;
  return lastPageOpener;
}

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
  const contentRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  return (
    // repositionInputs off: vaul resizes the sheet whenever the visible height changes, and on phones that
    // height changes while typing (the suggestion bar, Android's resizing keyboard), so it jumps mid-word.
    // The browser's own scroll-into-view handles the keyboard cleanly.
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content
          ref={contentRef}
          className="sheet"
          aria-describedby={undefined}
          // Focus the sheet itself, not its first field: keyboard users start inside the sheet,
          // and phones don't raise the on-screen keyboard before the guest asks for it.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            returnTo.current = openerOnPage();
            contentRef.current?.focus({ preventScroll: true });
          }}
          // The sheets open from state, not a Drawer.Trigger, so vaul has no trigger to hand focus back to.
          // An opener that has left the page (the floating RSVP button, once the guest has replied)
          // hands over to the page's own RSVP button.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const opener = returnTo.current?.isConnected ? returnTo.current : document.getElementById(RSVP_BUTTON_ID);
            opener?.focus({ preventScroll: true });
          }}
        >
          <Drawer.Handle className="sheet-handle" />
          <div className="sheet-scroll">
            <header className="sheet-head">
              <p className="eyebrow">{eyebrow}</p>
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

type Field = "attending" | "name" | "phone" | "invitedBy" | "guests" | "dietary" | "wish";
type FieldErrors = Partial<Record<Field, string>>;
/** Top to bottom, the order the fields appear in: focus goes to the first one in trouble. */
const FIELD_ORDER: readonly Field[] = ["attending", "name", "phone", "invitedBy", "guests", "dietary", "wish"];

/** Server errors arrive as text; route each to the field it is about so it shows under that field. */
function fieldFor(message: string): Field | undefined {
  if (/name/i.test(message)) return "name";
  if (/phone/i.test(message)) return "phone";
  if (/guest/i.test(message)) return "guests";
  if (/dietary/i.test(message)) return "dietary";
  if (/wish/i.test(message)) return "wish";
  return undefined;
}

/** What to fill in before anything is sent: both forms ask for a name, and the server asks the same. */
function requiredName(name: string): FieldErrors {
  return name.trim() ? {} : { name: emptyMessage("name") };
}

/**
 * Errors shown under the field each is about, plus one for a problem no field owns (a dropped connection),
 * which sits by the submit button. Each submit moves focus to the first field in trouble; editing a field
 * clears its message.
 */
function useFormErrors(targets: Partial<Record<Field, RefObject<HTMLElement | null>>>) {
  const id = useId();
  const [errors, setErrors] = useState<{ fields: FieldErrors; form?: string }>({ fields: {} });
  // Only a submit moves focus; clearing a message as the guest types must leave focus where it is.
  const focusAfterRender = useRef(false);

  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    const first = FIELD_ORDER.find((field) => errors.fields[field]);
    if (first) targets[first]?.current?.focus();
  });

  const errorId = (field: Field) => `${id}-${field}-error`;
  const formErrorId = `${id}-form-error`;

  return {
    /** The result of checking the form before sending: an empty set clears every message. */
    report: (fields: FieldErrors) => {
      setErrors({ fields });
      focusAfterRender.current = true;
      if (Object.keys(fields).length > 0) play("error");
    },
    reportServer: (err: unknown) => {
      const message = errorMessage(err);
      const field = fieldFor(message);
      setErrors(field ? { fields: { [field]: message } } : { fields: {}, form: message });
      focusAfterRender.current = true;
      play("error");
    },
    clear: (field: Field) =>
      setErrors((e) => {
        if (!e.fields[field]) return e;
        const fields = { ...e.fields };
        delete fields[field];
        return { ...e, fields };
      }),
    /** aria-invalid and aria-describedby for a field: its hint always, plus its error while it has one. */
    describe: (field: Field, hintId?: string) => {
      const invalid = Boolean(errors.fields[field]);
      const ids = [invalid ? errorId(field) : undefined, hintId].filter((v): v is string => Boolean(v)).join(" ");
      return { "aria-invalid": invalid || undefined, "aria-describedby": ids || undefined };
    },
    fieldError: (field: Field) =>
      errors.fields[field] ? (
        <span className="field-error" id={errorId(field)}>
          {errors.fields[field]}
        </span>
      ) : null,
    formError: errors.form ? (
      <p className="form-error" role="alert" id={formErrorId}>
        {errors.form}
      </p>
    ) : null,
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
  const [invitedBy, setInvitedBy] = useState<Inviter | null>(saved?.invitedBy ?? null);
  const [guests, setGuests] = useState(saved && saved.guests > 0 ? saved.guests : 1);
  const [dietary, setDietary] = useState(saved?.dietary ?? "");
  const [wish, setWish] = useState("");
  const [state, setState] = useState<RsvpState>({ kind: "editing" });
  const id = useId();
  const attendingRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const invitedByRef = useRef<HTMLInputElement>(null);
  const guestsRef = useRef<HTMLButtonElement>(null);
  const dietaryRef = useRef<HTMLTextAreaElement>(null);
  const wishRef = useRef<HTMLTextAreaElement>(null);
  const errors = useFormErrors({ attending: attendingRef, name: nameRef, phone: phoneRef, invitedBy: invitedByRef, guests: guestsRef, dietary: dietaryRef, wish: wishRef });
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
    const missing: FieldErrors = {
      ...(attending ? {} : { attending: "Choose Coming or Not coming." }),
      ...requiredName(name),
      ...(phoneDigits(phone) !== null ? {} : { phone: phone.trim() ? PHONE_MESSAGE : emptyMessage("phone number") }),
      ...(invitedBy ? {} : { invitedBy: "Choose who invited you." }),
    };
    errors.report(missing);
    if (!attending || !invitedBy || Object.keys(missing).length > 0) return;

    setState({ kind: "sending" });
    const rsvp: SavedRsvp = {
      name: name.trim(),
      phone: phone.trim(),
      attending,
      invitedBy,
      guests: attending === "yes" ? guests : 0,
      dietary: attending === "yes" && dietary.trim() ? dietary.trim() : undefined,
    };
    try {
      await submit({ ...rsvp, invitedBy });
    } catch (err) {
      errors.reportServer(err);
      setState({ kind: "editing" });
      return;
    }
    // The response is in. Remember it before the wish, so a wish that fails never hides that it was sent.
    saveRsvp(rsvp);
    onSaved(rsvp);
    try {
      if (wish.trim()) await addWish({ name, message: wish });
    } catch (err) {
      errors.reportServer(err);
      setState({ kind: "editing" });
      return;
    }
    setWish("");
    setState({ kind: "done", rsvp });
    play("success");
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} eyebrow="RSVP" title={state.kind === "done" ? "Thank you" : "Are you coming?"}>
      {state.kind === "done" ? (
        <div className="done">
          <div className="done-mark">
            <IconCheck size={30} />
          </div>
          <p className="done-text">
            {state.rsvp.attending === "yes" ? "Can't wait to see you!" : "Thank you for letting us know. You will be missed."}
          </p>
          {state.rsvp.attending === "yes" && (
            <p className="done-sub">
              {partySize(state.rsvp.guests)} · {EVENT.dateLong}
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
          <div className="field">
            <fieldset className="choice" aria-label="Are you coming?" {...errors.describe("attending")}>
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
                      errors.clear("attending");
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
            {errors.fieldError("attending")}
          </div>

          <label className="field">
            <span className="field-label">Your name</span>
            <input
              ref={nameRef}
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                errors.clear("name");
              }}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={80}
              required
              {...errors.describe("name")}
            />
            {errors.fieldError("name")}
          </label>

          <label className="field">
            <span className="field-label">Phone number</span>
            <input
              ref={phoneRef}
              className="input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                errors.clear("phone");
              }}
              autoComplete="tel"
              placeholder="012 345 6789"
              enterKeyHint="next"
              maxLength={20}
              required
              {...errors.describe("phone", `${id}-phone-hint`)}
            />
            {errors.fieldError("phone")}
            <span className="field-hint" id={`${id}-phone-hint`}>So we can reach you if plans change.</span>
          </label>

          <div className="field">
            <span className="field-label" id={`${id}-invited-label`}>
              Who invited you?
            </span>
            <fieldset className="chips" aria-labelledby={`${id}-invited-label`} {...errors.describe("invitedBy")}>
              {INVITERS.map(({ value, label }, i) => (
                <label key={value} className="chip" data-checked={invitedBy === value}>
                  <input
                    ref={i === 0 ? invitedByRef : undefined}
                    type="radio"
                    name="invitedBy"
                    value={value}
                    checked={invitedBy === value}
                    onChange={() => {
                      setInvitedBy(value);
                      errors.clear("invitedBy");
                    }}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {errors.fieldError("invitedBy")}
          </div>

          <div className="reveal-row" data-show={attending === "yes"} inert={attending !== "yes"}>
            <div className="reveal-inner">
              <div className="stitched">
                <div className="field">
                  <span className="field-label" id={`${id}-guests-label`}>
                    How many people, including you?
                  </span>
                  <div className="stepper" role="group" aria-labelledby={`${id}-guests-label`} {...errors.describe("guests")}>
                    <button
                      type="button"
                      className="stepper-btn"
                      data-sound="stepDown"
                      aria-label="Fewer people"
                      disabled={guests <= 1}
                      onClick={() => {
                        setGuests((g) => g - 1);
                        errors.clear("guests");
                      }}
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
                      aria-label="More people"
                      disabled={guests >= MAX_GUESTS}
                      onClick={() => {
                        setGuests((g) => g + 1);
                        errors.clear("guests");
                      }}
                    >
                      <IconPlus />
                    </button>
                  </div>
                  {errors.fieldError("guests")}
                </div>
                <label className="field dietary">
                  <span className="field-label">
                    Any dietary needs or allergies? <span className="optional">(optional)</span>
                  </span>
                  <textarea
                    ref={dietaryRef}
                    className="input textarea"
                    value={dietary}
                    onChange={(e) => {
                      setDietary(e.target.value);
                      errors.clear("dietary");
                    }}
                    rows={2}
                    maxLength={200}
                    placeholder="e.g. vegetarian, nut allergy"
                    {...errors.describe("dietary", `${id}-dietary-hint`)}
                  />
                  {errors.fieldError("dietary")}
                  <span className="field-hint" id={`${id}-dietary-hint`}>
                    For everyone in your party.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <label className="field">
            <span className="field-label">
              Do you have a wish for the couple? <span className="optional">(optional)</span>
            </span>
            <textarea
              ref={wishRef}
              className="input textarea"
              value={wish}
              onChange={(e) => {
                setWish(e.target.value);
                errors.clear("wish");
              }}
              rows={3}
              maxLength={400}
              {...errors.describe("wish", `${id}-wish-hint`)}
            />
            {errors.fieldError("wish")}
            <span className="field-hint" id={`${id}-wish-hint`}>
              Shown on the wishes wall.
            </span>
          </label>

          {errors.formError}

          <button className="btn-brutal" data-tone="jade" data-sound="none" type="submit" disabled={state.kind === "sending"}>
            {state.kind === "sending" ? "Sending…" : saved ? "Update response" : "Send response"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

export function WishSheet({
  open,
  onOpenChange,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The name from this guest's RSVP, which fills the name field until they type their own. */
  defaultName: string | undefined;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [prefilledFrom, setPrefilledFrom] = useState(defaultName);
  // An RSVP sent during this visit fills the name too, unless the guest has already typed one.
  if (defaultName !== prefilledFrom) {
    setPrefilledFrom(defaultName);
    if (!name.trim()) setName(defaultName ?? "");
  }
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const errors = useFormErrors({ name: nameRef, wish: messageRef });
  const add = useMutation(api.wishes.add);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const missing: FieldErrors = { ...requiredName(name), ...(message.trim() ? {} : { wish: emptyMessage("wish") }) };
    errors.report(missing);
    if (Object.keys(missing).length > 0) return;

    setSending(true);
    try {
      await add({ name, message });
      play("success");
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      errors.reportServer(err);
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
            onChange={(e) => {
              setName(e.target.value);
              errors.clear("name");
            }}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={80}
            {...errors.describe("name")}
          />
          {errors.fieldError("name")}
        </label>
        <label className="field">
          <span className="field-label">Your wish</span>
          <textarea
            ref={messageRef}
            className="input textarea"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              errors.clear("wish");
            }}
            rows={5}
            maxLength={400}
            {...errors.describe("wish", `${id}-count`)}
          />
          {errors.fieldError("wish")}
          <span className="field-hint" id={`${id}-count`}>
            {400 - message.length} characters left
          </span>
        </label>
        {errors.formError}
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
