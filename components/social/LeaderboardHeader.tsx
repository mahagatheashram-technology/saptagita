import { Text, View } from "react-native";
import { Id } from "@/convex/_generated/dataModel";
import { CommunityDropdown } from "./CommunityDropdown";

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
    : "Top 50 of all users";

  return (
    <View className="px-5 pt-3 pb-2">
      <View className="flex-row items-center">
        <CommunityDropdown
          userId={userId}
          onPressCreate={onPressCreate}
          onPressJoin={onPressJoin}
        />
      </View>
      <Text className="text-xl font-semibold text-secondary mt-3">{viewTitle}</Text>
      <Text className="text-sm text-textSecondary mt-1">{viewSubtitle}</Text>
    </View>
  );
}
