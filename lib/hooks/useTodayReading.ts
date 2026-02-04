import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback, useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export function useTodayReading(userId: Id<"users"> | null) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number;
    longestStreak: number;
    isNewRecord: boolean;
  }>({
    currentStreak: 0,
    longestStreak: 0,
    isNewRecord: false,
  });
  
  const getTodaySet = useMutation(api.dailySets.getTodaySet);
  const markVerseRead = useMutation(api.dailySets.markVerseRead);
  const userState = useQuery(
    api.users.getUserState,
    userId ? { userId } : "skip"
  );
  
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

  // Sync streak info from server query (resets record flag)
  useEffect(() => {
    if (streak) {
      setStreakInfo((prev) => ({
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isNewRecord: prev.isNewRecord,
      }));
    }
  }, [streak]);

  // Initialize today's set
  useEffect(() => {
    if (!userId) {
      setIsInitialized(false);
      setTodayData(null);
      setStreakInfo({
        currentStreak: 0,
        longestStreak: 0,
        isNewRecord: false,
      });
      return;
    }

    if (!isInitialized) {
      getTodaySet({ userId })
        .then((data) => {
          setTodayData(data);
          setIsInitialized(true);
          setStreakInfo((prev) => ({ ...prev, isNewRecord: false }));
        })
        .catch((error) => {
          console.error("Failed to get today set:", error);
        });
    }
  }, [userId, isInitialized, getTodaySet]);

  useEffect(() => {
    if (!userId || !userState) return;
    if (isInitialized && !userState.currentDailySetId) {
      setIsInitialized(false);
      setTodayData(null);
      setStreakInfo((prev) => ({ ...prev, isNewRecord: false }));
    }
  }, [userId, userState?.currentDailySetId, isInitialized]);

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

      if (result?.alreadyRead) {
        return;
      }

      // Update local state
      setTodayData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          readVerseIds: [...prev.readVerseIds, verseToMark._id],
          isComplete: result.isComplete,
        };
      });

      if (result?.streakUpdate) {
        setStreakInfo({
          currentStreak: result.streakUpdate.currentStreak,
          longestStreak: result.streakUpdate.longestStreak,
          isNewRecord: result.streakUpdate.isNewRecord,
        });
      }
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
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    isNewRecord: streakInfo.isNewRecord,
  };
}
