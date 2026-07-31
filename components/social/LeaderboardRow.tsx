import { Image, Text, View } from "react-native";
import { getInitials } from "./leaderboardPresentation";

interface LeaderboardRowProps {
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  currentStreak: number;
  isCurrentUser?: boolean;
  compact?: boolean;
}

export function LeaderboardRow({
  rank,
  displayName,
  avatarUrl,
  currentStreak,
  isCurrentUser,
  compact = false,
}: LeaderboardRowProps) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  const initials = getInitials(displayName || "User");
  const streakLabel = currentStreak === 1 ? "day" : "days";

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 ${compact ? "py-1 mb-1" : "py-3 mb-3"} ${
        isCurrentUser ? "bg-primary/10 border border-primary/30" : "bg-surface shadow-sm"
      }`}
    >
      <View className="w-11 items-center justify-center">
        {medal ? (
          <Text className="text-[21px]">{medal}</Text>
        ) : (
          <View className="min-w-[36px] h-7 px-2 rounded-full bg-[#F1F5F9] items-center justify-center">
            <Text
              className="text-[13px] font-semibold text-textSecondary"
              numberOfLines={1}
            >
              {rank}
            </Text>
          </View>
        )}
      </View>

      <View className={`${compact ? "h-7 w-7" : "h-10 w-10"} rounded-full bg-[#E2E8F0] overflow-hidden items-center justify-center`}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className={compact ? "h-7 w-7" : "h-10 w-10"} />
        ) : (
          <Text className={`${compact ? "text-[14px]" : "text-[15px]"} font-semibold text-secondary`}>{initials}</Text>
        )}
      </View>

      <View className="flex-1 ml-3">
        <Text
          className={`${compact ? "text-[14px]" : "text-[17px]"} font-semibold ${isCurrentUser ? "text-secondary" : "text-textPrimary"}`}
          numberOfLines={1}
        >
          {displayName || "Anonymous"}
        </Text>
        {isCurrentUser && !compact ? (
          <Text className="text-[13px] font-semibold text-primary mt-0.5">You</Text>
        ) : !compact ? (
          <Text className="text-[13px] text-textSecondary mt-0.5" numberOfLines={1}>
            Keeping the flame alive
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center">
        <Text className={`${compact ? "text-[15px]" : "text-[19px]"} mr-1`}>🔥</Text>
        <Text className={`${compact ? "text-[13px]" : "text-[15px]"} font-semibold text-secondary`}>
          {currentStreak} {streakLabel}
        </Text>
      </View>
    </View>
  );
}
