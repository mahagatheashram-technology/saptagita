import { spawnSync } from "node:child_process";

const toolingOnlyAdvisories = new Map();

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["audit", "--omit=dev", "--json"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  },
);

if (result.error) {
  console.error(`Unable to run npm audit: ${result.error.message}`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("npm audit did not return valid JSON.");
  if (result.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(2);
}

if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? report.error.code}`);
  process.exit(2);
}

const counts = report.metadata?.vulnerabilities ?? {};
console.log(
  [
    "npm audit --omit=dev:",
    `critical=${counts.critical ?? 0}`,
    `high=${counts.high ?? 0}`,
    `moderate=${counts.moderate ?? 0}`,
    `low=${counts.low ?? 0}`,
  ].join(" "),
);

const severeAdvisories = new Map();
for (const [packageName, vulnerability] of Object.entries(
  report.vulnerabilities ?? {},
)) {
  for (const via of vulnerability.via ?? []) {
    if (
      typeof via === "object" &&
      (via.severity === "critical" || via.severity === "high")
    ) {
      const existing = severeAdvisories.get(via.source);
      severeAdvisories.set(via.source, {
        ...via,
        packages: new Set([...(existing?.packages ?? []), packageName]),
      });
    }
  }
}

const unexpected = [];
for (const [source, advisory] of severeAdvisories) {
  const toolingException = toolingOnlyAdvisories.get(source);
  if (toolingException) {
    console.log(
      `TOOLING-ONLY ${toolingException.advisory} (${toolingException.package}, ${advisory.severity}): ${toolingException.rationale}`,
    );
  } else {
    unexpected.push(advisory);
    console.error(
      `PRODUCTION ${advisory.url ?? `advisory ${source}`} (${advisory.severity}) affects ${[...advisory.packages].join(", ")}`,
    );
  }
}

if (unexpected.length > 0) {
  console.error(
    `Production dependency audit failed with ${unexpected.length} unapproved critical/high advisories.`,
  );
  process.exit(1);
}

console.log(
  `Production dependency audit passed: no runtime-reachable critical/high advisories; ${severeAdvisories.size} reviewed tooling-only advisory remains.`,
);
