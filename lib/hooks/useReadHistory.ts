import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useReadHistory(userId: Id<"users"> | null) {
  return useQuery(
    api.dailySets.getReadVerses,
    userId ? { userId } : "skip"
  );
}
