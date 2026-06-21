// Spelling scanner for the Gita dataset's English translations.
//
// Strategy: a real typo is almost always a near-miss of an English word
// (edit distance 1), while a Sanskrit name/term (Dhrtarastra, Sanjaya, yoga)
// is not close to any English word. So we flag unknown words that HAVE a
// close English match as likely typos, and bucket the rest as probable
// names/terms. We also catch doubled words and excess whitespace.
//
// Report-only: this never edits the dataset.
//
// Usage: node scripts/spellcheck.mjs [path-to-json] [--out report.md]

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const outFlagIndex = args.indexOf("--out");
const outPath =
  outFlagIndex !== -1 ? args[outFlagIndex + 1] : "spellcheck-report.md";
const fileArg = args.find((a, i) => !a.startsWith("--") && i !== outFlagIndex + 1);
const dataFile = fileArg || "data/gita_enriched.json";

const DICT_PATH = "/usr/share/dict/words";

// Sanskrit / Gita terms and common proper nouns that are correct but absent
// from an English dictionary. Keeps the "likely typo" list focused. Lowercase.
const ALLOWLIST = new Set([
  "krishna", "arjuna", "sanjaya", "dhrtarastra", "dhritarashtra", "pandu",
  "pandavas", "kauravas", "kurukshetra", "kuru", "bharata", "bhagavad",
  "gita", "yoga", "yogi", "yogis", "yogin", "karma", "dharma", "adharma",
  "brahman", "brahma", "brahmana", "brahmanas", "atman", "moksha", "guna",
  "gunas", "sattva", "rajas", "tamas", "prakriti", "purusha", "vedas",
  "veda", "vedic", "om", "aum", "bhakti", "jnana", "samkhya", "sankhya",
  "vishnu", "shiva", "indra", "vayu", "agni", "soma", "prana", "asura",
  "asuras", "deva", "devas", "rishi", "rishis", "mantra", "samadhi",
  "ahamkara", "buddhi", "manas", "ksatriya", "kshatriya", "vaisya",
  "sudra", "varna", "ashrama", "tapas", "yajna", "sacrifices", "bhima",
  "yudhishthira", "nakula", "sahadeva", "drona", "bhishma", "karna",
  "duryodhana", "drupada", "virata", "kasi", "panchajanya", "devadatta",
  "gandiva", "himalayas", "ganges", "naga", "garuda", "kapila", "rama",
  "vasudeva", "kesava", "kesava", "madhava", "govinda", "hrishikesha",
  "sama", "samaveda", "saman",
  "partha", "kaunteya", "bharata", "kurus", "panchalas", "somadatta",
  "unmanifest", "imperishable", "unborn", "self", "supreme",
  // British spellings that survive normalization, plus a few archaic forms.
  "fulfil", "fulfilment", "fulness", "foetus", "behoves", "enrol", "instil",
  "judgement", "ageing", "storey", "grey",
]);

function readDictionary() {
  if (!fs.existsSync(DICT_PATH)) {
    console.error(`Dictionary not found at ${DICT_PATH}; cannot run scan.`);
    process.exit(1);
  }
  const set = new Set();
  const raw = fs.readFileSync(DICT_PATH, "utf8").split("\n");
  for (const line of raw) {
    const w = line.trim().toLowerCase();
    if (w) set.add(w);
  }
  return set;
}

const dict = readDictionary();
const inDict = (w) => dict.has(w) || ALLOWLIST.has(w);

// The system dictionary lists only base forms, so inflected words (plurals,
// past tense, gerunds, adverbs) are missing. Treat a word as known if it OR
// any plausible de-inflected stem is in the dictionary.
function isKnown(w) {
  if (inDict(w)) return true;
  const stems = [];
  const add = (s) => {
    if (s && s.length >= 2) stems.push(s);
  };
  if (w.endsWith("ies")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ied")) add(w.slice(0, -3) + "y"); // multiplied -> multiply
  if (w.endsWith("ier")) add(w.slice(0, -3) + "y");
  if (w.endsWith("iest")) add(w.slice(0, -4) + "y");
  if (w.endsWith("ily")) add(w.slice(0, -3) + "y");
  if (w.endsWith("es")) add(w.slice(0, -2));
  if (w.endsWith("s")) add(w.slice(0, -1));
  // British -> American normalization so valid UK spellings aren't flagged.
  if (w.endsWith("our")) add(w.slice(0, -3) + "or"); // colour -> color
  if (w.endsWith("re")) add(w.slice(0, -2) + "er"); // metre -> meter
  if (w.endsWith("ise")) add(w.slice(0, -3) + "ize"); // realise -> realize
  if (w.endsWith("ised")) add(w.slice(0, -4) + "ized");
  if (w.endsWith("ising")) add(w.slice(0, -5) + "izing");
  if (w.endsWith("isation")) add(w.slice(0, -7) + "ization");
  if (w.endsWith("ence")) add(w.slice(0, -4) + "ense"); // defence -> defense
  if (w.endsWith("yse")) add(w.slice(0, -3) + "yze"); // analyse -> analyze
  if (w.endsWith("ed")) {
    add(w.slice(0, -2)); // walked -> walk
    add(w.slice(0, -1)); // adored -> adore
  }
  if (w.endsWith("d")) add(w.slice(0, -1)); // freed -> free
  if (w.endsWith("ing")) {
    add(w.slice(0, -3)); // making -> mak
    add(w.slice(0, -3) + "e"); // making -> make
  }
  if (w.endsWith("ly")) add(w.slice(0, -2));
  if (w.endsWith("er")) {
    add(w.slice(0, -2));
    add(w.slice(0, -1));
  }
  if (w.endsWith("est")) {
    add(w.slice(0, -3));
    add(w.slice(0, -2));
  }
  if (w.endsWith("ness")) add(w.slice(0, -4));
  if (w.endsWith("less")) add(w.slice(0, -4));
  if (w.endsWith("ment")) add(w.slice(0, -4));
  if (w.endsWith("ful")) add(w.slice(0, -3));
  for (const base of stems) {
    if (inDict(base)) return true;
    // doubled final consonant before a suffix: running -> runn -> run
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      if (inDict(base.slice(0, -1))) return true;
    }
  }
  return false;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

// Generate all strings one edit away from `word`.
function edits1(word) {
  const out = new Set();
  for (let i = 0; i <= word.length; i++) {
    // deletions
    if (i < word.length) out.add(word.slice(0, i) + word.slice(i + 1));
    // transpositions
    if (i < word.length - 1)
      out.add(
        word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2)
      );
    for (const c of ALPHABET) {
      // replacements
      if (i < word.length) out.add(word.slice(0, i) + c + word.slice(i + 1));
      // insertions
      out.add(word.slice(0, i) + c + word.slice(i));
    }
  }
  return out;
}

function suggestionsFor(word) {
  const hits = [];
  for (const candidate of edits1(word)) {
    if (dict.has(candidate)) hits.push(candidate);
  }
  // Prefer same first letter and similar length for readability.
  return Array.from(new Set(hits))
    .sort((a, b) => {
      const aScore = (a[0] === word[0] ? 0 : 1);
      const bScore = (b[0] === word[0] ? 0 : 1);
      if (aScore !== bScore) return aScore - bScore;
      return Math.abs(a.length - word.length) - Math.abs(b.length - word.length);
    })
    .slice(0, 5);
}

const verses = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const list = Array.isArray(verses) ? verses : Object.values(verses);

// Strip the leading verse label like "1.1." / "1.1-1.3" / "1. 1."
function stripLabel(text) {
  return text.replace(/^\s*\d+\s*\.\s*\d+(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*\.?\s*/, "");
}

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

// word(lowercased) -> { count, locations:Set("c.v"), samples:[...] }
const unknown = new Map();
const doubledWords = []; // { ref, word, context }
const whitespaceIssues = []; // { ref, context }

function ref(v) {
  const c = v.chapterNumber ?? v.chapter;
  const n = v.verseNumber ?? v.verse;
  return `${c}.${n}`;
}

for (const v of list) {
  const rawText = String(v.translationEnglish ?? v.translation ?? "");
  const text = stripLabel(rawText);
  const r = ref(v);

  // doubled consecutive words (the the / are are). Require ONLY whitespace
  // between the repeats — punctuation between them (e.g. "Yoga. Yoga is",
  // "Vivasvan, Vivasvan taught") is legitimate and must not be flagged.
  const tokens = text.match(WORD_RE) || [];
  const dupRe = /\b([A-Za-z]+)\s+\1\b/gi;
  let m;
  while ((m = dupRe.exec(text)) !== null) {
    const word = m[1].toLowerCase();
    if (word.length > 1 && !/^(had|that)$/.test(word)) {
      doubledWords.push({ ref: r, word, context: squashSample(text) });
    }
  }

  // excessive whitespace (3+ spaces or space before punctuation are common
  // extraction artifacts; we only flag 2+ spaces as a soft note)
  if (/\S {2,}\S/.test(text)) {
    whitespaceIssues.push({ ref: r, context: squashSample(text) });
  }

  for (const token of tokens) {
    // normalize: lowercase, strip a trailing possessive 's or '
    let w = token.toLowerCase();
    w = w.replace(/'s$/, "").replace(/'$/, "");
    if (!w || w.length < 2) continue;
    if (/^[ivxlcdm]+$/.test(w)) continue; // roman numerals
    if (isKnown(w)) continue;

    let entry = unknown.get(w);
    if (!entry) {
      entry = { count: 0, locations: new Set(), sample: squashSample(text) };
      unknown.set(w, entry);
    }
    entry.count++;
    entry.locations.add(r);
  }
}

function squashSample(text) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 120 ? t.slice(0, 117) + "..." : t;
}

function contextAround(text) {
  return squashSample(text);
}

// Detect the systematic "qu" deletion (qualities -> alities, equanimity ->
// eanimity). For an unknown word, try re-inserting "qu" at each gap and see if
// it yields a real word.
function quRestoration(word) {
  const candidates = [];
  for (let i = 0; i <= word.length; i++) {
    const candidate = word.slice(0, i) + "qu" + word.slice(i);
    if (isKnown(candidate)) candidates.push(candidate);
  }
  if (candidates.length === 0) return null;
  // The system dict holds obscure forms (queal, quot); prefer a restoration
  // that doesn't start with "qu" (equal over queal), then the shortest.
  candidates.sort((a, b) => {
    const aq = a.startsWith("qu") ? 1 : 0;
    const bq = b.startsWith("qu") ? 1 : 0;
    if (aq !== bq) return aq - bq;
    return a.length - b.length || a.localeCompare(b);
  });
  return candidates[0];
}

// Classify unknown words.
const likelyTypos = [];
const probableNames = [];
const quCorruptions = [];
for (const [word, entry] of unknown) {
  const quFix = word.length >= 3 ? quRestoration(word) : null;
  if (quFix) {
    quCorruptions.push({ word, ...entry, restored: quFix });
    continue;
  }
  const sugg = word.length >= 3 ? suggestionsFor(word) : [];
  // Heuristic: a near-miss of an English word that occurs rarely is very
  // likely a typo. Frequent unknowns with suggestions are usually still names
  // that happen to be one edit from a word, so we lean on rarity.
  if (sugg.length > 0 && entry.count <= 3) {
    likelyTypos.push({ word, ...entry, suggestions: sugg });
  } else {
    probableNames.push({ word, ...entry, suggestions: sugg });
  }
}

likelyTypos.sort((a, b) => a.count - b.count || a.word.localeCompare(b.word));
probableNames.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
quCorruptions.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
const quAffectedVerses = new Set();
for (const q of quCorruptions) for (const loc of q.locations) quAffectedVerses.add(loc);

// ---- Report ----
const lines = [];
lines.push(`# Spelling scan — ${path.basename(dataFile)}`);
lines.push("");
lines.push(`Scanned **${list.length}** verses (\`translationEnglish\`).`);
lines.push("");
lines.push(
  `- ⚠️ Systematic "qu" corruption: **${quCorruptions.length}** distinct words across **${quAffectedVerses.size}** verses`
);
lines.push(
  `- Likely typos (rare word, ≤1 edit from an English word): **${likelyTypos.length}**`
);
lines.push(`- Doubled consecutive words: **${doubledWords.length}**`);
lines.push(`- Verses with double spaces: **${whitespaceIssues.length}**`);
lines.push(
  `- Unmatched words assumed to be names/Sanskrit terms: **${probableNames.length}** (review-only)`
);
lines.push("");

lines.push('## ⚠️ Systematic "qu" corruption');
lines.push("");
lines.push(
  'The digraph "qu" appears to have been stripped dataset-wide. Each row shows the corrupted word and its restored form.'
);
lines.push("");
if (quCorruptions.length === 0) {
  lines.push("_None found._");
} else {
  lines.push("| Corrupted | Restored | Count | Verses |");
  lines.push("|---|---|---|---|");
  for (const q of quCorruptions) {
    const locs = Array.from(q.locations).slice(0, 8).join(", ");
    lines.push(`| \`${q.word}\` | **${q.restored}** | ${q.count} | ${locs} |`);
  }
}
lines.push("");

lines.push("## Likely typos (review these)");
lines.push("");
if (likelyTypos.length === 0) {
  lines.push("_None found._");
} else {
  lines.push("| Word | Count | Suggestions | Verses | Example |");
  lines.push("|---|---|---|---|---|");
  for (const t of likelyTypos) {
    const locs = Array.from(t.locations).slice(0, 6).join(", ");
    lines.push(
      `| \`${t.word}\` | ${t.count} | ${t.suggestions.join(", ")} | ${locs} | ${t.sample} |`
    );
  }
}
lines.push("");

lines.push("## Doubled consecutive words");
lines.push("");
if (doubledWords.length === 0) {
  lines.push("_None found._");
} else {
  lines.push("| Verse | Word | Context |");
  lines.push("|---|---|---|");
  for (const d of doubledWords) {
    lines.push(`| ${d.ref} | \`${d.word} ${d.word}\` | ${d.context} |`);
  }
}
lines.push("");

lines.push("## Double-space artifacts (formatting, not spelling)");
lines.push("");
if (whitespaceIssues.length === 0) {
  lines.push("_None found._");
} else {
  for (const w of whitespaceIssues.slice(0, 40)) {
    lines.push(`- **${w.ref}** — ${w.context}`);
  }
  if (whitespaceIssues.length > 40) {
    lines.push(`- _…and ${whitespaceIssues.length - 40} more._`);
  }
}
lines.push("");

lines.push("## Probable names / Sanskrit terms (no close English word)");
lines.push("");
lines.push("_Review-only — these are expected to be correct transliterations._");
lines.push("");
lines.push("| Word | Count | Verses (first) |");
lines.push("|---|---|---|");
for (const n of probableNames) {
  const locs = Array.from(n.locations).slice(0, 4).join(", ");
  lines.push(`| ${n.word} | ${n.count} | ${locs} |`);
}
lines.push("");

const report = lines.join("\n");
fs.writeFileSync(outPath, report, "utf8");

// Console summary
console.log(report.split("## Probable names")[0]);
console.log(`Full report (incl. ${probableNames.length} names) written to ${outPath}`);
