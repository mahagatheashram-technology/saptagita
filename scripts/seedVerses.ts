import { config } from "dotenv";
import { readFile } from "fs/promises";
import path from "path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Load environment variables (supports .env.local and .env)
config({ path: ".env.local" });
config();

// Load environment variables
const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL ||
  process.env.CONVEX_URL ||
  process.env.expo_public_convex_url ||
  process.env.convex_url;

if (!CONVEX_URL) {
  console.error(
    "Missing CONVEX_URL environment variable. Set EXPO_PUBLIC_CONVEX_URL or CONVEX_URL in .env.local or your shell.",
  );
  process.exit(1);
}

const DATA_PATH =
  process.env.GITA_JSON_PATH || path.join(process.cwd(), "data/gita.json");

const client = new ConvexHttpClient(CONVEX_URL);

type VerseInput =
  | {
      chapter: number;
      verse: number;
      sanskrit: string;
      transliteration: string;
      translation: string;
      sourceKey?: string;
    }
  | {
      chapterNumber: number;
      verseNumber: number;
      sanskritDevanagari: string;
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

  let successCount = 0;
  let errorCount = 0;

  for (const verse of verses) {
    try {
      await client.mutation(api.verses.insertVerse, verse);
      successCount++;

      // Log progress every 50 verses
      if (successCount % 50 === 0) {
        console.log(`Progress: ${successCount}/${verses.length} verses inserted`);
      }
    } catch (error) {
      console.error(
        `Error inserting verse ${verse.chapterNumber}.${verse.verseNumber}:`,
        error,
      );
      errorCount++;
    }
  }

  console.log("\n=== Seeding Complete ===");
  console.log(`Successfully inserted: ${successCount} verses`);
  console.log(`Errors: ${errorCount}`);
}

seedVerses();
