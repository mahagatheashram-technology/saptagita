import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const DEFAULT_BUCKET_NAME = "Saved";
const DEFAULT_BUCKET_ICON = "🔖";

async function ensureDefaultBucketForUser(
  ctx: any,
  userId: Id<"users">
): Promise<Id<"bookmarkBuckets">> {
  const existing = await ctx.db
    .query("bookmarkBuckets")
    .withIndex("by_user_name", (q: any) =>
      q.eq("userId", userId).eq("name", DEFAULT_BUCKET_NAME)
    )
    .first();

  if (existing) return existing._id;

  return await ctx.db.insert("bookmarkBuckets", {
    userId,
    name: DEFAULT_BUCKET_NAME,
    isDefault: true,
    createdAt: Date.now(),
    icon: DEFAULT_BUCKET_ICON,
  });
}

export const ensureDefaultBucket = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const id = await ensureDefaultBucketForUser(ctx, args.userId);
    return await ctx.db.get(id);
  },
});

export const createBucket = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Bucket name is required");

    const exists = await ctx.db
      .query("bookmarkBuckets")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", args.userId).eq("name", trimmed)
      )
      .first();
    if (exists) throw new Error("You already have a bucket with this name");

    const id = await ctx.db.insert("bookmarkBuckets", {
      userId: args.userId,
      name: trimmed,
      isDefault: false,
      createdAt: Date.now(),
      icon: args.icon,
    });

    return await ctx.db.get(id);
  },
});

export const getUserBuckets = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [buckets, bookmarks] = await Promise.all([
      ctx.db
        .query("bookmarkBuckets")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("asc")
        .collect(),
      ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    const counts = new Map<string, number>();
    bookmarks.forEach((b: any) => {
      const key = String(b.bucketId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return buckets.map((b: any) => ({
      ...b,
      icon: b.icon ?? (b.isDefault ? DEFAULT_BUCKET_ICON : "📁"),
      bookmarkCount: counts.get(String(b._id)) ?? 0,
    }));
  },
});

export const getBucketById = query({
  args: { bucketId: v.id("bookmarkBuckets"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const bucket = await ctx.db.get(args.bucketId);
    if (!bucket) throw new Error("Bucket not found");
    if (bucket.userId !== args.userId) throw new Error("Not your bucket");
    return {
      ...bucket,
      icon: bucket.icon ?? (bucket.isDefault ? DEFAULT_BUCKET_ICON : "📁"),
    };
  },
});

export const renameBucket = mutation({
  args: {
    bucketId: v.id("bookmarkBuckets"),
    userId: v.id("users"),
    newName: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.newName.trim();
    if (!trimmed) throw new Error("Bucket name is required");

    const bucket = await ctx.db.get(args.bucketId);
    if (!bucket) throw new Error("Bucket not found");
    if (bucket.userId !== args.userId) throw new Error("Not your bucket");
    if (bucket.isDefault) throw new Error("Cannot rename default bucket");

    const duplicate = await ctx.db
      .query("bookmarkBuckets")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", args.userId).eq("name", trimmed)
      )
      .first();
    if (duplicate && duplicate._id !== args.bucketId) {
      throw new Error("You already have a bucket with this name");
    }

    await ctx.db.patch(args.bucketId, { name: trimmed, icon: args.icon });
    return await ctx.db.get(args.bucketId);
  },
});

export const deleteBucket = mutation({
  args: {
    bucketId: v.id("bookmarkBuckets"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const bucket = await ctx.db.get(args.bucketId);
    if (!bucket) throw new Error("Bucket not found");
    if (bucket.userId !== args.userId) throw new Error("Not your bucket");
    if (bucket.isDefault) throw new Error("Cannot delete default bucket");

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket", (q) => q.eq("bucketId", args.bucketId))
      .collect();
    await Promise.all(
      bookmarks.map((b: any) => ctx.db.delete(b._id))
    );

    await ctx.db.delete(args.bucketId);
    return { success: true };
  },
});

export const quickBookmark = mutation({
  args: {
    userId: v.id("users"),
    verseId: v.id("verses"),
  },
  handler: async (ctx, args) => {
    const bucketId = await ensureDefaultBucketForUser(ctx, args.userId);

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket_verse", (q) =>
        q.eq("bucketId", bucketId).eq("verseId", args.verseId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { removed: true, bucketId };
    }

    const id = await ctx.db.insert("bookmarks", {
      userId: args.userId,
      verseId: args.verseId,
      bucketId,
      createdAt: Date.now(),
    });
    return { added: true, bucketId, bookmarkId: id };
  },
});

export const addToBucket = mutation({
  args: {
    userId: v.id("users"),
    verseId: v.id("verses"),
    bucketId: v.id("bookmarkBuckets"),
  },
  handler: async (ctx, args) => {
    const bucket = await ctx.db.get(args.bucketId);
    if (!bucket) throw new Error("Bucket not found");
    if (bucket.userId !== args.userId) throw new Error("Not your bucket");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket_verse", (q) =>
        q.eq("bucketId", args.bucketId).eq("verseId", args.verseId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("bookmarks", {
      userId: args.userId,
      verseId: args.verseId,
      bucketId: args.bucketId,
      createdAt: Date.now(),
    });
  },
});

export const removeBookmark = mutation({
  args: {
    userId: v.id("users"),
    bucketId: v.id("bookmarkBuckets"),
    verseId: v.id("verses"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket_verse", (q) =>
        q.eq("bucketId", args.bucketId).eq("verseId", args.verseId)
      )
      .first();

    if (!existing) return { removed: false };
    if (existing.userId !== args.userId)
      throw new Error("Not your bookmark");

    await ctx.db.delete(existing._id);
    return { removed: true };
  },
});

export const getBookmarksInBucket = query({
  args: { bucketId: v.id("bookmarkBuckets"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const bucket = await ctx.db.get(args.bucketId);
    if (!bucket) throw new Error("Bucket not found");
    if (bucket.userId !== args.userId) throw new Error("Not your bucket");

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket", (q) => q.eq("bucketId", args.bucketId))
      .order("desc")
      .collect();

    const verses = await Promise.all(
      bookmarks.map((b: any) => ctx.db.get(b.verseId))
    );

    return bookmarks.map((b: any, i: number) => ({
      ...b,
      verse: verses[i],
    }));
  },
});

export const isVerseBookmarked = query({
  args: { userId: v.id("users"), verseId: v.id("verses") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_verse", (q) =>
        q.eq("userId", args.userId).eq("verseId", args.verseId)
      )
      .first();
    return Boolean(existing);
  },
});

export const getVerseBuckets = query({
  args: { userId: v.id("users"), verseId: v.id("verses") },
  handler: async (ctx, args) => {
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_verse", (q) =>
        q.eq("userId", args.userId).eq("verseId", args.verseId)
      )
      .collect();
    return bookmarks.map((b: any) => b.bucketId);
  },
});

export const moveBookmark = mutation({
  args: {
    userId: v.id("users"),
    verseId: v.id("verses"),
    sourceBucketId: v.id("bookmarkBuckets"),
    targetBucketId: v.id("bookmarkBuckets"),
  },
  handler: async (ctx, args) => {
    if (args.sourceBucketId === args.targetBucketId) {
      return { moved: false, reason: "same bucket" };
    }

    const [source, target] = await Promise.all([
      ctx.db.get(args.sourceBucketId),
      ctx.db.get(args.targetBucketId),
    ]);

    if (!source || !target) throw new Error("Bucket not found");
    if (source.userId !== args.userId || target.userId !== args.userId) {
      throw new Error("Not your bucket");
    }

    const existingInSource = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket_verse", (q) =>
        q.eq("bucketId", args.sourceBucketId).eq("verseId", args.verseId)
      )
      .first();

    if (!existingInSource) {
      return { moved: false, reason: "not in source" };
    }

    const existingInTarget = await ctx.db
      .query("bookmarks")
      .withIndex("by_bucket_verse", (q) =>
        q.eq("bucketId", args.targetBucketId).eq("verseId", args.verseId)
      )
      .first();

    if (!existingInTarget) {
      await ctx.db.insert("bookmarks", {
        userId: args.userId,
        verseId: args.verseId,
        bucketId: args.targetBucketId,
        createdAt: Date.now(),
      });
    }

    await ctx.db.delete(existingInSource._id);
    return { moved: true };
  },
});
