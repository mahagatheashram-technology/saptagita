import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get or create user by auth ID
export const getOrCreateUser = mutation({
  args: {
    authId: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", args.authId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      authId: args.authId,
      displayName: args.displayName ?? "Reader",
      avatarUrl: args.avatarUrl ?? "",
      timezone: args.timezone ?? "UTC",
      createdAt: Date.now(),
    });

    // Initialize user state
    await ctx.db.insert("userState", {
      userId,
      mode: "sequential",
      sequentialPointer: 0,
      lastDailyDate: "",
      currentDailySetId: null,
    });

    // Initialize streak
    await ctx.db.insert("streaks", {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedLocalDate: "",
      updatedAt: Date.now(),
    });

    return await ctx.db.get(userId);
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

// For development: get or create a test user
export const getOrCreateTestUser = mutation({
  handler: async (ctx) => {
    const testAuthId = "test-user-dev";
    
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", testAuthId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    const userId = await ctx.db.insert("users", {
      authId: testAuthId,
      displayName: "Test Reader",
      avatarUrl: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
  },
});

