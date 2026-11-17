import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const attendance = v.union(v.literal("yes"), v.literal("no"));
/** Whose guest this is, so the couple can tell their sides of the list apart. */
export const inviter = v.union(v.literal("hazli"), v.literal("ain"), v.literal("both"));

export default defineSchema({
  // Private: holds phone numbers, only readable through the admin key.
  rsvps: defineTable({
    name: v.string(),
    phone: v.string(),
    attending: attendance,
    guests: v.number(),
    /** Dietary needs or allergies, from guests who are attending. */
    dietary: v.optional(v.string()),
    /** Missing only on responses sent before the form asked. */
    invitedBy: v.optional(inviter),
    updatedAt: v.number(),
  }).index("by_phone", ["phone"]),

  // Public: shown on the wishes wall unless hidden by the couple.
  wishes: defineTable({
    name: v.string(),
    message: v.string(),
    hidden: v.boolean(),
  }).index("by_hidden", ["hidden"]),
});
