import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import gitaData from "../data/gita.json";

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

const client = new ConvexHttpClient(CONVEX_URL);

interface VerseInput {
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration: string;
  translation: string;
}

async function seedVerses() {
  console.log("Starting verse seeding...");
  console.log(`Found ${gitaData.length} verses in JSON file`);

  let successCount = 0;
  let errorCount = 0;

  for (const verse of gitaData as VerseInput[]) {
    try {
      await client.mutation(api.verses.insertVerse, {
        chapterNumber: verse.chapter,
        verseNumber: verse.verse,
        sanskritDevanagari: verse.sanskrit,
        transliteration: verse.transliteration,
        translationEnglish: verse.translation,
        sourceKey: "vedicscriptures_github",
      });
      successCount++;

      // Log progress every 50 verses
      if (successCount % 50 === 0) {
        console.log(`Progress: ${successCount}/${gitaData.length} verses inserted`);
      }
    } catch (error) {
      console.error(`Error inserting verse ${verse.chapter}.${verse.verse}:`, error);
      errorCount++;
    }
  }

  console.log("\\n=== Seeding Complete ===");
  console.log(`Successfully inserted: ${successCount} verses`);
  console.log(`Errors: ${errorCount}`);
}

seedVerses();
