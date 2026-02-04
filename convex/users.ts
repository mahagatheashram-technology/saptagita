import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function ensureUser(ctx: any, args: {
  authId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
}) {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("byAuthId", (q: any) => q.eq("authId", args.authId))
    .first();

  if (existingUser) {
    return existingUser;
  }

  const userId = await ctx.db.insert("users", {
    authId: args.authId,
    displayName: args.displayName ?? "Reader",
    avatarUrl: args.avatarUrl ?? "",
    timezone: args.timezone ?? "UTC",
    createdAt: Date.now(),
  });

  await ctx.db.insert("userState", {
    userId,
    mode: "sequential",
    sequentialPointer: 0,
    lastDailyDate: "",
    currentDailySetId: null,
  });

  await ctx.db.insert("streaks", {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedLocalDate: "",
    updatedAt: Date.now(),
  });

  return await ctx.db.get(userId);
}

// Get or create user by auth ID (used by backend scripts or legacy flows)
export const getOrCreateUser = mutation({
  args: {
    authId: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ensureUser(ctx, args);
  },
});

// Get or create user from Clerk auth
export const getOrCreateUserFromAuth = mutation({
  args: {
    authId: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ensureUser(ctx, args);
  },
});

// Get user by auth ID
export const getUserByAuthId = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", args.authId))
      .first();
  },
});

export const getUserState = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const updateReminderTime = mutation({
  args: { userId: v.id("users"), reminderTime: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Allow unauthenticated updates in dev while still protecting against cross-user writes
    const identity = await ctx.auth.getUserIdentity();
    if (identity && user.authId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!userState) {
      throw new Error("User state not found");
    }

    await ctx.db.patch(userState._id, {
      reminderTime: args.reminderTime,
    });

    return { reminderTime: args.reminderTime };
  },
});

export const updateDisplayName = mutation({
  args: { userId: v.id("users"), displayName: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (identity && user.authId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.userId, { displayName: args.displayName });
    return { displayName: args.displayName };
  },
});

export const deleteUserData = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = args.userId;

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const event of readEvents) {
      await ctx.db.delete(event._id);
    }

    const dailySets = await ctx.db
      .query("dailySets")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    for (const set of dailySets) {
      await ctx.db.delete(set._id);
    }

    const streaks = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    for (const streak of streaks) {
      await ctx.db.delete(streak._id);
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    const buckets = await ctx.db
      .query("bookmarkBuckets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const bucket of buckets) {
      await ctx.db.delete(bucket._id);
    }

    const userState = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .first();
    if (userState) {
      await ctx.db.delete(userState._id);
    }

    await ctx.db.delete(userId);

    return { deleted: true };
  },
});

// For development: get or create a test user
export const getOrCreateTestUser = mutation({
  handler: async (ctx) => {
    const testAuthId = "test-user-dev";
    
    return ensureUser(ctx, {
      authId: testAuthId,
      displayName: "Test Reader",
      avatarUrl: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },
});

