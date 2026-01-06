import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";
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

interface GlobalLeaderboardProps {
  entries?: LeaderboardEntry[];
  isLoading: boolean;
  currentUserId?: Id<"users"> | null;
  currentUser?: LeaderboardEntry | null;
  totalUsers?: number;
}

export function GlobalLeaderboard({
  entries,
  isLoading,
  currentUserId,
  currentUser,
  totalUsers,
}: GlobalLeaderboardProps) {
  const insets = useSafeAreaInsets();
  const data = entries ?? [];
  const isEmpty = !isLoading && data.length === 0;

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
    ? data.some((entry) => entry.userId === currentUserId)
    : false;
  const pinnedUser = !isCurrentUserInTop50 ? currentUser : null;
  const totalCount = totalUsers ?? (pinnedUser ? pinnedUser.rank : data.length);

  return (
    <View className="flex-1">
      <FlatList
        data={data}
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
              Global leaderboard
            </Text>
            <Text className="text-sm text-textSecondary mt-1">
              Top streaks across Sapta Gita
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
