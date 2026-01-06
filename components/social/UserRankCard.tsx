import { Text, View } from "react-native";

interface UserRankCardProps {
  rank: number;
  currentStreak: number;
  totalUsers: number;
  bottomInset?: number;
}

export function UserRankCard({
  rank,
  currentStreak,
  totalUsers,
  bottomInset = 0,
}: UserRankCardProps) {
  const streakLabel = currentStreak === 1 ? "day" : "days";

  return (
    <View
      className="absolute left-5 right-5 bg-secondary rounded-2xl px-4 py-3 shadow-lg flex-row items-center"
      style={{ bottom: 24 + bottomInset }}
    >
      <View className="flex-1">
        <Text className="text-white text-xs font-semibold uppercase tracking-wide">
          Your Rank
        </Text>
        <Text className="text-white text-xl font-bold mt-0.5">
          #{rank} of {totalUsers}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-lg mr-1">🔥</Text>
        <Text className="text-white font-semibold">
          {currentStreak} {streakLabel}
        </Text>
      </View>
    </View>
  );
}
