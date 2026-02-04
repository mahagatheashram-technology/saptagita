import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export type ReadSortMode = "recent" | "canonical";

export function useReadHistory(
  userId: Id<"users"> | null,
  sort: ReadSortMode
) {
  return useQuery(
    api.dailySets.getReadVerses,
    userId ? { userId, sort } : "skip"
  );
}
