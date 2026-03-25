import { readFile, writeFile } from "fs/promises";
import path from "path";

const BASE_DATASET_PATH = path.join(
  process.cwd(),
  "data",
  "gita_vedicscriptures.json",
);
const TELUGU_DATASET_PATH = path.join(
  process.cwd(),
  "data",
  "gita_telugu_gitasupersite.json",
);
const OUTPUT_PATH = path.join(process.cwd(), "data", "gita_enriched.json");
const EXPECTED_VERSE_COUNT = 701;

type BaseVerse = {
  chapterNumber: number;
  verseNumber: number;
  sanskritDevanagari: string;
  transliteration: string;
  translationEnglish: string;
  sourceKey: string;
};

type TeluguVerse = {
  chapterNumber: number;
  verseNumber: number;
  sanskritTelugu: string;
};

type EnrichedVerse = BaseVerse & {
  sanskritTelugu: string;
};

function verseKey(chapterNumber: number, verseNumber: number) {
  return `${chapterNumber}.${verseNumber}`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
}

function buildUniqueMap<T extends { chapterNumber: number; verseNumber: number }>(
  rows: T[],
  label: string,
) {
  if (rows.length !== EXPECTED_VERSE_COUNT) {
    throw new Error(
      `${label} expected ${EXPECTED_VERSE_COUNT} verses, found ${rows.length}`,
    );
  }

  const result = new Map<string, T>();
  for (const row of rows) {
    const key = verseKey(row.chapterNumber, row.verseNumber);
    if (result.has(key)) {
      throw new Error(`${label} has duplicate verse key ${key}`);
    }
    result.set(key, row);
  }

  if (result.size !== EXPECTED_VERSE_COUNT) {
    throw new Error(
      `${label} expected ${EXPECTED_VERSE_COUNT} unique verses, found ${result.size}`,
    );
  }

  return result;
}

async function main() {
  const baseRows = await readJsonFile<BaseVerse[]>(BASE_DATASET_PATH);
  const teluguRows = await readJsonFile<TeluguVerse[]>(TELUGU_DATASET_PATH);

  const baseMap = buildUniqueMap(baseRows, "Base dataset");
  const teluguMap = buildUniqueMap(teluguRows, "Telugu dataset");

  const enrichedRows: EnrichedVerse[] = [];

  for (const baseRow of baseRows) {
    const key = verseKey(baseRow.chapterNumber, baseRow.verseNumber);
    const teluguRow = teluguMap.get(key);

    if (!teluguRow?.sanskritTelugu?.trim()) {
      throw new Error(`Missing Telugu verse text for ${key}`);
    }

    enrichedRows.push({
      ...baseRow,
      sanskritTelugu: teluguRow.sanskritTelugu,
    });
  }

  for (const key of teluguMap.keys()) {
    if (!baseMap.has(key)) {
      throw new Error(`Telugu dataset contains verse missing from base dataset: ${key}`);
    }
  }

  enrichedRows.sort((a, b) => {
    if (a.chapterNumber !== b.chapterNumber) {
      return a.chapterNumber - b.chapterNumber;
    }
    return a.verseNumber - b.verseNumber;
  });

  await writeFile(OUTPUT_PATH, `${JSON.stringify(enrichedRows, null, 2)}\n`, "utf8");
  console.log(`Merged ${enrichedRows.length} verses into ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
