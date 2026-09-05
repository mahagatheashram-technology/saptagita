import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  GLOBAL_STREAK_RANKING_MAX_NODE_SIZE,
  localDateRankValue,
} from "./streakRankingKey";

export {
  GLOBAL_STREAK_RANKING_MAX_NODE_SIZE,
  localDateRankValue,
} from "./streakRankingKey";

type StreakRankKey = [number, number, number];
type StreakInsert = Omit<Doc<"streaks">, "_id" | "_creationTime">;
type StreakPatch = Partial<StreakInsert>;

export const GLOBAL_STREAK_RANKING_METADATA_KEY =
  "global-streak-ranking-v2-read-days";

export function isRankedStreak(streak: Pick<Doc<"streaks">, "currentStreak">) {
  return streak.currentStreak > 0;
}

// Ascending aggregate keys mirror the shipped leaderboard's descending Convex
// index: current streak, last read date, then creation time.
export const globalStreakRanking = new TableAggregate<{
  Key: StreakRankKey;
  DataModel: DataModel;
  TableName: "streaks";
}>(components.globalStreakRanking, {
  sortKey: (doc) => [
    -doc.currentStreak,
    -localDateRankValue(doc.lastReadLocalDate ?? doc.lastCompletedLocalDate),
    -doc._creationTime,
  ],
});

export async function insertRankedStreak(
  ctx: MutationCtx,
  value: StreakInsert,
): Promise<Id<"streaks">> {
  const streakId = await ctx.db.insert("streaks", value);
  if (!isRankedStreak(value) || !(await isRankingMaintenanceReady(ctx))) {
    return streakId;
  }

  const streak = await ctx.db.get(streakId);
  if (!streak) throw new Error("Inserted streak was not found");
  await globalStreakRanking.insertIfDoesNotExist(ctx, streak);
  return streakId;
}

export async function patchRankedStreak(
  ctx: MutationCtx,
  streak: Doc<"streaks">,
  patch: StreakPatch,
): Promise<void> {
  const nextStreak = { ...streak, ...patch };
  await ctx.db.patch(streak._id, patch);
  if (!(await isRankingMaintenanceReady(ctx))) return;

  if (isRankedStreak(streak) && isRankedStreak(nextStreak)) {
    await globalStreakRanking.replaceOrInsert(ctx, streak, nextStreak);
  } else if (isRankedStreak(nextStreak)) {
    await globalStreakRanking.insertIfDoesNotExist(ctx, nextStreak);
  } else if (isRankedStreak(streak)) {
    await globalStreakRanking.deleteIfExists(ctx, streak);
  }
}

export async function deleteRankedStreak(
  ctx: MutationCtx,
  streak: Doc<"streaks">,
): Promise<void> {
  await ctx.db.delete(streak._id);
  if (isRankedStreak(streak) && (await isRankingMaintenanceReady(ctx))) {
    await globalStreakRanking.deleteIfExists(ctx, streak);
  }
}

async function isRankingMaintenanceReady(ctx: MutationCtx): Promise<boolean> {
  const metadata = await ctx.db
    .query("systemMetadata")
    .withIndex("by_key", (q) =>
      q.eq("key", GLOBAL_STREAK_RANKING_METADATA_KEY),
    )
    .unique();
  return metadata?.ready === true;
}
