import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeaderboardRow } from "./LeaderboardRow";
import { router } from "expo-router";

export interface LeaderboardEntry {
  userId: Id<"users">;
  displayName: string;
  avatarUrl?: string | null;
  currentStreak: number;
  lastReadLocalDate?: string | null;
  rank: number;
}

interface LeaderboardListProps {
  communityId: Id<"communities"> | null;
  currentUserId?: Id<"users"> | null;
}

export function LeaderboardList({
  communityId,
  currentUserId,
}: LeaderboardListProps) {
  const insets = useSafeAreaInsets();
  const convex = useConvex();
  const isGlobal = communityId === null;
  const [globalCurrentUser, setGlobalCurrentUser] =
    useState<LeaderboardEntry | null>(null);

  const globalData = useQuery(
    api.streaks.getGlobalLeaderboard,
    isGlobal ? {} : "skip"
  );
  const communityData = useQuery(
    api.streaks.getCommunityLeaderboard,
    !isGlobal && communityId
      ? { communityId, currentUserId: currentUserId ?? undefined }
      : "skip"
  );

  const globalLeaderboardLoaded = globalData !== undefined;
  useEffect(() => {
    setGlobalCurrentUser(null);
    if (!isGlobal || !globalLeaderboardLoaded) return;

    let cancelled = false;
    void convex
      .query(api.streaks.getMyGlobalRank, {})
      .then((entry) => {
        if (!cancelled) setGlobalCurrentUser(entry);
      })
      .catch((error) => {
        console.error("Failed to load signed-in user's global rank", error);
        if (!cancelled) setGlobalCurrentUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [convex, globalLeaderboardLoaded, isGlobal]);

  const data = isGlobal ? globalData : communityData;
  const entries = isGlobal
    ? globalData?.top5 ?? []
    : communityData?.top50 ?? [];
  const currentUser = isGlobal
    ? globalCurrentUser
    : communityData?.currentUser ?? null;
  const isLoading = data === undefined;
  const isEmpty = !isLoading && entries.length === 0;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-[15px] text-textSecondary mt-3">Loading leaderboard...</Text>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-[17px] font-semibold text-textPrimary text-center">
          No one has started a streak yet.
        </Text>
        <Text className="text-[15px] text-textSecondary mt-1 text-center">
          Be the first!
        </Text>
      </View>
    );
  }

  const resolvedCurrentUserId = currentUserId ?? currentUser?.userId;
  const isCurrentUserInVisibleList = resolvedCurrentUserId
    ? entries.some((entry) => entry.userId === resolvedCurrentUserId)
    : false;
  const pinnedUser = !isCurrentUserInVisibleList ? currentUser : null;
  if (isGlobal) {
    return (
      <View className="flex-1 px-5 pt-3">
        {entries.map((item) => (
          <LeaderboardRow
            key={item.userId}
            rank={item.rank}
            displayName={item.displayName}
            avatarUrl={item.avatarUrl}
            currentStreak={item.currentStreak}
            isCurrentUser={item.userId === resolvedCurrentUserId}
            compact
          />
        ))}

        <Pressable
          onPress={() => router.push("/leaderboard")}
          className="rounded-xl border border-primary/30 bg-primary/5 py-2.5 items-center mb-2 active:opacity-70"
        >
          <Text className="text-[15px] font-semibold text-primary">View Top 50</Text>
        </Pressable>

        {pinnedUser ? (
          <LeaderboardRow
            rank={pinnedUser.rank}
            displayName={pinnedUser.displayName}
            avatarUrl={pinnedUser.avatarUrl}
            currentStreak={pinnedUser.currentStreak}
            isCurrentUser
            compact
          />
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <LeaderboardRow
            rank={item.rank}
            displayName={item.displayName}
            avatarUrl={item.avatarUrl}
            currentStreak={item.currentStreak}
            isCurrentUser={item.userId === resolvedCurrentUserId}
          />
        )}
        ListHeaderComponent={<View className="pb-2" />}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: (pinnedUser ? 140 : 80) + insets.bottom,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      />

      {pinnedUser ? (
        <View
          className="absolute left-5 right-5"
          style={{ bottom: 24 + insets.bottom }}
        >
          <LeaderboardRow
            rank={pinnedUser.rank}
            displayName={pinnedUser.displayName}
            avatarUrl={pinnedUser.avatarUrl}
            currentStreak={pinnedUser.currentStreak}
            isCurrentUser
          />
        </View>
      ) : null}
    </View>
  );
}
