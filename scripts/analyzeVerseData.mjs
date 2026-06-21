import fs from "node:fs";

const file = process.argv[2] ?? "data/gita_enriched.json";
const verses = JSON.parse(fs.readFileSync(file, "utf8"));

const get = (verse, ...keys) => {
  for (const key of keys) {
    if (verse[key] !== undefined && verse[key] !== null) return verse[key];
  }
  return "";
};

const normalized = verses.map((verse, index) => {
  const chapter = Number(get(verse, "chapterNumber", "chapter"));
  const verseNumber = String(get(verse, "verseNumber", "verse"));
  const sanskrit = String(get(verse, "sanskritDevanagari", "sanskrit"));
  const transliteration = String(get(verse, "transliteration"));
  const translation = String(get(verse, "translationEnglish", "translation"));
  return { index, chapter, verseNumber, sanskrit, transliteration, translation, raw: verse };
});

const combined = normalized.filter((verse) => /[-–,]/.test(verse.verseNumber));
const combinedByText = normalized.filter((verse) => {
  const text = verse.translation.trim();
  const escapedChapter = String(verse.chapter).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedVerse = String(verse.verseNumber).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ownLabel = new RegExp(`^${escapedChapter}\\.${escapedVerse}(?:\\b|\\s|\\.)`);
  const rangeLabel = /^\d+\.\d+\s*[-–]\s*\d+\.\d+\b/.test(text);
  const twoLabels = /^\d+\.\d+\s+\d+\.\d+\b/.test(text);
  const nonOwnLabel = /^\d+\.\d+\b/.test(text) && !ownLabel.test(text);
  const sanskritRange = /\|\|\s*\d+\s*[-–]\s*\d+\s*\|\|/.test(verse.sanskrit);
  return rangeLabel || twoLabels || nonOwnLabel || sanskritRange;
});

const chapterVerseKeys = new Map();
for (const verse of normalized) {
  const key = `${verse.chapter}.${verse.verseNumber}`;
  if (!chapterVerseKeys.has(key)) chapterVerseKeys.set(key, []);
  chapterVerseKeys.get(key).push(verse.index);
}
const duplicateKeys = [...chapterVerseKeys.entries()].filter(([, indexes]) => indexes.length > 1);

const suspiciousPatterns = [
  /\balified\b/i,
  /\bunalified\b/i,
  /\breaization\b/i,
  /\b14the\b/i,
  /\bDhrtarastra\b/,
  /\bHr?shikes[ah]\b/i,
  /\bSanjay said\s+O\s+scion/i,
  /\bson of Pandu \(Arjuna\) who had the insignia of Hanuman/i,
];

const suspicious = normalized
  .map((verse) => {
    const text = verse.translation;
    const hits = suspiciousPatterns.filter((pattern) => pattern.test(text));
    return hits.length ? { verse, hits: hits.map(String) } : null;
  })
  .filter(Boolean);

const chapterCounts = new Map();
for (const verse of normalized) {
  chapterCounts.set(verse.chapter, (chapterCounts.get(verse.chapter) ?? 0) + 1);
}

console.log(`File: ${file}`);
console.log(`Rows: ${normalized.length}`);
console.log(`Chapter counts:`);
for (const [chapter, count] of [...chapterCounts.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${chapter}: ${count}`);
}

console.log(`\nCombined verseNumber rows (${combined.length}):`);
for (const verse of combined) {
  console.log(`  row ${verse.index + 1}: ${verse.chapter}.${verse.verseNumber}`);
}

console.log(`\nRows whose text appears to combine multiple verse labels (${combinedByText.length}):`);
for (const verse of combinedByText) {
  const sample = verse.translation.replace(/\s+/g, " ").slice(0, 140);
  console.log(`  row ${verse.index + 1}: ${verse.chapter}.${verse.verseNumber} :: ${sample}`);
}

console.log(`\nDuplicate chapter.verse keys (${duplicateKeys.length}):`);
for (const [key, indexes] of duplicateKeys) {
  console.log(`  ${key}: rows ${indexes.map((i) => i + 1).join(", ")}`);
}

console.log(`\nSuspicious translation strings (${suspicious.length}):`);
for (const item of suspicious) {
  const { verse } = item;
  const sample = verse.translation.replace(/\s+/g, " ").slice(0, 180);
  console.log(`  row ${verse.index + 1}: ${verse.chapter}.${verse.verseNumber} :: ${sample}`);
}
