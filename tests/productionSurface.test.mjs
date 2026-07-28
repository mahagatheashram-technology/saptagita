import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function readWorkspaceFile(relativePath) {
  return readFile(join(workspaceRoot, relativePath), "utf8");
}

async function listSourceFiles(relativeDirectory) {
  const directory = join(workspaceRoot, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(relativePath)));
    } else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

function assertInternalOnlyModule(source, relativePath) {
  assert.doesNotMatch(
    source,
    /import\s*{[^}]*\b(?:query|mutation|action)\b[^}]*}\s*from\s*["']\.\/_generated\/server["']/s,
    `${relativePath} must not import public Convex function builders`
  );
  assert.doesNotMatch(
    source,
    /=\s*(?:query|mutation|action)\s*\(\s*{/,
    `${relativePath} must not export public Convex functions`
  );
}

test("debug and maintenance modules expose internal Convex functions only", async () => {
  const debugSource = await readWorkspaceFile("convex/debug.ts");
  const adminSource = await readWorkspaceFile("convex/admin.ts");
  const integritySource = await readWorkspaceFile(
    "convex/integrityMigration.ts"
  );

  assertInternalOnlyModule(debugSource, "convex/debug.ts");
  assertInternalOnlyModule(adminSource, "convex/admin.ts");
  assertInternalOnlyModule(
    integritySource,
    "convex/integrityMigration.ts"
  );

  for (const functionName of [
    "getDebugState",
    "simulateNextDay",
    "simulateMissedDay",
    "forceCompleteToday",
    "resetUserProgress",
  ]) {
    assert.match(
      debugSource,
      new RegExp(
        `export\\s+const\\s+${functionName}\\s*=\\s*internal(?:Query|Mutation)\\s*\\(`
      ),
      `${functionName} must remain internal-only`
    );
  }

  for (const functionName of ["listUsersWithProgress", "purgeAllUserData"]) {
    assert.match(
      adminSource,
      new RegExp(
        `export\\s+const\\s+${functionName}\\s*=\\s*internal(?:Query|Mutation)\\s*\\(`
      ),
      `${functionName} must remain internal-only`
    );
  }

  for (const functionName of ["auditIntegrity", "repairIntegrityBatch"]) {
    assert.match(
      integritySource,
      new RegExp(
        `export\\s+const\\s+${functionName}\\s*=\\s*internal(?:Query|Mutation)\\s*\\(`
      ),
      `${functionName} must remain internal-only`
    );
  }
});

test("seeding and test-user helpers remain internal-only", async () => {
  const versesSource = await readWorkspaceFile("convex/verses.ts");
  const usersSource = await readWorkspaceFile("convex/users.ts");
  const seedScript = await readWorkspaceFile("scripts/seedVerses.ts");

  for (const functionName of ["insertVerse", "insertVersesBatch"]) {
    assert.match(
      versesSource,
      new RegExp(
        `export\\s+const\\s+${functionName}\\s*=\\s*internalMutation\\s*\\(`
      )
    );
  }
  assert.match(
    usersSource,
    /export\s+const\s+getOrCreateTestUser\s*=\s*internalMutation\s*\(/
  );
  assert.doesNotMatch(
    `${versesSource}\n${usersSource}\n${seedScript}`,
    /maintenanceToken|ADMIN_MAINTENANCE_TOKEN/
  );
  assert.match(seedScript, /--confirm-production-seed/);
});

test("shipping client source cannot call debug or maintenance APIs", async () => {
  const sourceDirectories = ["app", "components", "lib"];
  const clientFiles = (
    await Promise.all(sourceDirectories.map(listSourceFiles))
  ).flat();

  for (const relativePath of clientFiles) {
    const source = await readWorkspaceFile(relativePath);
    assert.doesNotMatch(
      source,
      /\bapi\.(?:debug|admin)\b/,
      `${relativePath} references a non-shipping Convex API`
    );
  }
});

test("the production profile does not render developer controls", async () => {
  const profileSource = await readWorkspaceFile("app/(tabs)/profile.tsx");

  assert.doesNotMatch(profileSource, /\bDevPanel\b/);
  assert.doesNotMatch(profileSource, /Developer Tools|Dev Mode Active/);
});
