import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import "tsx/cjs";

const require = createRequire(import.meta.url);
const {
  createCommunity,
  getCommunityByInviteCode,
  joinByInviteCode,
  regenerateInviteCode,
} = require("../convex/communities.ts");

const currentUser = {
  _id: "user-1",
  authId: "clerk-user-1",
  displayName: "Reader",
  avatarUrl: "",
  timezone: "UTC",
  createdAt: 1,
};

function createContext({ communities = [], memberships = [] } = {}) {
  let nextId = 1;
  const tables = {
    users: [{ ...currentUser }],
    communities: communities.map((document) => ({ ...document })),
    communityMembers: memberships.map((document) => ({ ...document })),
    activeCommunity: [],
  };

  function matchingRows(table, constraints) {
    return tables[table].filter((document) =>
      Object.entries(constraints).every(
        ([field, value]) => document[field] === value
      )
    );
  }

  const db = {
    get: async (id) => {
      for (const documents of Object.values(tables)) {
        const document = documents.find((candidate) => candidate._id === id);
        if (document) return document;
      }
      return null;
    },
    query: (table) => ({
      withIndex: (_indexName, select) => {
        const constraints = {};
        const indexQuery = {
          eq: (field, value) => {
            constraints[field] = value;
            return indexQuery;
          },
        };
        select(indexQuery);
        return {
          first: async () => matchingRows(table, constraints)[0] ?? null,
          collect: async () => matchingRows(table, constraints),
        };
      },
      collect: async () => [...tables[table]],
    }),
    insert: async (table, value) => {
      const id = `${table}-${nextId++}`;
      tables[table].push({
        ...value,
        _id: id,
        _creationTime: nextId,
      });
      return id;
    },
    patch: async (id, value) => {
      const document = await db.get(id);
      assert.ok(document, `cannot patch missing document ${id}`);
      Object.assign(document, value);
    },
    delete: async (id) => {
      for (const documents of Object.values(tables)) {
        const index = documents.findIndex((document) => document._id === id);
        if (index !== -1) {
          documents.splice(index, 1);
          return;
        }
      }
    },
  };

  return {
    auth: {
      getUserIdentity: async () => ({ subject: currentUser.authId }),
    },
    db,
    tables,
  };
}

function community(id, inviteCode) {
  return {
    _id: id,
    _creationTime: 1,
    name: `Community ${id}`,
    type: "private",
    inviteCode,
    createdBy: currentUser._id,
    createdAt: 1,
  };
}

function membership(id, communityId, role = "member") {
  return {
    _id: id,
    _creationTime: 1,
    communityId,
    userId: currentUser._id,
    role,
    joinedAt: 1,
  };
}

function assertConvexCode(expectedCode) {
  return (error) => {
    assert.equal(error?.data?.code, expectedCode);
    return true;
  };
}

test("private community creation retries an invite-code collision", async () => {
  const ctx = createContext({ communities: [community("community-1", "AAAAAA")] });
  const originalRandom = Math.random;
  let randomCalls = 0;
  Math.random = () => (randomCalls++ < 6 ? 0 : 0.04);

  try {
    const result = await createCommunity._handler(ctx, {
      name: "New Community",
      type: "private",
    });

    assert.equal(result.inviteCode, "BBBBBB");
    assert.equal(
      ctx.tables.communities.find(
        (candidate) => candidate._id === result.communityId
      )?.inviteCode,
      "BBBBBB"
    );
  } finally {
    Math.random = originalRandom;
  }
});

test("invite-code generation fails after the bounded collision retries", async () => {
  const ctx = createContext({ communities: [community("community-1", "AAAAAA")] });
  const originalRandom = Math.random;
  let randomCalls = 0;
  Math.random = () => {
    randomCalls += 1;
    return 0;
  };

  try {
    await assert.rejects(
      createCommunity._handler(ctx, {
        name: "New Community",
        type: "private",
      }),
      assertConvexCode("INVITE_CODE_GENERATION_FAILED")
    );
    assert.equal(randomCalls, 60);
  } finally {
    Math.random = originalRandom;
  }
});

test("invite-code preview returns null for an unknown normalized code", async () => {
  const ctx = createContext();
  assert.equal(
    await getCommunityByInviteCode._handler(ctx, {
      inviteCode: "  not known  ",
    }),
    null
  );
});

test("invite-code preview normalizes case and whitespace without exposing members", async () => {
  const ctx = createContext({
    communities: [community("community-1", "ABC234")],
    memberships: [
      membership("membership-1", "community-1"),
      {
        ...membership("membership-2", "community-1"),
        userId: "user-2",
      },
    ],
  });

  const preview = await getCommunityByInviteCode._handler(ctx, {
    inviteCode: "  ab c 234  ",
  });

  assert.deepEqual(preview, {
    name: "Community community-1",
    memberCount: 2,
    isAlreadyMember: true,
  });
  assert.deepEqual(Object.keys(preview).sort(), [
    "isAlreadyMember",
    "memberCount",
    "name",
  ]);
});

test("a non-admin member cannot regenerate an invite code", async () => {
  const ctx = createContext({
    communities: [community("community-1", "ABC234")],
    memberships: [membership("membership-1", "community-1")],
  });

  await assert.rejects(
    regenerateInviteCode._handler(ctx, {
      communityId: "community-1",
      userId: currentUser._id,
    }),
    assertConvexCode("FORBIDDEN")
  );
  assert.equal(ctx.tables.communities[0].inviteCode, "ABC234");
});

test("regeneration retries collisions and invalidates the old code", async () => {
  const ctx = createContext({
    communities: [
      community("community-1", "AAAAAA"),
      community("community-2", "BBBBBB"),
    ],
    memberships: [membership("membership-1", "community-1", "admin")],
  });
  const randomValues = [
    ...Array(6).fill(0),
    ...Array(6).fill(0.04),
    ...Array(6).fill(0.07),
  ];
  const originalRandom = Math.random;
  Math.random = () => randomValues.shift() ?? 0.07;

  try {
    const result = await regenerateInviteCode._handler(ctx, {
      communityId: "community-1",
      userId: currentUser._id,
    });

    assert.equal(result.inviteCode, "CCCCCC");
    assert.equal(ctx.tables.communities[0].inviteCode, "CCCCCC");
    assert.equal(
      await getCommunityByInviteCode._handler(ctx, { inviteCode: "AAAAAA" }),
      null
    );
  } finally {
    Math.random = originalRandom;
  }
});

test("join errors distinguish invalid codes from existing membership", async () => {
  const ctx = createContext({
    communities: [community("community-1", "ABC234")],
    memberships: [membership("membership-1", "community-1")],
  });

  await assert.rejects(
    joinByInviteCode._handler(ctx, { inviteCode: "invalid" }),
    assertConvexCode("INVALID_INVITE_CODE")
  );
  await assert.rejects(
    joinByInviteCode._handler(ctx, { inviteCode: "  ab c 234  " }),
    assertConvexCode("ALREADY_A_MEMBER")
  );
});
