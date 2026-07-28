import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  calculateDateStreak,
  getPreviousLocalDate,
} from "./streakMath";
import { requireCurrentUser, requireOwnedUser } from "./auth";

const streakUpdateValidator = v.object({
  currentStreak: v.number(),
  longestStreak: v.number(),
  isNewRecord: v.boolean(),
});

const leaderboardEntryValidator = v.object({
  userId: v.id("users"),
  displayName: v.string(),
  avatarUrl: v.string(),
  currentStreak: v.number(),
  lastReadLocalDate: v.union(v.string(), v.null()),
  rank: v.number(),
});

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
    .withIndex("byUserAndCompletedAt", (q: any) =>
      q.eq("userId", userId).gt("completedAt", 0),
    )
    .collect();

  return {
    completedSets,
    stats: calculateDateStreak(
      completedSets.map((set: any) => set.localDate)
    ),
  };
}

async function getReadActivityStats(ctx: any, userId: any) {
  const [legacyReadEvents, sequenceReadEvents] = await Promise.all([
    ctx.db
      .query("readEvents")
      .withIndex("by_user_kind", (q: any) =>
        q.eq("userId", userId).eq("kind", undefined),
      )
      .collect(),
    ctx.db
      .query("readEvents")
      .withIndex("by_user_kind", (q: any) =>
        q.eq("userId", userId).eq("kind", "sequence"),
      )
      .collect(),
  ]);
  const readEvents = [...legacyReadEvents, ...sequenceReadEvents];
  const readDailySetIds: string[] = Array.from(
    new Set<string>(readEvents.map((event: any) => String(event.dailySetId)))
  );
  const readDailySets = (
    await Promise.all(
      readDailySetIds.map((id) => ctx.db.get(id as any))
    )
  ).filter(Boolean);
  const readDates: string[] = Array.from(
    new Set<string>(readDailySets.map((set: any) => set.localDate))
  );

  return {
    readDates,
    stats: calculateDateStreak(readDates),
  };
}

function getActiveCurrentStreak(
  currentStreak: number,
  lastLocalDate: string,
  todayDate: string
): number {
  const yesterdayDate = getPreviousLocalDate(todayDate);
  return lastLocalDate === todayDate ||
    lastLocalDate === yesterdayDate
    ? currentStreak
    : 0;
}

// Get user's streak data
export const getStreak = query({
  args: { userId: v.id("users") },
  returns: v.object({
    _id: v.optional(v.id("streaks")),
    _creationTime: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedLocalDate: v.string(),
    lastReadLocalDate: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    const [{ stats: readStats }, { stats: completionStats }] =
      await Promise.all([
        getReadActivityStats(ctx, args.userId),
        getCompletionStats(ctx, args.userId),
      ]);
    const todayDate = getTodayDateString(user?.timezone || "UTC");
    const currentStreak = getActiveCurrentStreak(
      readStats.currentStreak,
      readStats.lastLocalDate,
      todayDate
    );

    return {
      ...(streak ?? {}),
      currentStreak,
      longestStreak: readStats.longestStreak,
      lastCompletedLocalDate: completionStats.lastLocalDate,
      lastReadLocalDate: readStats.lastLocalDate,
    };
  },
});

export const getStreakStats = query({
  args: { userId: v.id("users") },
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    perfectDays: v.number(),
    readDays: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);
    const [
      { completedSets },
      { readDates, stats: readStats },
    ] = await Promise.all([
      getCompletionStats(ctx, args.userId),
      getReadActivityStats(ctx, args.userId),
    ]);
    const todayDate = getTodayDateString(user?.timezone || "UTC");

    return {
      currentStreak: getActiveCurrentStreak(
        readStats.currentStreak,
        readStats.lastLocalDate,
        todayDate
      ),
      longestStreak: readStats.longestStreak,
      perfectDays: new Set(
        completedSets.map((set: any) => set.localDate)
      ).size,
      readDays: readDates.length,
    };
  },
});

// Internal mutation: Update the reading streak on the first sequence read of
// a local day. Rereads do not count toward this habit streak.
export const updateStreakOnReadInternal = internalMutation({
  args: { userId: v.id("users"), localDate: v.string() },
  returns: streakUpdateValidator,
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.userId))) throw new Error("User not found");

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    const { readDates, stats: nextStats } = await getReadActivityStats(
      ctx,
      args.userId
    );
    const previousStats = calculateDateStreak(
      readDates.filter((date: string) => date !== args.localDate)
    );
    const isNewRecord =
      nextStats.longestStreak > previousStats.longestStreak;

    if (streakRecord) {
      await ctx.db.patch(streakRecord._id, {
        currentStreak: nextStats.currentStreak,
        longestStreak: nextStats.longestStreak,
        lastReadLocalDate: nextStats.lastLocalDate,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("streaks", {
        userId: args.userId,
        currentStreak: nextStats.currentStreak,
        longestStreak: nextStats.longestStreak,
        lastCompletedLocalDate: "",
        lastReadLocalDate: nextStats.lastLocalDate,
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

// Internal mutation: Record completion metadata while preserving the
// first-read streak semantics used by Current and Longest.
export const updateStreakOnCompletionInternal = internalMutation({
  args: { userId: v.id("users"), localDate: v.optional(v.string()) },
  returns: streakUpdateValidator,
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

    const [
      { readDates, stats: readStats },
      { stats: completionStats },
    ] = await Promise.all([
      getReadActivityStats(ctx, args.userId),
      getCompletionStats(ctx, args.userId),
    ]);
    const previousReadStats = calculateDateStreak(
      readDates.filter((date: string) => date !== completionLocalDate)
    );
    const isNewRecord =
      readStats.longestStreak > previousReadStats.longestStreak;

    if (streakRecord) {
      await ctx.db.patch(streakRecord._id, {
        currentStreak: readStats.currentStreak,
        longestStreak: readStats.longestStreak,
        lastCompletedLocalDate: completionStats.lastLocalDate,
        lastReadLocalDate: readStats.lastLocalDate,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("streaks", {
        userId: args.userId,
        currentStreak: readStats.currentStreak,
        longestStreak: readStats.longestStreak,
        lastCompletedLocalDate: completionStats.lastLocalDate,
        lastReadLocalDate: readStats.lastLocalDate,
        updatedAt: Date.now(),
      });
    }

    return {
      currentStreak: readStats.currentStreak,
      longestStreak: readStats.longestStreak,
      isNewRecord,
    };
  },
});

// Check and potentially reset streak if day was missed
// Call this when app opens to ensure streak is accurate
export const checkAndUpdateStreak = mutation({
  args: { userId: v.id("users") },
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    needsReset: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);

    const timezone = user.timezone || "UTC";
    const todayDate = getTodayDateString(timezone);

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const [
      { stats: readStats },
      { stats: completionStats },
    ] = await Promise.all([
      getReadActivityStats(ctx, args.userId),
      getCompletionStats(ctx, args.userId),
    ]);
    const currentStreak = getActiveCurrentStreak(
      readStats.currentStreak,
      readStats.lastLocalDate,
      todayDate
    );
    const needsReset =
      Boolean(streakRecord?.currentStreak) && currentStreak === 0;

    if (streakRecord) {
      await ctx.db.patch(streakRecord._id, {
        currentStreak,
        longestStreak: readStats.longestStreak,
        lastCompletedLocalDate: completionStats.lastLocalDate,
        lastReadLocalDate: readStats.lastLocalDate,
        updatedAt: Date.now(),
      });
    }

    return {
      currentStreak,
      longestStreak: readStats.longestStreak,
      needsReset,
    };
  },
});

export const getGlobalLeaderboard = query({
  args: { currentUserId: v.optional(v.id("users")) },
  returns: v.object({
    top50: v.array(leaderboardEntryValidator),
    currentUser: v.union(leaderboardEntryValidator, v.null()),
    totalUsers: v.number(),
  }),
  handler: async (ctx, args) => {
    const currentUser = args.currentUserId
      ? await requireOwnedUser(ctx, args.currentUserId)
      : await requireCurrentUser(ctx);
    const streaks = await ctx.db.query("streaks").collect();

    if (streaks.length === 0) {
      return { top50: [], currentUser: null, totalUsers: 0 };
    }

    const leaderboard = await Promise.all(
      streaks.map(async (streak) => {
        const user = await ctx.db.get(streak.userId);
        const { stats } = await getReadActivityStats(ctx, streak.userId);
        const todayDate = getTodayDateString(user?.timezone || "UTC");
        return {
          userId: streak.userId,
          displayName: user?.displayName ?? "Anonymous",
          avatarUrl: user?.avatarUrl ?? "",
          currentStreak: getActiveCurrentStreak(
            stats.currentStreak,
            stats.lastLocalDate,
            todayDate
          ),
          lastReadLocalDate: stats.lastLocalDate,
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

    const currentUserEntry = ranked.find(
      (entry) => String(entry.userId) === String(currentUser._id)
    ) ?? null;

    return {
      top50: ranked.slice(0, 50),
      currentUser: currentUserEntry,
      totalUsers: ranked.length,
    };
  },
});

export const getCommunityLeaderboard = query({
  args: {
    communityId: v.id("communities"),
    currentUserId: v.optional(v.id("users")),
  },
  returns: v.object({
    top50: v.array(leaderboardEntryValidator),
    currentUser: v.union(leaderboardEntryValidator, v.null()),
    totalMembers: v.number(),
  }),
  handler: async (ctx, args) => {
    const currentUser = args.currentUserId
      ? await requireOwnedUser(ctx, args.currentUserId)
      : await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", currentUser._id)
      )
      .first();
    if (!membership) {
      throw new Error("Not a member of this community");
    }

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

        const { stats } = await getReadActivityStats(ctx, member.userId);
        const todayDate = getTodayDateString(user.timezone || "UTC");

        return {
          userId: member.userId,
          displayName: user.displayName ?? "Anonymous",
          avatarUrl: user.avatarUrl ?? "",
          currentStreak: getActiveCurrentStreak(
            stats.currentStreak,
            stats.lastLocalDate,
            todayDate
          ),
          lastReadLocalDate: stats.lastLocalDate || null,
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

    const currentUserEntry = ranked.find(
      (entry) => String(entry.userId) === String(currentUser._id)
    ) ?? null;

    return {
      top50: ranked.slice(0, 50),
      currentUser: currentUserEntry,
      totalMembers: members.length,
    };
  },
});
