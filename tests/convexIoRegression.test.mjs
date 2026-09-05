import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getInitials } from "../components/social/leaderboardPresentation.ts";
import {
  GLOBAL_STREAK_RANKING_MAX_NODE_SIZE,
  localDateRankValue,
} from "../convex/streakRankingKey.ts";

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
const streakRankingMigrationSource = await readFile(
  new URL("../convex/streakRankingMigration.ts", import.meta.url),
  "utf8",
);
const debugSource = await readFile(
  new URL("../convex/debug.ts", import.meta.url),
  "utf8",
);
const dailyReadersSource = await readFile(
  new URL("../convex/dailyReaders.ts", import.meta.url),
  "utf8",
);
const dailyReaderMigrationSource = await readFile(
  new URL("../convex/dailyReaderMigration.ts", import.meta.url),
  "utf8",
);
const readStreakMigrationSource = await readFile(
  new URL("../convex/readStreakMigration.ts", import.meta.url),
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
const colorsSource = await readFile(
  new URL("../constants/Colors.ts", import.meta.url),
  "utf8",
);
const streakStatsSource = await readFile(
  new URL("../components/profile/StreakStatsCard.tsx", import.meta.url),
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
    /\.withIndex\(\s*["']byCurrentStreakAndLastReadDate["']\s*,/,
  );
  assert.match(leaderboardReadPath, /\.order\(\s*["']desc["']\s*\)/);
  assert.match(leaderboardReadPath, /\.take\(\s*limit\s*\)/);
  assert.match(streaksSource, /const GLOBAL_LEADERBOARD_LIMIT = 5/);
  assert.match(streaksSource, /globalStreakRanking\.indexOfDoc/);
  assert.match(
    streaksSource,
    /rankingMetadata\.maxNodeSize\s*!==\s*GLOBAL_STREAK_RANKING_MAX_NODE_SIZE/,
  );
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

test("the first verse advances the read-day streak while Perfect stays completion-only", () => {
  assert.match(
    dailySetsSource,
    /isFirstReadToday[\s\S]*updateStreakOnReadInternal/,
  );
  assert.match(
    streaksSource,
    /export const updateStreakOnReadInternal[\s\S]*lastReadLocalDate:\s*args\.localDate/,
  );
  assert.match(
    streaksSource,
    /Completing all seven verses records a Perfect day without changing/,
  );
  assert.match(
    streakRankingSource,
    /doc\.lastReadLocalDate\s*\?\?\s*doc\.lastCompletedLocalDate/,
  );
});

test("read-day streak repair is paginated and isolated from the runtime path", () => {
  assert.match(readStreakMigrationSource, /const BACKFILL_PAGE_SIZE = 8/);
  assert.match(readStreakMigrationSource, /\.query\("users"\)\.paginate\(/);
  assert.match(
    readStreakMigrationSource,
    /\.withIndex\("by_user_kind"/,
  );
  const runtimeReadUpdate = streaksSource.slice(
    streaksSource.indexOf("export const updateStreakOnReadInternal"),
    streaksSource.indexOf("export const updateStreakOnCompletionInternal"),
  );
  assert.doesNotMatch(runtimeReadUpdate, /\.collect\s*\(/);
});

test("global leaderboard preserves the code 3 contract without penalizing code 4", () => {
  assert.match(
    streaksSource,
    /args:\s*\{\s*currentUserId:\s*v\.optional\(v\.id\(["']users["']\)\)\s*\}/,
  );
  assert.match(streaksSource, /top5:\s*v\.array\(leaderboardEntryValidator\)/);
  assert.match(streaksSource, /top50:\s*v\.array\(leaderboardEntryValidator\)/);
  assert.match(
    streaksSource,
    /legacyClient\s*\?\s*GLOBAL_LEADERBOARD_DETAIL_LIMIT\s*:\s*GLOBAL_LEADERBOARD_LIMIT/,
  );
  assert.match(streaksSource, /globalStreakRanking\.count\(ctx\)/);
});

test("global rank tuning is explicit and empty dates retain index ordering", () => {
  assert.equal(GLOBAL_STREAK_RANKING_MAX_NODE_SIZE, 64);
  assert.ok(
    -localDateRankValue("2026-07-31") < -localDateRankValue(""),
    "a valid recent date must rank before an empty date",
  );
  assert.match(
    streakRankingMigrationSource,
    /maxNodeSize:\s*v\.literal\(GLOBAL_STREAK_RANKING_MAX_NODE_SIZE\)/,
  );
  assert.match(streakRankingMigrationSource, /rootLazy:\s*true/);
  assert.match(streakRankingMigrationSource, /metadata\.cursor/);
});

test("debug streak rewrites keep the exact-rank aggregate synchronized", () => {
  const directStreakPatch = /ctx\.db\.patch\(streak\._id/g;
  assert.doesNotMatch(debugSource, directStreakPatch);
  assert.equal(
    debugSource.match(/patchRankedStreak\(ctx, streak,/g)?.length,
    3,
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

test("today reader backfill is paginated and idempotent with live reads", () => {
  assert.match(dailyReaderMigrationSource, /const BACKFILL_PAGE_SIZE = 32/);
  assert.match(dailyReaderMigrationSource, /\.query\(["']userState["']\)\.paginate\(/);
  assert.match(
    dailyReaderMigrationSource,
    /state\.lastReaderCountedLocalDate\s*===\s*dailySet\.localDate/,
  );
  assert.match(
    dailyReaderMigrationSource,
    /\.withIndex\(["']by_dailySet_kind["']/,
  );
  assert.doesNotMatch(dailyReaderMigrationSource, /\.collect\s*\(/);
});

test("social fits the main leaderboard without shrinking current-user treatment", () => {
  // The screen and its rows now draw from the shared type scale in
  // lib/typography.ts instead of hand-rolled pixel sizes, so this guards the
  // density properties themselves rather than specific px literals.
  assert.match(socialScreenSource, /\$\{type\.display\}[^>]*>Social</);
  assert.match(todayReadersSource, /\$\{type\.title\}/);
  assert.match(leaderboardRowSource, /\$\{type\.body\} font-semibold/);
  assert.match(leaderboardRowSource, /\$\{type\.bodySm\} font-semibold text-primary/);
  // Rank pill keeps a floor width and single-line rank at every position.
  assert.match(leaderboardRowSource, /min-w-\[28px\]/);
  assert.match(leaderboardRowSource, /numberOfLines=\{1\}/);
  // Compact mode stays denser than the full row.
  assert.match(leaderboardRowSource, /compact\s*\?\s*"py-2\.5 mb-2"/);
  assert.match(leaderboardRowSource, /compact \? "h-9 w-9" : "h-10 w-10"/);
  // Current-user treatment is preserved: tinted, bordered, and labelled.
  assert.match(leaderboardRowSource, /isCurrentUser[\s\S]*bg-primary\/10 border border-primary\/30/);
  assert.match(leaderboardRowSource, />\s*You\s*</);
  assert.match(leaderboardListSource, /px-5 pt-3/);
});

test("leaderboard ranks render one consistent pill, not medal emoji", () => {
  // Android renders 🥇/🥈/🥉 with their own numeral inside, which made ranks
  // 1-3 read as a different component from the rest of the list.
  assert.doesNotMatch(leaderboardRowSource, /🥇|🥈|🥉/);
  assert.match(leaderboardRowSource, /MEDAL_TINTS/);
});

test("leaderboard initials ignore numeric fixture suffixes", () => {
  assert.equal(getInitials("Preview Reader 01"), "PR");
  assert.equal(getInitials("Preview Reader 50"), "PR");
  assert.equal(getInitials("  Arjuna  "), "A");
});

test("calendar distinguishes started and perfect days", () => {
  // The hexes moved behind named status tokens, so assert the binding *and*
  // the value the token resolves to. Gold-for-perfect confused readers; the
  // universal yellow=started / green=complete encoding must not regress, and
  // these colours are deliberately excluded from the warm palette sweep.
  assert.match(calendarSource, /const PERFECT_GREEN = status\.complete/);
  assert.match(calendarSource, /const READ_YELLOW = status\.partial/);
  assert.match(colorsSource, /complete:\s*'#16A34A'/);
  assert.match(colorsSource, /partial:\s*'#FACC15'/);
  assert.match(calendarSource, /label="All 7 read"/);
  assert.match(calendarSource, /label="Started"/);
});

test("the Perfect stat matches the calendar's complete colour", () => {
  // "Perfect" and a green calendar day mean the same thing (all 7 read). The
  // stat box used to render gold, directly above a legend where yellow means
  // "Started" — i.e. the opposite of what the box was reporting.
  assert.match(streakStatsSource, /tone="complete"/);
  assert.match(streakStatsSource, /text-status-complete/);
  assert.doesNotMatch(streakStatsSource, /tone="gold"|#FDE68A|#B45309/);
});

test("preview fixtures are isolated and reconciliation-safe", () => {
  assert.match(previewFixturesSource, /process\.env\.ALLOW_PREVIEW_FIXTURES/);
  assert.match(previewFixturesSource, /process\.env\.CONVEX_CLOUD_URL/);
  assert.match(previewFixturesSource, /process\.env\.PREVIEW_FIXTURE_CONVEX_URL/);
  assert.match(
    previewFixturesSource,
    /maxNodeSize:\s*GLOBAL_STREAK_RANKING_MAX_NODE_SIZE/,
  );
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
