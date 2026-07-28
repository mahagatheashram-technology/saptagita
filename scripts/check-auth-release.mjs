import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [layout, appConfig, schema, users, profile, gate] = await Promise.all([
  readFile(new URL("../app/_layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app.json", import.meta.url), "utf8"),
  readFile(new URL("../convex/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../convex/users.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/(tabs)/profile.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../components/auth/AccountDeletionGate.tsx", import.meta.url),
    "utf8"
  ),
]);

const config = JSON.parse(appConfig);

assert(
  config.expo.plugins.some((plugin) => plugin === "expo-secure-store"),
  "expo-secure-store must remain in the Expo plugin list"
);
assert.match(
  layout,
  /@clerk\/clerk-expo\/token-cache/,
  "Clerk's SecureStore-backed token cache must be imported"
);
assert.match(
  layout,
  /tokenCache=\{tokenCache\}/,
  "ClerkProvider must receive the secure token cache"
);
assert.doesNotMatch(
  layout,
  /convex\.setAuth/,
  "ConvexProviderWithClerk owns token refresh; do not add a second setAuth loop"
);
assert.doesNotMatch(
  layout,
  /\/v1\/client\?_is_native/,
  "do not add an extra Clerk client probe to every app startup"
);
assert.match(
  layout,
  /useConvexAuth/,
  "Convex-backed effects must wait for Convex authentication"
);
assert.match(
  schema,
  /accountDeletionRequests/,
  "a durable deletion marker is required for resumable deletion"
);
assert.match(
  users,
  /ACCOUNT_DELETION_PENDING_ERROR/,
  "user sync must reject recreation while deletion is pending"
);
assert.match(
  profile,
  /deleteClerkIdentity:\s*\(\)\s*=>\s*clerkUser\.delete\(\)/,
  "the in-app deletion path must delete the Clerk identity"
);
assert.match(
  gate,
  /getAccountDeletionStatus/,
  "a restart-safe account deletion recovery gate is required"
);

console.log("Auth release invariants passed.");
