import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { attendance } from "./schema";
import { LIMITS, cleanText, normalisePhone, optionalText } from "./limits";

/** One response per phone number: resubmitting updates the earlier answer instead of double-counting. */
export const submit = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    attending: attendance,
    guests: v.number(),
    dietary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = cleanText(args.name, "name", LIMITS.name);
    const phone = normalisePhone(args.phone);
    const guests = args.attending === "yes" ? args.guests : 0;
    if (args.attending === "yes" && (!Number.isInteger(guests) || guests < 1 || guests > LIMITS.maxGuests)) {
      throw new ConvexError(`Guests must be between 1 and ${LIMITS.maxGuests}.`);
    }

    const dietary = args.attending === "yes" ? optionalText(args.dietary, "dietary note", LIMITS.dietary) : undefined;
    const row = { name, phone, attending: args.attending, guests, dietary, updatedAt: Date.now() };
    const existing = await ctx.db
      .query("rsvps")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (existing) {
      await ctx.db.replace("rsvps", existing._id, row);
      return { updated: true };
    }
    await ctx.db.insert("rsvps", row);
    return { updated: false };
  },
});
