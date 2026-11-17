import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const attendance = v.union(v.literal("yes"), v.literal("no"));

export default defineSchema({
  // Private: holds phone numbers, only readable through the admin key.
  rsvps: defineTable({
    name: v.string(),
    phone: v.string(),
    attending: attendance,
    guests: v.number(),
    /** Dietary needs or allergies, from guests who are attending. */
    dietary: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_phone", ["phone"]),

  // Public: shown on the wishes wall unless hidden by the couple.
  wishes: defineTable({
    name: v.string(),
    message: v.string(),
    hidden: v.boolean(),
  }).index("by_hidden", ["hidden"]),
});
