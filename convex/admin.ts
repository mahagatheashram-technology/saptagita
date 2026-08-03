import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { globalStreakRanking } from "./streakRanking";

const progressRowValidator = v.object({
  userId: v.id("users"),
  authId: v.string(),
  displayName: v.string(),
  avatarUrl: v.string(),
  timezone: v.string(),
  createdAt: v.number(),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastReadLocalDate: v.string(),
  sequentialPointer: v.number(),
  lastDailyDate: v.string(),
  reminderTime: v.union(v.string(), v.null()),
});

const purgeCountsValidator = v.object({
  activeCommunity: v.number(),
  communityMembers: v.number(),
  communities: v.number(),
  readEvents: v.number(),
  dailySets: v.number(),
  dailyReaderCounts: v.number(),
  streaks: v.number(),
  bookmarks: v.number(),
  bookmarkBuckets: v.number(),
  userState: v.number(),
  users: v.number(),
});

// Maintenance functions are deliberately internal-only. In particular, do not
// expose a public wrapper that accepts a deployment secret as an argument:
// function arguments can appear in logs and public functions are callable by
// untrusted clients.
export const listUsersWithProgress = internalQuery({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    rows: v.array(progressRowValidator),
  }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const streaks = await ctx.db.query("streaks").collect();
    const userStates = await ctx.db.query("userState").collect();

    const streakByUserId = new Map(
      streaks.map((streak) => [String(streak.userId), streak])
    );
    const userStateByUserId = new Map(
      userStates.map((userState) => [String(userState.userId), userState])
    );

    const rows = users.map((user) => {
      const streak = streakByUserId.get(String(user._id));
      const userState = userStateByUserId.get(String(user._id));

      return {
        userId: user._id,
        authId: user.authId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
        createdAt: user.createdAt,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        lastReadLocalDate:
          streak?.lastReadLocalDate ?? streak?.lastCompletedLocalDate ?? "",
        sequentialPointer: userState?.sequentialPointer ?? 0,
        lastDailyDate: userState?.lastDailyDate ?? "",
        reminderTime: userState?.reminderTime ?? null,
      };
    });

    rows.sort((a, b) => {
      if (a.displayName !== b.displayName) {
        return a.displayName.localeCompare(b.displayName);
      }
      return a.createdAt - b.createdAt;
    });

    return {
      totalUsers: rows.length,
      rows,
    };
  },
});

export const purgeAllUserData = internalMutation({
  args: {
    confirm: v.string(),
  },
  returns: v.object({
    purged: v.boolean(),
    counts: purgeCountsValidator,
  }),
  handler: async (ctx, args) => {
    if (args.confirm !== "PURGE_ALL_USER_DATA") {
      throw new Error(
        "Confirmation mismatch. Pass confirm='PURGE_ALL_USER_DATA' to proceed."
      );
    }

    const counts = {
      activeCommunity: 0,
      communityMembers: 0,
      communities: 0,
      readEvents: 0,
      dailySets: 0,
      dailyReaderCounts: 0,
      streaks: 0,
      bookmarks: 0,
      bookmarkBuckets: 0,
      userState: 0,
      users: 0,
    };

    const activeCommunity = await ctx.db.query("activeCommunity").collect();
    for (const doc of activeCommunity) {
      await ctx.db.delete(doc._id);
      counts.activeCommunity += 1;
    }

    const communityMembers = await ctx.db.query("communityMembers").collect();
    for (const doc of communityMembers) {
      await ctx.db.delete(doc._id);
      counts.communityMembers += 1;
    }

    const communities = await ctx.db.query("communities").collect();
    for (const doc of communities) {
      await ctx.db.delete(doc._id);
      counts.communities += 1;
    }

    const readEvents = await ctx.db.query("readEvents").collect();
    for (const doc of readEvents) {
      await ctx.db.delete(doc._id);
      counts.readEvents += 1;
    }

    const dailySets = await ctx.db.query("dailySets").collect();
    for (const doc of dailySets) {
      await ctx.db.delete(doc._id);
      counts.dailySets += 1;
    }

    const streaks = await ctx.db.query("streaks").collect();
    for (const doc of streaks) {
      await ctx.db.delete(doc._id);
      counts.streaks += 1;
    }
    await globalStreakRanking.clear(ctx);

    const dailyReaderCounts = await ctx.db.query("dailyReaderCounts").collect();
    for (const doc of dailyReaderCounts) {
      await ctx.db.delete(doc._id);
      counts.dailyReaderCounts += 1;
    }

    const bookmarks = await ctx.db.query("bookmarks").collect();
    for (const doc of bookmarks) {
      await ctx.db.delete(doc._id);
      counts.bookmarks += 1;
    }

    const bookmarkBuckets = await ctx.db.query("bookmarkBuckets").collect();
    for (const doc of bookmarkBuckets) {
      await ctx.db.delete(doc._id);
      counts.bookmarkBuckets += 1;
    }

    const userState = await ctx.db.query("userState").collect();
    for (const doc of userState) {
      await ctx.db.delete(doc._id);
      counts.userState += 1;
    }

    const users = await ctx.db.query("users").collect();
    for (const doc of users) {
      await ctx.db.delete(doc._id);
      counts.users += 1;
    }

    return {
      purged: true,
      counts,
    };
  },
});
