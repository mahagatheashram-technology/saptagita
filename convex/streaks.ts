import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  calculateCompletionStreak,
  getPreviousLocalDate,
} from "./streakMath";
import { requireCurrentUser, requireOwnedUser } from "./auth";
import {
  GLOBAL_STREAK_RANKING_METADATA_KEY,
  GLOBAL_STREAK_RANKING_MAX_NODE_SIZE,
  globalStreakRanking,
  insertRankedStreak,
  patchRankedStreak,
} from "./streakRanking";

const streakUpdateValidator = v.object({
  currentStreak: v.number(),
  longestStreak: v.number(),
  isNewRecord: v.boolean(),
});

const leaderboardEntryValidator = v.object({
  userId: v.id("users"),
  displayName: v.string(),
  avatarUrl: v.string(),
  currentStreak: v.number(),
  lastReadLocalDate: v.union(v.string(), v.null()),
  rank: v.number(),
});

// Helper: Get today's date string in user's timezone with fallback to UTC if invalid
function getTodayDateString(timezone: string): string {
  const now = new Date();
  try {
    return now.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

async function getCompletionStats(ctx: any, userId: any) {
  const completedSets = await ctx.db
    .query("dailySets")
    .withIndex("byUserAndCompletedAt", (q: any) =>
      q.eq("userId", userId).gt("completedAt", 0),
    )
    .collect();

  return {
    completedSets,
    stats: calculateCompletionStreak(
      completedSets.map((set: any) => set.localDate)
    ),
  };
}

function getActiveCurrentStreak(
  currentStreak: number,
  lastReadLocalDate: string,
  todayDate: string
): number {
  const yesterdayDate = getPreviousLocalDate(todayDate);
  return lastReadLocalDate === todayDate ||
    lastReadLocalDate === yesterdayDate
    ? currentStreak
    : 0;
}

// Get user's streak data
export const getStreak = query({
  args: { userId: v.id("users") },
  returns: v.object({
    _id: v.optional(v.id("streaks")),
    _creationTime: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedLocalDate: v.string(),
    lastReadLocalDate: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);
    const streak = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    const todayDate = getTodayDateString(user?.timezone || "UTC");
    const lastReadLocalDate =
      streak?.lastReadLocalDate ?? streak?.lastCompletedLocalDate ?? "";
    const currentStreak = getActiveCurrentStreak(
      streak?.currentStreak ?? 0,
      lastReadLocalDate,
      todayDate
    );

    return {
      ...(streak ?? {}),
      currentStreak,
      longestStreak: streak?.longestStreak ?? 0,
      lastCompletedLocalDate: streak?.lastCompletedLocalDate ?? "",
      lastReadLocalDate,
    };
  },
});

export const getStreakStats = query({
  args: { userId: v.id("users") },
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    perfectDays: v.number(),
    readDays: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);
    const { completedSets } = await getCompletionStats(ctx, args.userId);
    const todayDate = getTodayDateString(user?.timezone || "UTC");

    const [legacyReadEvents, sequenceReadEvents] = await Promise.all([
      ctx.db
        .query("readEvents")
        .withIndex("by_user_kind", (q) =>
          q.eq("userId", args.userId).eq("kind", undefined),
        )
        .collect(),
      ctx.db
        .query("readEvents")
        .withIndex("by_user_kind", (q) =>
          q.eq("userId", args.userId).eq("kind", "sequence"),
        )
        .collect(),
    ]);
    const readEvents = [...legacyReadEvents, ...sequenceReadEvents];

    const readDailySetIds = Array.from(
      new Set(readEvents.map((event: any) => String(event.dailySetId)))
    );

    const readDailySets = await Promise.all(
      readDailySetIds.map((id) => ctx.db.get(id as any))
    );

    const readDates = Array.from(new Set<string>(
      readDailySets
        .filter(Boolean)
        .map((set: any) => set.localDate)
    ));
    const readStats = calculateCompletionStreak(readDates);

    return {
      currentStreak: getActiveCurrentStreak(
        readStats.currentStreak,
        readStats.lastCompletedLocalDate,
        todayDate
      ),
      longestStreak: readStats.longestStreak,
      perfectDays: new Set(
        completedSets.map((set: any) => set.localDate)
      ).size,
      readDays: readDates.length,
    };
  },
});

// Start or continue the habit streak on the first sequence read of a local day.
// This is constant-I/O; historical repair is handled by a paginated migration.
export const updateStreakOnReadInternal = internalMutation({
  args: { userId: v.id("users"), localDate: v.string() },
  returns: streakUpdateValidator,
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.userId))) throw new Error("User not found");

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();
    const previousReadDate =
      streakRecord?.lastReadLocalDate ??
      streakRecord?.lastCompletedLocalDate ??
      "";

    if (streakRecord && previousReadDate === args.localDate) {
      return {
        currentStreak: streakRecord.currentStreak,
        longestStreak: streakRecord.longestStreak,
        isNewRecord: false,
      };
    }

    const currentStreak =
      previousReadDate === getPreviousLocalDate(args.localDate)
        ? (streakRecord?.currentStreak ?? 0) + 1
        : 1;
    const longestStreak = Math.max(
      streakRecord?.longestStreak ?? 0,
      currentStreak,
    );
    const isNewRecord = longestStreak > (streakRecord?.longestStreak ?? 0);

    if (streakRecord) {
      await patchRankedStreak(ctx, streakRecord, {
        currentStreak,
        longestStreak,
        lastReadLocalDate: args.localDate,
        updatedAt: Date.now(),
      });
    } else {
      await insertRankedStreak(ctx, {
        userId: args.userId,
        currentStreak,
        longestStreak,
        lastCompletedLocalDate: "",
        lastReadLocalDate: args.localDate,
        updatedAt: Date.now(),
      });
    }

    return { currentStreak, longestStreak, isNewRecord };
  },
});

// Completing all seven verses records a Perfect day without changing the
// read-day streak that already advanced on the first verse.
export const updateStreakOnCompletionInternal = internalMutation({
  args: { userId: v.id("users"), localDate: v.optional(v.string()) },
  returns: streakUpdateValidator,
  handler: async (ctx, args) => {
    // Get user for timezone
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const timezone = user.timezone || "UTC";
    // Anchor streak updates to the daily set's local date to avoid timezone drift
    const completionLocalDate =
      args.localDate ?? getTodayDateString(timezone);
    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (streakRecord) {
      await patchRankedStreak(ctx, streakRecord, {
        lastCompletedLocalDate: completionLocalDate,
        updatedAt: Date.now(),
      });
    } else {
      await insertRankedStreak(ctx, {
        userId: args.userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedLocalDate: completionLocalDate,
        lastReadLocalDate: completionLocalDate,
        updatedAt: Date.now(),
      });
    }

    return {
      currentStreak: streakRecord?.currentStreak ?? 1,
      longestStreak: streakRecord?.longestStreak ?? 1,
      isNewRecord: false,
    };
  },
});

// Check and potentially reset streak if day was missed
// Call this when app opens to ensure streak is accurate
export const checkAndUpdateStreak = mutation({
  args: { userId: v.id("users") },
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    needsReset: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await requireOwnedUser(ctx, args.userId);

    const timezone = user.timezone || "UTC";
    const todayDate = getTodayDateString(timezone);

    const streakRecord = await ctx.db
      .query("streaks")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    const lastReadLocalDate =
      streakRecord?.lastReadLocalDate ??
      streakRecord?.lastCompletedLocalDate ??
      "";
    const currentStreak = getActiveCurrentStreak(
      streakRecord?.currentStreak ?? 0,
      lastReadLocalDate,
      todayDate
    );
    const needsReset =
      Boolean(streakRecord?.currentStreak) && currentStreak === 0;

    const streakChanged =
      streakRecord &&
      (streakRecord.currentStreak !== currentStreak ||
        streakRecord.lastReadLocalDate !== lastReadLocalDate);

    if (streakChanged) {
      await patchRankedStreak(ctx, streakRecord, {
        currentStreak,
        lastReadLocalDate,
        updatedAt: Date.now(),
      });
    }

    return {
      currentStreak,
      longestStreak: streakRecord?.longestStreak ?? 0,
      needsReset,
    };
  },
});

const GLOBAL_LEADERBOARD_LIMIT = 5;
const GLOBAL_LEADERBOARD_DETAIL_LIMIT = 50;

async function getGlobalLeaderboardEntries(ctx: any, limit: number) {
  const streaks = await ctx.db
    .query("streaks")
    .withIndex("byCurrentStreakAndLastReadDate", (q: any) =>
      q.gt("currentStreak", 0),
    )
    .order("desc")
    .take(limit);

  const entries = await Promise.all(
    streaks.map(async (streak: any) => {
      const user = await ctx.db.get(streak.userId);
      return {
        userId: streak.userId,
        displayName: user?.displayName ?? "Anonymous",
        avatarUrl: user?.avatarUrl ?? "",
        currentStreak: streak.currentStreak,
        lastReadLocalDate:
          streak.lastReadLocalDate ?? streak.lastCompletedLocalDate ?? "",
      };
    }),
  );

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function getGlobalRankingMetadata(ctx: any) {
  return await ctx.db
    .query("systemMetadata")
    .withIndex("by_key", (q: any) =>
      q.eq("key", GLOBAL_STREAK_RANKING_METADATA_KEY),
    )
    .unique();
}

function isGlobalRankingReady(rankingMetadata: any): boolean {
  if (
    !rankingMetadata?.ready ||
    rankingMetadata.maxNodeSize !== GLOBAL_STREAK_RANKING_MAX_NODE_SIZE
  ) {
    return false;
  }

  return true;
}

async function getGlobalRankEntry(ctx: any, currentUser: any) {
  const currentStreak = await ctx.db
    .query("streaks")
    .withIndex("byUser", (q: any) => q.eq("userId", currentUser._id))
    .unique();
  if (!currentStreak || currentStreak.currentStreak <= 0) return null;

  const rank =
    (await globalStreakRanking.indexOfDoc(ctx, currentStreak, {
      id: currentStreak._id,
    })) + 1;

  return {
    userId: currentUser._id,
    displayName: currentUser.displayName ?? "Anonymous",
    avatarUrl: currentUser.avatarUrl ?? "",
    currentStreak: currentStreak.currentStreak,
    lastReadLocalDate:
      currentStreak.lastReadLocalDate ??
      currentStreak.lastCompletedLocalDate ??
      "",
    rank,
  };
}

export const getGlobalLeaderboard = query({
  // versionCode 3 sends currentUserId and reads the legacy fields. versionCode
  // 4 omits it and reads top5. Keep this superset contract until code 3 is no
  // longer supported.
  args: { currentUserId: v.optional(v.id("users")) },
  returns: v.object({
    top5: v.array(leaderboardEntryValidator),
    top50: v.array(leaderboardEntryValidator),
    currentUser: v.union(leaderboardEntryValidator, v.null()),
    totalUsers: v.number(),
  }),
  handler: async (ctx, args) => {
    const currentUser = args.currentUserId
      ? await requireOwnedUser(ctx, args.currentUserId)
      : await requireCurrentUser(ctx);
    const legacyClient = Boolean(args.currentUserId);
    const entries = await getGlobalLeaderboardEntries(
      ctx,
      legacyClient ? GLOBAL_LEADERBOARD_DETAIL_LIMIT : GLOBAL_LEADERBOARD_LIMIT,
    );

    if (!legacyClient) {
      return {
        top5: entries,
        top50: [],
        currentUser: null,
        totalUsers: 0,
      };
    }

    const rankingMetadata = await getGlobalRankingMetadata(ctx);
    const rankingReady = isGlobalRankingReady(rankingMetadata);
    const visibleCurrentUser =
      entries.find(
        (entry) => String(entry.userId) === String(currentUser._id),
      ) ?? null;
    const currentUserEntry =
      visibleCurrentUser ??
      (rankingReady ? await getGlobalRankEntry(ctx, currentUser) : null);

    return {
      top5: entries.slice(0, GLOBAL_LEADERBOARD_LIMIT),
      top50: entries,
      currentUser: currentUserEntry,
      totalUsers: rankingReady
        ? await globalStreakRanking.count(ctx)
        : entries.length,
    };
  },
});

// Bounded, imperative detail query. The Top 50 page reads this once instead of
// keeping fifty rows subscribed to every streak update.
export const getGlobalLeaderboardTop50 = query({
  args: {},
  returns: v.object({
    entries: v.array(leaderboardEntryValidator),
    currentUserId: v.id("users"),
  }),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    return {
      entries: await getGlobalLeaderboardEntries(
        ctx,
        GLOBAL_LEADERBOARD_DETAIL_LIMIT,
      ),
      currentUserId: currentUser._id,
    };
  },
});

// The client fetches this query imperatively once when the screen opens. Do not
// turn it into a persistent useQuery subscription: broad rank dependencies can
// cause avoidable realtime fan-out when many users update streaks together.
export const getMyGlobalRank = query({
  args: {},
  returns: v.union(leaderboardEntryValidator, v.null()),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const rankingMetadata = await getGlobalRankingMetadata(ctx);
    if (!isGlobalRankingReady(rankingMetadata)) {
      throw new Error("Global streak ranking is not ready");
    }
    return await getGlobalRankEntry(ctx, currentUser);
  },
});

export const getCommunityLeaderboard = query({
  args: {
    communityId: v.id("communities"),
    currentUserId: v.optional(v.id("users")),
  },
  returns: v.object({
    top50: v.array(leaderboardEntryValidator),
    currentUser: v.union(leaderboardEntryValidator, v.null()),
    totalMembers: v.number(),
  }),
  handler: async (ctx, args) => {
    const currentUser = args.currentUserId
      ? await requireOwnedUser(ctx, args.currentUserId)
      : await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", currentUser._id)
      )
      .first();
    if (!membership) {
      throw new Error("Not a member of this community");
    }

    const members = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    if (members.length === 0) {
      return { top50: [], currentUser: null, totalMembers: 0 };
    }

    const leaderboardEntries = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (!user) return null;

        const streak = await ctx.db
          .query("streaks")
          .withIndex("byUser", (q) => q.eq("userId", member.userId))
          .first();

        return {
          userId: member.userId,
          displayName: user.displayName ?? "Anonymous",
          avatarUrl: user.avatarUrl ?? "",
          currentStreak: streak?.currentStreak ?? 0,
          lastReadLocalDate:
            streak?.lastReadLocalDate ??
            streak?.lastCompletedLocalDate ??
            null,
        };
      })
    );

    const leaderboard = leaderboardEntries.filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry)
    );

    leaderboard.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      const aDate = a.lastReadLocalDate ?? "";
      const bDate = b.lastReadLocalDate ?? "";
      return bDate.localeCompare(aDate);
    });

    const ranked = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    const currentUserEntry = ranked.find(
      (entry) => String(entry.userId) === String(currentUser._id)
    ) ?? null;

    return {
      top50: ranked.slice(0, 50),
      currentUser: currentUserEntry,
      totalMembers: members.length,
    };
  },
});

async function usersShareCommunity(
  ctx: any,
  currentUserId: any,
  targetUserId: any,
): Promise<boolean> {
  const [currentUserMemberships, targetUserMemberships] = await Promise.all([
    ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", currentUserId))
      .collect(),
    ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .collect(),
  ]);
  const currentUserCommunityIds = new Set(
    currentUserMemberships.map((membership: any) =>
      String(membership.communityId),
    ),
  );

  return targetUserMemberships.some((membership: any) =>
    currentUserCommunityIds.has(String(membership.communityId)),
  );
}

export const getStreakSummary = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      displayName: v.string(),
      avatarUrl: v.union(v.string(), v.null()),
      currentStreak: v.number(),
      longestStreak: v.number(),
      perfectDays: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    const globalTop50 = await getGlobalLeaderboardEntries(
      ctx,
      GLOBAL_LEADERBOARD_DETAIL_LIMIT,
    );
    const isGloballyVisible = globalTop50.some(
      (entry) => String(entry.userId) === String(args.userId),
    );
    if (
      !isGloballyVisible &&
      !(await usersShareCommunity(ctx, currentUser._id, args.userId))
    ) {
      return null;
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) return null;

    const [streak, { completedSets }] = await Promise.all([
      ctx.db
        .query("streaks")
        .withIndex("byUser", (q) => q.eq("userId", args.userId))
        .first(),
      getCompletionStats(ctx, args.userId),
    ]);
    const lastReadLocalDate =
      streak?.lastReadLocalDate ?? streak?.lastCompletedLocalDate ?? "";

    return {
      displayName: targetUser.displayName ?? "Anonymous",
      avatarUrl: targetUser.avatarUrl ?? null,
      currentStreak: getActiveCurrentStreak(
        streak?.currentStreak ?? 0,
        lastReadLocalDate,
        getTodayDateString(targetUser.timezone || "UTC"),
      ),
      longestStreak: streak?.longestStreak ?? 0,
      perfectDays: new Set(
        completedSets.map((set: any) => set.localDate),
      ).size,
    };
  },
});
