import { Image, Text, View } from "react-native";
import { getInitials } from "./leaderboardPresentation";
import { type } from "@/lib/typography";

interface LeaderboardRowProps {
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  currentStreak: number;
  isCurrentUser?: boolean;
  /** Denser vertical rhythm for the 5-row preview on the Social tab. */
  compact?: boolean;
}

// Medal tints for the top three. The rank pill keeps its shape at every
// position — only its colour changes — so ranks 1-3 and 4+ read as one list.
// Previously the top three rendered a 🥇/🥈/🥉 emoji *instead of* the pill, and
// Android draws its own numeral inside those emoji, which made the first three
// rows look like a different component from the rest of the list.
const MEDAL_TINTS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#FDF0D5", text: "#8A6A12" },
  2: { bg: "#EFEBE5", text: "#6B6459" },
  3: { bg: "#F6E3D5", text: "#8A5A32" },
};

export function LeaderboardRow({
  rank,
  displayName,
  avatarUrl,
  currentStreak,
  isCurrentUser,
  compact = false,
}: LeaderboardRowProps) {
  const initials = getInitials(displayName || "User");
  const streakLabel = currentStreak === 1 ? "day" : "days";
  const medal = MEDAL_TINTS[rank];
  const avatarSize = compact ? "h-9 w-9" : "h-10 w-10";

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 ${
        compact ? "py-2.5 mb-2" : "py-3 mb-3"
      } ${
        isCurrentUser
          ? "bg-primary/10 border border-primary/30"
          : "bg-surface shadow-sm"
      }`}
    >
      <View className="w-9 items-center justify-center mr-1">
        <View
          className="min-w-[28px] h-7 px-2 rounded-full items-center justify-center"
          style={{ backgroundColor: medal?.bg ?? "#F8F4EE" }}
        >
          <Text
            className={`${type.meta} font-bold`}
            style={{ color: medal?.text ?? "#8C7B68" }}
            numberOfLines={1}
          >
            {rank}
          </Text>
        </View>
      </View>

      <View
        className={`${avatarSize} rounded-full bg-sand-200 overflow-hidden items-center justify-center`}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className={avatarSize} />
        ) : (
          <Text className={`${type.bodySm} font-semibold text-secondary`}>
            {initials}
          </Text>
        )}
      </View>

      <View className="flex-1 ml-3">
        <Text
          className={`${type.body} font-semibold ${
            isCurrentUser ? "text-secondary" : "text-textPrimary"
          }`}
          numberOfLines={1}
        >
          {displayName || "Anonymous"}
        </Text>
        {/* Only the signed-in user gets a subtitle. The old non-compact branch
            filled this slot with "Keeping the flame alive" for everyone, which
            made the same component two different heights in two places. */}
        {isCurrentUser ? (
          <Text className={`${type.meta} font-semibold text-primary mt-0.5`}>
            You
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center">
        <Text className={`${type.bodySm} mr-1`}>🔥</Text>
        <Text className={`${type.bodySm} font-semibold text-primary`}>
          {currentStreak} {streakLabel}
        </Text>
      </View>
    </View>
  );
}
