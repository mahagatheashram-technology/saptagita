import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dailySetsSource = await readFile(
  new URL("../convex/dailySets.ts", import.meta.url),
  "utf8",
);
const versesSource = await readFile(
  new URL("../convex/verses.ts", import.meta.url),
  "utf8",
);
const streaksSource = await readFile(
  new URL("../convex/streaks.ts", import.meta.url),
  "utf8",
);

test("user-facing flows never collect the complete verses table", () => {
  for (const [moduleName, source] of [
    ["dailySets.ts", dailySetsSource],
    ["verses.ts", versesSource],
  ]) {
    assert.doesNotMatch(
      source,
      /\.query\(\s*["']verses["']\s*\)\s*\.collect\s*\(/s,
      `${moduleName} must use bounded indexed verse reads`,
    );
  }
  assert.doesNotMatch(dailySetsSource, /getOrderedVerseIds/);
});

test("daily verse selection uses the canonical index and a fixed count", () => {
  assert.match(
    dailySetsSource,
    /getSequenceVerses\(\s*ctx\.db,\s*pointer,\s*DAILY_VERSE_COUNT/s,
  );
  assert.match(dailySetsSource, /\.withIndex\(\s*["']byChapterVerse["']/);
  assert.match(dailySetsSource, /const DAILY_VERSE_COUNT = 7/);
});

test("completed daily sets are read through the completion index", () => {
  assert.match(streaksSource, /\.withIndex\(\s*["']byUserAndCompletedAt["']/);
  assert.doesNotMatch(
    streaksSource,
    /\.filter\([^;]*completedAt/s,
    "streak queries must not post-filter every daily set",
  );
});
