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
    scriptPreference: "devanagari",
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

export const markTodayGestureCoachSeen = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

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

    const seenAt = Date.now();
    await ctx.db.patch(userState._id, {
      todayGestureCoachSeenAt: seenAt,
    });

    return { todayGestureCoachSeenAt: seenAt };
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

export const updateScriptPreference = mutation({
  args: {
    userId: v.id("users"),
    scriptPreference: v.union(v.literal("devanagari"), v.literal("telugu")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

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
      scriptPreference: args.scriptPreference,
    });

    return { scriptPreference: args.scriptPreference };
  },
});

export const resetReadingProgress = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

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
      sequentialPointer: 0,
      sequenceInitialized: true,
      lastDailyDate: "",
      currentDailySetId: null,
    });

    return { success: true };
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

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", identity.subject))
      .first();

    const zeroCounts = {
      activeCommunity: 0,
      communityMembers: 0,
      communities: 0,
      readEvents: 0,
      dailySets: 0,
      streaks: 0,
      bookmarks: 0,
      bookmarkBuckets: 0,
      userState: 0,
      users: 0,
    };

    if (!user) {
      return {
        deleted: false,
        alreadyDeleted: true,
        userId: null,
        counts: zeroCounts,
      };
    }

    const userId = user._id;
    const counts = { ...zeroCounts };

    const allCommunities = await ctx.db.query("communities").collect();
    const ownedCommunities = allCommunities.filter(
      (community) => String(community.createdBy) === String(userId)
    );
    const ownedCommunityIdSet = new Set(
      ownedCommunities.map((community) => String(community._id))
    );

    // Remove active community records for this user and for users currently set
    // to communities owned by this user.
    const activeByUser = await ctx.db
      .query("activeCommunity")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const allActiveCommunity = await ctx.db.query("activeCommunity").collect();
    const activeOwnedCommunity = allActiveCommunity.filter((active) =>
      ownedCommunityIdSet.has(String(active.communityId))
    );
    const activeDocsById = new Map<string, (typeof activeByUser)[number]["_id"]>();
    for (const activeDoc of [...activeByUser, ...activeOwnedCommunity]) {
      activeDocsById.set(String(activeDoc._id), activeDoc._id);
    }
    for (const activeId of activeDocsById.values()) {
      await ctx.db.delete(activeId);
      counts.activeCommunity += 1;
    }

    // Remove all memberships for this user and all memberships in communities
    // owned by this user.
    const userMemberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const membershipIdsToDelete = new Map<
      string,
      (typeof userMemberships)[number]["_id"]
    >();
    for (const membership of userMemberships) {
      membershipIdsToDelete.set(String(membership._id), membership._id);
    }

    for (const community of ownedCommunities) {
      const memberships = await ctx.db
        .query("communityMembers")
        .withIndex("by_community", (q) => q.eq("communityId", community._id))
        .collect();
      for (const membership of memberships) {
        membershipIdsToDelete.set(String(membership._id), membership._id);
      }
    }

    for (const membershipId of membershipIdsToDelete.values()) {
      await ctx.db.delete(membershipId);
      counts.communityMembers += 1;
    }

    for (const community of ownedCommunities) {
      await ctx.db.delete(community._id);
      counts.communities += 1;
    }

    const readEvents = await ctx.db
      .query("readEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const event of readEvents) {
      await ctx.db.delete(event._id);
      counts.readEvents += 1;
    }

    const dailySets = await ctx.db
      .query("dailySets")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    for (const set of dailySets) {
      await ctx.db.delete(set._id);
      counts.dailySets += 1;
    }

    const streaks = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    for (const streak of streaks) {
      await ctx.db.delete(streak._id);
      counts.streaks += 1;
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
      counts.bookmarks += 1;
    }

    const buckets = await ctx.db
      .query("bookmarkBuckets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const bucket of buckets) {
      await ctx.db.delete(bucket._id);
      counts.bookmarkBuckets += 1;
    }

    const userStateDocs = await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    for (const userState of userStateDocs) {
      await ctx.db.delete(userState._id);
      counts.userState += 1;
    }

    await ctx.db.delete(userId);
    counts.users = 1;

    return {
      deleted: true,
      alreadyDeleted: false,
      userId,
      counts,
    };
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
