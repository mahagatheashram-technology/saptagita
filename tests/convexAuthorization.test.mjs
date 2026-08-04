import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertIdentitySubject,
  LEGACY_ALPHA_AUTH_ENV,
  requireCurrentUser,
  requireIdentity,
  requireOwnedUser,
} from "../convex/auth.ts";

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

const protectedExports = {
  "convex/users.ts": {
    getOrCreateUser: "requireIdentity",
    getOrCreateUserFromAuth: "requireIdentity",
    getAccountDeletionStatus: "requireIdentity",
    getUserByAuthId: "requireIdentity",
    getUserState: "requireOwnedUser",
    markTodayGestureCoachSeen: "requireOwnedUser",
    updateReminderTime: "requireOwnedUser",
    updateScriptPreference: "requireOwnedUser",
    resetReadingProgress: "requireOwnedUser",
    updateDisplayName: "requireOwnedUser",
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
