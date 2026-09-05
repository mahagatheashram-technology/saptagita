import { Text, View } from "react-native";
import { Id } from "@/convex/_generated/dataModel";
import { CommunityDropdown } from "./CommunityDropdown";
import { type } from "@/lib/typography";

interface LeaderboardHeaderProps {
  userId?: Id<"users"> | null;
  activeCommunityName?: string | null;
  onPressCreate: () => void;
  onPressJoin?: () => void;
}

export function LeaderboardHeader({
  userId,
  activeCommunityName,
  onPressCreate,
  onPressJoin,
}: LeaderboardHeaderProps) {
  const viewTitle = activeCommunityName
    ? `Community: ${activeCommunityName}`
    : "Global Leaderboard";
  const viewSubtitle = activeCommunityName
    ? "Streaks inside this community"
    : "Top 5 of all users";

  return (
    <View className="px-5 pt-1 pb-1">
      <View className="flex-row items-center">
        <CommunityDropdown
          userId={userId}
          onPressCreate={onPressCreate}
          onPressJoin={onPressJoin}
        />
      </View>
      <Text className={`${type.title} text-secondary mt-2`}>{viewTitle}</Text>
      <Text className={`${type.bodySm} text-textSecondary mt-0.5`}>
        {viewSubtitle}
      </Text>
    </View>
  );
}
