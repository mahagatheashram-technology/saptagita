import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  GLOBAL_STREAK_RANKING_METADATA_KEY,
  globalStreakRanking,
} from "./streakRanking";
import { incrementDailyReaderCount } from "./dailyReaders";
import { TOTAL_VERSES } from "./verseSequence";

const FIXTURE_AUTH_PREFIX = "preview-social-calendar-";
const FIXTURE_USER_COUNT = 55;
const TODAY_READER_COUNT = 43;

function requirePreviewFixturesEnabled() {
  if (process.env.ALLOW_PREVIEW_FIXTURES !== "true") {
    throw new Error(
      "Preview fixtures are disabled. Set ALLOW_PREVIEW_FIXTURES=true only on an isolated development deployment.",
    );
  }
}

function localDate(timezone: string): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function deleteDailySetsForUser(ctx: any, userId: Id<"users">) {
  const dailySets = await ctx.db
    .query("dailySets")
    .withIndex("byUser", (q: any) => q.eq("userId", userId))
    .collect();
  for (const dailySet of dailySets) {
    const events = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q: any) => q.eq("dailySetId", dailySet._id))
      .collect();
    for (const event of events) await ctx.db.delete(event._id);
    await ctx.db.delete(dailySet._id);
  }
}

async function deletePreviewUsers(ctx: any) {
  const users = await ctx.db.query("users").collect();
  const previewUsers = users.filter((user: Doc<"users">) =>
    user.authId.startsWith(FIXTURE_AUTH_PREFIX),
  );
  for (const user of previewUsers) {
    await deleteDailySetsForUser(ctx, user._id);
    const states = await ctx.db
      .query("userState")
      .withIndex("byUser", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const state of states) await ctx.db.delete(state._id);
    const streaks = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const streak of streaks) await ctx.db.delete(streak._id);
    await ctx.db.delete(user._id);
  }
}

async function replaceCurrentUserHistory(
  ctx: any,
  user: Doc<"users">,
  streakDays: number,
) {
  await deleteDailySetsForUser(ctx, user._id);
  const existingStreaks = await ctx.db
    .query("streaks")
    .withIndex("byUser", (q: any) => q.eq("userId", user._id))
    .collect();
  for (const streak of existingStreaks) await ctx.db.delete(streak._id);

  const verses = await ctx.db
    .query("verses")
    .withIndex("byChapterVerse", (q: any) => q.eq("chapterNumber", 1))
    .order("asc")
    .take(7);
  if (verses.length !== 7) {
    throw new Error("Seed the canonical verses before creating preview fixtures");
  }

  const today = localDate(user.timezone || "UTC");
  let todaySetId: Id<"dailySets"> | null = null;
  for (let offset = streakDays - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset);
    const timestamp = Date.parse(`${date}T12:00:00.000Z`);
    const dailySetId = await ctx.db.insert("dailySets", {
      userId: user._id,
      localDate: date,
      verseIds: verses.map((verse: Doc<"verses">) => verse._id),
      createdAt: timestamp,
      completedAt: timestamp + 60_000,
    });
    for (const verse of verses) {
      await ctx.db.insert("readEvents", {
        userId: user._id,
        dailySetId,
        verseId: verse._id,
        readAt: timestamp + 30_000,
        kind: "sequence",
      });
    }
    if (date === today) todaySetId = dailySetId;
  }

  const partialDate = shiftDate(today, -(streakDays + 2));
  const partialTimestamp = Date.parse(`${partialDate}T12:00:00.000Z`);
  const partialSetId = await ctx.db.insert("dailySets", {
    userId: user._id,
    localDate: partialDate,
    verseIds: verses.map((verse: Doc<"verses">) => verse._id),
    createdAt: partialTimestamp,
    completedAt: null,
  });
  await ctx.db.insert("readEvents", {
    userId: user._id,
    dailySetId: partialSetId,
    verseId: verses[0]._id,
    readAt: partialTimestamp + 30_000,
    kind: "sequence",
  });

  const state = await ctx.db
    .query("userState")
    .withIndex("byUser", (q: any) => q.eq("userId", user._id))
    .first();
  const statePatch = {
    mode: "sequential",
    sequentialPointer: (streakDays * 7) % TOTAL_VERSES,
    lastDailyDate: today,
    currentDailySetId: todaySetId,
    sequenceInitialized: true,
    lastReaderCountedLocalDate: today,
  };
  if (state) await ctx.db.patch(state._id, statePatch);
  else await ctx.db.insert("userState", { userId: user._id, ...statePatch });

  await ctx.db.insert("streaks", {
    userId: user._id,
    currentStreak: streakDays,
    longestStreak: streakDays,
    lastCompletedLocalDate: today,
    lastReadLocalDate: today,
    updatedAt: Date.now(),
  });
  return { today, partialDate };
}

export const listCandidateUsers = internalQuery({
  args: {},
  returns: v.array(v.object({ authId: v.string(), displayName: v.string() })),
  handler: async (ctx) => {
    requirePreviewFixturesEnabled();
    const users = await ctx.db.query("users").collect();
    return users
      .filter((user) => !user.authId.startsWith(FIXTURE_AUTH_PREFIX))
      .map((user) => ({ authId: user.authId, displayName: user.displayName }));
  },
});

export const seed = internalMutation({
  args: {
    targetAuthId: v.string(),
    scenario: v.union(v.literal("rank1"), v.literal("rank11")),
    confirm: v.literal("ISOLATED_DEV_ONLY"),
  },
  returns: v.object({
    currentRank: v.number(),
    fixtureUsers: v.number(),
    partialDate: v.string(),
    perfectDays: v.number(),
    todayReaderCount: v.number(),
  }),
  handler: async (ctx, args) => {
    requirePreviewFixturesEnabled();
    let currentUser = await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", args.targetAuthId))
      .unique();
    if (!currentUser) {
      const userId = await ctx.db.insert("users", {
        authId: args.targetAuthId,
        displayName: "Preview Current User",
        avatarUrl: "",
        timezone: "America/New_York",
        createdAt: Date.now(),
      });
      currentUser = await ctx.db.get(userId);
      if (!currentUser) throw new Error("Could not create preview current user");
    }

    await globalStreakRanking.clear(ctx);
    await deletePreviewUsers(ctx);
    const currentStreakDays = args.scenario === "rank1" ? 70 : 50;
    const { today, partialDate } = await replaceCurrentUserHistory(
      ctx,
      currentUser,
      currentStreakDays,
    );

    const fixtureUsers: Id<"users">[] = [];
    for (let index = 0; index < FIXTURE_USER_COUNT; index += 1) {
      const suffix = String(index + 1).padStart(2, "0");
      const userId = await ctx.db.insert("users", {
        authId: `${FIXTURE_AUTH_PREFIX}${suffix}`,
        displayName: `Preview Reader ${suffix}`,
        avatarUrl: "",
        timezone: "UTC",
        createdAt: Date.now() + index,
      });
      fixtureUsers.push(userId);
      await ctx.db.insert("userState", {
        userId,
        mode: "sequential",
        sequentialPointer: 0,
        lastDailyDate: "",
        currentDailySetId: null,
        sequenceInitialized: true,
        ...(index < TODAY_READER_COUNT - 1
          ? { lastReaderCountedLocalDate: today }
          : {}),
      });
      const streak =
        args.scenario === "rank1"
          ? 69 - index
          : index < 10
            ? 60 - index
            : 49 - (index - 10);
      await ctx.db.insert("streaks", {
        userId,
        currentStreak: streak,
        longestStreak: streak,
        lastCompletedLocalDate: today,
        lastReadLocalDate: today,
        updatedAt: Date.now(),
      });
    }

    const oldCounters = await ctx.db
      .query("dailyReaderCounts")
      .withIndex("by_date", (q) => q.eq("localDate", today))
      .collect();
    for (const counter of oldCounters) await ctx.db.delete(counter._id);
    await incrementDailyReaderCount(ctx, currentUser._id, today);
    for (const userId of fixtureUsers.slice(0, TODAY_READER_COUNT - 1)) {
      await incrementDailyReaderCount(ctx, userId, today);
    }

    const streaks = await ctx.db.query("streaks").collect();
    for (const streak of streaks) {
      if (streak.currentStreak > 0) {
        await globalStreakRanking.insertIfDoesNotExist(ctx, streak);
      }
    }
    const metadata = await ctx.db
      .query("systemMetadata")
      .withIndex("by_key", (q) =>
        q.eq("key", GLOBAL_STREAK_RANKING_METADATA_KEY),
      )
      .unique();
    if (metadata) {
      await ctx.db.patch(metadata._id, { ready: true, completedAt: Date.now() });
    } else {
      await ctx.db.insert("systemMetadata", {
        key: GLOBAL_STREAK_RANKING_METADATA_KEY,
        ready: true,
        completedAt: Date.now(),
      });
    }

    const currentStreak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", currentUser._id))
      .unique();
    if (!currentStreak) throw new Error("Current-user streak fixture is missing");
    const currentRank =
      (await globalStreakRanking.indexOfDoc(ctx, currentStreak, {
        id: currentStreak._id,
      })) + 1;
    return {
      currentRank,
      fixtureUsers: fixtureUsers.length,
      partialDate,
      perfectDays: currentStreakDays,
      todayReaderCount: TODAY_READER_COUNT,
    };
  },
});

export const verify = internalQuery({
  args: { targetAuthId: v.string() },
  returns: v.object({
    currentRank: v.number(),
    partialDays: v.number(),
    perfectDays: v.number(),
    rankedUsers: v.number(),
    todayReaderCount: v.number(),
  }),
  handler: async (ctx, args) => {
    requirePreviewFixturesEnabled();
    const user = await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", args.targetAuthId))
      .unique();
    if (!user) throw new Error("Preview user not found");
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .unique();
    if (!streak) throw new Error("Preview streak not found");
    const dailySets = await ctx.db
      .query("dailySets")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .collect();
    const today = localDate(user.timezone || "UTC");
    const counters = await ctx.db
      .query("dailyReaderCounts")
      .withIndex("by_date", (q) => q.eq("localDate", today))
      .collect();
    const rankedUsers = await globalStreakRanking.count(ctx);
    return {
      currentRank:
        (await globalStreakRanking.indexOfDoc(ctx, streak, { id: streak._id })) +
        1,
      partialDays: dailySets.filter((set) => set.completedAt === null).length,
      perfectDays: dailySets.filter((set) => set.completedAt !== null).length,
      rankedUsers,
      todayReaderCount: counters.reduce((sum, row) => sum + row.count, 0),
    };
  },
});
