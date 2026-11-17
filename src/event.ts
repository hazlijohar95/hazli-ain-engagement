/** Every fact the invitation shows lives here. Edit this file, nothing else, to change wording. */
export const EVENT = {
  couple: {
    short: "Hazli & Ain",
    first: { short: "Hazli", given: "Mohamad Hazli", lineage: "bin Johar", full: "Mohamad Hazli bin Johar" },
    second: { short: "Ain", given: "Nurul Ain Izzaty", lineage: "binti Sallehudin", full: "Nurul Ain Izzaty binti Sallehudin" },
  },
  occasion: "The engagement of",
  /** ISO calendar date in Malaysia time. No start time has been set, so it is an all-day event. */
  date: "2027-01-31",
  dateLong: "Sunday, 31 January 2027",
  dateDay: "31 January 2027",
  dateShort: "31 · 01 · 2027",
  weekday: "Sunday",
  time: null as string | null,
  timeZone: "Asia/Kuala_Lumpur",
  venue: {
    name: "De.Wan 1958",
    byline: "by Chef Wan",
    full: "De.Wan 1958 by Chef Wan",
    label: "De.Wan 1958, BSC",
    /** Restaurant listing address at Bangsar Shopping Centre. */
    address: ["F1 & F6, Level 1", "Bangsar Shopping Centre", "285 Jalan Maarof, Bangsar", "59000 Kuala Lumpur"],
    mapsQuery: "De.Wan 1958 by Chef Wan, Bangsar Shopping Centre, 285 Jalan Maarof, Kuala Lumpur",
  },
  tagline: "Two threads, woven together",
  rsvpBy: null as string | null,
} as const;

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(EVENT.venue.mapsQuery)}`;
export const APPLE_MAPS_URL = `https://maps.apple.com/?q=${encodeURIComponent(EVENT.venue.full)}&address=${encodeURIComponent(EVENT.venue.address.join(", "))}`;
export const MAX_GUESTS = 6;
