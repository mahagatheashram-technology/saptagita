import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const DAILY_VERSE_COUNT = 7;
const TOTAL_VERSES = 701;

// Helper: Get today's date string in user's timezone with fallback to UTC if invalid
function getTodayDateString(timezone: string): string {
  const now = new Date();
  try {
    return now.toLocaleDateString("en-CA", { timeZone: timezone }); // Returns YYYY-MM-DD
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

// Helper: Get ordered verses (could be cached/optimized later)
async function getOrderedVerseIds(ctx: any): Promise<Id<"verses">[]> {
  const verses = await ctx.db.query("verses").collect();
  const sorted = verses.sort((a: any, b: any) => {
    if (a.chapterNumber !== b.chapterNumber) {
      return a.chapterNumber - b.chapterNumber;
    }
    return a.verseNumber - b.verseNumber;
  });
  return sorted.map((v: any) => v._id);
}

// Get or create today's daily set for a user
export const getTodaySet = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user and their state
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    if (!userState) throw new Error("User state not found");

    const todayDate = getTodayDateString(user.timezone);

    // Check if we already have today's set
    if (userState.currentDailySetId && userState.lastDailyDate === todayDate) {
      const existingSet = await ctx.db.get(userState.currentDailySetId);
      if (existingSet) {
        // Get the actual verse documents
        const verses = await Promise.all(
          existingSet.verseIds.map((id: Id<"verses">) => ctx.db.get(id))
        );
        
        // Get read events for this set
        const readEvents = await ctx.db
          .query("readEvents")
          .withIndex("by_dailySet", (q) => q.eq("dailySetId", existingSet._id))
          .collect();
        
        return {
          dailySet: existingSet,
          verses: verses.filter(Boolean),
          readVerseIds: readEvents.map((e) => e.verseId),
          isComplete: existingSet.completedAt != null,
        };
      }
    }

    // Need to create a new daily set
    const allVerseIds = await getOrderedVerseIds(ctx);
    
    // Get next 7 verses based on sequential pointer
    let pointer = userState.sequentialPointer;
    const selectedVerseIds: Id<"verses">[] = [];
    
    for (let i = 0; i < DAILY_VERSE_COUNT; i++) {
      // Wrap around if we've gone through all verses
      const index = (pointer + i) % TOTAL_VERSES;
      selectedVerseIds.push(allVerseIds[index]);
    }

    // Create the daily set
    const dailySetId = await ctx.db.insert("dailySets", {
      userId: args.userId,
      localDate: todayDate,
      verseIds: selectedVerseIds,
      createdAt: Date.now(),
      completedAt: null,
    });

    // Update user state with new pointer (advance by 7)
    await ctx.db.patch(userState._id, {
      sequentialPointer: (pointer + DAILY_VERSE_COUNT) % TOTAL_VERSES,
      lastDailyDate: todayDate,
      currentDailySetId: dailySetId,
    });

    // Get the actual verse documents
    const verses = await Promise.all(
      selectedVerseIds.map((id) => ctx.db.get(id))
    );

    return {
      dailySet: await ctx.db.get(dailySetId),
      verses: verses.filter(Boolean),
      readVerseIds: [],
      isComplete: false,
    };
  },
});

type StreakUpdate = {
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
};

// Mark a verse as read
export const markVerseRead = mutation({
  args: {
    userId: v.id("users"),
    dailySetId: v.id("dailySets"),
    verseId: v.id("verses"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    alreadyRead: boolean;
    versesRead: number;
    totalVerses: number;
    isComplete: boolean;
    streakUpdate: StreakUpdate | null;
  }> => {
    // Check if already read
    const existingRead = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q) => q.eq("dailySetId", args.dailySetId))
      .filter((q) => q.eq(q.field("verseId"), args.verseId))
      .first();

    // Check if all verses in the set are now read
    const dailySet = await ctx.db.get(args.dailySetId);
    if (!dailySet) throw new Error("Daily set not found");

    if (existingRead) {
      const readEvents = await ctx.db
        .query("readEvents")
        .withIndex("by_dailySet", (q) => q.eq("dailySetId", args.dailySetId))
        .collect();

      const isComplete = readEvents.length >= dailySet.verseIds.length;

      return {
        alreadyRead: true,
        versesRead: readEvents.length,
        totalVerses: dailySet.verseIds.length,
        isComplete,
        streakUpdate: null,
      };
    }

    // Create read event
    await ctx.db.insert("readEvents", {
      userId: args.userId,
      dailySetId: args.dailySetId,
      verseId: args.verseId,
      readAt: Date.now(),
    });

    const allReadEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q) => q.eq("dailySetId", args.dailySetId))
      .collect();

    const isComplete = allReadEvents.length >= dailySet.verseIds.length;
    let streakUpdate: StreakUpdate | null = null;

    if (isComplete && !dailySet.completedAt) {
      // Mark set as complete
      await ctx.db.patch(args.dailySetId, {
        completedAt: Date.now(),
      });

      // Update streak and capture result for UI
      streakUpdate = await ctx.runMutation(
        internal.streaks.updateStreakOnCompletionInternal,
        { userId: args.userId }
      );
    }

    return {
      alreadyRead: false,
      versesRead: allReadEvents.length,
      totalVerses: dailySet.verseIds.length,
      isComplete,
      streakUpdate,
    };
  },
});

// Get reading progress for today
export const getTodayProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!userState?.currentDailySetId) {
      return { versesRead: 0, totalVerses: DAILY_VERSE_COUNT, isComplete: false };
    }

    const dailySet = await ctx.db.get(userState.currentDailySetId);
    if (!dailySet) {
      return { versesRead: 0, totalVerses: DAILY_VERSE_COUNT, isComplete: false };
    }

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q) => q.eq("dailySetId", dailySet._id))
      .collect();

    return {
      versesRead: readEvents.length,
      totalVerses: dailySet.verseIds.length,
      isComplete: dailySet.completedAt != null,
    };
  },
});
