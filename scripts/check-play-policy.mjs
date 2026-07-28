import { config } from "dotenv";

config({ path: ".env.production" });

const rawUrl = process.env.PLAY_ACCOUNT_DELETION_URL;
if (!rawUrl) {
  console.error(
    "PLAY_ACCOUNT_DELETION_URL is missing. Google Play requires a public web account-deletion resource in addition to the in-app flow.",
  );
  process.exit(1);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error("PLAY_ACCOUNT_DELETION_URL must be a valid URL.");
  process.exit(1);
}

if (url.protocol !== "https:") {
  console.error("PLAY_ACCOUNT_DELETION_URL must use HTTPS.");
  process.exit(1);
}

try {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Sapta-Gita-release-QA/1.0" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  console.log(`Play account-deletion URL is reachable: ${response.url}`);
} catch (error) {
  console.error(
    `PLAY_ACCOUNT_DELETION_URL is not publicly reachable: ${String(error)}`,
  );
  process.exit(1);
}
