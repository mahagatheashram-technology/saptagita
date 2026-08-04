import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import "tsx/cjs";
import {
  assertIdentitySubject,
  LEGACY_ALPHA_AUTH_ENV,
  requireCurrentUser,
  requireIdentity,
  requireOwnedUser,
} from "../convex/auth.ts";

const require = createRequire(import.meta.url);
const { getStreakSummary } = require("../convex/streaks.ts");

function authContext({ subject, users = [] } = {}) {
  let requestedAuthId = null;
  return {
    auth: {
      getUserIdentity: async () =>
        subject ? { subject, tokenIdentifier: `clerk|${subject}` } : null,
    },
    db: {
      get: async (id) => users.find((user) => user._id === id) ?? null,
      query: (table) => {
        assert.equal(table, "users");
        return {
          withIndex: (indexName, select) => {
            assert.equal(indexName, "byAuthId");
            select({
              eq: (field, value) => {
                assert.equal(field, "authId");
                requestedAuthId = value;
                return {};
              },
            });
            return {
              first: async () =>
                users.find((user) => user.authId === requestedAuthId) ?? null,
            };
          },
        };
      },
    },
  };
}

function assertConvexCode(expectedCode) {
  return (error) => {
    assert.equal(error?.data?.code, expectedCode);
    return true;
  };
}

test("authentication helper rejects an unauthenticated request", async () => {
  await assert.rejects(
    requireIdentity(authContext()),
    assertConvexCode("UNAUTHENTICATED")
  );
});

test("current-user lookup rejects an identity without a synced user", async () => {
  await assert.rejects(
    requireCurrentUser(authContext({ subject: "clerk-user-a" })),
    assertConvexCode("USER_NOT_SYNCED")
  );
});

test("ownership helper accepts the authenticated user's own id", async () => {
  const user = { _id: "user-a", authId: "clerk-user-a" };
  const result = await requireOwnedUser(
    authContext({ subject: "clerk-user-a", users: [user] }),
    "user-a"
  );
  assert.equal(result, user);
});

test("ownership helper rejects a cross-user id", async () => {
  const users = [
    { _id: "user-a", authId: "clerk-user-a" },
    { _id: "user-b", authId: "clerk-user-b" },
  ];
  await assert.rejects(
    requireOwnedUser(
      authContext({ subject: "clerk-user-a", users }),
      "user-b"
    ),
    assertConvexCode("FORBIDDEN")
  );
});

test("legacy alpha ownership fallback is disabled by default", async () => {
  const previousValue = process.env[LEGACY_ALPHA_AUTH_ENV];
  delete process.env[LEGACY_ALPHA_AUTH_ENV];
  try {
    const user = { _id: "user-a", authId: "clerk-user-a" };
    await assert.rejects(
      requireOwnedUser(authContext({ users: [user] }), "user-a"),
      assertConvexCode("UNAUTHENTICATED")
    );
  } finally {
    if (previousValue === undefined) {
      delete process.env[LEGACY_ALPHA_AUTH_ENV];
    } else {
      process.env[LEGACY_ALPHA_AUTH_ENV] = previousValue;
    }
  }
});

test("legacy alpha ownership fallback accepts only an existing requested id", async () => {
  const previousValue = process.env[LEGACY_ALPHA_AUTH_ENV];
  process.env[LEGACY_ALPHA_AUTH_ENV] = "true";
  try {
    const user = { _id: "user-a", authId: "clerk-user-a" };
    const result = await requireOwnedUser(
      authContext({ users: [user] }),
      "user-a"
    );
    assert.equal(result, user);
    await assert.rejects(
      requireOwnedUser(authContext({ users: [user] }), "missing-user"),
      assertConvexCode("USER_NOT_FOUND")
    );
  } finally {
    if (previousValue === undefined) {
      delete process.env[LEGACY_ALPHA_AUTH_ENV];
    } else {
      process.env[LEGACY_ALPHA_AUTH_ENV] = previousValue;
    }
  }
});

test("legacy authId arguments cannot impersonate another Clerk subject", () => {
  assert.throws(
    () => assertIdentitySubject("clerk-user-a", "clerk-user-b"),
    assertConvexCode("FORBIDDEN")
  );
  assert.doesNotThrow(() =>
    assertIdentitySubject("clerk-user-a", "clerk-user-a")
  );
});

function streakSummaryContext({
  subject,
  users,
  streaks,
  memberships,
  dailySets,
}) {
  const tables = { users, streaks, communityMembers: memberships, dailySets };

  return {
    auth: {
      getUserIdentity: async () =>
        subject ? { subject, tokenIdentifier: `clerk|${subject}` } : null,
    },
    db: {
      get: async (id) =>
        Object.values(tables)
          .flat()
          .find((document) => document._id === id) ?? null,
      query: (table) => {
        const filters = [];
        let order = null;
        const indexQuery = {
          eq(field, value) {
            filters.push((document) => document[field] === value);
            return indexQuery;
          },
          gt(field, value) {
            filters.push((document) => document[field] > value);
            return indexQuery;
          },
        };
        const matchingDocuments = () => {
          const documents = (tables[table] ?? []).filter((document) =>
            filters.every((filter) => filter(document)),
          );
          if (table === "streaks" && order === "desc") {
            documents.sort(
              (a, b) =>
                b.currentStreak - a.currentStreak ||
                (b.lastReadLocalDate ?? "").localeCompare(
                  a.lastReadLocalDate ?? "",
                ),
            );
          }
          return documents;
        };
        const query = {
          withIndex(_indexName, select) {
            select(indexQuery);
            return query;
          },
          order(direction) {
            order = direction;
            return query;
          },
          async take(limit) {
            return matchingDocuments().slice(0, limit);
          },
          async first() {
            return matchingDocuments()[0] ?? null;
          },
          async collect() {
            return matchingDocuments();
          },
        };
        return query;
      },
    },
  };
}

const summaryUsers = [
  {
    _id: "user-a",
    authId: "clerk-user-a",
    displayName: "Caller",
    avatarUrl: "caller.png",
    timezone: "UTC",
  },
  {
    _id: "user-b",
    authId: "clerk-user-b",
    displayName: "Visible Reader",
    timezone: "UTC",
  },
  {
    _id: "user-c",
    authId: "clerk-user-c",
    displayName: "Private Reader",
    avatarUrl: "private.png",
    timezone: "UTC",
  },
];

test("streak summary returns only safe all-time stats for a visible target", async () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
  const higherRankedStreaks = Array.from({ length: 50 }, (_, index) => ({
    _id: `ranked-streak-${index}`,
    userId: `ranked-user-${index}`,
    currentStreak: 100 - index,
    longestStreak: 100 - index,
    lastCompletedLocalDate: today,
    lastReadLocalDate: today,
  }));
  const result = await getStreakSummary._handler(
    streakSummaryContext({
      subject: "clerk-user-a",
      users: summaryUsers,
      streaks: [
        ...higherRankedStreaks,
        {
          _id: "streak-b",
          userId: "user-b",
          currentStreak: 4,
          longestStreak: 9,
          lastCompletedLocalDate: today,
          lastReadLocalDate: today,
        },
      ],
      memberships: [
        { _id: "member-a", communityId: "community-1", userId: "user-a" },
        { _id: "member-b", communityId: "community-1", userId: "user-b" },
      ],
      dailySets: [
        {
          _id: "set-b-1",
          userId: "user-b",
          localDate: "2019-01-01",
          completedAt: 1,
        },
        {
          _id: "set-b-2",
          userId: "user-b",
          localDate: today,
          completedAt: 2,
        },
        {
          _id: "set-b-incomplete",
          userId: "user-b",
          localDate: "2020-01-01",
          completedAt: 0,
        },
      ],
    }),
    { userId: "user-b" },
  );

  assert.deepEqual(result, {
    displayName: "Visible Reader",
    avatarUrl: null,
    currentStreak: 4,
    longestStreak: 9,
    perfectDays: 2,
  });
});

test("streak summary allows a global top-50 target without a shared community", async () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
  const result = await getStreakSummary._handler(
    streakSummaryContext({
      subject: "clerk-user-a",
      users: summaryUsers,
      streaks: [
        {
          _id: "streak-c",
          userId: "user-c",
          currentStreak: 2,
          longestStreak: 3,
          lastCompletedLocalDate: today,
          lastReadLocalDate: today,
        },
      ],
      memberships: [],
      dailySets: [],
    }),
    { userId: "user-c" },
  );

  assert.deepEqual(result, {
    displayName: "Private Reader",
    avatarUrl: "private.png",
    currentStreak: 2,
    longestStreak: 3,
    perfectDays: 0,
  });
});

test("streak summary returns null for a target outside top 50 and communities", async () => {
  const result = await getStreakSummary._handler(
    streakSummaryContext({
      subject: "clerk-user-a",
      users: summaryUsers,
      streaks: [],
      memberships: [],
      dailySets: [],
    }),
    { userId: "user-c" },
  );

  assert.equal(result, null);
});

test("streak summary rejects an unauthenticated request", async () => {
  await assert.rejects(
    getStreakSummary._handler(
      streakSummaryContext({
        users: summaryUsers,
        streaks: [],
        memberships: [],
        dailySets: [],
      }),
      { userId: "user-b" },
    ),
    assertConvexCode("UNAUTHENTICATED"),
  );
});

const protectedExports = {
  "convex/users.ts": {
    getOrCreateUser: "requireIdentity",
    getOrCreateUserFromAuth: "requireIdentity",
    getAccountDeletionStatus: "requireIdentity",
    getUserByAuthId: "requireIdentity",
    getUserState: "requireOwnedUser",
    searchUsersByDisplayName: "requireCurrentUser",
    markTodayGestureCoachSeen: "requireOwnedUser",
    updateReminderTime: "requireOwnedUser",
    updateScriptPreference: "requireOwnedUser",
    resetReadingProgress: "requireOwnedUser",
    updateDisplayName: "requireOwnedUser",
    updateDiscoverability: "requireOwnedUser",
    deleteAccount: "requireIdentity",
  },
  "convex/bookmarks.ts": {
    ensureDefaultBucket: "requireOwnedUser",
    createBucket: "requireOwnedUser",
    getUserBuckets: "requireOwnedUser",
    getBucketById: "requireOwnedUser",
    renameBucket: "requireOwnedUser",
    deleteBucket: "requireOwnedUser",
    quickBookmark: "requireOwnedUser",
    addToBucket: "requireOwnedUser",
    removeBookmark: "requireOwnedUser",
    getBookmarksInBucket: "requireOwnedUser",
    isVerseBookmarked: "requireOwnedUser",
    getVerseBuckets: "requireOwnedUser",
    moveBookmark: "requireOwnedUser",
  },
  "convex/dailySets.ts": {
    getTodaySet: "requireOwnedUser",
    markVerseRead: "requireOwnedUser",
    logReread: "requireOwnedUser",
    getTodayProgress: "requireOwnedUser",
    getReadingHistory: "requireOwnedUser",
    getReadVerses: "requireOwnedUser",
  },
  "convex/streaks.ts": {
    getStreak: "requireOwnedUser",
    getStreakStats: "requireOwnedUser",
    getStreakSummary: "requireCurrentUser",
    checkAndUpdateStreak: "requireOwnedUser",
    getGlobalLeaderboard: "requireCurrentUser",
    getGlobalLeaderboardTop50: "requireCurrentUser",
    getMyGlobalRank: "requireCurrentUser",
    getCommunityLeaderboard: "requireCurrentUser",
  },
  "convex/dailyReaders.ts": {
    getTodayReaderCount: "requireCurrentUser",
  },
  "convex/communities.ts": {
    createCommunity: "resolveUser",
    getUserCommunities: "resolveUser",
    getActiveCommunity: "resolveUser",
    setActiveCommunity: "resolveUser",
    getPublicCommunities: "requireCurrentUser",
    getCommunityByInviteCode: "requireCurrentUser",
    regenerateInviteCode: "requireOwnedUser",
    joinPublicCommunity: "resolveUser",
    joinByInviteCode: "resolveUser",
    leaveCommunity: "resolveUser",
  },
};

const intentionallyPublicReads = {
  "convex/verses.ts": [
    "getVerseCount",
    "getVersesByChapter",
    "getVerseByPosition",
    "getAllVersesOrdered",
    "getVerseByIndex",
    "getVersesFromIndex",
  ],
};

function exportedFunctionBlock(source, exportName) {
  const start = source.indexOf(`export const ${exportName} =`);
  assert.notEqual(start, -1, `missing public function ${exportName}`);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("every protected public API invokes its authorization gate", async () => {
  for (const [file, functions] of Object.entries(protectedExports)) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const [exportName, expectedGate] of Object.entries(functions)) {
      const block = exportedFunctionBlock(source, exportName);
      assert.match(
        block,
        new RegExp(`\\b${expectedGate}\\b`),
        `${file}:${exportName} must invoke ${expectedGate}`
      );
    }
  }

  const communities = await readFile(
    new URL("../convex/communities.ts", import.meta.url),
    "utf8"
  );
  const resolver = communities.slice(
    communities.indexOf("async function resolveUser"),
    communities.indexOf("async function upsertActiveCommunity")
  );
  assert.match(resolver, /requireOwnedUser/);
  assert.match(resolver, /requireCurrentUser/);
  assert.doesNotMatch(resolver, /ctx\.db\.get\(userId\)/);
});

test("the complete non-debug Convex surface is protected or explicitly public", async () => {
  const files = Object.keys(protectedExports);
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const actualPublicExports = Array.from(
      source.matchAll(/export const (\w+) = (?:query|mutation)\(\{/g),
      (match) => match[1]
    ).sort();
    const reviewedExports = [
      ...Object.keys(protectedExports[file]),
      ...(intentionallyPublicReads[file] ?? []),
    ].sort();
    assert.deepEqual(
      actualPublicExports,
      reviewedExports,
      `${file} has an unreviewed public Convex function`
    );

    for (const exportName of actualPublicExports) {
      assert.match(
        exportedFunctionBlock(source, exportName),
        /\breturns\s*:/,
        `${file}:${exportName} must validate its return value`
      );
    }
  }
});

test("the former optional-identity bypass is absent from protected modules", async () => {
  for (const file of Object.keys(protectedExports)) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /if\s*\(\s*identity\s*&&/,
      `${file} must not allow missing identity to bypass ownership checks`
    );
  }
});

test("legacy alpha sync compatibility is gated and read-only", async () => {
  const source = await readFile(
    new URL("../convex/users.ts", import.meta.url),
    "utf8"
  );
  const helperStart = source.indexOf("async function getLegacyExistingUser");
  const helperEnd = source.indexOf("\nasync function ensureUser", helperStart);
  assert.notEqual(helperStart, -1);
  assert.notEqual(helperEnd, -1);

  const helper = source.slice(helperStart, helperEnd);
  assert.match(helper, /\bisLegacyAlphaAuthEnabled\b/);
  assert.match(helper, /\.query\("users"\)/);
  assert.match(helper, /\.withIndex\("byAuthId"/);
  assert.doesNotMatch(helper, /ctx\.db\.(?:insert|patch|delete)/);
  assert.doesNotMatch(helper, /\bensureUser\b/);

  const syncBlock = exportedFunctionBlock(
    source,
    "getOrCreateUserFromAuth"
  );
  assert.match(syncBlock, /\brequireIdentity\b/);
  assert.match(syncBlock, /\bgetLegacyExistingUser\b/);
});
