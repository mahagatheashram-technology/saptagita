import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8"));
}

function readEnv(filePath) {
  const absolutePath = path.join(root, filePath);
  if (!fs.existsSync(absolutePath)) return {};

  const raw = fs.readFileSync(absolutePath, "utf8");
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitIndex = trimmed.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function isPlaceholder(value = "") {
  return (
    value.includes("replace_me") ||
    value.includes("your-live-domain.example") ||
    value.includes("your-clerk-domain")
  );
}

function assertCondition(condition, message) {
  if (!condition) errors.push(message);
}

function warnCondition(condition, message) {
  if (!condition) warnings.push(message);
}

const easConfig = readJson("eas.json");
const profiles = easConfig.build ?? {};
const shippingProfiles = ["preview", "production"];

for (const profile of shippingProfiles) {
  const config = profiles[profile];
  assertCondition(Boolean(config), `Missing EAS build profile: ${profile}`);
  if (!config) continue;

  warnCondition(
    Boolean(config.environment),
    `EAS profile "${profile}" should set "environment" to pull managed env vars.`
  );

  const convexUrl = config.env?.EXPO_PUBLIC_CONVEX_URL ?? "";
  assertCondition(
    !convexUrl.includes("joyous-warthog-33"),
    `EAS profile "${profile}" points to dev Convex deployment (${convexUrl}).`
  );

  const inlineClerkKey = config.env?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  assertCondition(
    !inlineClerkKey || !inlineClerkKey.startsWith("pk_test_"),
    `EAS profile "${profile}" hardcodes a Clerk test key. Move live keys to EAS environment variables.`
  );
}

const localEnv = readEnv(".env.local");
const productionEnv = readEnv(".env.production");
const convexLocalEnv = readEnv("convex/.env.local");

assertCondition(
  Boolean(productionEnv.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY),
  ".env.production is missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY."
);
assertCondition(
  !String(productionEnv.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "").startsWith(
    "pk_test_"
  ),
  ".env.production uses a Clerk test publishable key."
);
assertCondition(
  !isPlaceholder(productionEnv.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ""),
  ".env.production still contains a placeholder Clerk publishable key."
);
assertCondition(
  !isPlaceholder(productionEnv.CLERK_JWT_ISSUER_DOMAIN || ""),
  ".env.production still contains a placeholder Clerk issuer domain."
);
assertCondition(
  !String(productionEnv.EXPO_PUBLIC_CONVEX_URL || "").includes(
    "joyous-warthog-33"
  ),
  ".env.production points to dev Convex deployment."
);

warnCondition(
  String(localEnv.EXPO_PUBLIC_CONVEX_URL || "").includes("quick-tiger-684"),
  ".env.local is not pointed at shipping Convex deployment."
);

assertCondition(
  !isPlaceholder(convexLocalEnv.CLERK_JWT_ISSUER_DOMAIN || ""),
  "convex/.env.local still has a placeholder Clerk issuer domain."
);

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (errors.length) {
  console.error("Environment parity check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Environment parity check passed.");
