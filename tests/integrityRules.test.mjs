import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeIntegrityRepairRequest,
  planReadEventMerge,
  selectCanonicalDailySet,
} from "../convex/integrityRules.ts";

test("repair requests default to dry-run and clamp batch size", () => {
  assert.deepEqual(normalizeIntegrityRepairRequest({}), {
    mode: "dryRun",
    batchSize: 10,
  });
  assert.equal(
    normalizeIntegrityRepairRequest({ batchSize: 1_000 }).batchSize,
    25
  );
});

test("execution requires the exact confirmation phrase", () => {
  assert.throws(
    () => normalizeIntegrityRepairRequest({ mode: "execute" }),
    /Confirmation mismatch/
  );
  assert.deepEqual(
    normalizeIntegrityRepairRequest({
      mode: "execute",
      confirm: "REPAIR_DATABASE_INTEGRITY",
      batchSize: 5,
    }),
    { mode: "execute", batchSize: 5 }
  );
});

test("canonical daily set preserves completion before newer partial records", () => {
  const canonical = selectCanonicalDailySet([
    {
      id: "partial-with-more-events",
      completedAt: null,
      createdAt: 10,
      sequenceReadCount: 7,
      totalReadCount: 7,
    },
    {
      id: "completed",
      completedAt: 500,
      createdAt: 20,
      sequenceReadCount: 6,
      totalReadCount: 6,
    },
  ]);

  assert.equal(canonical?.id, "completed");
});

test("canonical daily set selection is deterministic for equivalent records", () => {
  const candidates = [
    {
      id: "later-id",
      completedAt: null,
      createdAt: 100,
      sequenceReadCount: 3,
      totalReadCount: 4,
    },
    {
      id: "earlier-id",
      completedAt: null,
      createdAt: 100,
      sequenceReadCount: 3,
      totalReadCount: 4,
    },
  ];

  assert.equal(selectCanonicalDailySet(candidates)?.id, "earlier-id");
  assert.equal(
    selectCanonicalDailySet([...candidates].reverse())?.id,
    "earlier-id"
  );
});

test("dedup merge keeps sequence progress and retains off-set reads as rereads", () => {
  const operations = planReadEventMerge({
    canonicalDailySetId: "canonical",
    canonicalVerseIds: ["v1", "v2"],
    events: [
      {
        id: "a",
        dailySetId: "canonical",
        verseId: "v1",
        kind: "sequence",
      },
      {
        id: "b",
        dailySetId: "duplicate",
        verseId: "v1",
        kind: "sequence",
      },
      {
        id: "c",
        dailySetId: "duplicate",
        verseId: "v2",
        kind: "sequence",
      },
      {
        id: "d",
        dailySetId: "duplicate",
        verseId: "other",
        kind: "sequence",
      },
      {
        id: "e",
        dailySetId: "duplicate",
        verseId: "other",
        kind: "reread",
      },
    ],
  });

  assert.deepEqual(operations, [
    { type: "keep", eventId: "a" },
    { type: "deleteDuplicate", eventId: "b" },
    {
      type: "move",
      eventId: "c",
      dailySetId: "canonical",
      kind: "sequence",
    },
    {
      type: "move",
      eventId: "d",
      dailySetId: "canonical",
      kind: "reread",
    },
    {
      type: "move",
      eventId: "e",
      dailySetId: "canonical",
      kind: "reread",
    },
  ]);
});

test("a second merge plan after repair contains no writes", () => {
  const operations = planReadEventMerge({
    canonicalDailySetId: "canonical",
    canonicalVerseIds: ["v1", "v2"],
    events: [
      {
        id: "a",
        dailySetId: "canonical",
        verseId: "v1",
        kind: "sequence",
      },
      {
        id: "c",
        dailySetId: "canonical",
        verseId: "v2",
        kind: "sequence",
      },
      {
        id: "d",
        dailySetId: "canonical",
        verseId: "other",
        kind: "reread",
      },
    ],
  });

  assert.ok(operations.every((operation) => operation.type === "keep"));
});
