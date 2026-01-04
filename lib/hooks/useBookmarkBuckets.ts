import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useBookmarkBuckets(userId: Id<"users"> | null) {
  const buckets = useQuery(
    api.bookmarks.getUserBuckets,
    userId ? { userId } : "skip"
  );

  const getOrCreateDefaultBucket = useMutation(
    api.bookmarks.ensureDefaultBucket
  );

  return {
    buckets,
    getOrCreateDefaultBucket,
  };
}
