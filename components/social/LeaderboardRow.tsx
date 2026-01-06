import { Image, Text, View } from "react-native";

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

interface LeaderboardRowProps {
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  currentStreak: number;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({
  rank,
  displayName,
  avatarUrl,
  currentStreak,
  isCurrentUser,
}: LeaderboardRowProps) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  const initials = getInitials(displayName || "User");
  const streakLabel = currentStreak === 1 ? "day" : "days";

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 py-3 mb-3 ${
        isCurrentUser ? "bg-primary/10 border border-primary/30" : "bg-surface shadow-sm"
      }`}
    >
      <View className="w-10 items-center">
        {medal ? (
          <Text className="text-xl">{medal}</Text>
        ) : (
          <View className="px-3 py-1 rounded-full bg-[#F1F5F9]">
            <Text className="text-xs font-semibold text-textSecondary">{rank}</Text>
          </View>
        )}
      </View>

      <View className="h-10 w-10 rounded-full bg-[#E2E8F0] overflow-hidden items-center justify-center">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-10 w-10" />
        ) : (
          <Text className="text-sm font-semibold text-secondary">{initials}</Text>
        )}
      </View>

      <View className="flex-1 ml-3">
        <Text
          className={`text-base font-semibold ${isCurrentUser ? "text-secondary" : "text-textPrimary"}`}
          numberOfLines={1}
        >
          {displayName || "Anonymous"}
        </Text>
        {isCurrentUser ? (
          <Text className="text-xs font-semibold text-primary mt-0.5">You</Text>
        ) : (
          <Text className="text-xs text-textSecondary mt-0.5" numberOfLines={1}>
            Keeping the flame alive
          </Text>
        )}
      </View>

      <View className="flex-row items-center">
        <Text className="text-lg mr-1">🔥</Text>
        <Text className="text-sm font-semibold text-secondary">
          {currentStreak} {streakLabel}
        </Text>
      </View>
    </View>
  );
}
