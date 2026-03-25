import { writeFile } from "fs/promises";
import path from "path";

const CHAPTERS = Array.from({ length: 18 }, (_, index) => index + 1);
const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "gita_telugu_gitasupersite.json",
);
const REQUEST_DELAY_MS = 10_000;
const SOURCE_KEY = "gitasupersite_iitk_srimadch_te";

type TeluguVerse = {
  chapterNumber: number;
  verseNumber: number;
  sanskritTelugu: string;
  sourceKey: string;
  sourceUrl: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(input: string) {
  return input.replace(/<[^>]+>/g, "");
}

function cleanupVerseText(input: string) {
  return decodeHtmlEntities(input)
    .replace(/\r/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\uFEFF/g, "")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/मूल श्लोकः/g, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function extractRows(html: string) {
  const rows = Array.from(
    html.matchAll(
      /<div class="views-row[\s\S]*?<div class="field-content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g,
    ),
  );
  return rows.map((match) => match[1]);
}

function parseVerse(rawRow: string, expectedChapter: number, sourceUrl: string) {
  const cleaned = cleanupVerseText(rawRow);
  const plainText = stripTags(cleaned).trim();
  const refMatch = plainText.match(/(\d+)\.(\d+)\s*৷৷\s*$/u);

  if (!refMatch) {
    throw new Error(
      `Missing chapter.verse suffix in chapter ${expectedChapter} row from ${sourceUrl}`,
    );
  }

  const chapterNumber = Number(refMatch[1]);
  const verseNumber = Number(refMatch[2]);

  if (chapterNumber !== expectedChapter) {
    throw new Error(
      `Parsed chapter ${chapterNumber} but expected ${expectedChapter} from ${sourceUrl}`,
    );
  }

  const sanskritTelugu = plainText
    .replace(/\s*(\d+)\.(\d+)\s*৷৷\s*$/u, "")
    .replace(/\s+\./g, ".")
    .trim();

  if (!sanskritTelugu) {
    throw new Error(
      `Empty Telugu verse text for chapter ${chapterNumber} verse ${verseNumber}`,
    );
  }

  return {
    chapterNumber,
    verseNumber,
    sanskritTelugu,
    sourceKey: SOURCE_KEY,
    sourceUrl,
  } satisfies TeluguVerse;
}

async function fetchChapter(chapterNumber: number) {
  const sourceUrl = `https://www.gitasupersite.iitk.ac.in/srimadch?language=te&field_chapter_value=${chapterNumber}`;
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch chapter ${chapterNumber}: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const rows = extractRows(html);

  if (rows.length === 0) {
    throw new Error(`No verse rows found for chapter ${chapterNumber}`);
  }

  const verses = rows.map((row) => parseVerse(row, chapterNumber, sourceUrl));
  return verses;
}

async function main() {
  const allVerses: TeluguVerse[] = [];

  for (const chapterNumber of CHAPTERS) {
    console.log(`Fetching chapter ${chapterNumber}...`);
    const verses = await fetchChapter(chapterNumber);
    console.log(`Parsed ${verses.length} verses from chapter ${chapterNumber}`);
    allVerses.push(...verses);

    if (chapterNumber !== CHAPTERS[CHAPTERS.length - 1]) {
      console.log(`Waiting ${REQUEST_DELAY_MS / 1000}s before the next chapter...`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  allVerses.sort((a, b) => {
    if (a.chapterNumber !== b.chapterNumber) {
      return a.chapterNumber - b.chapterNumber;
    }
    return a.verseNumber - b.verseNumber;
  });

  await writeFile(OUTPUT_PATH, `${JSON.stringify(allVerses, null, 2)}\n`, "utf8");
  console.log(`Wrote ${allVerses.length} verses to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
