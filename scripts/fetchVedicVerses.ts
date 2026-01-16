import { writeFile } from "fs/promises";
import path from "path";

const CHAPTERS_URL = "https://vedicscriptures.github.io/chapters";
const SLOK_BASE_URL = "https://vedicscriptures.github.io/slok";
const OUTPUT_PATH =
  process.env.OUTPUT_PATH ||
  path.join(process.cwd(), "data/gita_vedicscriptures.json");

type ChapterMeta = {
  chapter_number: number;
  verses_count: number;
};

type SlokResponse = {
  chapter: number;
  verse: number;
  slok: string;
  transliteration: string;
  gambir?: { et?: string };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function fetchChapters(): Promise<ChapterMeta[]> {
  const chapters = await fetchJson<ChapterMeta[]>(CHAPTERS_URL);
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error("Chapters response was empty or invalid");
  }
  return chapters;
}

async function fetchSlok(chapter: number, verse: number): Promise<SlokResponse> {
  return fetchJson<SlokResponse>(`${SLOK_BASE_URL}/${chapter}/${verse}`);
}

async function main() {
  console.log("Fetching chapter metadata...");
  const chapters = await fetchChapters();
  const expectedTotal = chapters.reduce(
    (sum, c) => sum + (c.verses_count ?? 0),
    0,
  );

  console.log(`Found ${chapters.length} chapters; expecting ${expectedTotal} verses`);

  const verses = [];
  for (const chapter of chapters) {
    for (let v = 1; v <= chapter.verses_count; v++) {
      try {
        const slok = await fetchSlok(chapter.chapter_number, v);
        verses.push({
          chapterNumber: slok.chapter,
          verseNumber: slok.verse,
          sanskritDevanagari: slok.slok,
          transliteration: slok.transliteration,
          translationEnglish: slok.gambir?.et ?? "",
          sourceKey: "vedicscriptures_github_api",
        });

        if (verses.length % 50 === 0) {
          console.log(`Fetched ${verses.length}/${expectedTotal} verses...`);
        }
      } catch (err) {
        console.error(
          `Failed to fetch verse ${chapter.chapter_number}.${v}:`,
          err,
        );
        throw err;
      }
    }
  }

  if (verses.length !== expectedTotal) {
    console.warn(
      `Warning: expected ${expectedTotal} verses but collected ${verses.length}`,
    );
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(verses, null, 2), "utf8");
  console.log(`Saved ${verses.length} verses to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Failed to fetch verses:", err);
  process.exit(1);
});
