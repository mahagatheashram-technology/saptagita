import assert from "node:assert/strict";
import test from "node:test";
import {
  clearUserSyncCache,
  coordinateUserSync,
} from "../lib/userSyncCoordinator.ts";

test.beforeEach(() => {
  clearUserSyncCache();
});

test("coalesces concurrent sync requests with the same fingerprint", async () => {
  let calls = 0;
  let resolveSync;
  const operation = () => {
    calls += 1;
    return new Promise((resolve) => {
      resolveSync = resolve;
    });
  };

  const first = coordinateUserSync("user-1", operation);
  const second = coordinateUserSync("user-1", operation);

  assert.equal(calls, 1);
  resolveSync({ id: "convex-user-1" });
  assert.deepEqual(await first, { id: "convex-user-1" });
  assert.deepEqual(await second, { id: "convex-user-1" });
});

test("briefly reuses a completed sync to avoid tab-mount bursts", async () => {
  let calls = 0;
  const operation = async () => ({ call: ++calls });

  assert.deepEqual(await coordinateUserSync("user-1", operation), { call: 1 });
  assert.deepEqual(await coordinateUserSync("user-1", operation), { call: 1 });
  assert.equal(calls, 1);
});

test("does not cache failures and supports an immediate retry", async () => {
  let calls = 0;
  const operation = async () => {
    calls += 1;
    if (calls === 1) throw new Error("offline");
    return "synced";
  };

  await assert.rejects(coordinateUserSync("user-1", operation), /offline/);
  assert.equal(await coordinateUserSync("user-1", operation), "synced");
  assert.equal(calls, 2);
});

test("explicit retry bypasses a recent successful sync", async () => {
  let calls = 0;
  const operation = async () => ++calls;

  assert.equal(await coordinateUserSync("user-1", operation), 1);
  assert.equal(await coordinateUserSync("user-1", operation, true), 2);
});
