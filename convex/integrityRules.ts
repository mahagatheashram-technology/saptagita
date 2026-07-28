export type DailySetCandidate = {
  id: string;
  completedAt: number | null;
  createdAt: number;
  sequenceReadCount: number;
  totalReadCount: number;
};

export const INTEGRITY_REPAIR_CONFIRMATION = "REPAIR_DATABASE_INTEGRITY";
const DEFAULT_INTEGRITY_BATCH_SIZE = 10;
const MAX_INTEGRITY_BATCH_SIZE = 25;

export function normalizeIntegrityRepairRequest(args: {
  mode?: "dryRun" | "execute";
  confirm?: string;
  batchSize?: number;
}) {
  const mode = args.mode ?? "dryRun";
  const requestedBatchSize = Number.isFinite(args.batchSize)
    ? Math.floor(args.batchSize as number)
    : DEFAULT_INTEGRITY_BATCH_SIZE;
  const batchSize = Math.max(
    1,
    Math.min(requestedBatchSize, MAX_INTEGRITY_BATCH_SIZE)
  );
  if (
    mode === "execute" &&
    args.confirm !== INTEGRITY_REPAIR_CONFIRMATION
  ) {
    throw new Error(
      `Confirmation mismatch. Pass confirm='${INTEGRITY_REPAIR_CONFIRMATION}' to execute.`
    );
  }
  return { mode, batchSize };
}

/**
 * Choose the record that preserves the most user progress. The ordering is
 * deterministic so retrying a migration produces the same result.
 */
export function selectCanonicalDailySet<T extends DailySetCandidate>(
  candidates: readonly T[]
): T | null {
  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    if ((a.completedAt !== null) !== (b.completedAt !== null)) {
      return a.completedAt !== null ? -1 : 1;
    }
    if (a.sequenceReadCount !== b.sequenceReadCount) {
      return b.sequenceReadCount - a.sequenceReadCount;
    }
    if (a.totalReadCount !== b.totalReadCount) {
      return b.totalReadCount - a.totalReadCount;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return a.id.localeCompare(b.id);
  })[0];
}

export type ReadEventForMerge = {
  id: string;
  dailySetId: string;
  verseId: string;
  kind?: "sequence" | "reread";
};

export type ReadEventMergeOperation =
  | { type: "keep"; eventId: string }
  | {
      type: "move";
      eventId: string;
      dailySetId: string;
      kind: "sequence" | "reread";
    }
  | { type: "deleteDuplicate"; eventId: string };

/**
 * Plan how events from duplicate sets are folded into the canonical set.
 * Sequence progress that fits the canonical set remains sequence progress.
 * Other valid reads become rereads instead of being discarded.
 */
export function planReadEventMerge(args: {
  canonicalDailySetId: string;
  canonicalVerseIds: readonly string[];
  events: readonly ReadEventForMerge[];
}): ReadEventMergeOperation[] {
  const canonicalVerses = new Set(args.canonicalVerseIds);
  const seenSequenceVerses = new Set<string>();
  const orderedEvents = [...args.events].sort((a, b) => {
    const aCanonical = a.dailySetId === args.canonicalDailySetId;
    const bCanonical = b.dailySetId === args.canonicalDailySetId;
    if (aCanonical !== bCanonical) return aCanonical ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  return orderedEvents.map((event) => {
    const isSequence = event.kind !== "reread";
    const canRemainSequence =
      isSequence &&
      canonicalVerses.has(event.verseId) &&
      !seenSequenceVerses.has(event.verseId);

    if (canRemainSequence) {
      seenSequenceVerses.add(event.verseId);
      if (event.dailySetId === args.canonicalDailySetId) {
        return { type: "keep", eventId: event.id };
      }
      return {
        type: "move",
        eventId: event.id,
        dailySetId: args.canonicalDailySetId,
        kind: "sequence",
      };
    }

    if (
      isSequence &&
      canonicalVerses.has(event.verseId) &&
      seenSequenceVerses.has(event.verseId)
    ) {
      return { type: "deleteDuplicate", eventId: event.id };
    }

    if (
      event.dailySetId === args.canonicalDailySetId &&
      event.kind === "reread"
    ) {
      return { type: "keep", eventId: event.id };
    }

    return {
      type: "move",
      eventId: event.id,
      dailySetId: args.canonicalDailySetId,
      kind: "reread",
    };
  });
}
