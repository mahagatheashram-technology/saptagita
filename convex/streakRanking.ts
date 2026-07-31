import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type StreakRankKey = [number, number, number];
type StreakInsert = Omit<Doc<"streaks">, "_id" | "_creationTime">;
type StreakPatch = Partial<StreakInsert>;

export const GLOBAL_STREAK_RANKING_METADATA_KEY =
  "global-streak-ranking-v1";

export function isRankedStreak(streak: Pick<Doc<"streaks">, "currentStreak">) {
  return streak.currentStreak > 0;
}

function localDateRankValue(localDate: string): number {
  const compactDate = Number(localDate.replaceAll("-", ""));
  return Number.isFinite(compactDate) ? compactDate : 0;
}

// Ascending aggregate keys mirror the shipped leaderboard's descending Convex
// index: current streak, last completion date, then creation time.
export const globalStreakRanking = new TableAggregate<{
  Key: StreakRankKey;
  DataModel: DataModel;
  TableName: "streaks";
}>(components.globalStreakRanking, {
  sortKey: (doc) => [
    -doc.currentStreak,
    -localDateRankValue(doc.lastCompletedLocalDate),
    -doc._creationTime,
  ],
});

export async function insertRankedStreak(
  ctx: MutationCtx,
  value: StreakInsert,
): Promise<Id<"streaks">> {
  const streakId = await ctx.db.insert("streaks", value);
  if (!isRankedStreak(value)) return streakId;

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
  if (isRankedStreak(streak)) {
    await globalStreakRanking.deleteIfExists(ctx, streak);
  }
}
