import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const exportDirectory = mkdtempSync(join(tmpdir(), "sapta-android-release-"));

const gates = [
  ["Automated tests", npmCommand, ["test"]],
  ["Clerk release invariants", npmCommand, ["run", "check:auth-release"]],
  ["Convex public surface", npmCommand, ["run", "test:release-surface"]],
  ["Production dependency audit", npmCommand, ["run", "audit:production"]],
  ["TypeScript", npxCommand, ["tsc", "--noEmit"]],
  [
    "Convex code generation",
    npxCommand,
    ["convex", "codegen", "--typecheck", "enable"],
  ],
  ["Expo dependency alignment", npxCommand, ["expo", "install", "--check"]],
  ["Expo Doctor", npxCommand, ["expo-doctor"]],
  ["Production environment parity", npmCommand, ["run", "check:env-parity"]],
  [
    "Android Hermes export",
    npxCommand,
    [
      "expo",
      "export",
      "--platform",
      "android",
      "--output-dir",
      exportDirectory,
      "--clear",
    ],
  ],
  ["Google Play policy prerequisites", npmCommand, ["run", "check:play-policy"]],
];

const failures = [];
try {
  for (const [name, command, args] of gates) {
    console.log(`\n=== ${name} ===`);
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    if (result.error || result.status !== 0) {
      failures.push(name);
      console.error(`Gate failed: ${name}`);
    }
  }
} finally {
  rmSync(exportDirectory, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nProduction QA failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("\nProduction QA passed.");
