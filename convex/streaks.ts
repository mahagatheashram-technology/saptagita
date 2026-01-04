import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

// Internal mutation: Update streak when day is completed
// Called when user finishes all 7 verses
export const updateStreakOnCompletionInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user for timezone
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    const todayDate = getTodayDateString(timezone);
    const yesterdayDate = getYesterdayDateString(timezone);

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
        lastCompletedLocalDate: todayDate,
        updatedAt: Date.now(),
      });
      return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
    }

    // Already completed today - no change
    if (streakRecord.lastCompletedLocalDate === todayDate) {
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
    if (streakRecord.lastCompletedLocalDate === yesterdayDate) {
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
      lastCompletedLocalDate: todayDate,
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user for timezone
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    const todayDate = getTodayDateString(timezone);
    const yesterdayDate = getYesterdayDateString(timezone);

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
        lastCompletedLocalDate: todayDate,
        updatedAt: Date.now(),
      });
      return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
    }

    // Already completed today - no change
    if (streakRecord.lastCompletedLocalDate === todayDate) {
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
    if (streakRecord.lastCompletedLocalDate === yesterdayDate) {
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
      lastCompletedLocalDate: todayDate,
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

    // If last completion was today or yesterday, streak is still valid
    if (
      streakRecord.lastCompletedLocalDate === todayDate ||
      streakRecord.lastCompletedLocalDate === yesterdayDate
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
