import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { patchRankedStreak } from "./streakRanking";

const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  authId: v.string(),
  displayName: v.string(),
  avatarUrl: v.string(),
  timezone: v.string(),
  createdAt: v.number(),
});

const userStateValidator = v.object({
  _id: v.id("userState"),
  _creationTime: v.number(),
  userId: v.id("users"),
  mode: v.string(),
  sequentialPointer: v.number(),
  lastDailyDate: v.string(),
  currentDailySetId: v.union(v.id("dailySets"), v.null()),
  reminderTime: v.optional(v.string()),
  scriptPreference: v.optional(
    v.union(v.literal("devanagari"), v.literal("telugu"))
  ),
  sequenceInitialized: v.optional(v.boolean()),
  todayGestureCoachSeenAt: v.optional(v.number()),
});

const streakValidator = v.object({
  _id: v.id("streaks"),
  _creationTime: v.number(),
  userId: v.id("users"),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastCompletedLocalDate: v.string(),
  lastReadLocalDate: v.optional(v.string()),
  updatedAt: v.number(),
});

// ============================================
// INTERNAL-ONLY DEVELOPMENT UTILITIES
//
// These functions intentionally use Convex's internal function builders so
// they are omitted from the public API and cannot be called by app clients.
// Keep them internal: they expose private state and destructively rewrite
// reading progress.
// ============================================

// Get full debug state for a user
export const getDebugState = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    user: v.union(userValidator, v.null()),
    userState: v.union(userStateValidator, v.null()),
    streak: v.union(streakValidator, v.null()),
    dailySets: v.array(
      v.object({
        id: v.id("dailySets"),
        localDate: v.string(),
        verseCount: v.number(),
        completedAt: v.union(v.number(), v.null()),
      })
    ),
    totalReadEvents: v.number(),
    currentTimezone: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const allDailySets = await ctx.db
      .query("dailySets")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .collect();

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      user,
      userState,
      streak,
      dailySets: allDailySets.map((ds) => ({
        id: ds._id,
        localDate: ds.localDate,
        verseCount: ds.verseIds.length,
        completedAt: ds.completedAt,
      })),
      totalReadEvents: readEvents.length,
      currentTimezone: user?.timezone || "UTC",
    };
  },
});

// Simulate moving to the next day (completes current day if needed, advances date)
export const simulateNextDay = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({
    previousDate: v.string(),
    simulatedDate: v.string(),
    message: v.string(),
    nextSequentialPointer: v.number(),
    lastStreakDate: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!userState) throw new Error("User state not found");

    // Calculate "tomorrow" based on current lastDailyDate
    const currentDate =
      userState.lastDailyDate || new Date().toISOString().split("T")[0];
    const nextDate = getNextDateString(currentDate);

    // Update userState to think it's the next day
    await ctx.db.patch(userState._id, {
      lastDailyDate: "", // Clear so next getTodaySet creates new set
      currentDailySetId: null,
    });

    // Also update streak's lastCompletedLocalDate if exists
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    // Nudge streak to think yesterday was the last completion so the next
    // force-complete will count as a new day (useful when real clock doesn't advance).
    let newStreakDate = streak?.lastCompletedLocalDate;
    if (streak) {
      const yesterday = getYesterdayDateString(user.timezone || "UTC");
      await patchRankedStreak(ctx, streak, {
        lastCompletedLocalDate: yesterday,
        updatedAt: Date.now(),
      });
      newStreakDate = yesterday;
    }

    return {
      previousDate: currentDate,
      simulatedDate: nextDate,
      message: "Day advanced. Reopen app or call getTodaySet to generate new daily set.",
      nextSequentialPointer: userState.sequentialPointer,
      lastStreakDate: newStreakDate,
    };
  },
});

// Simulate a missed day (advances date by 2, breaking streak)
export const simulateMissedDay = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({
    message: v.string(),
    streakLastDate: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!userState) throw new Error("User state not found");

    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    // If there's a streak, set lastCompletedLocalDate to 3 days ago
    // This will cause checkAndUpdateStreak to reset it
    let missedStreakDate: string | undefined;
    if (streak) {
      missedStreakDate = getPastDateString(3);
      await patchRankedStreak(ctx, streak, {
        lastCompletedLocalDate: missedStreakDate,
      });
    }

    // Clear current daily set
    await ctx.db.patch(userState._id, {
      lastDailyDate: "",
      currentDailySetId: null,
    });

    return {
      message: "Simulated missed day. Streak should reset on next app open.",
      streakLastDate: missedStreakDate,
    };
  },
});

// Force complete current day (marks all verses as read)
export const forceCompleteToday = internalMutation({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({ error: v.string() }),
    v.object({
      versesMarkedRead: v.number(),
      totalVerses: v.number(),
      message: v.string(),
      streak: v.union(streakValidator, v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!userState?.currentDailySetId) {
      return { error: "No current daily set found" };
    }

    const dailySet = await ctx.db.get(userState.currentDailySetId);
    if (!dailySet) {
      return { error: "Daily set not found" };
    }

    // Create read events for all verses not yet read
    const existingReads = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q) => q.eq("dailySetId", dailySet._id))
      .collect();

    const readVerseIds = new Set(existingReads.map((r) => r.verseId));
    let created = 0;

    for (const verseId of dailySet.verseIds) {
      if (!readVerseIds.has(verseId)) {
        await ctx.db.insert("readEvents", {
          userId: args.userId,
          dailySetId: dailySet._id,
          verseId: verseId,
          readAt: Date.now(),
          kind: "sequence",
        });
        created++;
      }
    }

    // Mark daily set as complete
    if (!dailySet.completedAt) {
      await ctx.db.patch(dailySet._id, {
        completedAt: Date.now(),
      });
    }

    // Update streak anchored to the set's local date to avoid misattribution across midnights
    await ctx.runMutation(internal.streaks.updateStreakOnCompletionInternal, {
      userId: args.userId,
      localDate: dailySet.localDate,
    });

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    return {
      versesMarkedRead: created,
      totalVerses: dailySet.verseIds.length,
      message: "Day force completed. Streak updated.",
      streak: streakRecord,
    };
  },
});

// Reset all user progress (start fresh)
export const resetUserProgress = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({
    deletedReadEvents: v.number(),
    deletedDailySets: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Delete all read events
    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const event of readEvents) {
      await ctx.db.delete(event._id);
    }

    // Delete all daily sets
    const dailySets = await ctx.db
      .query("dailySets")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .collect();

    for (const set of dailySets) {
      await ctx.db.delete(set._id);
    }

    // Reset user state
    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (userState) {
      await ctx.db.patch(userState._id, {
        sequentialPointer: 0,
        lastDailyDate: "",
        currentDailySetId: null,
      });
    }

    // Reset streak
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (streak) {
      await patchRankedStreak(ctx, streak, {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedLocalDate: "",
        updatedAt: Date.now(),
      });
    }

    return {
      deletedReadEvents: readEvents.length,
      deletedDailySets: dailySets.length,
      message: "User progress completely reset. Will start from verse 1.1",
    };
  },
});

// Helper functions
function getYesterdayDateString(timezone: string): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA", { timeZone: timezone });
}

function getNextDateString(currentDate: string): string {
  const d = new Date(currentDate + "T12:00:00Z");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}
