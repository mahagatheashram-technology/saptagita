import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  normalizeIntegrityRepairRequest,
  planReadEventMerge,
  selectCanonicalDailySet,
} from "./integrityRules";

const SAMPLE_SIZE = 20;

const repairActionValidator = v.union(
  v.object({
    type: v.literal("deduplicateDailySets"),
    userId: v.id("users"),
    localDate: v.string(),
    dailySetIds: v.array(v.id("dailySets")),
    canonicalDailySetId: v.id("dailySets"),
  }),
  v.object({
    type: v.literal("deleteOrphanDailySet"),
    dailySetId: v.id("dailySets"),
  }),
  v.object({
    type: v.literal("deleteOrphanUserState"),
    userStateId: v.id("userState"),
  }),
  v.object({
    type: v.literal("repairDanglingUserState"),
    userStateId: v.id("userState"),
  }),
  v.object({
    type: v.literal("deleteOrphanStreak"),
    streakId: v.id("streaks"),
  }),
  v.object({
    type: v.literal("deleteOrphanBookmarkBucket"),
    bucketId: v.id("bookmarkBuckets"),
  }),
  v.object({
    type: v.literal("repairReadEvent"),
    readEventId: v.id("readEvents"),
    disposition: v.union(v.literal("delete"), v.literal("reassign")),
  }),
  v.object({
    type: v.literal("repairBookmark"),
    bookmarkId: v.id("bookmarks"),
    disposition: v.union(v.literal("delete"), v.literal("reassign")),
  })
);

const scannedValidator = v.object({
  users: v.number(),
  userState: v.number(),
  dailySets: v.number(),
  readEvents: v.number(),
  streaks: v.number(),
  bookmarkBuckets: v.number(),
  bookmarks: v.number(),
  verses: v.number(),
});

const dryRunResultValidator = v.object({
  mode: v.literal("dryRun"),
  executedActions: v.optional(v.number()),
  scanned: scannedValidator,
  pendingActions: v.number(),
  byType: v.record(v.string(), v.number()),
  samples: v.array(repairActionValidator),
});

const executeResultValidator = v.object({
  mode: v.literal("execute"),
  attemptedActions: v.number(),
  executedActions: v.number(),
  writes: v.number(),
  remainingActions: v.number(),
  remainingByType: v.record(v.string(), v.number()),
  complete: v.boolean(),
});

function assertMaintenanceToken(token: string) {
  const expected = process.env.ADMIN_MAINTENANCE_TOKEN;
  if (!expected) {
    throw new Error(
      "ADMIN_MAINTENANCE_TOKEN is not configured on this deployment."
    );
  }
  if (token !== expected) {
    throw new Error("Invalid maintenance token.");
  }
}

async function loadSnapshot(ctx: any) {
  const [
    users,
    userStates,
    dailySets,
    readEvents,
    streaks,
    bookmarkBuckets,
    bookmarks,
    verses,
  ] = await Promise.all([
    ctx.db.query("users").collect(),
    ctx.db.query("userState").collect(),
    ctx.db.query("dailySets").collect(),
    ctx.db.query("readEvents").collect(),
    ctx.db.query("streaks").collect(),
    ctx.db.query("bookmarkBuckets").collect(),
    ctx.db.query("bookmarks").collect(),
    ctx.db.query("verses").collect(),
  ]);
  return {
    users,
    userStates,
    dailySets,
    readEvents,
    streaks,
    bookmarkBuckets,
    bookmarks,
    verses,
  };
}

type Snapshot = Awaited<ReturnType<typeof loadSnapshot>>;

type RepairAction =
  | {
      type: "deduplicateDailySets";
      userId: Id<"users">;
      localDate: string;
      dailySetIds: Id<"dailySets">[];
      canonicalDailySetId: Id<"dailySets">;
    }
  | { type: "deleteOrphanDailySet"; dailySetId: Id<"dailySets"> }
  | { type: "deleteOrphanUserState"; userStateId: Id<"userState"> }
  | { type: "repairDanglingUserState"; userStateId: Id<"userState"> }
  | { type: "deleteOrphanStreak"; streakId: Id<"streaks"> }
  | {
      type: "deleteOrphanBookmarkBucket";
      bucketId: Id<"bookmarkBuckets">;
    }
  | {
      type: "repairReadEvent";
      readEventId: Id<"readEvents">;
      disposition: "delete" | "reassign";
    }
  | {
      type: "repairBookmark";
      bookmarkId: Id<"bookmarks">;
      disposition: "delete" | "reassign";
    };

function buildRepairPlan(snapshot: Snapshot): RepairAction[] {
  const userIds = new Set(snapshot.users.map((doc: any) => String(doc._id)));
  const verseIds = new Set(snapshot.verses.map((doc: any) => String(doc._id)));
  const dailySetsById = new Map<string, any>(
    snapshot.dailySets.map((doc: any) => [String(doc._id), doc])
  );
  const bucketsById = new Map<string, any>(
    snapshot.bookmarkBuckets.map((doc: any) => [String(doc._id), doc])
  );
  const readEventsByDailySet = new Map<string, typeof snapshot.readEvents>();
  for (const event of snapshot.readEvents) {
    const key = String(event.dailySetId);
    const events = readEventsByDailySet.get(key) ?? [];
    events.push(event);
    readEventsByDailySet.set(key, events);
  }

  const actions: RepairAction[] = [];
  const setsByUserDate = new Map<string, typeof snapshot.dailySets>();
  for (const dailySet of snapshot.dailySets) {
    if (!userIds.has(String(dailySet.userId))) continue;
    const key = `${String(dailySet.userId)}\u0000${dailySet.localDate}`;
    const sets = setsByUserDate.get(key) ?? [];
    sets.push(dailySet);
    setsByUserDate.set(key, sets);
  }

  for (const sets of setsByUserDate.values()) {
    if (sets.length < 2) continue;
    const canonical = selectCanonicalDailySet<any>(
      sets.map((set: any) => {
        const events = readEventsByDailySet.get(String(set._id)) ?? [];
        return {
          ...set,
          id: String(set._id),
          sequenceReadCount: new Set(
            events
              .filter((event: any) => event.kind !== "reread")
              .map((event: any) => String(event.verseId))
          ).size,
          totalReadCount: events.length,
        };
      })
    );
    if (!canonical) continue;
    actions.push({
      type: "deduplicateDailySets",
      userId: canonical.userId,
      localDate: canonical.localDate,
      dailySetIds: sets.map((set: any) => set._id),
      canonicalDailySetId: canonical._id,
    });
  }

  for (const dailySet of snapshot.dailySets) {
    if (!userIds.has(String(dailySet.userId))) {
      actions.push({
        type: "deleteOrphanDailySet",
        dailySetId: dailySet._id,
      });
    }
  }

  for (const userState of snapshot.userStates) {
    if (!userIds.has(String(userState.userId))) {
      actions.push({
        type: "deleteOrphanUserState",
        userStateId: userState._id,
      });
      continue;
    }
    if (userState.currentDailySetId) {
      const currentSet = dailySetsById.get(String(userState.currentDailySetId));
      if (
        !currentSet ||
        String(currentSet.userId) !== String(userState.userId)
      ) {
        actions.push({
          type: "repairDanglingUserState",
          userStateId: userState._id,
        });
      }
    }
  }

  for (const streak of snapshot.streaks) {
    if (!userIds.has(String(streak.userId))) {
      actions.push({ type: "deleteOrphanStreak", streakId: streak._id });
    }
  }

  for (const bucket of snapshot.bookmarkBuckets) {
    if (!userIds.has(String(bucket.userId))) {
      actions.push({
        type: "deleteOrphanBookmarkBucket",
        bucketId: bucket._id,
      });
    }
  }

  for (const event of snapshot.readEvents) {
    const dailySet = dailySetsById.get(String(event.dailySetId));
    const dailySetUserExists =
      dailySet && userIds.has(String(dailySet.userId));
    const canReassign =
      dailySetUserExists && verseIds.has(String(event.verseId));
    if (
      !canReassign ||
      !userIds.has(String(event.userId)) ||
      String(event.userId) !== String(dailySet.userId)
    ) {
      actions.push({
        type: "repairReadEvent",
        readEventId: event._id,
        disposition: canReassign ? "reassign" : "delete",
      });
    }
  }

  for (const bookmark of snapshot.bookmarks) {
    const bucket = bucketsById.get(String(bookmark.bucketId));
    const bucketUserExists = bucket && userIds.has(String(bucket.userId));
    const canReassign =
      bucketUserExists && verseIds.has(String(bookmark.verseId));
    if (
      !canReassign ||
      !userIds.has(String(bookmark.userId)) ||
      String(bookmark.userId) !== String(bucket.userId)
    ) {
      actions.push({
        type: "repairBookmark",
        bookmarkId: bookmark._id,
        disposition: canReassign ? "reassign" : "delete",
      });
    }
  }

  return actions;
}

function summarizePlan(snapshot: Snapshot, actions: RepairAction[]) {
  const byType: Record<string, number> = {};
  for (const action of actions) {
    byType[action.type] = (byType[action.type] ?? 0) + 1;
  }
  return {
    scanned: {
      users: snapshot.users.length,
      userState: snapshot.userStates.length,
      dailySets: snapshot.dailySets.length,
      readEvents: snapshot.readEvents.length,
      streaks: snapshot.streaks.length,
      bookmarkBuckets: snapshot.bookmarkBuckets.length,
      bookmarks: snapshot.bookmarks.length,
      verses: snapshot.verses.length,
    },
    pendingActions: actions.length,
    byType,
    samples: actions.slice(0, SAMPLE_SIZE),
  };
}

async function repairDuplicateDailySets(
  ctx: any,
  action: Extract<RepairAction, { type: "deduplicateDailySets" }>
) {
  const candidates = await ctx.db
    .query("dailySets")
    .withIndex("byUserAndDate", (q: any) =>
      q.eq("userId", action.userId).eq("localDate", action.localDate)
    )
    .collect();
  if (candidates.length < 2) return { changed: false, writes: 0 };

  const eventGroups = await Promise.all(
    candidates.map((candidate: any) =>
      ctx.db
        .query("readEvents")
        .withIndex("by_dailySet", (q: any) =>
          q.eq("dailySetId", candidate._id)
        )
        .collect()
    )
  );
  const events = eventGroups.flat();
  const canonical = selectCanonicalDailySet<any>(
    candidates.map((candidate: any, index: number) => ({
      ...candidate,
      id: String(candidate._id),
      sequenceReadCount: new Set(
        eventGroups[index]
          .filter((event: any) => event.kind !== "reread")
          .map((event: any) => String(event.verseId))
      ).size,
      totalReadCount: eventGroups[index].length,
    }))
  );
  if (!canonical) return { changed: false, writes: 0 };

  let writes = 0;
  const completionTimes = candidates
    .map((candidate: any) => candidate.completedAt)
    .filter((value: number | null): value is number => value !== null);
  const preservedCompletedAt =
    completionTimes.length > 0 ? Math.min(...completionTimes) : null;
  if (canonical.completedAt !== preservedCompletedAt) {
    await ctx.db.patch(canonical._id, { completedAt: preservedCompletedAt });
    writes += 1;
  }

  const operations = planReadEventMerge({
    canonicalDailySetId: String(canonical._id),
    canonicalVerseIds: canonical.verseIds.map(String),
    events: events.map((event: any) => ({
      id: String(event._id),
      dailySetId: String(event.dailySetId),
      verseId: String(event.verseId),
      kind: event.kind,
    })),
  });
  const eventsById = new Map(
    events.map((event: any) => [String(event._id), event])
  );
  for (const operation of operations) {
    if (operation.type === "keep") continue;
    const event = eventsById.get(operation.eventId);
    if (!event) continue;
    if (operation.type === "deleteDuplicate") {
      await ctx.db.delete(event._id);
    } else {
      await ctx.db.patch(event._id, {
        userId: canonical.userId,
        dailySetId: canonical._id,
        kind: operation.kind,
      });
    }
    writes += 1;
  }

  const duplicateIds = new Set(
    candidates
      .filter((candidate: any) => candidate._id !== canonical._id)
      .map((candidate: any) => String(candidate._id))
  );
  const userStates = await ctx.db
    .query("userState")
    .withIndex("byUser", (q: any) => q.eq("userId", canonical.userId))
    .collect();
  for (const userState of userStates) {
    if (
      userState.currentDailySetId &&
      duplicateIds.has(String(userState.currentDailySetId))
    ) {
      await ctx.db.patch(userState._id, {
        currentDailySetId: canonical._id,
        lastDailyDate: canonical.localDate,
      });
      writes += 1;
    }
  }

  for (const candidate of candidates) {
    if (candidate._id === canonical._id) continue;
    await ctx.db.delete(candidate._id);
    writes += 1;
  }
  return { changed: true, writes, canonicalDailySetId: canonical._id };
}

async function applyAction(ctx: any, action: RepairAction) {
  if (action.type === "deduplicateDailySets") {
    return await repairDuplicateDailySets(ctx, action);
  }
  if (action.type === "deleteOrphanDailySet") {
    const dailySet = await ctx.db.get(action.dailySetId);
    if (!dailySet || (await ctx.db.get(dailySet.userId))) {
      return { changed: false, writes: 0 };
    }
    const events = await ctx.db
      .query("readEvents")
      .withIndex("by_dailySet", (q: any) =>
        q.eq("dailySetId", action.dailySetId)
      )
      .collect();
    for (const event of events) await ctx.db.delete(event._id);
    await ctx.db.delete(action.dailySetId);
    return { changed: true, writes: events.length + 1 };
  }
  if (action.type === "deleteOrphanUserState") {
    const doc = await ctx.db.get(action.userStateId);
    if (!doc || (await ctx.db.get(doc.userId))) {
      return { changed: false, writes: 0 };
    }
    await ctx.db.delete(doc._id);
    return { changed: true, writes: 1 };
  }
  if (action.type === "repairDanglingUserState") {
    const doc = await ctx.db.get(action.userStateId);
    if (!doc?.currentDailySetId) return { changed: false, writes: 0 };
    const dailySet = await ctx.db.get(doc.currentDailySetId);
    if (dailySet && dailySet.userId === doc.userId) {
      return { changed: false, writes: 0 };
    }
    await ctx.db.patch(doc._id, { currentDailySetId: null });
    return { changed: true, writes: 1 };
  }
  if (action.type === "deleteOrphanStreak") {
    const doc = await ctx.db.get(action.streakId);
    if (!doc || (await ctx.db.get(doc.userId))) {
      return { changed: false, writes: 0 };
    }
    await ctx.db.delete(doc._id);
    return { changed: true, writes: 1 };
  }
  if (action.type === "deleteOrphanBookmarkBucket") {
    const bucket = await ctx.db.get(action.bucketId);
    if (!bucket || (await ctx.db.get(bucket.userId))) {
      return { changed: false, writes: 0 };
    }
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket", (q: any) => q.eq("bucketId", bucket._id))
      .collect();
    for (const bookmark of bookmarks) await ctx.db.delete(bookmark._id);
    await ctx.db.delete(bucket._id);
    return { changed: true, writes: bookmarks.length + 1 };
  }
  if (action.type === "repairReadEvent") {
    const event = await ctx.db.get(action.readEventId);
    if (!event) return { changed: false, writes: 0 };
    const [dailySet, verse] = await Promise.all([
      ctx.db.get(event.dailySetId),
      ctx.db.get(event.verseId),
    ]);
    const user = dailySet ? await ctx.db.get(dailySet.userId) : null;
    if (!dailySet || !verse || !user) {
      await ctx.db.delete(event._id);
      return { changed: true, writes: 1 };
    }
    if (event.userId !== dailySet.userId) {
      await ctx.db.patch(event._id, { userId: dailySet.userId });
      return { changed: true, writes: 1 };
    }
    return { changed: false, writes: 0 };
  }

  const bookmark = await ctx.db.get(action.bookmarkId);
  if (!bookmark) return { changed: false, writes: 0 };
  const [bucket, verse] = await Promise.all([
    ctx.db.get(bookmark.bucketId),
    ctx.db.get(bookmark.verseId),
  ]);
  const user = bucket ? await ctx.db.get(bucket.userId) : null;
  if (!bucket || !verse || !user) {
    await ctx.db.delete(bookmark._id);
    return { changed: true, writes: 1 };
  }
  if (bookmark.userId !== bucket.userId) {
    await ctx.db.patch(bookmark._id, { userId: bucket.userId });
    return { changed: true, writes: 1 };
  }
  return { changed: false, writes: 0 };
}

/**
 * Read-only report. Running this is always safe and is the required first
 * production step before any repair batch.
 */
export const auditIntegrity = query({
  args: { token: v.string() },
  returns: dryRunResultValidator,
  handler: async (ctx, args) => {
    assertMaintenanceToken(args.token);
    const snapshot = await loadSnapshot(ctx);
    return {
      mode: "dryRun" as const,
      ...summarizePlan(snapshot, buildRepairPlan(snapshot)),
    };
  },
});

/**
 * Defaults to dry-run. Execution requires both the deployment maintenance
 * token and an exact confirmation phrase. Re-run until `remainingActions` is
 * zero; subsequent executions are safe no-ops.
 */
export const repairIntegrityBatch = mutation({
  args: {
    token: v.string(),
    mode: v.optional(v.union(v.literal("dryRun"), v.literal("execute"))),
    confirm: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: v.union(dryRunResultValidator, executeResultValidator),
  handler: async (ctx, args) => {
    assertMaintenanceToken(args.token);
    const { mode, batchSize } = normalizeIntegrityRepairRequest(args);
    const before = await loadSnapshot(ctx);
    const plan = buildRepairPlan(before);
    if (mode === "dryRun") {
      return {
        mode,
        executedActions: 0,
        ...summarizePlan(before, plan),
      };
    }
    let executedActions = 0;
    let writes = 0;
    for (const action of plan.slice(0, batchSize)) {
      const result = await applyAction(ctx, action);
      if (result.changed) executedActions += 1;
      writes += result.writes;
    }

    const after = await loadSnapshot(ctx);
    const remainingPlan = buildRepairPlan(after);
    return {
      mode,
      attemptedActions: Math.min(batchSize, plan.length),
      executedActions,
      writes,
      remainingActions: remainingPlan.length,
      remainingByType: summarizePlan(after, remainingPlan).byType,
      complete: remainingPlan.length === 0,
    };
  },
});
