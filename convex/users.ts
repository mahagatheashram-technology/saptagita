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
