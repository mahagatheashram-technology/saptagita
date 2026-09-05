import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateCompletionStreak, getPreviousLocalDate } from "./streakMath";

const BACKFILL_PAGE_SIZE = 8;

function getTodayDateString(timezone: string): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

// One-time repair for deployments that temporarily reconciled Current and
// Longest from perfect days. Runtime streak updates remain constant-I/O.
export const backfillReadDayStreaksPage = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    processed: v.number(),
    repaired: v.number(),
    cursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("users").paginate({
      cursor: args.cursor ?? null,
      numItems: BACKFILL_PAGE_SIZE,
    });
    let repaired = 0;

    for (const user of page.page) {
      const [legacyReads, sequenceReads, completedSets, streakRecord] =
        await Promise.all([
          ctx.db
            .query("readEvents")
            .withIndex("by_user_kind", (q) =>
              q.eq("userId", user._id).eq("kind", undefined),
            )
            .collect(),
          ctx.db
            .query("readEvents")
            .withIndex("by_user_kind", (q) =>
              q.eq("userId", user._id).eq("kind", "sequence"),
            )
            .collect(),
          ctx.db
            .query("dailySets")
            .withIndex("byUserAndCompletedAt", (q) =>
              q.eq("userId", user._id).gt("completedAt", 0),
            )
            .collect(),
          ctx.db
            .query("streaks")
            .withIndex("byUser", (q) => q.eq("userId", user._id))
            .first(),
        ]);

      const dailySetIds = Array.from(
        new Set(
          [...legacyReads, ...sequenceReads].map((event) =>
            String(event.dailySetId),
          ),
        ),
      );
      const dailySets = await Promise.all(
        dailySetIds.map((dailySetId) => ctx.db.get(dailySetId as any)),
      );
      const readStats = calculateCompletionStreak(
        dailySets
          .filter(Boolean)
          .map((dailySet: any) => dailySet.localDate),
      );
      const completionStats = calculateCompletionStreak(
        completedSets.map((dailySet) => dailySet.localDate),
      );
      const todayDate = getTodayDateString(user.timezone || "UTC");
      const activeCurrentStreak =
        readStats.lastCompletedLocalDate === todayDate ||
        readStats.lastCompletedLocalDate === getPreviousLocalDate(todayDate)
          ? readStats.currentStreak
          : 0;
      const patch = {
        currentStreak: activeCurrentStreak,
        longestStreak: readStats.longestStreak,
        lastCompletedLocalDate: completionStats.lastCompletedLocalDate,
        lastReadLocalDate: readStats.lastCompletedLocalDate,
        updatedAt: Date.now(),
      };

      if (streakRecord) {
        await ctx.db.patch(streakRecord._id, patch);
      } else {
        await ctx.db.insert("streaks", { userId: user._id, ...patch });
      }
      repaired += 1;
    }

    return {
      processed: page.page.length,
      repaired,
      cursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
