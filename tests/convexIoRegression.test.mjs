import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getInitials } from "../components/social/leaderboardPresentation.ts";

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
const streakRankingSource = await readFile(
  new URL("../convex/streakRanking.ts", import.meta.url),
  "utf8",
);
const dailyReadersSource = await readFile(
  new URL("../convex/dailyReaders.ts", import.meta.url),
  "utf8",
);
const leaderboardListSource = await readFile(
  new URL("../components/social/LeaderboardList.tsx", import.meta.url),
  "utf8",
);
const socialScreenSource = await readFile(
  new URL("../app/(tabs)/social.tsx", import.meta.url),
  "utf8",
);
const top50ScreenSource = await readFile(
  new URL("../app/(tabs)/leaderboard.tsx", import.meta.url),
  "utf8",
);
const leaderboardRowSource = await readFile(
  new URL("../components/social/LeaderboardRow.tsx", import.meta.url),
  "utf8",
);
const todayReadersSource = await readFile(
  new URL("../components/social/TodayReadersStat.tsx", import.meta.url),
  "utf8",
);
const calendarSource = await readFile(
  new URL("../components/profile/ReadingCalendar.tsx", import.meta.url),
  "utf8",
);
const previewFixturesSource = await readFile(
  new URL("../convex/previewFixtures.ts", import.meta.url),
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

test("global leaderboard remains bounded to five and personal rank is logarithmic", () => {
  const leaderboardReadPath = streaksSource.slice(
    streaksSource.indexOf("async function getGlobalLeaderboardEntries"),
    streaksSource.indexOf("export const getGlobalLeaderboard"),
  );
  assert.match(
    leaderboardReadPath,
    /\.withIndex\(\s*["']byCurrentStreakAndLastCompletedDate["']\s*,/,
  );
  assert.match(leaderboardReadPath, /\.order\(\s*["']desc["']\s*\)/);
  assert.match(leaderboardReadPath, /\.take\(\s*limit\s*\)/);
  assert.match(streaksSource, /const GLOBAL_LEADERBOARD_LIMIT = 5/);
  assert.match(streaksSource, /globalStreakRanking\.indexOfDoc/);
  assert.match(streakRankingSource, /TableAggregate/);
  assert.doesNotMatch(leaderboardReadPath, /\.collect\s*\(/);
  assert.match(
    leaderboardListSource,
    /convex\s*\.query\(api\.streaks\.getMyGlobalRank,\s*{}\)/s,
  );
  assert.doesNotMatch(
    leaderboardListSource,
    /useQuery\(\s*api\.streaks\.getMyGlobalRank/,
  );
});

test("top 50 is a bounded one-shot detail read", () => {
  assert.match(streaksSource, /const GLOBAL_LEADERBOARD_DETAIL_LIMIT = 50/);
  assert.match(
    top50ScreenSource,
    /convex\s*\.query\(api\.streaks\.getGlobalLeaderboardTop50,\s*{}\)/s,
  );
  assert.doesNotMatch(
    top50ScreenSource,
    /useQuery\(\s*api\.streaks\.getGlobalLeaderboardTop50/,
  );
});

test("pinned personal rank reuses the highlighted leaderboard row", () => {
  assert.doesNotMatch(leaderboardListSource, /UserRankCard/);
  assert.match(
    leaderboardListSource,
    /pinnedUser\s*\?\s*\([\s\S]*?<LeaderboardRow[\s\S]*?isCurrentUser/,
  );
});

test("today reader count is sharded, bounded, and read as a snapshot", () => {
  assert.match(dailyReadersSource, /const DAILY_READER_SHARD_COUNT = 64/);
  assert.match(dailyReadersSource, /\.withIndex\(\s*["']by_date["']/);
  assert.match(
    dailyReadersSource,
    /\.take\(\s*DAILY_READER_SHARD_COUNT\s*\)/,
  );
  assert.doesNotMatch(
    dailyReadersSource,
    /\.query\(\s*["'](?:users|readEvents|dailySets)["']\s*\)/,
  );
  assert.match(
    socialScreenSource,
    /convex\s*\.query\(api\.dailyReaders\.getTodayReaderCount,\s*{}\)/s,
  );
  assert.doesNotMatch(
    socialScreenSource,
    /useQuery\(\s*api\.dailyReaders\.getTodayReaderCount/,
  );
});

test("social fits the main leaderboard without shrinking current-user treatment", () => {
  assert.match(socialScreenSource, /text-\[25px\][^>]*>Social</);
  assert.match(todayReadersSource, /size=\{18\}/);
  assert.match(todayReadersSource, /text-\[19px\]/);
  assert.match(leaderboardRowSource, /text-\[15px\]/);
  assert.match(leaderboardRowSource, /text-\[13px\]/);
  assert.match(leaderboardRowSource, /min-w-\[36px\]/);
  assert.match(leaderboardRowSource, /numberOfLines=\{1\}/);
  assert.match(leaderboardRowSource, /compact \? "py-2 mb-1\.5"/);
  assert.match(leaderboardRowSource, /compact \? "h-9 w-9"/);
  assert.match(leaderboardListSource, /flex-1 px-5 pt-3/);
});

test("leaderboard initials ignore numeric fixture suffixes", () => {
  assert.equal(getInitials("Preview Reader 01"), "PR");
  assert.equal(getInitials("Preview Reader 50"), "PR");
  assert.equal(getInitials("  Arjuna  "), "A");
});

test("calendar distinguishes started and perfect days", () => {
  assert.match(calendarSource, /const PERFECT_GREEN = "#16A34A"/);
  assert.match(calendarSource, /const READ_YELLOW = "#FACC15"/);
  assert.match(calendarSource, /label="All 7 read"/);
  assert.match(calendarSource, /label="Started"/);
});

test("preview fixtures are isolated and reconciliation-safe", () => {
  assert.match(previewFixturesSource, /process\.env\.ALLOW_PREVIEW_FIXTURES/);
  assert.match(previewFixturesSource, /internalMutation/);
  assert.doesNotMatch(previewFixturesSource, /export const \w+ = mutation\(/);
  assert.match(previewFixturesSource, /completedAt: timestamp \+ 60_000/);
  assert.match(previewFixturesSource, /scenario === "rank1" \? 70 : 50/);
  assert.match(previewFixturesSource, /TODAY_READER_COUNT = 43/);
  assert.match(previewFixturesSource, /displayName: "Preview Current User"/);
});

test("daily-set ranking metadata never escapes the public return validator", () => {
  assert.match(
    dailySetsSource,
    /const canonical = selectCanonicalDailySet[\s\S]*candidates\.find\([\s\S]*canonical\._id/,
  );
  assert.doesNotMatch(
    dailySetsSource,
    /return selectCanonicalDailySet<any>/,
    "the enriched ranking candidate must not be returned as a daily-set document",
  );
});
