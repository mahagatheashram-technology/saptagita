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

async function ensureSequenceInitialized(
  ctx: any,
  userId: Id<"users">,
  userState: any,
  orderedVerseIds: Id<"verses">[]
): Promise<any> {
  if (userState.sequenceInitialized) {
    return userState;
  }

  const readEvents = await ctx.db
    .query("readEvents")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const readSet = new Set(
    readEvents
      .filter((event: any) => event.kind !== "reread")
      .map((event: any) => String(event.verseId))
  );

  let pointer = 0;
  if (readSet.size > 0) {
    const firstUnreadIndex = orderedVerseIds.findIndex(
      (id) => !readSet.has(String(id))
    );
    pointer = firstUnreadIndex === -1 ? 0 : firstUnreadIndex;
  }

  await ctx.db.patch(userState._id, {
    sequentialPointer: pointer,
    sequenceInitialized: true,
  });

  return { ...userState, sequentialPointer: pointer, sequenceInitialized: true };
}

// Get or create today's daily set for a user
export const getTodaySet = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user and their state
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    let userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    if (!userState) throw new Error("User state not found");

    const todayDate = getTodayDateString(user.timezone);
    const orderedVerseIds = await getOrderedVerseIds(ctx);
    const totalVerses = orderedVerseIds.length || TOTAL_VERSES;

    userState = await ensureSequenceInitialized(
      ctx,
      args.userId,
      userState,
      orderedVerseIds
    );
    if (!userState) throw new Error("User state not found");

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

        const sequenceReads = readEvents.filter(
          (event: any) => event.kind !== "reread"
        );

        return {
          dailySet: existingSet,
          verses: verses.filter(Boolean),
          readVerseIds: sequenceReads.map((e) => e.verseId),
          isComplete: existingSet.completedAt != null,
        };
      }
    }

    // Need to create a new daily set
    // Get next 7 verses based on sequential pointer
    const pointer = userState.sequentialPointer ?? 0;
    const selectedVerseIds: Id<"verses">[] = [];
    
    for (let i = 0; i < DAILY_VERSE_COUNT; i++) {
      // Wrap around if we've gone through all verses
      const index = (pointer + i) % totalVerses;
      selectedVerseIds.push(orderedVerseIds[index]);
    }

    // Create the daily set
    const dailySetId = await ctx.db.insert("dailySets", {
      userId: args.userId,
      localDate: todayDate,
      verseIds: selectedVerseIds,
      createdAt: Date.now(),
      completedAt: null,
    });

    // Update user state with new set (do not advance pointer)
    await ctx.db.patch(userState._id, {
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
    // Check if all verses in the set are now read
    const dailySet = await ctx.db.get(args.dailySetId);
    if (!dailySet) throw new Error("Daily set not found");
    if (dailySet.userId !== args.userId) {
      throw new Error("Not your daily set");
    }

    let userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    if (!userState) throw new Error("User state not found");

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q) => q.eq("dailySetId", args.dailySetId))
      .collect();

    const sequenceReads = readEvents.filter(
      (event: any) => event.kind !== "reread"
    );

    // Check if already read (sequence)
    const existingRead = sequenceReads.find(
      (event: any) => String(event.verseId) === String(args.verseId)
    );

    if (existingRead) {
      const isComplete = sequenceReads.length >= dailySet.verseIds.length;

      return {
        alreadyRead: true,
        versesRead: sequenceReads.length,
        totalVerses: dailySet.verseIds.length,
        isComplete,
        streakUpdate: null,
      };
    }

    const expectedVerseId = dailySet.verseIds[sequenceReads.length];
    if (!expectedVerseId) {
      return {
        alreadyRead: true,
        versesRead: sequenceReads.length,
        totalVerses: dailySet.verseIds.length,
        isComplete: true,
        streakUpdate: null,
      };
    }

    if (String(expectedVerseId) !== String(args.verseId)) {
      throw new Error("Verse is not next in sequence");
    }

    const firstReadOfDay = readEvents.length === 0;

    // Create read event
    await ctx.db.insert("readEvents", {
      userId: args.userId,
      dailySetId: args.dailySetId,
      verseId: args.verseId,
      readAt: Date.now(),
      kind: "sequence",
    });

    const newReadCount = sequenceReads.length + 1;
    const isComplete = newReadCount >= dailySet.verseIds.length;
    let streakUpdate: StreakUpdate | null = null;

    if (firstReadOfDay) {
      streakUpdate = await ctx.runMutation(
        internal.streaks.updateStreakOnReadInternal,
        { userId: args.userId, localDate: dailySet.localDate }
      );
    }

    await ctx.db.patch(userState._id, {
      sequentialPointer: ((userState.sequentialPointer ?? 0) + 1) % TOTAL_VERSES,
    });

    if (isComplete && !dailySet.completedAt) {
      // Mark set as complete
      await ctx.db.patch(args.dailySetId, {
        completedAt: Date.now(),
      });

      const streakRecord = await ctx.db
        .query("streaks")
        .withIndex("byUser", (q) => q.eq("userId", args.userId))
        .first();

      if (streakRecord) {
        await ctx.db.patch(streakRecord._id, {
          lastCompletedLocalDate: dailySet.localDate,
          updatedAt: Date.now(),
        });
      }
    }

    return {
      alreadyRead: false,
      versesRead: newReadCount,
      totalVerses: dailySet.verseIds.length,
      isComplete,
      streakUpdate,
    };
  },
});

export const logReread = mutation({
  args: {
    userId: v.id("users"),
    verseId: v.id("verses"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ streakUpdate: StreakUpdate | null }> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    let userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    if (!userState) throw new Error("User state not found");

    const todayDate = getTodayDateString(user.timezone);

    let dailySet = null;
    if (userState.currentDailySetId && userState.lastDailyDate === todayDate) {
      dailySet = await ctx.db.get(userState.currentDailySetId);
    }

    if (!dailySet) {
      const orderedVerseIds = await getOrderedVerseIds(ctx);
      userState = await ensureSequenceInitialized(
        ctx,
        args.userId,
        userState,
        orderedVerseIds
      );
      if (!userState) throw new Error("User state not found");
      const totalVerses = orderedVerseIds.length || TOTAL_VERSES;
      const pointer = userState.sequentialPointer ?? 0;

      const selectedVerseIds: Id<"verses">[] = [];
      for (let i = 0; i < DAILY_VERSE_COUNT; i++) {
        const index = (pointer + i) % totalVerses;
        selectedVerseIds.push(orderedVerseIds[index]);
      }

      const dailySetId = await ctx.db.insert("dailySets", {
        userId: args.userId,
        localDate: todayDate,
        verseIds: selectedVerseIds,
        createdAt: Date.now(),
        completedAt: null,
      });

      await ctx.db.patch(userState._id, {
        lastDailyDate: todayDate,
        currentDailySetId: dailySetId,
      });

      dailySet = await ctx.db.get(dailySetId);
    }
    if (!dailySet) throw new Error("Daily set not found");

    const existingEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q) => q.eq("dailySetId", dailySet._id))
      .collect();

    const firstReadOfDay = existingEvents.length === 0;

    await ctx.db.insert("readEvents", {
      userId: args.userId,
      dailySetId: dailySet._id,
      verseId: args.verseId,
      readAt: Date.now(),
      kind: "reread",
    });

    let streakUpdate: StreakUpdate | null = null;
    if (firstReadOfDay) {
      streakUpdate = await ctx.runMutation(
        internal.streaks.updateStreakOnReadInternal,
        { userId: args.userId, localDate: dailySet.localDate }
      );
    }

    return { streakUpdate };
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

    const sequenceReads = readEvents.filter(
      (event: any) => event.kind !== "reread"
    );

    return {
      versesRead: sequenceReads.length,
      totalVerses: dailySet.verseIds.length,
      isComplete: dailySet.completedAt != null,
    };
  },
});

export const getReadingHistory = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const days = args.days ?? 90;
    const timezone = user.timezone || "UTC";
    const today = new Date();
    const targetDates = new Set<string>();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const localDate = date.toLocaleDateString("en-CA", { timeZone: timezone });
      targetDates.add(localDate);
    }

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (readEvents.length === 0) {
      return { readDates: [], perfectDates: [] };
    }

    const dailySetIds = Array.from(
      new Set(readEvents.map((event) => String(event.dailySetId)))
    );

    const dailySets = await Promise.all(
      dailySetIds.map((id) => ctx.db.get(id as Id<"dailySets">))
    );

    const readDates = new Set(
      dailySets
        .filter(Boolean)
        .map((set) => (set as any).localDate)
        .filter((localDate) => targetDates.has(localDate))
    );

    const perfectDates = new Set(
      dailySets
        .filter(Boolean)
        .filter((set: any) => set.completedAt != null)
        .map((set: any) => set.localDate)
        .filter((localDate) => targetDates.has(localDate))
    );

    return {
      readDates: Array.from(readDates),
      perfectDates: Array.from(perfectDates),
    };
  },
});

export const getReadVerses = query({
  args: {
    userId: v.id("users"),
    sort: v.optional(v.union(v.literal("recent"), v.literal("canonical"))),
  },
  handler: async (ctx, args) => {
    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const verses = await ctx.db.query("verses").collect();
    const orderedVerses = verses.sort((a: any, b: any) => {
      if (a.chapterNumber !== b.chapterNumber) {
        return a.chapterNumber - b.chapterNumber;
      }
      return a.verseNumber - b.verseNumber;
    });

    if (readEvents.length === 0) {
      return { items: [], totalReadVerses: 0, totalVerses: TOTAL_VERSES };
    }

    const verseIndexMap = new Map<string, number>();
    orderedVerses.forEach((verse: any, index: number) => {
      verseIndexMap.set(String(verse._id), index);
    });

    const sequenceEvents = readEvents.filter(
      (event: any) => event.kind !== "reread"
    );

    let maxSequenceIndex = -1;
    for (const event of sequenceEvents) {
      const index = verseIndexMap.get(String(event.verseId));
      if (index !== undefined && index > maxSequenceIndex) {
        maxSequenceIndex = index;
      }
    }

    if (maxSequenceIndex < 0) {
      return { items: [], totalReadVerses: 0, totalVerses: TOTAL_VERSES };
    }

    const verseStats = new Map<
      string,
      { verseId: Id<"verses">; lastReadAt: number; firstReadAt: number; readCount: number }
    >();

    for (const event of readEvents) {
      const key = String(event.verseId);
      const existing = verseStats.get(key);
      if (!existing) {
        verseStats.set(key, {
          verseId: event.verseId,
          lastReadAt: event.readAt,
          firstReadAt: event.readAt,
          readCount: 1,
        });
        continue;
      }
      existing.lastReadAt = Math.max(existing.lastReadAt, event.readAt);
      existing.firstReadAt = Math.min(existing.firstReadAt, event.readAt);
      existing.readCount += 1;
    }

    const progressVerses = orderedVerses.slice(0, maxSequenceIndex + 1);
    let items = progressVerses.map((verse: any, index: number) => {
      const stats = verseStats.get(String(verse._id));
      return {
        verse,
        lastReadAt: stats?.lastReadAt ?? null,
        readCount: stats?.readCount ?? 0,
        _index: index,
      };
    });

    const sortMode = args.sort ?? "recent";
    if (sortMode === "recent") {
      items.sort((a: any, b: any) => {
        const aTime = a.lastReadAt ?? 0;
        const bTime = b.lastReadAt ?? 0;
        if (bTime !== aTime) {
          return bTime - aTime;
        }
        return a._index - b._index;
      });
    }

    items = items.map(({ _index, ...rest }: any) => rest);

    return {
      items,
      totalReadVerses: progressVerses.length,
      totalVerses: TOTAL_VERSES,
    };
  },
});
