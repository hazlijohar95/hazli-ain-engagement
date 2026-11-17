import { ConvexError } from "convex/values";

export const LIMITS = {
  name: 80,
  wish: 400,
  maxGuests: 6,
  dietary: 200,
} as const;

export function cleanText(value: string, field: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length === 0) throw new ConvexError(`Enter your ${field}.`);
  if (text.length > max) throw new ConvexError(`Shorten your ${field} to ${max} characters or fewer.`);
  return text;
}

/** Normalises Malaysian and international numbers to digits with country code, e.g. 60123456789. */
export function normalisePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `6${digits}`;
  if (digits.length < 9 || digits.length > 15) {
    throw new ConvexError("Enter a phone number with 9 to 15 digits, such as 012 345 6789.");
  }
  return digits;
}

/** Like cleanText, but empty means "not given" rather than an error. */
export function optionalText(value: string | undefined, field: string, max: number): string | undefined {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text ? cleanText(text, field, max) : undefined;
}
