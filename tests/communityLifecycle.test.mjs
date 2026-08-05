import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import "tsx/cjs";

const require = createRequire(import.meta.url);
const {
  deleteCommunity,
  getCommunityMembers,
  leaveCommunity,
  transferOwnership,
} = require("../convex/communities.ts");

const users = [
  {
    _id: "user-owner",
    _creationTime: 1,
    authId: "clerk-owner",
    displayName: "Owner",
    avatarUrl: "owner.png",
    timezone: "UTC",
    createdAt: 1,
  },
  {
    _id: "user-member",
    _creationTime: 2,
    authId: "clerk-member",
    displayName: "Member",
    avatarUrl: "member.png",
    timezone: "UTC",
    createdAt: 1,
  },
  {
    _id: "user-outsider",
    _creationTime: 3,
    authId: "clerk-outsider",
    displayName: "Outsider",
    avatarUrl: "outsider.png",
    timezone: "UTC",
    createdAt: 1,
  },
];

function community(id = "community-1") {
  return {
    _id: id,
    _creationTime: 1,
    name: "Readers",
    type: "public",
    createdBy: "user-owner",
    createdAt: 1,
  };
}

function membership(id, userId, role, communityId = "community-1") {
  return {
    _id: id,
    _creationTime: 1,
    communityId,
    userId,
    role,
    joinedAt: 1,
  };
}

function activeCommunity(id, userId, communityId = "community-1") {
  return { _id: id, _creationTime: 1, userId, communityId };
}

function createContext({
  subject = "clerk-owner",
  communities = [community()],
  memberships = [],
  activeCommunities = [],
} = {}) {
  const tables = {
    users: users.map((document) => ({ ...document })),
    communities: communities.map((document) => ({ ...document })),
    communityMembers: memberships.map((document) => ({ ...document })),
    activeCommunity: activeCommunities.map((document) => ({ ...document })),
  };

  function findById(id) {
    for (const documents of Object.values(tables)) {
      const document = documents.find((candidate) => candidate._id === id);
      if (document) return document;
    }
    return null;
  }

  const db = {
    get: async (id) => findById(id),
    query: (table) => {
      const constraints = {};
      const query = {
        withIndex: (_indexName, select) => {
          const indexQuery = {
            eq(field, value) {
              constraints[field] = value;
              return indexQuery;
            },
          };
          select(indexQuery);
          return query;
        },
        async first() {
          return matchingRows()[0] ?? null;
        },
        async collect() {
          return matchingRows();
        },
        async take(limit) {
          return matchingRows().slice(0, limit);
        },
      };
      const matchingRows = () =>
        tables[table].filter((document) =>
          Object.entries(constraints).every(
            ([field, value]) => document[field] === value
          )
        );
      return query;
    },
    patch: async (id, value) => {
      const document = findById(id);
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
      getUserIdentity: async () =>
        subject ? { subject, tokenIdentifier: `clerk|${subject}` } : null,
    },
    db,
    tables,
  };
}

function assertConvexCode(expectedCode) {
  return (error) => {
    assert.equal(error?.data?.code, expectedCode);
    return true;
  };
}

test("a non-owner cannot delete a community", async () => {
  const ctx = createContext({
    subject: "clerk-member",
    memberships: [
      membership("membership-owner", "user-owner", "owner"),
      membership("membership-member", "user-member", "admin"),
    ],
  });

  await assert.rejects(
    deleteCommunity._handler(ctx, {
      communityId: "community-1",
      userId: "user-member",
    }),
    assertConvexCode("NOT_COMMUNITY_OWNER")
  );
  assert.equal(ctx.tables.communities.length, 1);
  assert.equal(ctx.tables.communityMembers.length, 2);
});

test("deleting a community removes memberships and active-community rows", async () => {
  const ctx = createContext({
    communities: [community(), community("community-2")],
    memberships: [
      membership("membership-owner", "user-owner", "owner"),
      membership("membership-member", "user-member", "member"),
      membership("membership-other", "user-outsider", "owner", "community-2"),
    ],
    activeCommunities: [
      activeCommunity("active-owner", "user-owner"),
      activeCommunity("active-member", "user-member"),
      activeCommunity("active-other", "user-outsider", "community-2"),
    ],
  });

  const result = await deleteCommunity._handler(ctx, {
    communityId: "community-1",
    userId: "user-owner",
  });

  assert.deepEqual(result, { success: true, removedMemberCount: 2 });
  assert.deepEqual(
    ctx.tables.communities.map(({ _id }) => _id),
    ["community-2"]
  );
  assert.deepEqual(
    ctx.tables.communityMembers.map(({ _id }) => _id),
    ["membership-other"]
  );
  assert.deepEqual(
    ctx.tables.activeCommunity.map(({ _id }) => _id),
    ["active-other"]
  );
});

test("ownership transfer requires the target to be a member", async () => {
  const ctx = createContext({
    memberships: [membership("membership-owner", "user-owner", "owner")],
  });

  await assert.rejects(
    transferOwnership._handler(ctx, {
      communityId: "community-1",
      userId: "user-owner",
      newOwnerUserId: "user-member",
    }),
    assertConvexCode("NOT_A_MEMBER")
  );
});

test("the old owner becomes an admin and can leave after transfer", async () => {
  const ctx = createContext({
    memberships: [
      membership("membership-owner", "user-owner", "owner"),
      membership("membership-member", "user-member", "member"),
    ],
    activeCommunities: [activeCommunity("active-owner", "user-owner")],
  });

  assert.deepEqual(
    await transferOwnership._handler(ctx, {
      communityId: "community-1",
      userId: "user-owner",
      newOwnerUserId: "user-member",
    }),
    { success: true }
  );
  assert.equal(
    ctx.tables.communityMembers.find(({ userId }) => userId === "user-owner")
      ?.role,
    "admin"
  );
  assert.equal(
    ctx.tables.communityMembers.find(({ userId }) => userId === "user-member")
      ?.role,
    "owner"
  );

  assert.deepEqual(
    await leaveCommunity._handler(ctx, {
      communityId: "community-1",
      userId: "user-owner",
    }),
    { success: true }
  );
  assert.equal(
    ctx.tables.communityMembers.some(({ userId }) => userId === "user-owner"),
    false
  );
  assert.equal(ctx.tables.activeCommunity.length, 0);
});

test("community member listing rejects a non-member", async () => {
  const ctx = createContext({
    subject: "clerk-outsider",
    memberships: [membership("membership-owner", "user-owner", "owner")],
  });

  await assert.rejects(
    getCommunityMembers._handler(ctx, {
      communityId: "community-1",
      userId: "user-outsider",
    }),
    assertConvexCode("NOT_A_MEMBER")
  );
});

test("community member listing returns profile fields and caps results at 50", async () => {
  const extraUsers = Array.from({ length: 50 }, (_, index) => ({
    ...users[1],
    _id: `extra-user-${index}`,
    authId: `extra-clerk-${index}`,
    displayName: `Extra ${index}`,
  }));
  const ctx = createContext({
    memberships: [
      membership("membership-owner", "user-owner", "owner"),
      ...extraUsers.map((user, index) =>
        membership(`membership-${index}`, user._id, "member")
      ),
    ],
  });
  ctx.tables.users.push(...extraUsers);

  const result = await getCommunityMembers._handler(ctx, {
    communityId: "community-1",
    userId: "user-owner",
  });

  assert.equal(result.length, 50);
  assert.deepEqual(result[0], {
    userId: "user-owner",
    displayName: "Owner",
    avatarUrl: "owner.png",
    role: "owner",
  });
});
