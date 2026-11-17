import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { LIMITS, cleanText } from "./limits";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("wishes")
      .withIndex("by_hidden", (q) => q.eq("hidden", false))
      .order("desc")
      .take(200);
    return rows.map(({ _id, _creationTime, name, message }) => ({ _id, _creationTime, name, message }));
  },
});

export const add = mutation({
  args: { name: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const name = cleanText(args.name, "name", LIMITS.name);
    const message = cleanText(args.message, "wish", LIMITS.wish);

    // A double tap or a retry on a flaky connection must not post the same wish twice.
    const recent = await ctx.db.query("wishes").order("desc").take(50);
    if (recent.some((w) => w.name === name && w.message === message)) return null;
    return await ctx.db.insert("wishes", { name, message, hidden: false });
  },
});
