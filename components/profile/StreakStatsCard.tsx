import { View, Text } from "react-native";

interface StreakStatsCardProps {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-lg p-3 ${
        highlight ? "bg-[#FFF7ED] border border-primary/20" : "bg-[#F7FAFC]"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          highlight ? "text-primary" : "text-textSecondary"
        }`}
      >
        {label}
      </Text>
      <Text className="text-lg font-bold text-textPrimary">
        {value} days
      </Text>
    </View>
  );
}

export function StreakStatsCard({
  currentStreak,
  longestStreak,
  totalCompletedDays,
}: StreakStatsCardProps) {
  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm">
      <Text className="text-base font-semibold text-secondary mb-3">
        Streak Stats
      </Text>
      <View className="flex-row space-x-2">
        <StatBox label="🔥 Current" value={currentStreak} highlight />
        <StatBox label="🏆 Longest" value={longestStreak} />
        <StatBox label="📅 Total" value={totalCompletedDays} />
      </View>
    </View>
  );
}
