import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  verses: defineTable({
    chapterNumber: v.number(),
    verseNumber: v.number(),
    sanskritDevanagari: v.string(),
    transliteration: v.string(),
    translationEnglish: v.string(),
    sourceKey: v.string(),
  }).index("byChapterVerse", ["chapterNumber", "verseNumber"]),
});
