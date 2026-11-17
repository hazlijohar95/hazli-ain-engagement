import { EVENT } from "../event";

const title = `${EVENT.couple.short} · Engagement`;
const location = [EVENT.venue.full, ...EVENT.venue.address].join(", ");
const details = `${EVENT.occasion} ${EVENT.couple.first.full} & ${EVENT.couple.second.full}.`;

function compact(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function googleCalendarUrl(): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${compact(EVENT.date)}/${compact(nextDay(EVENT.date))}`,
    details,
    location,
    ctz: EVENT.timeZone,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Outlook on the web; desktop Outlook opens the .ics file instead. */
export function outlookCalendarUrl(): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: EVENT.date,
    enddt: nextDay(EVENT.date),
    allday: "true",
    location,
    body: details,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

function escapeIcs(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`);
}

/** Written to public/engagement.ics by `npm run og`; a static file is what iOS offers to add to Calendar. */
export function icsText(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hazli & Ain//Engagement//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:engagement-${EVENT.date}@hazli-ain`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${compact(EVENT.date)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(EVENT.date))}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(details)}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
