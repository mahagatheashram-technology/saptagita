import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  verses: defineTable({
    chapterNumber: v.number(),
    verseNumber: v.number(),
    sanskritDevanagari: v.string(),
    transliteration: v.string(),
    translationEnglish: v.string(),
    sourceKey: v.string(),
  }).index("byChapterVerse", ["chapterNumber", "verseNumber"]),
  users: defineTable({
    authId: v.string(),
    displayName: v.string(),
    avatarUrl: v.string(),
    timezone: v.string(),
    createdAt: v.number(),
  })
    .index("byAuthId", ["authId"]),
  userState: defineTable({
    userId: v.id("users"),
    mode: v.string(), // "sequential" | "random" | etc.
    sequentialPointer: v.number(),
    lastDailyDate: v.string(), // YYYY-MM-DD format
    currentDailySetId: v.union(v.id("dailySets"), v.null()),
  })
    .index("byUser", ["userId"]),
  dailySets: defineTable({
    userId: v.id("users"),
    localDate: v.string(), // YYYY-MM-DD format
    verseIds: v.array(v.id("verses")),
    createdAt: v.number(),
    completedAt: v.union(v.number(), v.null()),
  })
    .index("byUser", ["userId"])
    .index("byUserAndDate", ["userId", "localDate"]),
  readEvents: defineTable({
    userId: v.id("users"),
    dailySetId: v.id("dailySets"),
    verseId: v.id("verses"),
    readAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_dailySet", ["dailySetId"]),
  streaks: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedLocalDate: v.string(), // YYYY-MM-DD format
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]),
});
