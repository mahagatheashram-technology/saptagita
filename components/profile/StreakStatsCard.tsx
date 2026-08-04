import { View, Text } from "react-native";

interface StreakStatsCardProps {
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
}

// "Perfect" means the same thing as a green day on the Reading Calendar — all
// 7 verses read. It used to render gold here, which put a gold swatch directly
// above a legend where yellow means "Started", i.e. the opposite. Gold-for-
// perfect is exactly the encoding that tested badly on the calendar, so this
// box now matches status.complete. Keep the two in sync.
function StatBox({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone?: "primary" | "complete";
  /** Small qualifier under the value, e.g. the period a stat is counted over. */
  note?: string;
}) {
  const isPrimary = tone === "primary";
  const isComplete = tone === "complete";
  return (
    <View
      className={`flex-1 rounded-lg p-3 ${
        isComplete
          ? "bg-[#F0FDF4] border border-[#BBF7D0]"
          : isPrimary
          ? "bg-[#FFF7ED] border border-primary/20"
          : "bg-sand-50"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          isComplete
            ? "text-status-complete"
            : isPrimary
            ? "text-primary"
            : "text-textSecondary"
        }`}
      >
        {label}
      </Text>
      <Text className="text-lg font-bold text-textPrimary">
        {value} days
      </Text>
      {note ? (
        <Text className="text-[10px] text-textSecondary/70 mt-0.5">{note}</Text>
      ) : null}
    </View>
  );
}

export function StreakStatsCard({
  currentStreak,
  longestStreak,
  perfectDays,
}: StreakStatsCardProps) {
  return (
    <View className="bg-surface rounded-2xl p-4 shadow-sm">
      <Text className="text-lg font-semibold text-secondary mb-3">
        Streak Stats
      </Text>
      <View className="flex-row gap-2">
        <StatBox label="🔥 Current" value={currentStreak} tone="primary" />
        <StatBox label="🏆 Longest" value={longestStreak} />
        {/* Counted over all time, unlike the calendar below, which paints only
            the last 12 weeks. The note makes that difference explicit. */}
        <StatBox
          label="⭐ Perfect"
          value={perfectDays}
          tone="complete"
          note="All-time"
        />
      </View>
    </View>
  );
}
