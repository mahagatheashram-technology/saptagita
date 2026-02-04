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
    reminderTime: v.optional(v.string()), // "HH:mm" 24h
    sequenceInitialized: v.optional(v.boolean()),
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
    kind: v.optional(v.union(v.literal("sequence"), v.literal("reread"))),
  })
    .index("by_user", ["userId"])
    .index("by_dailySet", ["dailySetId"]),
  streaks: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedLocalDate: v.string(), // YYYY-MM-DD format
    lastReadLocalDate: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]),
  bookmarkBuckets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
    icon: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),
  bookmarks: defineTable({
    userId: v.id("users"),
    verseId: v.id("verses"),
    bucketId: v.id("bookmarkBuckets"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_bucket", ["bucketId"])
    .index("by_user_verse", ["userId", "verseId"])
    .index("by_bucket_verse", ["bucketId", "verseId"]),
  communities: defineTable({
    name: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    inviteCode: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_type", ["type"]),
  communityMembers: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_community", ["communityId"])
    .index("by_user", ["userId"])
    .index("by_community_user", ["communityId", "userId"]),
  activeCommunity: defineTable({
    userId: v.id("users"),
    communityId: v.id("communities"),
  }).index("by_user", ["userId"]),
});
