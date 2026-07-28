import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Google OAuth uses an explicit Expo-compatible callback", async () => {
  const source = await readFile(
    new URL("../components/auth/GoogleSignInButton.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /useSSO/);
  assert.doesNotMatch(source, /\buseOAuth\b/);
  assert.match(source, /AuthSession\.makeRedirectUri/);
  assert.match(source, /scheme:\s*"saptagita"/);
  assert.match(source, /OAUTH_CALLBACK_PATH = "oauth-native-callback"/);
  assert.match(source, /startSSOFlow\(\{[\s\S]*redirectUrl,/);
});
