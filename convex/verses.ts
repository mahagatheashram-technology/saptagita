import { internalMutation, query } from "./_generated/server";
import type { DatabaseReader } from "./_generated/server";
import { v } from "convex/values";
import { verseValidator } from "./validators";
import {
  getSequencePositions,
  getVersePosition,
  TOTAL_VERSES,
} from "./verseSequence";

async function getVerseAtCanonicalPosition(
  db: DatabaseReader,
  canonicalIndex: number,
) {
  const position = getVersePosition(canonicalIndex);
  return await db
    .query("verses")
    .withIndex("byChapterVerse", (q) =>
      q
        .eq("chapterNumber", position.chapterNumber)
        .eq("verseNumber", position.verseNumber),
    )
    .unique();
}

async function getSequenceVerses(
  db: DatabaseReader,
  startIndex: number,
  count: number,
) {
  return await Promise.all(
    getSequencePositions(startIndex, count).map((position) =>
      db
        .query("verses")
        .withIndex("byChapterVerse", (q) =>
          q
            .eq("chapterNumber", position.chapterNumber)
            .eq("verseNumber", position.verseNumber),
        )
        .unique(),
    ),
  );
}

// Mutation to insert a single verse
export const insertVerse = internalMutation({
  args: {
    chapterNumber: v.number(),
    verseNumber: v.number(),
    sanskritDevanagari: v.string(),
    sanskritTelugu: v.optional(v.string()),
    transliteration: v.string(),
    translationEnglish: v.string(),
    sourceKey: v.string(),
  },
  returns: v.id("verses"),
  handler: async (ctx, args) => {
    // Check if verse already exists to prevent duplicates
    const existing = await ctx.db
      .query("verses")
      .withIndex("byChapterVerse", (q) =>
        q
          .eq("chapterNumber", args.chapterNumber)
          .eq("verseNumber", args.verseNumber),
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
export const insertVersesBatch = internalMutation({
  args: {
    verses: v.array(
      v.object({
        chapterNumber: v.number(),
        verseNumber: v.number(),
        sanskritDevanagari: v.string(),
        sanskritTelugu: v.optional(v.string()),
        transliteration: v.string(),
        translationEnglish: v.string(),
        sourceKey: v.string(),
      }),
    ),
  },
  returns: v.array(v.id("verses")),
  handler: async (ctx, args) => {
    const ids = [];
    for (const verse of args.verses) {
      const existing = await ctx.db
        .query("verses")
        .withIndex("byChapterVerse", (q) =>
          q
            .eq("chapterNumber", verse.chapterNumber)
            .eq("verseNumber", verse.verseNumber)
        )
        .unique();
      const id = existing?._id ?? (await ctx.db.insert("verses", verse));
      if (existing) {
        await ctx.db.patch(existing._id, verse);
      }
      ids.push(id);
    }
    return ids;
  },
});

// Query to get total verse count
export const getVerseCount = query({
  args: {},
  returns: v.number(),
  handler: async () => TOTAL_VERSES,
});

// Query to get verses by chapter
export const getVersesByChapter = query({
  args: { chapter: v.number() },
  returns: v.array(verseValidator),
  handler: async (ctx, args) => {
    const verses = await ctx.db
      .query("verses")
      .withIndex("byChapterVerse", (q) =>
        q.eq("chapterNumber", args.chapter),
      )
      .order("asc")
      .collect();
    return verses;
  },
});

// Query to get a specific verse by chapter and verse number
export const getVerseByPosition = query({
  args: {
    chapter: v.number(),
    verse: v.number(),
  },
  returns: v.union(verseValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("verses")
      .withIndex("byChapterVerse", (q) =>
        q
          .eq("chapterNumber", args.chapter)
          .eq("verseNumber", args.verse),
      )
      .unique();
  },
});

// Query to get all verses ordered by chapter and verse
export const getAllVersesOrdered = query({
  args: {},
  returns: v.array(verseValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("verses")
      .withIndex("byChapterVerse")
      .order("asc")
      .take(TOTAL_VERSES);
  },
});

// Query to get verse by index (0-700) - useful for sequential reading
export const getVerseByIndex = query({
  args: { index: v.number() },
  returns: v.union(verseValidator, v.null()),
  handler: async (ctx, args) => {
    if (
      !Number.isInteger(args.index) ||
      args.index < 0 ||
      args.index >= TOTAL_VERSES
    ) {
      return null;
    }
    return await getVerseAtCanonicalPosition(ctx.db, args.index);
  },
});

// Query to get 7 verses starting from an index - for daily set
export const getVersesFromIndex = query({
  args: { startIndex: v.number(), count: v.number() },
  returns: v.array(verseValidator),
  handler: async (ctx, args) => {
    return (await getSequenceVerses(ctx.db, args.startIndex, args.count)).filter(
      (verse) => verse !== null,
    );
  },
});
