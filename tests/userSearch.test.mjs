import assert from "node:assert/strict";
import test from "node:test";
import { require as tsxRequire } from "tsx/cjs/api";

const { searchUsersByDisplayName } = tsxRequire(
  "../convex/users.ts",
  import.meta.url
);

function valueOf(expression, document) {
  return typeof expression === "function" ? expression(document) : expression;
}

function searchContext({ users, subject = "clerk-caller", streaks = {} }) {
  const searches = [];

  const db = {
    query(table) {
      if (table === "users") {
        return {
          withIndex(indexName, select) {
            assert.equal(indexName, "byAuthId");
            let authId;
            select({
              eq(field, value) {
                assert.equal(field, "authId");
                authId = value;
              },
            });
            return {
              first: async () =>
                users.find((user) => user.authId === authId) ?? null,
            };
          },
          withSearchIndex(indexName, select) {
            assert.equal(indexName, "search_display_name");
            let searchValue;
            select({
              search(field, value) {
                assert.equal(field, "displayName");
                searchValue = value;
                searches.push({ field, value });
                return {};
              },
            });

            let matches = users.filter((user) =>
              user.displayName
                .toLocaleLowerCase()
                .includes(searchValue.toLocaleLowerCase())
            );

            const orderedQuery = {
              filter(predicate) {
                const expression = predicate({
                  field: (field) => (document) => document[field],
                  neq: (left, right) => (document) =>
                    valueOf(left, document) !== valueOf(right, document),
                  and: (...expressions) => (document) =>
                    expressions.every((item) => item(document)),
                });
                matches = matches.filter(expression);
                return orderedQuery;
              },
              async take(limit) {
                return matches.slice(0, limit);
              },
            };

            return orderedQuery;
          },
        };
      }

      assert.equal(table, "streaks");
      return {
        withIndex(indexName, select) {
          assert.equal(indexName, "byUser");
          let userId;
          select({
            eq(field, value) {
              assert.equal(field, "userId");
              userId = value;
            },
          });
          return {
            first: async () =>
              userId in streaks
                ? { userId, currentStreak: streaks[userId] }
                : null,
          };
        },
      };
    },
  };

  return {
    ctx: {
      auth: {
        getUserIdentity: async () => ({ subject }),
      },
      db,
    },
    searches,
  };
}

function user(id, displayName, options = {}) {
  return {
    _id: id,
    authId: options.authId ?? `clerk-${id}`,
    displayName,
    avatarUrl: options.avatarUrl ?? "",
    ...(options.discoverable === undefined
      ? {}
      : { discoverable: options.discoverable }),
    ...(options.email === undefined ? {} : { email: options.email }),
  };
}

async function runSearch(fixture, query) {
  return await searchUsersByDisplayName._handler(fixture.ctx, { query });
}

test("trimmed display-name queries under three characters return no results", async () => {
  const fixture = searchContext({
    users: [
      user("caller", "Caller", { authId: "clerk-caller" }),
      user("other", "Ab Reader"),
    ],
  });

  assert.deepEqual(await runSearch(fixture, "  ab  "), []);
  assert.deepEqual(fixture.searches, []);
});

test("display-name search results are capped at ten", async () => {
  const fixture = searchContext({
    users: [
      user("caller", "Caller", { authId: "clerk-caller" }),
      ...Array.from({ length: 14 }, (_, index) =>
        user(`reader-${index}`, `Search Reader ${index}`)
      ),
    ],
  });

  const results = await runSearch(fixture, "  Search  ");

  assert.equal(results.length, 10);
  assert.deepEqual(fixture.searches, [
    { field: "displayName", value: "Search" },
  ]);
});

test("an email-looking query cannot match a user by email", async () => {
  const fixture = searchContext({
    users: [
      user("caller", "Caller", { authId: "clerk-caller" }),
      user("other", "Quiet Reader", { email: "victim@example.com" }),
    ],
  });

  assert.deepEqual(await runSearch(fixture, "victim@example.com"), []);
  assert.deepEqual(fixture.searches, []);
});

test("a display name containing an email address is never returned", async () => {
  const fixture = searchContext({
    users: [
      user("caller", "Caller", { authId: "clerk-caller" }),
      user("other", "Listed (listed@example.com)"),
    ],
  });

  assert.deepEqual(await runSearch(fixture, "Listed"), []);
});

test("users who explicitly disable discoverability are excluded", async () => {
  const fixture = searchContext({
    users: [
      user("caller", "Caller", { authId: "clerk-caller" }),
      user("hidden", "Findable Hidden", { discoverable: false }),
      user("existing", "Findable Existing"),
    ],
  });

  const results = await runSearch(fixture, "Findable");

  assert.deepEqual(
    results.map((result) => result.userId),
    ["existing"]
  );
});

test("the caller is excluded from display-name search results", async () => {
  const fixture = searchContext({
    users: [
      user("caller", "Shared Name Caller", { authId: "clerk-caller" }),
      user("other", "Shared Name Reader", { avatarUrl: "avatar.png" }),
    ],
    streaks: { other: 7 },
  });

  assert.deepEqual(await runSearch(fixture, "Shared Name"), [
    {
      userId: "other",
      displayName: "Shared Name Reader",
      avatarUrl: "avatar.png",
      currentStreak: 7,
    },
  ]);
});
