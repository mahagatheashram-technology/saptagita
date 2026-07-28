import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDateStreak,
  getPreviousLocalDate,
} from "../convex/streakMath.ts";

test("counts consecutive local activity dates", () => {
  assert.deepEqual(
    calculateDateStreak([
      "2026-07-20",
      "2026-07-21",
      "2026-07-23",
      "2026-07-24",
    ]),
    {
      currentStreak: 2,
      longestStreak: 2,
      lastLocalDate: "2026-07-24",
    }
  );
});

test("deduplicates multiple activity records for one local date", () => {
  assert.deepEqual(
    calculateDateStreak([
      "2026-07-23",
      "2026-07-24",
      "2026-07-24",
    ]),
    {
      currentStreak: 2,
      longestStreak: 2,
      lastLocalDate: "2026-07-24",
    }
  );
});

test("uses calendar-day arithmetic across DST boundaries", () => {
  assert.equal(getPreviousLocalDate("2026-03-09"), "2026-03-08");
  assert.equal(getPreviousLocalDate("2026-11-02"), "2026-11-01");
});

test("a partial reading day starts a streak without becoming a perfect day", () => {
  const readDayStats = calculateDateStreak([
    "2026-07-06",
    "2026-07-07",
    "2026-07-08",
    "2026-07-09",
    "2026-07-10",
    "2026-07-11",
    "2026-07-12",
    "2026-07-13",
    "2026-07-14",
    "2026-07-16",
    "2026-07-18",
    "2026-07-19",
    "2026-07-20",
    "2026-07-21",
    "2026-07-22",
    "2026-07-23",
    "2026-07-24",
    "2026-07-25",
    "2026-07-26",
    "2026-07-28",
  ]);
  const perfectDayStats = calculateDateStreak([
    "2026-07-20",
    "2026-07-21",
    "2026-07-22",
  ]);

  assert.deepEqual(readDayStats, {
    currentStreak: 1,
    longestStreak: 9,
    lastLocalDate: "2026-07-28",
  });
  assert.deepEqual(perfectDayStats, {
    currentStreak: 3,
    longestStreak: 3,
    lastLocalDate: "2026-07-22",
  });
});
