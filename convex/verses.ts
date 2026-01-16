import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Mutation to insert a single verse
export const insertVerse = mutation({
  args: {
    chapterNumber: v.number(),
    verseNumber: v.number(),
    sanskritDevanagari: v.string(),
    transliteration: v.string(),
    translationEnglish: v.string(),
    sourceKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if verse already exists to prevent duplicates
    const existing = await ctx.db
      .query("verses")
      .filter((q) =>
        q.and(
          q.eq(q.field("chapterNumber"), args.chapterNumber),
          q.eq(q.field("verseNumber"), args.verseNumber),
        ),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("verses", args);
  },
});

// Mutation to insert multiple verses (batch)
export const insertVersesBatch = mutation({
  args: {
    verses: v.array(
      v.object({
        chapterNumber: v.number(),
        verseNumber: v.number(),
        sanskritDevanagari: v.string(),
        transliteration: v.string(),
        translationEnglish: v.string(),
        sourceKey: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const verse of args.verses) {
      const id = await ctx.db.insert("verses", verse);
      ids.push(id);
    }
    return ids;
  },
});

// Query to get total verse count
export const getVerseCount = query({
  handler: async (ctx) => {
    const verses = await ctx.db.query("verses").collect();
    return verses.length;
  },
});

// Query to get verses by chapter
export const getVersesByChapter = query({
  args: { chapter: v.number() },
  handler: async (ctx, args) => {
    const verses = await ctx.db
      .query("verses")
      .filter((q) => q.eq(q.field("chapterNumber"), args.chapter))
      .collect();
    return verses.sort((a, b) => a.verseNumber - b.verseNumber);
  },
});

// Query to get a specific verse by chapter and verse number
export const getVerseByPosition = query({
  args: {
    chapter: v.number(),
    verse: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("verses")
      .filter((q) =>
        q.and(
          q.eq(q.field("chapterNumber"), args.chapter),
          q.eq(q.field("verseNumber"), args.verse),
        ),
      )
      .first();
  },
});

// Query to get all verses ordered by chapter and verse
export const getAllVersesOrdered = query({
  handler: async (ctx) => {
    const verses = await ctx.db.query("verses").collect();
    return verses.sort((a, b) => {
      if (a.chapterNumber !== b.chapterNumber) {
        return a.chapterNumber - b.chapterNumber;
      }
      return a.verseNumber - b.verseNumber;
    });
  },
});

// Query to get verse by index (0-700) - useful for sequential reading
export const getVerseByIndex = query({
  args: { index: v.number() },
  handler: async (ctx, args) => {
    const verses = await ctx.db.query("verses").collect();
    const sorted = verses.sort((a, b) => {
      if (a.chapterNumber !== b.chapterNumber) {
        return a.chapterNumber - b.chapterNumber;
      }
      return a.verseNumber - b.verseNumber;
    });
    return sorted[args.index] || null;
  },
});

// Query to get 7 verses starting from an index - for daily set
export const getVersesFromIndex = query({
  args: { startIndex: v.number(), count: v.number() },
  handler: async (ctx, args) => {
    const verses = await ctx.db.query("verses").collect();
    const sorted = verses.sort((a, b) => {
      if (a.chapterNumber !== b.chapterNumber) {
        return a.chapterNumber - b.chapterNumber;
      }
      return a.verseNumber - b.verseNumber;
    });
    return sorted.slice(args.startIndex, args.startIndex + args.count);
  },
});
