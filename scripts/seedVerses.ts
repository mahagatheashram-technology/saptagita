import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { readFile } from "fs/promises";
import path from "path";

// Load environment variables (supports .env.local and .env)
config({ path: ".env.local" });
config();

const isProduction = process.argv.includes("--prod");
if (isProduction && !process.argv.includes("--confirm-production-seed")) {
  console.error(
    "Production seeding requires both --prod and --confirm-production-seed.",
  );
  process.exit(1);
}

// Seeds from the qu-corrected copy (see scripts/applyQuFix.mjs). The pristine
// data/gita_enriched.json is kept untouched as the backup/source of record.
// Override with GITA_JSON_PATH to seed from a different file.
const DATA_PATH =
  process.env.GITA_JSON_PATH ||
  path.join(process.cwd(), "data/gita_enriched.cleaned.json");

const SEED_BATCH_SIZE = 25;

type VerseInput =
  | {
      chapter: number;
      verse: number;
      sanskrit: string;
      sanskritTelugu?: string;
      transliteration: string;
      translation: string;
      sourceKey?: string;
    }
  | {
      chapterNumber: number;
      verseNumber: number;
      sanskritDevanagari: string;
      sanskritTelugu?: string;
      transliteration: string;
      translationEnglish: string;
      sourceKey?: string;
    };

function normalizeVerse(input: VerseInput) {
  const chapterNumber =
    "chapterNumber" in input ? input.chapterNumber : input.chapter;
  const verseNumber = "verseNumber" in input ? input.verseNumber : input.verse;

  return {
    chapterNumber,
    verseNumber,
    sanskritDevanagari:
      "sanskritDevanagari" in input ? input.sanskritDevanagari : input.sanskrit,
    sanskritTelugu: input.sanskritTelugu,
    transliteration: input.transliteration,
    translationEnglish:
      "translationEnglish" in input
        ? input.translationEnglish
        : input.translation,
    sourceKey: input.sourceKey ?? "vedicscriptures_github",
  };
}

async function loadVersesFromFile(filePath: string) {
  const fileContents = await readFile(filePath, "utf8");
  const parsed = JSON.parse(fileContents) as VerseInput[];
  return parsed.map(normalizeVerse);
}

async function seedVerses() {
  const verses = await loadVersesFromFile(DATA_PATH);

  console.log("Starting verse seeding...");
  console.log(`Dataset: ${DATA_PATH}`);
  console.log(`Found ${verses.length} verses in JSON file`);

  for (let offset = 0; offset < verses.length; offset += SEED_BATCH_SIZE) {
    const batch = verses.slice(offset, offset + SEED_BATCH_SIZE);
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const commandArgs = [
      "convex",
      "run",
      "verses:insertVersesBatch",
      JSON.stringify({ verses: batch }),
      ...(isProduction ? ["--prod"] : []),
    ];
    const result = spawnSync(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    if (result.error || result.status !== 0) {
      throw new Error(
        `Verse seed batch ${offset + 1}-${offset + batch.length} failed.`,
        { cause: result.error },
      );
    }
    console.log(
      `Progress: ${Math.min(offset + batch.length, verses.length)}/${verses.length} verses upserted`,
    );
  }

  console.log("\n=== Seeding Complete ===");
  console.log(`Successfully upserted: ${verses.length} verses`);
}

seedVerses().catch((error) => {
  console.error(error);
  process.exit(1);
});
