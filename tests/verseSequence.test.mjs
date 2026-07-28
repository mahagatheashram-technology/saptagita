import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CHAPTER_VERSE_COUNTS,
  getCanonicalIndex,
  getSequencePositions,
  getVersePosition,
  TOTAL_VERSES,
} from "../convex/verseSequence.ts";

test("canonical metadata exactly describes the production 701-verse corpus", async () => {
  assert.equal(TOTAL_VERSES, 701);
  assert.equal(CHAPTER_VERSE_COUNTS.length, 18);

  const dataset = JSON.parse(
    await readFile(
      new URL("../data/gita_enriched.cleaned.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(dataset.length, TOTAL_VERSES);

  dataset.forEach((verse, canonicalIndex) => {
    assert.deepEqual(getVersePosition(canonicalIndex), {
      canonicalIndex,
      chapterNumber: verse.chapterNumber,
      verseNumber: verse.verseNumber,
    });
    assert.equal(
      getCanonicalIndex(verse.chapterNumber, verse.verseNumber),
      canonicalIndex,
    );
  });
});

test("daily selection performs exactly seven canonical point lookups", () => {
  const positions = getSequencePositions(119, 7);
  assert.equal(positions.length, 7);
  assert.deepEqual(
    positions.map(({ chapterNumber, verseNumber }) => [
      chapterNumber,
      verseNumber,
    ]),
    [
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
      [3, 5],
      [3, 6],
      [3, 7],
    ],
  );
});

test("daily selection wraps from verse 701 back to verse 1 without gaps", () => {
  const positions = getSequencePositions(TOTAL_VERSES - 4, 7);
  assert.deepEqual(
    positions.map(({ canonicalIndex, chapterNumber, verseNumber }) => [
      canonicalIndex,
      chapterNumber,
      verseNumber,
    ]),
    [
      [697, 18, 75],
      [698, 18, 76],
      [699, 18, 77],
      [700, 18, 78],
      [0, 1, 1],
      [1, 1, 2],
      [2, 1, 3],
    ],
  );
});

test("selection rejects an unbounded caller-controlled count", () => {
  assert.throws(
    () => getSequencePositions(0, TOTAL_VERSES + 1),
    /Verse count must be an integer/,
  );
});
