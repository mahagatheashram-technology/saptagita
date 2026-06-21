// Repairs the systematic "qu" deletion in the Gita translations (see
// `npm run spellcheck`). Reads the pristine source and writes a corrected COPY,
// leaving the original untouched. Only the explicit, hand-verified word map
// below is applied — whole-word and case-preserving — so nothing else changes.
//
// Usage: node scripts/applyQuFix.mjs
//   in:  data/gita_enriched.json   (untouched)
//   out: data/gita_enriched.cleaned.json

import fs from "node:fs";

const IN = "data/gita_enriched.json";
const OUT = "data/gita_enriched.cleaned.json";

// corrupted -> { fix, expected occurrences } (expected used as a sanity check)
const MAP = [
  ["alities", "qualities", 24],
  ["ality", "quality", 9],
  ["eanimity", "equanimity", 5],
  ["acisition", "acquisition", 4],
  ["alified", "qualified", 4],
  ["eal", "equal", 4],
  ["eally", "equally", 4],
  ["eipoised", "equipoised", 3],
  ["acired", "acquired", 2],
  ["acire", "acquire", 3],
  ["conest", "conquest", 1],
  ["conseence", "consequence", 2],
  ["tranil", "tranquil", 2],
  ["acires", "acquires", 1],
  ["aciring", "acquiring", 1],
  ["alifies", "qualifies", 1],
  ["coneror", "conqueror", 1],
  ["conseences", "consequences", 1],
  ["eipped", "equipped", 1],
  ["estion", "question", 1],
  ["ickly", "quickly", 1],
  ["iniry", "inquiry", 1],
  ["ite", "quite", 1],
  ["relinish", "relinquish", 1],
  ["tranillity", "tranquillity", 1],
  ["unalified", "unqualified", 1],
  ["unconered", "unconquered", 1],
];

// Apply longest corrupted words first as a belt-and-suspenders against overlap
// (word boundaries already prevent partial matches).
MAP.sort((a, b) => b[0].length - a[0].length);

// Preserve the case of the matched token on the replacement.
function matchCase(matched, replacementLower) {
  if (matched === matched.toUpperCase() && /[A-Z]/.test(matched)) {
    return replacementLower.toUpperCase();
  }
  if (matched[0] === matched[0].toUpperCase()) {
    return replacementLower[0].toUpperCase() + replacementLower.slice(1);
  }
  return replacementLower;
}

const verses = JSON.parse(fs.readFileSync(IN, "utf8"));
const counts = new Map();
let changedVerses = 0;

for (const v of verses) {
  const before = String(v.translationEnglish ?? "");
  let after = before;
  for (const [bad, good] of MAP) {
    const re = new RegExp(`\\b${bad}\\b`, "gi");
    after = after.replace(re, (m) => {
      counts.set(bad, (counts.get(bad) ?? 0) + 1);
      return matchCase(m, good);
    });
  }
  if (after !== before) {
    v.translationEnglish = after;
    changedVerses++;
  }
}

fs.writeFileSync(OUT, JSON.stringify(verses, null, 2) + "\n", "utf8");

// Report + sanity check against expected counts.
console.log(`Read  ${IN} (${verses.length} verses)`);
console.log(`Wrote ${OUT} — ${changedVerses} verses changed\n`);
console.log("word            applied  expected");
let total = 0;
let mismatch = false;
for (const [bad, good, expected] of MAP) {
  const got = counts.get(bad) ?? 0;
  total += got;
  const flag = got === expected ? "" : "  <-- MISMATCH";
  if (got !== expected) mismatch = true;
  console.log(
    `${(bad + " -> " + good).padEnd(28)} ${String(got).padStart(3)}  ${String(expected).padStart(8)}${flag}`
  );
}
console.log(`\nTotal replacements: ${total}`);
if (mismatch) {
  console.log("\n⚠️  Some counts differ from the scan — review before seeding.");
}
