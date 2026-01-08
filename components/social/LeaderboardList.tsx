import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeaderboardRow } from "./LeaderboardRow";
import { UserRankCard } from "./UserRankCard";

export interface LeaderboardEntry {
  userId: Id<"users">;
  displayName: string;
  avatarUrl?: string | null;
  currentStreak: number;
  lastCompletedLocalDate?: string | null;
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
  const isGlobal = communityId === null;

  const globalData = useQuery(
    api.streaks.getGlobalLeaderboard,
    isGlobal ? { currentUserId: currentUserId ?? undefined } : "skip"
  );
  const communityData = useQuery(
    api.streaks.getCommunityLeaderboard,
    !isGlobal && communityId
      ? { communityId, currentUserId: currentUserId ?? undefined }
      : "skip"
  );

  const data = isGlobal ? globalData : communityData;
  const entries = data?.top50 ?? [];
  const currentUser = data?.currentUser ?? null;
  const totalMembers = isGlobal ? undefined : communityData?.totalMembers;
  const totalUsers = isGlobal ? globalData?.totalUsers : undefined;
  const isLoading = data === undefined;
  const isEmpty = !isLoading && entries.length === 0;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-3">Loading leaderboard...</Text>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base font-semibold text-textPrimary text-center">
          No one has started a streak yet.
        </Text>
        <Text className="text-sm text-textSecondary mt-1 text-center">
          Be the first!
        </Text>
      </View>
    );
  }

  const isCurrentUserInTop50 = currentUserId
    ? entries.some((entry) => entry.userId === currentUserId)
    : false;
  const pinnedUser = !isCurrentUserInTop50 ? currentUser : null;
  const totalCount =
    totalMembers ??
    totalUsers ??
    (pinnedUser ? pinnedUser.rank : entries.length);
  const listSubtitle = isGlobal
    ? "Top 50 of all users"
    : `${totalCount} members`;

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
            isCurrentUser={item.userId === currentUserId}
          />
        )}
        ListHeaderComponent={
          <View className="pb-2">
            <Text className="text-lg font-semibold text-secondary">
              {isGlobal ? "Global leaderboard" : "Community leaderboard"}
            </Text>
            <Text className="text-sm text-textSecondary mt-1">
              {listSubtitle}
            </Text>
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: (pinnedUser ? 140 : 80) + insets.bottom,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      />

      {pinnedUser ? (
        <UserRankCard
          rank={pinnedUser.rank}
          currentStreak={pinnedUser.currentStreak}
          totalUsers={totalCount}
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
}
