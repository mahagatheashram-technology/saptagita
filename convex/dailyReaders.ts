import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireCurrentUser } from "./auth";

// Spread a conference-sized first-read burst over independent counter docs.
// The Social query reads at most 64 tiny rows once when the screen is focused;
// it never scans users, readEvents, or dailySets.
const DAILY_READER_SHARD_COUNT = 64;

function getLocalDate(timezone: string): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

function getReaderShard(userId: Id<"users">): number {
  let hash = 0x811c9dc5;
  for (const character of String(userId)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % DAILY_READER_SHARD_COUNT;
}

export async function incrementDailyReaderCount(
  ctx: MutationCtx,
  userId: Id<"users">,
  localDate: string,
): Promise<void> {
  const shard = getReaderShard(userId);
  const counter = await ctx.db
    .query("dailyReaderCounts")
    .withIndex("by_date_shard", (q) =>
      q.eq("localDate", localDate).eq("shard", shard),
    )
    .unique();

  if (counter) {
    await ctx.db.patch(counter._id, { count: counter.count + 1 });
  } else {
    await ctx.db.insert("dailyReaderCounts", { localDate, shard, count: 1 });
  }
}

export async function decrementDailyReaderCount(
  ctx: MutationCtx,
  userId: Id<"users">,
  localDate: string,
): Promise<void> {
  const shard = getReaderShard(userId);
  const counter = await ctx.db
    .query("dailyReaderCounts")
    .withIndex("by_date_shard", (q) =>
      q.eq("localDate", localDate).eq("shard", shard),
    )
    .unique();
  if (!counter) return;

  if (counter.count <= 1) {
    await ctx.db.delete(counter._id);
  } else {
    await ctx.db.patch(counter._id, { count: counter.count - 1 });
  }
}

export const getTodayReaderCount = query({
  args: {},
  returns: v.object({
    count: v.number(),
    localDate: v.string(),
  }),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const localDate = getLocalDate(currentUser.timezone || "UTC");
    const shards = await ctx.db
      .query("dailyReaderCounts")
      .withIndex("by_date", (q) => q.eq("localDate", localDate))
      .take(DAILY_READER_SHARD_COUNT);

    return {
      count: shards.reduce((total, shard) => total + shard.count, 0),
      localDate,
    };
  },
});
