import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCompletionStreak,
  getPreviousLocalDate,
} from "../convex/streakMath.ts";

test("counts only consecutive completed local dates", () => {
  assert.deepEqual(
    calculateCompletionStreak([
      "2026-07-20",
      "2026-07-21",
      "2026-07-23",
      "2026-07-24",
    ]),
    {
      currentStreak: 2,
      longestStreak: 2,
      lastCompletedLocalDate: "2026-07-24",
    }
  );
});

test("deduplicates multiple completion records for one local date", () => {
  assert.deepEqual(
    calculateCompletionStreak([
      "2026-07-23",
      "2026-07-24",
      "2026-07-24",
    ]),
    {
      currentStreak: 2,
      longestStreak: 2,
      lastCompletedLocalDate: "2026-07-24",
    }
  );
});

test("uses calendar-day arithmetic across DST boundaries", () => {
  assert.equal(getPreviousLocalDate("2026-03-09"), "2026-03-08");
  assert.equal(getPreviousLocalDate("2026-11-02"), "2026-11-01");
});
