import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Convex provides process.env at runtime; declared here so the browser build (which imports these types) needs no Node typings.
declare const process: { env: Record<string, string | undefined> };

function assertAdmin(key: string) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) throw new ConvexError("ADMIN_KEY is not set on this Convex deployment.");
  if (key !== expected) throw new ConvexError("That key is not correct.");
}

export const overview = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    assertAdmin(key);
    const rsvps = await ctx.db.query("rsvps").collect();
    const wishes = await ctx.db.query("wishes").order("desc").collect();
    rsvps.sort((a, b) => b.updatedAt - a.updatedAt);

    const attending = rsvps.filter((r) => r.attending === "yes");
    const guestsFrom = (side: Doc<"rsvps">["invitedBy"]) =>
      attending.filter((r) => r.invitedBy === side).reduce((sum, r) => sum + r.guests, 0);
    return {
      totals: {
        responses: rsvps.length,
        attending: attending.length,
        declined: rsvps.length - attending.length,
        guests: attending.reduce((sum, r) => sum + r.guests, 0),
        dietary: attending.filter((r) => r.dietary).length,
        bySide: { hazli: guestsFrom("hazli"), ain: guestsFrom("ain"), both: guestsFrom("both"), unknown: guestsFrom(undefined) },
      },
      rsvps,
      wishes,
    };
  },
});

export const setWishHidden = mutation({
  args: { key: v.string(), id: v.id("wishes"), hidden: v.boolean() },
  handler: async (ctx, { key, id, hidden }) => {
    assertAdmin(key);
    await ctx.db.patch(id, { hidden });
  },
});
