import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeaderboardRow } from "./LeaderboardRow";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { type } from "@/lib/typography";

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
  /** Opens a reader's stats sheet. Rows stay inert when omitted. */
  onSelectUser?: (user: {
    userId: Id<"users">;
    displayName: string;
    avatarUrl: string | null;
  }) => void;
}

export function LeaderboardList({
  communityId,
  currentUserId,
  onSelectUser,
}: LeaderboardListProps) {

  const selectHandler = (entry: LeaderboardEntry) =>
    onSelectUser
      ? () =>
          onSelectUser({
            userId: entry.userId,
            displayName: entry.displayName,
            avatarUrl: entry.avatarUrl ?? null,
          })
      : undefined;
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
        <Text className={`${type.bodySm} text-textSecondary mt-3`}>
          Loading leaderboard...
        </Text>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className={`${type.title} text-textPrimary text-center`}>
          No one has started a streak yet.
        </Text>
        <Text className={`${type.bodySm} text-textSecondary mt-1 text-center`}>
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
    // Deliberately NOT flex-1. The global view is a fixed 5-row preview, so
    // stretching it to fill the screen left ~35% of the tab empty and pushed
    // the page footer into the middle of the viewport. Sizing to content lets
    // the footer sit directly beneath the list. (Community mode below still
    // uses flex-1 — that list scrolls, so filling the space is correct there.)
    return (
      <View className="px-5 pt-3">
        {entries.map((item) => (
          <LeaderboardRow
            key={item.userId}
            rank={item.rank}
            displayName={item.displayName}
            avatarUrl={item.avatarUrl}
            currentStreak={item.currentStreak}
            isCurrentUser={item.userId === resolvedCurrentUserId}
            compact
            onPress={selectHandler(item)}
          />
        ))}

        {pinnedUser ? (
          <LeaderboardRow
            rank={pinnedUser.rank}
            displayName={pinnedUser.displayName}
            avatarUrl={pinnedUser.avatarUrl}
            currentStreak={pinnedUser.currentStreak}
            isCurrentUser
            compact
            onPress={selectHandler(pinnedUser)}
          />
        ) : null}

        <Pressable
          onPress={() => router.push("/leaderboard")}
          className="flex-row items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 py-3 mt-1 active:opacity-70"
        >
          <Text className={`${type.bodySm} font-semibold text-primary`}>
            View Top 50
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
        </Pressable>
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
            onPress={selectHandler(item)}
          />
        )}
        ListHeaderComponent={<View className="pb-2" />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            onPress={selectHandler(pinnedUser)}
          />
        </View>
      ) : null}
    </View>
  );
}
