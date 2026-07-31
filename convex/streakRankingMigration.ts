import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  GLOBAL_STREAK_RANKING_METADATA_KEY,
  GLOBAL_STREAK_RANKING_MAX_NODE_SIZE,
  globalStreakRanking,
  isRankedStreak,
} from "./streakRanking";

const BACKFILL_PAGE_SIZE = 64;

async function getRankingMetadata(ctx: any) {
  return await ctx.db
    .query("systemMetadata")
    .withIndex("by_key", (q: any) =>
      q.eq("key", GLOBAL_STREAK_RANKING_METADATA_KEY),
    )
    .unique();
}

export const getGlobalStreakRankingStatus = internalQuery({
  args: {},
  returns: v.object({
    initialized: v.boolean(),
    ready: v.boolean(),
    completedAt: v.optional(v.number()),
    cursor: v.optional(v.string()),
    maxNodeSize: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const metadata = await getRankingMetadata(ctx);
    return {
      initialized: Boolean(metadata),
      ready: metadata?.ready ?? false,
      completedAt: metadata?.completedAt,
      cursor: metadata?.cursor,
      maxNodeSize: metadata?.maxNodeSize,
    };
  },
});

// Operational sequence (non-production first): reset once, then call the
// paginated backfill repeatedly with the returned cursor until isDone is true.
export const resetGlobalStreakRanking = internalMutation({
  args: {
    confirm: v.literal("RESET_GLOBAL_STREAK_RANKING"),
    maxNodeSize: v.literal(GLOBAL_STREAK_RANKING_MAX_NODE_SIZE),
  },
  returns: v.object({ ready: v.literal(false) }),
  handler: async (ctx, args) => {
    await globalStreakRanking.clear(ctx, {
      maxNodeSize: args.maxNodeSize,
      rootLazy: true,
    });
    const metadata = await getRankingMetadata(ctx);
    if (metadata) {
      await ctx.db.patch(metadata._id, {
        ready: false,
        completedAt: undefined,
        cursor: undefined,
        maxNodeSize: args.maxNodeSize,
      });
    } else {
      await ctx.db.insert("systemMetadata", {
        key: GLOBAL_STREAK_RANKING_METADATA_KEY,
        ready: false,
        maxNodeSize: args.maxNodeSize,
      });
    }
    return { ready: false as const };
  },
});

export const backfillGlobalStreakRankingPage = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    cursor: v.string(),
    isDone: v.boolean(),
    ready: v.boolean(),
  }),
  handler: async (ctx) => {
    const metadata = await getRankingMetadata(ctx);
    if (!metadata) {
      throw new Error("Run resetGlobalStreakRanking before backfilling");
    }
    if (metadata.ready) {
      throw new Error("Global streak ranking is already ready");
    }

    const page = await ctx.db.query("streaks").paginate({
      cursor: metadata.cursor ?? null,
      numItems: BACKFILL_PAGE_SIZE,
    });

    for (const streak of page.page) {
      if (isRankedStreak(streak)) {
        await globalStreakRanking.insertIfDoesNotExist(ctx, streak);
      }
    }

    if (page.isDone) {
      await ctx.db.patch(metadata._id, {
        ready: true,
        completedAt: Date.now(),
        cursor: undefined,
      });
    } else {
      await ctx.db.patch(metadata._id, {
        cursor: page.continueCursor,
      });
    }

    return {
      processed: page.page.length,
      cursor: page.continueCursor,
      isDone: page.isDone,
      ready: page.isDone,
    };
  },
});
