import { ConvexError } from "convex/values";

export const LIMITS = {
  name: 80,
  wish: 400,
  maxGuests: 6,
  dietary: 200,
} as const;

/** Shared with the forms, which check the same rules before sending so every problem shows at once. */
export const emptyMessage = (field: string) => `Enter your ${field}.`;
export const PHONE_MESSAGE = "Enter a phone number with 9 to 15 digits, such as 012 345 6789.";

export function cleanText(value: string, field: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length === 0) throw new ConvexError(emptyMessage(field));
  if (text.length > max) throw new ConvexError(`Shorten your ${field} to ${max} characters or fewer.`);
  return text;
}

/**
 * Malaysian and international numbers as digits with the country code, e.g. 60123456789, or null when
 * the number cannot be one. Every way of typing the same number must land on the same digits, because
 * the phone number is what makes a second RSVP update the first instead of counting the guest twice.
 */
export function phoneDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `6${digits}`;
  // A Malaysian mobile typed without its leading 0 (12 345 6789). With a country code a number starting
  // with 1 is North American, and that is 11 digits, so it never matches.
  else if (/^1\d{8,9}$/.test(digits)) digits = `60${digits}`;
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

export function normalisePhone(raw: string): string {
  const digits = phoneDigits(raw);
  if (digits === null) throw new ConvexError(PHONE_MESSAGE);
  return digits;
}

/** Like cleanText, but empty means "not given" rather than an error. */
export function optionalText(value: string | undefined, field: string, max: number): string | undefined {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text ? cleanText(text, field, max) : undefined;
}
