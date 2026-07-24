import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  calculateCompletionStreak,
  getPreviousLocalDate,
} from "./streakMath";

// Helper: Get today's date string in user's timezone with fallback to UTC if invalid
function getTodayDateString(timezone: string): string {
  const now = new Date();
  try {
    return now.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

async function getCompletionStats(ctx: any, userId: any) {
  const completedSets = await ctx.db
    .query("dailySets")
    .withIndex("byUser", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.neq(q.field("completedAt"), null))
    .collect();

  return {
    completedSets,
    stats: calculateCompletionStreak(
      completedSets.map((set: any) => set.localDate)
    ),
  };
}

function getActiveCurrentStreak(
  currentStreak: number,
  lastCompletedLocalDate: string,
  todayDate: string
): number {
  const yesterdayDate = getPreviousLocalDate(todayDate);
  return lastCompletedLocalDate === todayDate ||
    lastCompletedLocalDate === yesterdayDate
    ? currentStreak
    : 0;
}

// Get user's streak data
export const getStreak = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    const { stats } = await getCompletionStats(ctx, args.userId);
    const todayDate = getTodayDateString(user?.timezone || "UTC");
    const currentStreak = getActiveCurrentStreak(
      stats.currentStreak,
      stats.lastCompletedLocalDate,
      todayDate
    );

    return {
      ...(streak ?? {}),
      currentStreak,
      longestStreak: stats.longestStreak,
      lastCompletedLocalDate: stats.lastCompletedLocalDate,
    };
  },
});

export const getStreakStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const { completedSets, stats } = await getCompletionStats(ctx, args.userId);
    const todayDate = getTodayDateString(user?.timezone || "UTC");

    const readEvents = (
      await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
    ).filter((event: any) => event.kind !== "reread");

    const readDailySetIds = Array.from(
      new Set(readEvents.map((event: any) => String(event.dailySetId)))
    );

    const readDailySets = await Promise.all(
      readDailySetIds.map((id) => ctx.db.get(id as any))
    );

    const readDays = new Set(
      readDailySets
        .filter(Boolean)
        .map((set: any) => set.localDate)
    ).size;

    return {
      currentStreak: getActiveCurrentStreak(
        stats.currentStreak,
        stats.lastCompletedLocalDate,
        todayDate
      ),
      longestStreak: stats.longestStreak,
      perfectDays: new Set(
        completedSets.map((set: any) => set.localDate)
      ).size,
      readDays,
    };
  },
});

// Internal mutation: Update streak when day is completed
// Called when user finishes all 7 verses
export const updateStreakOnCompletionInternal = internalMutation({
  args: { userId: v.id("users"), localDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Get user for timezone
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    // Anchor streak updates to the daily set's local date to avoid timezone drift
    const completionLocalDate =
      args.localDate ?? getTodayDateString(timezone);
    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const { completedSets } = await getCompletionStats(ctx, args.userId);
    const completedDates: string[] = completedSets.map(
      (set: any) => set.localDate
    );
    const wasAlreadyCompleted = completedDates.includes(completionLocalDate);
    if (!wasAlreadyCompleted) {
      completedDates.push(completionLocalDate);
    }

    const previousStats = calculateCompletionStreak(
      completedDates.filter((date: string) => date !== completionLocalDate)
    );
    const nextStats = calculateCompletionStreak(completedDates);
    const isNewRecord =
      !wasAlreadyCompleted &&
      nextStats.longestStreak > previousStats.longestStreak;

    if (streakRecord) {
      await ctx.db.patch(streakRecord._id, {
        ...nextStats,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("streaks", {
        userId: args.userId,
        ...nextStats,
        updatedAt: Date.now(),
      });
    }

    return {
      currentStreak: nextStats.currentStreak,
      longestStreak: nextStats.longestStreak,
      isNewRecord,
    };
  },
});

// Check and potentially reset streak if day was missed
// Call this when app opens to ensure streak is accurate
export const checkAndUpdateStreak = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    const todayDate = getTodayDateString(timezone);

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const { stats } = await getCompletionStats(ctx, args.userId);
    const currentStreak = getActiveCurrentStreak(
      stats.currentStreak,
      stats.lastCompletedLocalDate,
      todayDate
    );
    const needsReset =
      Boolean(streakRecord?.currentStreak) && currentStreak === 0;

    if (streakRecord) {
      await ctx.db.patch(streakRecord._id, {
        currentStreak,
        longestStreak: stats.longestStreak,
        lastCompletedLocalDate: stats.lastCompletedLocalDate,
        updatedAt: Date.now(),
      });
    }

    return {
      currentStreak,
      longestStreak: stats.longestStreak,
      needsReset,
    };
  },
});

export const getGlobalLeaderboard = query({
  args: { currentUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const streaks = await ctx.db.query("streaks").collect();

    if (streaks.length === 0) {
      return { top50: [], currentUser: null, totalUsers: 0 };
    }

    const leaderboard = await Promise.all(
      streaks.map(async (streak) => {
        const user = await ctx.db.get(streak.userId);
        return {
          userId: streak.userId,
          displayName: user?.displayName ?? "Anonymous",
          avatarUrl: user?.avatarUrl ?? "",
          currentStreak: streak.currentStreak,
          lastReadLocalDate: streak.lastCompletedLocalDate ?? "",
        };
      })
    );

    leaderboard.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      const aDate = a.lastReadLocalDate ?? "";
      const bDate = b.lastReadLocalDate ?? "";
      return bDate.localeCompare(aDate);
    });

    const ranked = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    const currentUser = args.currentUserId
      ? ranked.find((entry) => entry.userId === args.currentUserId) ?? null
      : null;

    return {
      top50: ranked.slice(0, 50),
      currentUser,
      totalUsers: ranked.length,
    };
  },
});

export const getCommunityLeaderboard = query({
  args: {
    communityId: v.id("communities"),
    currentUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    if (members.length === 0) {
      return { top50: [], currentUser: null, totalMembers: 0 };
    }

    const leaderboardEntries = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (!user) return null;

        const streak = await ctx.db
          .query("streaks")
          .withIndex("byUser", (q) => q.eq("userId", member.userId))
          .first();

        return {
          userId: member.userId,
          displayName: user.displayName ?? "Anonymous",
          avatarUrl: user.avatarUrl ?? "",
          currentStreak: streak?.currentStreak ?? 0,
          lastReadLocalDate: streak?.lastCompletedLocalDate ?? null,
        };
      })
    );

    const leaderboard = leaderboardEntries.filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry)
    );

    leaderboard.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      const aDate = a.lastReadLocalDate ?? "";
      const bDate = b.lastReadLocalDate ?? "";
      return bDate.localeCompare(aDate);
    });

    const ranked = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    const currentUser = args.currentUserId
      ? ranked.find((entry) => entry.userId === args.currentUserId) ?? null
      : null;

    return {
      top50: ranked.slice(0, 50),
      currentUser,
      totalMembers: members.length,
    };
  },
});
