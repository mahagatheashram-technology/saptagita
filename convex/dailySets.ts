import { mutation, query } from "./_generated/server";
import type { DatabaseReader } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireOwnedUser } from "./auth";
import {
  dailySetValidator,
  verseValidator,
} from "./validators";
import { selectCanonicalDailySet } from "./integrityRules";
import { incrementDailyReaderCount } from "./dailyReaders";
import {
  CHAPTER_VERSE_COUNTS,
  getCanonicalIndex,
  getSequencePositions,
  TOTAL_VERSES,
} from "./verseSequence";

const DAILY_VERSE_COUNT = 7;

const streakUpdateValidator = v.object({
  currentStreak: v.number(),
  longestStreak: v.number(),
  isNewRecord: v.boolean(),
});

// Helper: Get today's date string in user's timezone with fallback to UTC if invalid
function getTodayDateString(timezone: string): string {
  const now = new Date();
  try {
    return now.toLocaleDateString("en-CA", { timeZone: timezone }); // Returns YYYY-MM-DD
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

async function getSequenceVerses(
  db: DatabaseReader,
  startIndex: number,
  count: number,
): Promise<Doc<"verses">[]> {
  return await Promise.all(
    getSequencePositions(startIndex, count).map((position) =>
      db
        .query("verses")
        .withIndex("byChapterVerse", (q) =>
          q
            .eq("chapterNumber", position.chapterNumber)
            .eq("verseNumber", position.verseNumber),
        )
        .unique()
        .then((verse) => {
          if (!verse) {
            throw new Error(
              `Verse ${position.chapterNumber}.${position.verseNumber} is missing`,
            );
          }
          return verse;
        }),
    ),
  );
}

async function getCanonicalVersePrefix(
  db: DatabaseReader,
  count: number,
): Promise<Doc<"verses">[]> {
  if (count < 0 || count > TOTAL_VERSES) {
    throw new Error(`Verse prefix must contain 0 to ${TOTAL_VERSES} verses`);
  }

  let remaining = count;
  const chapterReads: Promise<Doc<"verses">[]>[] = [];
  for (
    let chapterIndex = 0;
    chapterIndex < CHAPTER_VERSE_COUNTS.length && remaining > 0;
    chapterIndex += 1
  ) {
    const chapterNumber = chapterIndex + 1;
    const chapterReadCount = Math.min(
      remaining,
      CHAPTER_VERSE_COUNTS[chapterIndex],
    );
    chapterReads.push(
      db
        .query("verses")
        .withIndex("byChapterVerse", (q) =>
          q.eq("chapterNumber", chapterNumber),
        )
        .order("asc")
        .take(chapterReadCount),
    );
    remaining -= chapterReadCount;
  }

  const verses = (await Promise.all(chapterReads)).flat();
  if (verses.length !== count) {
    throw new Error(`Expected ${count} canonical verses, found ${verses.length}`);
  }
  return verses;
}

async function getSequenceReadEventsByUser(
  db: DatabaseReader,
  userId: Id<"users">,
): Promise<Doc<"readEvents">[]> {
  const [legacyEvents, sequenceEvents] = await Promise.all([
    db
      .query("readEvents")
      .withIndex("by_user_kind", (q) =>
        q.eq("userId", userId).eq("kind", undefined),
      )
      .collect(),
    db
      .query("readEvents")
      .withIndex("by_user_kind", (q) =>
        q.eq("userId", userId).eq("kind", "sequence"),
      )
      .collect(),
  ]);
  return [...legacyEvents, ...sequenceEvents];
}

async function getSequenceReadEventsByDailySet(
  db: DatabaseReader,
  dailySetId: Id<"dailySets">,
): Promise<Doc<"readEvents">[]> {
  const [legacyEvents, sequenceEvents] = await Promise.all([
    db
      .query("readEvents")
      .withIndex("by_dailySet_kind", (q) =>
        q.eq("dailySetId", dailySetId).eq("kind", undefined),
      )
      .collect(),
    db
      .query("readEvents")
      .withIndex("by_dailySet_kind", (q) =>
        q.eq("dailySetId", dailySetId).eq("kind", "sequence"),
      )
      .collect(),
  ]);
  return [...legacyEvents, ...sequenceEvents];
}

async function ensureSequenceInitialized(
  ctx: any,
  userId: Id<"users">,
  userState: any,
): Promise<any> {
  if (userState.sequenceInitialized) {
    return userState;
  }

  const readEvents = await getSequenceReadEventsByUser(ctx.db, userId);
  const uniqueVerseIds = Array.from(
    new Set(readEvents.map((event) => String(event.verseId))),
  );
  const readVerses = await Promise.all(
    uniqueVerseIds.map((verseId) =>
      ctx.db.get(verseId as Id<"verses">) as Promise<Doc<"verses"> | null>,
    ),
  );
  const readIndexes = new Set<number>();
  for (const verse of readVerses) {
    if (!verse) continue;
    const index = getCanonicalIndex(verse.chapterNumber, verse.verseNumber);
    if (index !== null) readIndexes.add(index);
  }

  let pointer = 0;
  if (readIndexes.size > 0) {
    while (pointer < TOTAL_VERSES && readIndexes.has(pointer)) {
      pointer += 1;
    }
    if (pointer === TOTAL_VERSES) pointer = 0;
  }

  await ctx.db.patch(userState._id, {
    sequentialPointer: pointer,
    sequenceInitialized: true,
  });

  return { ...userState, sequentialPointer: pointer, sequenceInitialized: true };
}

async function findDailySetForDate(
  ctx: any,
  userId: Id<"users">,
  localDate: string
): Promise<any | null> {
  const candidates = await ctx.db
    .query("dailySets")
    .withIndex("byUserAndDate", (q: any) =>
      q.eq("userId", userId).eq("localDate", localDate)
    )
    .collect();

  const eventGroups = await Promise.all(
    candidates.map((candidate: any) =>
      ctx.db
        .query("readEvents")
        .withIndex("by_dailySet", (q: any) =>
          q.eq("dailySetId", candidate._id)
        )
        .collect()
    )
  );
  const canonical = selectCanonicalDailySet<any>(
    candidates.map((candidate: any, index: number) => ({
      ...candidate,
      id: String(candidate._id),
      sequenceReadCount: new Set(
        eventGroups[index]
          .filter((event: any) => event.kind !== "reread")
          .map((event: any) => String(event.verseId))
      ).size,
      totalReadCount: eventGroups[index].length,
    }))
  );

  if (!canonical) return null;

  // Ranking fields are runtime-only migration metadata. Returning the enriched
  // candidate from a public function violates dailySetValidator, so resolve
  // the selected ID back to the unmodified stored document.
  return (
    candidates.find(
      (candidate: any) => String(candidate._id) === String(canonical._id)
    ) ?? null
  );
}

async function updateCurrentDailySet(
  ctx: any,
  userState: any,
  localDate: string,
  dailySetId: Id<"dailySets">
) {
  if (
    userState.lastDailyDate !== localDate ||
    String(userState.currentDailySetId) !== String(dailySetId)
  ) {
    await ctx.db.patch(userState._id, {
      lastDailyDate: localDate,
      currentDailySetId: dailySetId,
    });
  }
}

// Get or create today's daily set for a user
export const getTodaySet = mutation({
  args: { userId: v.id("users") },
  returns: v.object({
    dailySet: v.union(dailySetValidator, v.null()),
    verses: v.array(verseValidator),
    readVerseIds: v.array(v.id("verses")),
    isComplete: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Get user and their state
    const user = await requireOwnedUser(ctx, args.userId);

    let userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    if (!userState) throw new Error("User state not found");

    const todayDate = getTodayDateString(user.timezone);
    userState = await ensureSequenceInitialized(ctx, args.userId, userState);
    if (!userState) throw new Error("User state not found");

    // The indexed user/date lookup is the idempotency key. Convex's optimistic
    // concurrency control retries concurrent mutations that both observe this
    // empty index range, preventing a second insert for the same day.
    const existingSet = await findDailySetForDate(
      ctx,
      args.userId,
      todayDate
    );
    if (existingSet) {
      await updateCurrentDailySet(ctx, userState, todayDate, existingSet._id);
      const verses = await Promise.all(
        existingSet.verseIds.map((id: Id<"verses">) => ctx.db.get(id))
      );

      const sequenceReads = await getSequenceReadEventsByDailySet(
        ctx.db,
        existingSet._id,
      );

      return {
        dailySet: existingSet,
        verses: verses.filter(
          (verse): verse is NonNullable<typeof verse> => verse !== null
        ),
        readVerseIds: sequenceReads.map((e) => e.verseId),
        isComplete: existingSet.completedAt != null,
      };
    }
    // Need to create a new daily set
    // Get next 7 verses based on sequential pointer
    const pointer = userState.sequentialPointer ?? 0;
    const verses = await getSequenceVerses(ctx.db, pointer, DAILY_VERSE_COUNT);
    const selectedVerseIds = verses.map((verse) => verse._id);

    // Create the daily set
    const dailySetId = await ctx.db.insert("dailySets", {
      userId: args.userId,
      localDate: todayDate,
      verseIds: selectedVerseIds,
      createdAt: Date.now(),
      completedAt: null,
    });

    // Update user state with new set (do not advance pointer)
    await updateCurrentDailySet(ctx, userState, todayDate, dailySetId);

    return {
      dailySet: await ctx.db.get(dailySetId),
      verses,
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
  returns: v.object({
    alreadyRead: v.boolean(),
    versesRead: v.number(),
    totalVerses: v.number(),
    isComplete: v.boolean(),
    completedLocalDate: v.union(v.string(), v.null()),
    streakUpdate: v.union(streakUpdateValidator, v.null()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    alreadyRead: boolean;
    versesRead: number;
    totalVerses: number;
    isComplete: boolean;
    completedLocalDate: string | null;
    streakUpdate: StreakUpdate | null;
  }> => {
    await requireOwnedUser(ctx, args.userId);
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

    const sequenceReads = await getSequenceReadEventsByDailySet(
      ctx.db,
      args.dailySetId,
    );

    // Check if already read (sequence)
    const existingRead =
      (await ctx.db
        .query("readEvents")
        .withIndex("by_dailySet_verse_kind", (q) =>
          q
            .eq("dailySetId", args.dailySetId)
            .eq("verseId", args.verseId)
            .eq("kind", "sequence")
        )
        .first()) ??
      sequenceReads.find(
        (event: any) => String(event.verseId) === String(args.verseId)
      );

    if (existingRead) {
      const isComplete = sequenceReads.length >= dailySet.verseIds.length;

      return {
        alreadyRead: true,
        versesRead: sequenceReads.length,
        totalVerses: dailySet.verseIds.length,
        isComplete,
        completedLocalDate: isComplete ? dailySet.localDate : null,
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
        completedLocalDate: dailySet.localDate,
        streakUpdate: null,
      };
    }

    if (String(expectedVerseId) !== String(args.verseId)) {
      throw new Error("Verse is not next in sequence");
    }

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

    const isFirstReadToday =
      userState.lastReaderCountedLocalDate !== dailySet.localDate;
    await ctx.db.patch(userState._id, {
      sequentialPointer: ((userState.sequentialPointer ?? 0) + 1) % TOTAL_VERSES,
      ...(isFirstReadToday
        ? { lastReaderCountedLocalDate: dailySet.localDate }
        : {}),
    });
    if (isFirstReadToday) {
      await incrementDailyReaderCount(ctx, args.userId, dailySet.localDate);
    }

    if (isComplete && !dailySet.completedAt) {
      // Mark set as complete
      await ctx.db.patch(args.dailySetId, {
        completedAt: Date.now(),
      });
      streakUpdate = await ctx.runMutation(
        internal.streaks.updateStreakOnCompletionInternal,
        { userId: args.userId, localDate: dailySet.localDate }
      );
    }

    return {
      alreadyRead: false,
      versesRead: newReadCount,
      totalVerses: dailySet.verseIds.length,
      isComplete,
      completedLocalDate: isComplete ? dailySet.localDate : null,
      streakUpdate,
    };
  },
});

export const logReread = mutation({
  args: {
    userId: v.id("users"),
    verseId: v.id("verses"),
  },
  returns: v.object({
    streakUpdate: v.union(streakUpdateValidator, v.null()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ streakUpdate: StreakUpdate | null }> => {
    const user = await requireOwnedUser(ctx, args.userId);
    if (!(await ctx.db.get(args.verseId))) throw new Error("Verse not found");

    let userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    if (!userState) throw new Error("User state not found");

    const todayDate = getTodayDateString(user.timezone);

    let dailySet = await findDailySetForDate(ctx, args.userId, todayDate);

    if (!dailySet) {
      userState = await ensureSequenceInitialized(ctx, args.userId, userState);
      if (!userState) throw new Error("User state not found");
      const pointer = userState.sequentialPointer ?? 0;

      const selectedVerses = await getSequenceVerses(
        ctx.db,
        pointer,
        DAILY_VERSE_COUNT,
      );
      const selectedVerseIds = selectedVerses.map((verse) => verse._id);

      const dailySetId = await ctx.db.insert("dailySets", {
        userId: args.userId,
        localDate: todayDate,
        verseIds: selectedVerseIds,
        createdAt: Date.now(),
        completedAt: null,
      });

      await updateCurrentDailySet(ctx, userState, todayDate, dailySetId);

      dailySet = await ctx.db.get(dailySetId);
    } else {
      await updateCurrentDailySet(ctx, userState, todayDate, dailySet._id);
    }
    if (!dailySet) throw new Error("Daily set not found");

    await ctx.db.insert("readEvents", {
      userId: args.userId,
      dailySetId: dailySet._id,
      verseId: args.verseId,
      readAt: Date.now(),
      kind: "reread",
    });

    return { streakUpdate: null };
  },
});

// Get reading progress for today
export const getTodayProgress = query({
  args: { userId: v.id("users") },
  returns: v.object({
    versesRead: v.number(),
    totalVerses: v.number(),
    isComplete: v.boolean(),
    localDate: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);
    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!userState?.currentDailySetId) {
      return {
        versesRead: 0,
        totalVerses: DAILY_VERSE_COUNT,
        isComplete: false,
        localDate: null,
      };
    }

    const dailySet = await ctx.db.get(userState.currentDailySetId);
    if (!dailySet) {
      return {
        versesRead: 0,
        totalVerses: DAILY_VERSE_COUNT,
        isComplete: false,
        localDate: null,
      };
    }

    const sequenceReads = await getSequenceReadEventsByDailySet(
      ctx.db,
      dailySet._id,
    );

    return {
      versesRead: sequenceReads.length,
      totalVerses: dailySet.verseIds.length,
      isComplete: dailySet.completedAt != null,
      localDate: dailySet.localDate,
    };
  },
});

export const getReadingHistory = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  returns: v.object({
    readDates: v.array(v.string()),
    perfectDates: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);

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

    const orderedTargetDates = Array.from(targetDates).sort();
    const firstTargetDate = orderedTargetDates[0];
    const lastTargetDate = orderedTargetDates[orderedTargetDates.length - 1];
    if (!firstTargetDate || !lastTargetDate) {
      return { readDates: [], perfectDates: [] };
    }

    const dailySets = await ctx.db
      .query("dailySets")
      .withIndex("byUserAndDate", (q) =>
        q
          .eq("userId", args.userId)
          .gte("localDate", firstTargetDate)
          .lte("localDate", lastTargetDate),
      )
      .collect();

    const sequenceReadsBySet = await Promise.all(
      dailySets.map((dailySet) =>
        getSequenceReadEventsByDailySet(ctx.db, dailySet._id),
      ),
    );
    const readDates = new Set<string>();
    const perfectDates = new Set<string>();

    dailySets.forEach((dailySet, index) => {
      if (
        targetDates.has(dailySet.localDate) &&
        sequenceReadsBySet[index].length > 0
      ) {
        readDates.add(dailySet.localDate);
        if (dailySet.completedAt != null) {
          perfectDates.add(dailySet.localDate);
        }
      }
    });

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
  returns: v.object({
    items: v.array(
      v.object({
        verse: verseValidator,
        lastReadAt: v.union(v.number(), v.null()),
        readCount: v.number(),
      })
    ),
    totalReadVerses: v.number(),
    totalVerses: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);
    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (readEvents.length === 0) {
      return { items: [], totalReadVerses: 0, totalVerses: TOTAL_VERSES };
    }

    const sequenceEvents = readEvents.filter(
      (event: any) => event.kind !== "reread"
    );
    const sequenceVerseIds = Array.from(
      new Set(sequenceEvents.map((event) => String(event.verseId))),
    );
    const sequenceVerses = await Promise.all(
      sequenceVerseIds.map((verseId) => ctx.db.get(verseId as Id<"verses">)),
    );

    let maxSequenceIndex = -1;
    const sequenceVersesByIndex = new Map<number, Doc<"verses">>();
    for (const verse of sequenceVerses) {
      if (!verse) continue;
      const index = getCanonicalIndex(verse.chapterNumber, verse.verseNumber);
      if (index !== null && index > maxSequenceIndex) {
        maxSequenceIndex = index;
      }
      if (index !== null) sequenceVersesByIndex.set(index, verse);
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

    const progressCount = maxSequenceIndex + 1;
    const hasCompletePrefix =
      sequenceVersesByIndex.size >= progressCount &&
      Array.from(
        { length: progressCount },
        (_, index) => sequenceVersesByIndex.has(index),
      ).every(Boolean);
    const progressVerses = hasCompletePrefix
      ? Array.from(
          { length: progressCount },
          (_, index) => sequenceVersesByIndex.get(index)!,
        )
      : await getCanonicalVersePrefix(ctx.db, progressCount);
    const orderedProgress = [...progressVerses].reverse();
    const items = orderedProgress.map((verse: any) => {
      const stats = verseStats.get(String(verse._id));
      return {
        verse,
        lastReadAt: stats?.lastReadAt ?? null,
        readCount: stats?.readCount ?? 0,
      };
    });

    return {
      items,
      totalReadVerses: progressVerses.length,
      totalVerses: TOTAL_VERSES,
    };
  },
});
