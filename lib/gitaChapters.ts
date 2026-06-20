// Static chapter metadata for the Bhagavad Gita (18 chapters, 701 verses).
// Verse counts match the seeded dataset (data/gita_enriched.json); all chapters
// are numbered contiguously 1..verseCount. Used by the Explore picker so we can
// bound the verse selector and pick random verses without extra queries.

export interface GitaChapter {
  chapter: number;
  title: string;
  verseCount: number;
}

export const GITA_CHAPTERS: GitaChapter[] = [
  { chapter: 1, title: "Arjuna's Dilemma", verseCount: 47 },
  { chapter: 2, title: "The Yoga of Knowledge", verseCount: 72 },
  { chapter: 3, title: "The Yoga of Action", verseCount: 43 },
  { chapter: 4, title: "The Yoga of Wisdom", verseCount: 42 },
  { chapter: 5, title: "The Yoga of Renunciation", verseCount: 29 },
  { chapter: 6, title: "The Yoga of Meditation", verseCount: 47 },
  { chapter: 7, title: "Knowledge and Realization", verseCount: 30 },
  { chapter: 8, title: "The Imperishable Brahman", verseCount: 28 },
  { chapter: 9, title: "The Royal Knowledge", verseCount: 34 },
  { chapter: 10, title: "Divine Glories", verseCount: 42 },
  { chapter: 11, title: "The Cosmic Form", verseCount: 55 },
  { chapter: 12, title: "The Yoga of Devotion", verseCount: 20 },
  { chapter: 13, title: "The Field and its Knower", verseCount: 35 },
  { chapter: 14, title: "The Three Gunas", verseCount: 27 },
  { chapter: 15, title: "The Supreme Person", verseCount: 20 },
  { chapter: 16, title: "Divine and Demoniac", verseCount: 24 },
  { chapter: 17, title: "The Threefold Faith", verseCount: 28 },
  { chapter: 18, title: "The Yoga of Liberation", verseCount: 78 },
];

export const TOTAL_GITA_VERSES = GITA_CHAPTERS.reduce(
  (sum, c) => sum + c.verseCount,
  0
);

export function getChapterMeta(chapter: number): GitaChapter | undefined {
  return GITA_CHAPTERS.find((c) => c.chapter === chapter);
}

export function getVerseCount(chapter: number): number {
  return getChapterMeta(chapter)?.verseCount ?? 0;
}

// Pick a uniformly random verse across all 701 verses (verse-weighted, so
// longer chapters are proportionally more likely — every verse equally likely).
export function getRandomVersePosition(): { chapter: number; verse: number } {
  let target = Math.floor(Math.random() * TOTAL_GITA_VERSES);
  for (const c of GITA_CHAPTERS) {
    if (target < c.verseCount) {
      return { chapter: c.chapter, verse: target + 1 };
    }
    target -= c.verseCount;
  }
  // Fallback (should never hit): first verse.
  return { chapter: 1, verse: 1 };
}
