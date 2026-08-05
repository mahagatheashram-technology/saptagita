import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const appConfig = JSON.parse(readFileSync(new URL("../app.json", import.meta.url)));
const easConfig = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url)));
const packageConfig = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url)),
);

const expectedExpoPackages = {
  expo: "~54.0.36",
  "expo-auth-session": "~7.0.11",
  "expo-font": "~14.0.12",
  "expo-linking": "~8.0.12",
  "expo-notifications": "~0.32.17",
  "expo-router": "~6.0.24",
  "expo-web-browser": "~15.0.11",
};

function getPublicExpoConfig() {
  const expoCli = fileURLToPath(
    new URL(
      `../node_modules/.bin/expo${process.platform === "win32" ? ".cmd" : ""}`,
      import.meta.url,
    ),
  );
  const output = execFileSync(expoCli, ["config", "--type", "public", "--json"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
  });
  return JSON.parse(output);
}

test("Android release identity and permissions remain production-safe", () => {
  const publicConfig = getPublicExpoConfig();

  assert.equal(publicConfig.sdkVersion, "54.0.0");
  assert.equal(publicConfig.version, "1.0.4");
  assert.equal(publicConfig.android.package, "com.mahagathe.saptagita");
  assert.equal(appConfig.expo.owner, "ynsameer");
  assert.equal(
    appConfig.expo.extra?.eas?.projectId,
    "7c87e9f5-5520-45f8-a689-f6fd5b75e14a",
  );
  assert.ok(
    Number.isInteger(publicConfig.android.versionCode) &&
      publicConfig.android.versionCode >= 6,
    "Android versionCode must be newer than the versionCode 5 artifact in closed testing",
  );
  assert.deepEqual(publicConfig.android.permissions, [
    "android.permission.MODIFY_AUDIO_SETTINGS",
  ]);
  assert.ok(
    !publicConfig.android.permissions.includes("android.permission.RECORD_AUDIO"),
    "Playback-only builds must not request microphone access",
  );

  assert.deepEqual(
    appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-av",
    ),
    ["expo-av", { microphonePermission: false }],
  );
  assert.ok(appConfig.expo.plugins.includes("expo-secure-store"));
  assert.ok(
    appConfig.expo.plugins.some(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-notifications",
    ),
  );
});

test("EAS production profile remains a store build against production services", () => {
  const production = easConfig.build.production;

  assert.equal(easConfig.cli.appVersionSource, "local");
  assert.equal(production.environment, "production");
  assert.ok(
    production.distribution === undefined || production.distribution === "store",
    "Production builds must not use internal distribution",
  );
  assert.equal(production.credentialsSource ?? "remote", "remote");
  assert.notEqual(production.developmentClient, true);
  assert.notEqual(production.android?.buildType, "apk");
  assert.ok(easConfig.submit?.production, "EAS production submit profile is required");
  assert.match(
    production.env.EXPO_PUBLIC_CONVEX_URL,
    /^https:\/\/[a-z0-9-]+\.convex\.cloud$/,
  );
});

test("Expo dependencies remain aligned with the supported SDK 54 patch set", () => {
  assert.equal(appConfig.expo.newArchEnabled, true);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedExpoPackages).map((name) => [
        name,
        packageConfig.dependencies[name],
      ]),
    ),
    expectedExpoPackages,
  );
});

test("Expo Go does not initialize the unsupported Android push module", () => {
  const source = readFileSync(
    new URL("../lib/notifications.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /Constants\.executionEnvironment\s*===\s*ExecutionEnvironment\.StoreClient/,
  );
  assert.match(source, /if \(isWeb \|\| isExpoGo \|\|/);
});
