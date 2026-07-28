import { v } from "convex/values";

export const verseValidator = v.object({
  _id: v.id("verses"),
  _creationTime: v.number(),
  chapterNumber: v.number(),
  verseNumber: v.number(),
  sanskritDevanagari: v.string(),
  sanskritTelugu: v.optional(v.string()),
  transliteration: v.string(),
  translationEnglish: v.string(),
  sourceKey: v.string(),
});

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  authId: v.string(),
  displayName: v.string(),
  avatarUrl: v.string(),
  timezone: v.string(),
  createdAt: v.number(),
});

export const userStateValidator = v.object({
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

export const dailySetValidator = v.object({
  _id: v.id("dailySets"),
  _creationTime: v.number(),
  userId: v.id("users"),
  localDate: v.string(),
  verseIds: v.array(v.id("verses")),
  createdAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
});

export const bookmarkBucketValidator = v.object({
  _id: v.id("bookmarkBuckets"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  isDefault: v.boolean(),
  createdAt: v.number(),
  icon: v.optional(v.string()),
});

export const communityValidator = v.object({
  _id: v.id("communities"),
  _creationTime: v.number(),
  name: v.string(),
  type: v.union(v.literal("public"), v.literal("private")),
  inviteCode: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
});

export const deletionCountsValidator = v.object({
  activeCommunity: v.number(),
  communityMembers: v.number(),
  communities: v.number(),
  readEvents: v.number(),
  dailySets: v.number(),
  streaks: v.number(),
  bookmarks: v.number(),
  bookmarkBuckets: v.number(),
  userState: v.number(),
  users: v.number(),
});
