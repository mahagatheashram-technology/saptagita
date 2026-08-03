import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  assertIdentitySubject,
  isLegacyAlphaAuthEnabled,
  requireIdentity,
  requireOwnedUser,
} from "./auth";
import {
  deletionCountsValidator,
  userStateValidator,
  userValidator,
} from "./validators";
import { deleteRankedStreak, insertRankedStreak } from "./streakRanking";
import { decrementDailyReaderCount } from "./dailyReaders";

export const ACCOUNT_DELETION_PENDING_ERROR = "ACCOUNT_DELETION_PENDING";

async function hashAuthId(authId: string): Promise<string> {
  const bytes = new TextEncoder().encode(authId);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function getAccountDeletionRequest(ctx: any, authId: string) {
  const authIdHash = await hashAuthId(authId);
  return await ctx.db
    .query("accountDeletionRequests")
    .withIndex("by_auth_id_hash", (q: any) => q.eq("authIdHash", authIdHash))
    .first();
}

async function assertAccountDeletionNotPending(ctx: any, authId: string) {
  if (await getAccountDeletionRequest(ctx, authId)) {
    throw new Error(ACCOUNT_DELETION_PENDING_ERROR);
  }
}

async function getLegacyExistingUser(
  ctx: any,
  authId: string | undefined,
  authenticationError: unknown
) {
  const errorCode = (authenticationError as { data?: { code?: unknown } })?.data
    ?.code;
  if (
    errorCode !== "UNAUTHENTICATED" ||
    !isLegacyAlphaAuthEnabled() ||
    !authId
  ) {
    throw authenticationError;
  }

  const existingUser = await ctx.db
    .query("users")
    .withIndex("byAuthId", (q: any) => q.eq("authId", authId))
    .first();

  // This bridge is deliberately read-only. It restores already-synced alpha
  // users while their client races Convex auth initialization, but it cannot
  // create accounts, repair records, or update another user's profile.
  if (!existingUser) {
    throw new ConvexError({
      code: "LEGACY_CLIENT_UPGRADE_REQUIRED",
      message: "Please install the latest Sapta Gita build and sign in again.",
    });
  }

  return existingUser;
}

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
    const nextTimezone = args.timezone ?? existingUser.timezone;
    let ensuredUser = existingUser;
    if (nextTimezone !== existingUser.timezone) {
      await ctx.db.patch(existingUser._id, { timezone: nextTimezone });
      ensuredUser = { ...existingUser, timezone: nextTimezone };
    }

    const [userState, streak] = await Promise.all([
      ctx.db
        .query("userState")
        .withIndex("byUser", (q: any) => q.eq("userId", existingUser._id))
        .first(),
      ctx.db
        .query("streaks")
        .withIndex("byUser", (q: any) => q.eq("userId", existingUser._id))
        .first(),
    ]);
    if (!userState) {
      await ctx.db.insert("userState", {
        userId: existingUser._id,
        mode: "sequential",
        sequentialPointer: 0,
        lastDailyDate: "",
        currentDailySetId: null,
        scriptPreference: "devanagari",
      });
    }
    if (!streak) {
      await insertRankedStreak(ctx, {
        userId: existingUser._id,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedLocalDate: "",
        updatedAt: Date.now(),
      });
    }
    return ensuredUser;
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

  await insertRankedStreak(ctx, {
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
    authId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    assertIdentitySubject(identity.subject, args.authId);
    await assertAccountDeletionNotPending(ctx, identity.subject);
    return ensureUser(ctx, { ...args, authId: identity.subject });
  },
});

// Get or create user from Clerk auth
export const getOrCreateUserFromAuth = mutation({
  args: {
    authId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    let identity;
    try {
      identity = await requireIdentity(ctx);
    } catch (error) {
      return getLegacyExistingUser(ctx, args.authId, error);
    }
    assertIdentitySubject(identity.subject, args.authId);
    await assertAccountDeletionNotPending(ctx, identity.subject);
    return ensureUser(ctx, { ...args, authId: identity.subject });
  },
});

export const getAccountDeletionStatus = query({
  args: {},
  returns: v.union(
    v.object({
      pending: v.literal(true),
      requestedAt: v.number(),
      appDataDeletedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const request = await getAccountDeletionRequest(ctx, identity.subject);

    return request
      ? {
          pending: true as const,
          requestedAt: request.requestedAt,
          appDataDeletedAt: request.appDataDeletedAt,
        }
      : null;
  },
});

// Get the authenticated user's Convex record. authId remains optional so
// already-installed clients can send it while the server still verifies it.
export const getUserByAuthId = query({
  args: { authId: v.optional(v.string()) },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    let identity;
    try {
      identity = await requireIdentity(ctx);
    } catch (error) {
      return getLegacyExistingUser(ctx, args.authId, error);
    }
    assertIdentitySubject(identity.subject, args.authId);
    return await ctx.db
      .query("users")
      .withIndex("byAuthId", (q) => q.eq("authId", identity.subject))
      .first();
  },
});

export const getUserState = query({
  args: { userId: v.id("users") },
  returns: v.union(userStateValidator, v.null()),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);
    return await ctx.db
      .query("userState")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const markTodayGestureCoachSeen = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ todayGestureCoachSeenAt: v.number() }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);

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
  returns: v.object({ reminderTime: v.string() }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);

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
  returns: v.object({
    scriptPreference: v.union(v.literal("devanagari"), v.literal("telugu")),
  }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);

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
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);

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
  returns: v.object({ displayName: v.string() }),
  handler: async (ctx, args) => {
    await requireOwnedUser(ctx, args.userId);

    await ctx.db.patch(args.userId, { displayName: args.displayName });
    return { displayName: args.displayName };
  },
});

export const deleteAccount = mutation({
  args: {},
  returns: v.object({
    deleted: v.boolean(),
    alreadyDeleted: v.boolean(),
    userId: v.union(v.id("users"), v.null()),
    counts: deletionCountsValidator,
  }),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const authIdHash = await hashAuthId(identity.subject);
    const existingRequest = await getAccountDeletionRequest(
      ctx,
      identity.subject
    );
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

    if (existingRequest) {
      return {
        deleted: false,
        alreadyDeleted: true,
        userId: null,
        counts: zeroCounts,
      };
    }

    // Convex mutations are transactional. The marker and all application-data
    // deletes either commit together or not at all, so a Clerk deletion failure
    // can be retried without recreating a fresh Convex user.
    const requestedAt = Date.now();
    await ctx.db.insert("accountDeletionRequests", {
      authIdHash,
      requestedAt,
      appDataDeletedAt: requestedAt,
    });

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
      await deleteRankedStreak(ctx, streak);
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
    const countedReaderDates = new Set(
      userStateDocs
        .map((state) => state.lastReaderCountedLocalDate)
        .filter((date): date is string => Boolean(date)),
    );
    for (const localDate of countedReaderDates) {
      await decrementDailyReaderCount(ctx, userId, localDate);
    }
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
export const getOrCreateTestUser = internalMutation({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    return ensureUser(ctx, {
      authId: "test-user-dev",
      displayName: "Test Reader",
      avatarUrl: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },
});
