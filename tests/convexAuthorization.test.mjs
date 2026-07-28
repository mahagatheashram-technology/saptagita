import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertIdentitySubject,
  requireCurrentUser,
  requireIdentity,
  requireOwnedUser,
} from "../convex/auth.ts";
import { assertMaintenanceToken } from "../convex/maintenanceAuth.ts";

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

test("legacy authId arguments cannot impersonate another Clerk subject", () => {
  assert.throws(
    () => assertIdentitySubject("clerk-user-a", "clerk-user-b"),
    assertConvexCode("FORBIDDEN")
  );
  assert.doesNotThrow(() =>
    assertIdentitySubject("clerk-user-a", "clerk-user-a")
  );
});

test("maintenance operations fail closed when credentials are absent or wrong", () => {
  const previous = process.env.ADMIN_MAINTENANCE_TOKEN;
  try {
    delete process.env.ADMIN_MAINTENANCE_TOKEN;
    assert.throws(
      () => assertMaintenanceToken("anything"),
      assertConvexCode("MAINTENANCE_DISABLED")
    );

    process.env.ADMIN_MAINTENANCE_TOKEN = "expected-token";
    assert.throws(
      () => assertMaintenanceToken("wrong-token"),
      assertConvexCode("FORBIDDEN")
    );
    assert.doesNotThrow(() => assertMaintenanceToken("expected-token"));
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_MAINTENANCE_TOKEN;
    } else {
      process.env.ADMIN_MAINTENANCE_TOKEN = previous;
    }
  }
});

const protectedExports = {
  "convex/users.ts": {
    getOrCreateUser: "requireIdentity",
    getOrCreateUserFromAuth: "requireIdentity",
    getUserByAuthId: "requireIdentity",
    getUserState: "requireOwnedUser",
    markTodayGestureCoachSeen: "requireOwnedUser",
    updateReminderTime: "requireOwnedUser",
    updateScriptPreference: "requireOwnedUser",
    resetReadingProgress: "requireOwnedUser",
    updateDisplayName: "requireOwnedUser",
    deleteAccount: "requireIdentity",
    getOrCreateTestUser: "assertMaintenanceToken",
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
    getCommunityLeaderboard: "requireCurrentUser",
  },
  "convex/communities.ts": {
    createCommunity: "resolveUser",
    getUserCommunities: "resolveUser",
    getActiveCommunity: "resolveUser",
    setActiveCommunity: "resolveUser",
    getPublicCommunities: "requireCurrentUser",
    joinPublicCommunity: "resolveUser",
    joinByInviteCode: "resolveUser",
    leaveCommunity: "resolveUser",
  },
  "convex/verses.ts": {
    insertVerse: "assertMaintenanceToken",
    insertVersesBatch: "assertMaintenanceToken",
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
