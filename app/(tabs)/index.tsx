import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardStack } from "@/components/verses/CardStack";
import { TodayHeader } from "@/components/today/TodayHeader";
import { SwipeHint } from "@/components/today/SwipeHint";
import { useTodayReading } from "@/lib/hooks/useTodayReading";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";

const DAILY_VERSE_COUNT = 7;

export default function TodayScreen() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  
  // Get or create test user (will be replaced with real auth later)
  const getOrCreateTestUser = useMutation(api.users.getOrCreateTestUser);

  useEffect(() => {
    getOrCreateTestUser()
      .then((user) => {
        if (user) {
          setUserId(user._id);
        }
      })
      .catch(console.error);
  }, [getOrCreateTestUser]);

  const {
    verses,
    currentIndex,
    isComplete,
    isLoading,
    handleSwipeRight: markAsRead,
    dailySetId,
    currentStreak,
  } = useTodayReading(userId);
  
  // Check and update streak on app open
  const checkStreak = useMutation(api.streaks.checkAndUpdateStreak);
  
  useEffect(() => {
    if (userId) {
      checkStreak({ userId }).catch(console.error);
    }
  }, [userId, checkStreak]);

  const handleSwipeRight = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAsRead();
  }, [markAsRead]);

  const handleSwipeLeft = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("Swipe left - show options (coming in Phase 2)");
  }, []);

  // Loading state
  if (isLoading || !userId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-4">Loading today's verses...</Text>
      </SafeAreaView>
    );
  }

  // Completion state
  if (isComplete || currentIndex >= DAILY_VERSE_COUNT) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <View className="items-center">
          <Text className="text-6xl mb-6">🎉</Text>
          <Text className="text-3xl font-bold text-secondary mb-3 text-center">
            Day Complete!
          </Text>
          <Text className="text-lg text-textSecondary text-center mb-8">
            You've read all 7 verses today.{"\n"}Come back tomorrow for more wisdom.
          </Text>
          
          <View className="flex-row items-center bg-orange-50 px-6 py-3 rounded-full">
            <Text className="text-primary text-lg font-semibold">
              🔥 Streak updated!
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // No verses loaded yet
  if (verses.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-4">Preparing your verses...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <TodayHeader
        currentIndex={currentIndex}
        totalVerses={DAILY_VERSE_COUNT}
        streak={currentStreak}
      />

      <View className="flex-1 px-5">
        <CardStack
          verses={verses}
          currentIndex={currentIndex}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
        />
      </View>

      <SwipeHint />
    </SafeAreaView>
  );
}
