import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback, useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export function useTodayReading(userId: Id<"users"> | null) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  const getTodaySet = useMutation(api.dailySets.getTodaySet);
  const markVerseRead = useMutation(api.dailySets.markVerseRead);
  
  // Fetch streak data
  const streak = useQuery(
    api.streaks.getStreak,
    userId ? { userId } : "skip"
  );
  
  const [todayData, setTodayData] = useState<{
    dailySet: any;
    verses: any[];
    readVerseIds: Id<"verses">[];
    isComplete: boolean;
  } | null>(null);

  // Initialize today's set
  useEffect(() => {
    if (!userId) {
      setIsInitialized(false);
      setTodayData(null);
      return;
    }

    if (!isInitialized) {
      getTodaySet({ userId })
        .then((data) => {
          setTodayData(data);
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error("Failed to get today set:", error);
        });
    }
  }, [userId, isInitialized, getTodaySet]);

  // Calculate current index based on read verses
  const currentIndex = todayData?.readVerseIds.length ?? 0;

  // Mark verse as read
  const handleSwipeRight = useCallback(async () => {
    if (!userId || !todayData?.dailySet || !todayData.verses[currentIndex]) {
      return;
    }

    const verseToMark = todayData.verses[currentIndex];
    
    try {
      const result = await markVerseRead({
        userId,
        dailySetId: todayData.dailySet._id,
        verseId: verseToMark._id,
      });

      // Update local state
      setTodayData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          readVerseIds: [...prev.readVerseIds, verseToMark._id],
          isComplete: result.isComplete,
        };
      });
    } catch (error) {
      console.error("Failed to mark verse as read:", error);
    }
  }, [userId, todayData, currentIndex, markVerseRead]);

  return {
    verses: todayData?.verses ?? [],
    currentIndex,
    isComplete: todayData?.isComplete ?? false,
    isLoading: !isInitialized,
    handleSwipeRight,
    dailySetId: todayData?.dailySet?._id,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
  };
}

