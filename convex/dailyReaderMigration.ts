import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { incrementDailyReaderCount } from "./dailyReaders";

const BACKFILL_PAGE_SIZE = 32;

// Backfill only each user's current daily set. Historical counts expire from
// the UI naturally, while the marker makes retries and concurrent live reads
// idempotent.
export const backfillCurrentReaderCountsPage = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    processed: v.number(),
    counted: v.number(),
    cursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("userState").paginate({
      cursor: args.cursor ?? null,
      numItems: BACKFILL_PAGE_SIZE,
    });
    let counted = 0;

    for (const state of page.page) {
      if (!state.currentDailySetId) continue;

      const dailySet = await ctx.db.get(state.currentDailySetId);
      if (
        !dailySet ||
        state.lastReaderCountedLocalDate === dailySet.localDate
      ) {
        continue;
      }

      const [sequenceRead, legacyRead] = await Promise.all([
        ctx.db
          .query("readEvents")
          .withIndex("by_dailySet_kind", (q) =>
            q.eq("dailySetId", dailySet._id).eq("kind", "sequence"),
          )
          .first(),
        ctx.db
          .query("readEvents")
          .withIndex("by_dailySet_kind", (q) =>
            q.eq("dailySetId", dailySet._id).eq("kind", undefined),
          )
          .first(),
      ]);
      if (!sequenceRead && !legacyRead) continue;

      await incrementDailyReaderCount(ctx, state.userId, dailySet.localDate);
      await ctx.db.patch(state._id, {
        lastReaderCountedLocalDate: dailySet.localDate,
      });
      counted += 1;
    }

    return {
      processed: page.page.length,
      counted,
      cursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
