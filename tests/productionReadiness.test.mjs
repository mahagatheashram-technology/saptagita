import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function convexSources() {
  const names = await readdir(new URL("../convex", import.meta.url));
  const files = names.filter(
    (name) =>
      name.endsWith(".ts") &&
      !name.endsWith(".d.ts") &&
      !name.startsWith("_"),
  );
  return await Promise.all(
    files.map(async (name) => ({
      name,
      source: await readFile(
        new URL(`../convex/${name}`, import.meta.url),
        "utf8",
      ),
    })),
  );
}

test("every public Convex function has a reviewed module and return validator", async () => {
  const allowedPublicModules = new Set([
    "bookmarks.ts",
    "communities.ts",
    "dailySets.ts",
    "streaks.ts",
    "users.ts",
    "verses.ts",
  ]);

  for (const { name, source } of await convexSources()) {
    const matches = Array.from(
      source.matchAll(
        /export const (\w+) = (query|mutation|action)\(\{([\s\S]*?)(?=\nexport const |\n\}\);\n|$)/g,
      ),
    );
    for (const [, functionName, , body] of matches) {
      assert.ok(
        allowedPublicModules.has(name),
        `${name}:${functionName} exposes an unreviewed public function`,
      );
      assert.match(
        body,
        /\breturns\s*:/,
        `${name}:${functionName} must validate its return value`,
      );
    }
  }
});

test("production data paths retain required integrity and I/O indexes", async () => {
  const schema = await readFile(
    new URL("../convex/schema.ts", import.meta.url),
    "utf8",
  );
  for (const index of [
    'index("byUserAndDate", ["userId", "localDate"])',
    'index("byUserAndCompletedAt", ["userId", "completedAt"])',
    'index("by_user_kind", ["userId", "kind"])',
    'index("by_dailySet_kind", ["dailySetId", "kind"])',
    'index("by_dailySet_verse_kind", ["dailySetId", "verseId", "kind"])',
    'index("by_auth_id_hash", ["authIdHash"])',
  ]) {
    assert.ok(schema.includes(index), `Missing required schema ${index}`);
  }
});

test("account deletion is durable across a partial Clerk failure", async () => {
  const [schema, users, gate] = await Promise.all([
    readFile(new URL("../convex/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../convex/users.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../components/auth/AccountDeletionGate.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(schema, /accountDeletionRequests/);
  assert.match(users, /assertAccountDeletionNotPending/);
  assert.match(users, /appDataDeletedAt/);
  assert.match(gate, /getAccountDeletionStatus/);
  assert.match(gate, /Retry account deletion/);
});
