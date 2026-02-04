import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Helper: Get today's date string in user's timezone with fallback to UTC if invalid
function getTodayDateString(timezone: string): string {
  const now = new Date();
  try {
    return now.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

// Helper: Get yesterday's date string in user's timezone with fallback to UTC if invalid
function getYesterdayDateString(timezone: string): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  try {
    return now.toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

// Helper: Move one day back from a stored local date string (YYYY-MM-DD)
function getPreviousLocalDate(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}

// Get user's streak data
export const getStreak = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedLocalDate: "",
      };
    }

    return streak;
  },
});

export const getStreakStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const completedSets = await ctx.db
      .query("dailySets")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("completedAt"), null))
      .collect();

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

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
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      perfectDays: completedSets.length,
      readDays,
    };
  },
});

export const updateStreakOnReadInternal = internalMutation({
  args: { userId: v.id("users"), localDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    const readLocalDate = args.localDate ?? getTodayDateString(timezone);
    const previousLocalDate = getPreviousLocalDate(readLocalDate);

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!streakRecord) {
      await ctx.db.insert("streaks", {
        userId: args.userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedLocalDate: "",
        lastReadLocalDate: readLocalDate,
        updatedAt: Date.now(),
      });
      return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
    }

    const lastRead =
      streakRecord.lastReadLocalDate ??
      streakRecord.lastCompletedLocalDate ??
      "";

    if (!streakRecord.lastReadLocalDate && streakRecord.lastCompletedLocalDate) {
      await ctx.db.patch(streakRecord._id, {
        lastReadLocalDate: streakRecord.lastCompletedLocalDate,
        updatedAt: Date.now(),
      });
    }

    if (lastRead === readLocalDate) {
      return {
        currentStreak: streakRecord.currentStreak,
        longestStreak: streakRecord.longestStreak,
        isNewRecord: false,
      };
    }

    let newCurrentStreak = 1;
    if (lastRead === previousLocalDate) {
      newCurrentStreak = streakRecord.currentStreak + 1;
    }

    let newLongestStreak = streakRecord.longestStreak;
    let isNewRecord = false;
    if (newCurrentStreak > streakRecord.longestStreak) {
      newLongestStreak = newCurrentStreak;
      isNewRecord = true;
    }

    await ctx.db.patch(streakRecord._id, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastReadLocalDate: readLocalDate,
      updatedAt: Date.now(),
    });

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isNewRecord,
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
    const previousLocalDate = getPreviousLocalDate(completionLocalDate);

    // Get current streak record
    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!streakRecord) {
      // First completion ever - create streak record
      await ctx.db.insert("streaks", {
        userId: args.userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedLocalDate: completionLocalDate,
        updatedAt: Date.now(),
      });
      return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
    }

    // Already completed today - no change
    if (streakRecord.lastCompletedLocalDate === completionLocalDate) {
      return {
        currentStreak: streakRecord.currentStreak,
        longestStreak: streakRecord.longestStreak,
        isNewRecord: false,
      };
    }

    let newCurrentStreak: number;
    let newLongestStreak: number;
    let isNewRecord = false;

    // Check if this continues the streak (completed yesterday)
    if (streakRecord.lastCompletedLocalDate === previousLocalDate) {
      // Streak continues!
      newCurrentStreak = streakRecord.currentStreak + 1;
    } else {
      // Streak broken - start fresh
      newCurrentStreak = 1;
    }

    // Update longest streak if needed
    if (newCurrentStreak > streakRecord.longestStreak) {
      newLongestStreak = newCurrentStreak;
      isNewRecord = true;
    } else {
      newLongestStreak = streakRecord.longestStreak;
    }

    // Update the record
    await ctx.db.patch(streakRecord._id, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastCompletedLocalDate: completionLocalDate,
      updatedAt: Date.now(),
    });

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isNewRecord,
    };
  },
});

// Public mutation: Update streak when day is completed
// Called when user finishes all 7 verses
export const updateStreakOnCompletion = mutation({
  args: { userId: v.id("users"), localDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Get user for timezone
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    const completionLocalDate =
      args.localDate ?? getTodayDateString(timezone);
    const previousLocalDate = getPreviousLocalDate(completionLocalDate);

    // Get current streak record
    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!streakRecord) {
      // First completion ever - create streak record
      await ctx.db.insert("streaks", {
        userId: args.userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedLocalDate: completionLocalDate,
        updatedAt: Date.now(),
      });
      return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
    }

    // Already completed today - no change
    if (streakRecord.lastCompletedLocalDate === completionLocalDate) {
      return {
        currentStreak: streakRecord.currentStreak,
        longestStreak: streakRecord.longestStreak,
        isNewRecord: false,
      };
    }

    let newCurrentStreak: number;
    let newLongestStreak: number;
    let isNewRecord = false;

    // Check if this continues the streak (completed yesterday)
    if (streakRecord.lastCompletedLocalDate === previousLocalDate) {
      // Streak continues!
      newCurrentStreak = streakRecord.currentStreak + 1;
    } else {
      // Streak broken - start fresh
      newCurrentStreak = 1;
    }

    // Update longest streak if needed
    if (newCurrentStreak > streakRecord.longestStreak) {
      newLongestStreak = newCurrentStreak;
      isNewRecord = true;
    } else {
      newLongestStreak = streakRecord.longestStreak;
    }

    // Update the record
    await ctx.db.patch(streakRecord._id, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastCompletedLocalDate: completionLocalDate,
      updatedAt: Date.now(),
    });

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
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
    const yesterdayDate = getYesterdayDateString(timezone);

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!streakRecord) {
      return { currentStreak: 0, longestStreak: 0, needsReset: false };
    }

    const lastRead =
      streakRecord.lastReadLocalDate ??
      streakRecord.lastCompletedLocalDate ??
      "";

    // If last read was today or yesterday, streak is still valid
    if (
      lastRead === todayDate ||
      lastRead === yesterdayDate
    ) {
      return {
        currentStreak: streakRecord.currentStreak,
        longestStreak: streakRecord.longestStreak,
        needsReset: false,
      };
    }

    // Streak is broken - reset to 0
    await ctx.db.patch(streakRecord._id, {
      currentStreak: 0,
      updatedAt: Date.now(),
    });

    return {
      currentStreak: 0,
      longestStreak: streakRecord.longestStreak,
      needsReset: true,
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
          lastReadLocalDate:
            streak.lastReadLocalDate ?? streak.lastCompletedLocalDate ?? "",
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
          lastReadLocalDate:
            streak?.lastReadLocalDate ?? streak?.lastCompletedLocalDate ?? null,
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
