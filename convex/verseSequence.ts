// This is the canonical order of data/gita_enriched.cleaned.json. Keeping the
// 701-position map in code lets existing verse rows use byChapterVerse without
// a production backfill or an offset-based table scan.
export const CHAPTER_VERSE_COUNTS = [
  47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78,
] as const;

export const TOTAL_VERSES = CHAPTER_VERSE_COUNTS.reduce(
  (total, chapterCount) => total + chapterCount,
  0,
);

export type VersePosition = {
  canonicalIndex: number;
  chapterNumber: number;
  verseNumber: number;
};

export function normalizeCanonicalIndex(index: number): number {
  if (!Number.isInteger(index)) {
    throw new Error("Canonical verse index must be an integer");
  }

  return ((index % TOTAL_VERSES) + TOTAL_VERSES) % TOTAL_VERSES;
}

export function getVersePosition(index: number): VersePosition {
  const canonicalIndex = normalizeCanonicalIndex(index);
  let chapterStartIndex = 0;

  for (
    let chapterIndex = 0;
    chapterIndex < CHAPTER_VERSE_COUNTS.length;
    chapterIndex += 1
  ) {
    const chapterCount = CHAPTER_VERSE_COUNTS[chapterIndex];
    const nextChapterStartIndex = chapterStartIndex + chapterCount;
    if (canonicalIndex < nextChapterStartIndex) {
      return {
        canonicalIndex,
        chapterNumber: chapterIndex + 1,
        verseNumber: canonicalIndex - chapterStartIndex + 1,
      };
    }
    chapterStartIndex = nextChapterStartIndex;
  }

  throw new Error(`Unable to resolve canonical verse index ${canonicalIndex}`);
}

export function getCanonicalIndex(
  chapterNumber: number,
  verseNumber: number,
): number | null {
  if (
    !Number.isInteger(chapterNumber) ||
    !Number.isInteger(verseNumber) ||
    chapterNumber < 1 ||
    chapterNumber > CHAPTER_VERSE_COUNTS.length
  ) {
    return null;
  }

  const chapterCount = CHAPTER_VERSE_COUNTS[chapterNumber - 1];
  if (verseNumber < 1 || verseNumber > chapterCount) {
    return null;
  }

  let canonicalIndex = verseNumber - 1;
  for (let index = 0; index < chapterNumber - 1; index += 1) {
    canonicalIndex += CHAPTER_VERSE_COUNTS[index];
  }
  return canonicalIndex;
}

export function getSequencePositions(
  startIndex: number,
  count: number,
): VersePosition[] {
  if (!Number.isInteger(count) || count < 0 || count > TOTAL_VERSES) {
    throw new Error(`Verse count must be an integer from 0 to ${TOTAL_VERSES}`);
  }

  return Array.from({ length: count }, (_, offset) =>
    getVersePosition(startIndex + offset),
  );
}
