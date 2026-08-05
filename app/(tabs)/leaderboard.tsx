import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import BottomSheet from "@gorhom/bottom-sheet";
import { Id } from "@/convex/_generated/dataModel";
import {
  LeaderboardEntry,
  LeaderboardRow,
  UserStatsSheet,
} from "@/components/social";
import { type } from "@/lib/typography";

export default function LeaderboardScreen() {
  const convex = useConvex();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewedUser, setViewedUser] = useState<{
    userId: Id<"users">;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const statsSheetRef = useRef<BottomSheet>(null);

  const openUserStats = (entry: LeaderboardEntry) => {
    setViewedUser({
      userId: entry.userId,
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl ?? null,
    });
    requestAnimationFrame(() => statsSheetRef.current?.snapToIndex(0));
  };

  useEffect(() => {
    let cancelled = false;
    void convex
      .query(api.streaks.getGlobalLeaderboardTop50, {})
      .then((result) => {
        if (!cancelled) {
          setEntries(result.entries);
          setCurrentUserId(result.currentUserId);
          setError(null);
        }
      })
      .catch((queryError) => {
        if (!cancelled) {
          console.error("Failed to load the Top 50 leaderboard", queryError);
          setError("The leaderboard could not be loaded. Please try again.");
          setEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [convex]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/social")
          }
          hitSlop={10}
          className="mr-2"
        >
          <Ionicons name="chevron-back" size={25} color="#1A365D" />
        </Pressable>
        <View>
          <Text className={`${type.display} text-secondary`}>Top 50</Text>
          <Text className={`${type.meta} text-textSecondary`}>Global streak leaderboard</Text>
        </View>
      </View>

      {entries === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className={`${type.bodySm} text-textSecondary text-center`}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <LeaderboardRow
              rank={item.rank}
              displayName={item.displayName}
              avatarUrl={item.avatarUrl}
              currentStreak={item.currentStreak}
              isCurrentUser={item.userId === currentUserId}
              onPress={() => openUserStats(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text className={`${type.bodySm} text-textSecondary text-center mt-12`}>
              No active streaks yet.
            </Text>
          }
        />
      )}

      <UserStatsSheet
        ref={statsSheetRef}
        userId={viewedUser?.userId ?? null}
        fallbackName={viewedUser?.displayName}
        fallbackAvatarUrl={viewedUser?.avatarUrl}
      />
    </SafeAreaView>
  );
}
