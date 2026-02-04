import { View, Text } from "react-native";

interface StreakStatsCardProps {
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "gold";
}) {
  const isPrimary = tone === "primary";
  const isGold = tone === "gold";
  return (
    <View
      className={`flex-1 rounded-lg p-3 ${
        isGold
          ? "bg-[#FFFBEB] border border-[#FDE68A]"
          : isPrimary
          ? "bg-[#FFF7ED] border border-primary/20"
          : "bg-[#F7FAFC]"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          isGold ? "text-[#B45309]" : isPrimary ? "text-primary" : "text-textSecondary"
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
  perfectDays,
}: StreakStatsCardProps) {
  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm">
      <Text className="text-base font-semibold text-secondary mb-3">
        Streak Stats
      </Text>
      <View className="flex-row space-x-2">
        <StatBox label="🔥 Current" value={currentStreak} tone="primary" />
        <StatBox label="🏆 Longest" value={longestStreak} />
        <StatBox label="⭐ Perfect" value={perfectDays} tone="gold" />
      </View>
    </View>
  );
}
