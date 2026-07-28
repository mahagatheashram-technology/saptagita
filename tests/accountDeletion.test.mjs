import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_DELETION_CHECKPOINT,
  runAccountDeletion,
} from "../lib/accountDeletion.ts";

function operations(events, overrides = {}) {
  return {
    canDeleteClerkIdentity: true,
    deleteAppData: async () => events.push("app_data"),
    deleteClerkIdentity: async () => events.push("clerk_identity"),
    signOut: async () => events.push("sign_out"),
    ...overrides,
  };
}

test("does not delete app data when Clerk self-deletion is disabled", async () => {
  const events = [];
  const result = await runAccountDeletion(
    operations(events, { canDeleteClerkIdentity: false })
  );

  assert.equal(result.ok, false);
  assert.equal(result.phase, "configuration");
  assert.deepEqual(events, []);
  assert.deepEqual(result.checkpoint, EMPTY_DELETION_CHECKPOINT);
});

test("requires a fresh sign-in before deleting any data when factor age is stale", async () => {
  const events = [];
  const result = await runAccountDeletion(
    operations(events, { requiresRecentSignIn: true })
  );

  assert.equal(result.ok, false);
  assert.equal(result.phase, "reauthentication");
  assert.equal(result.requiresSignInAgain, true);
  assert.deepEqual(events, []);
  assert.deepEqual(result.checkpoint, EMPTY_DELETION_CHECKPOINT);
});

test("deletes app data, then Clerk identity, then signs out", async () => {
  const events = [];
  const result = await runAccountDeletion(operations(events));

  assert.equal(result.ok, true);
  assert.deepEqual(events, ["app_data", "clerk_identity", "sign_out"]);
  assert.deepEqual(result.checkpoint, {
    appDataDeleted: true,
    clerkIdentityDeleted: true,
    signedOut: true,
  });
});

test("does not touch Clerk when app-data deletion fails", async () => {
  const events = [];
  const result = await runAccountDeletion(
    operations(events, {
      deleteAppData: async () => {
        events.push("app_data");
        throw new Error("offline");
      },
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.phase, "app_data");
  assert.deepEqual(events, ["app_data"]);
  assert.equal(result.checkpoint.appDataDeleted, false);
});

test("retries Clerk deletion without recreating or re-deleting app data", async () => {
  const firstEvents = [];
  const first = await runAccountDeletion(
    operations(firstEvents, {
      deleteClerkIdentity: async () => {
        firstEvents.push("clerk_identity");
        throw new Error("temporary Clerk failure");
      },
    })
  );

  assert.equal(first.ok, false);
  assert.equal(first.phase, "clerk_identity");
  assert.deepEqual(firstEvents, ["app_data", "clerk_identity"]);

  const retryEvents = [];
  const retry = await runAccountDeletion(
    operations(retryEvents),
    first.checkpoint
  );

  assert.equal(retry.ok, true);
  assert.deepEqual(retryEvents, ["clerk_identity", "sign_out"]);
});

test("surfaces Clerk's recent-verification requirement as a sign-in recovery", async () => {
  const result = await runAccountDeletion(
    operations([], {
      deleteClerkIdentity: async () => {
        throw {
          errors: [{ code: "session_reverification_required" }],
        };
      },
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.phase, "clerk_identity");
  assert.equal(result.requiresSignInAgain, true);
  assert.match(result.message, /Sign out, sign in again/);
  assert.equal(result.checkpoint.appDataDeleted, true);
});

test("a sign-out retry does not repeat either destructive deletion", async () => {
  const firstEvents = [];
  const first = await runAccountDeletion(
    operations(firstEvents, {
      signOut: async () => {
        firstEvents.push("sign_out");
        throw new Error("local cleanup failed");
      },
    })
  );

  assert.equal(first.ok, false);
  assert.equal(first.phase, "sign_out");

  const retryEvents = [];
  const retry = await runAccountDeletion(
    operations(retryEvents),
    first.checkpoint
  );

  assert.equal(retry.ok, true);
  assert.deepEqual(retryEvents, ["sign_out"]);
});
