import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  GlobalLeaderboard,
  LeaderboardHeader,
  LeaderboardScope,
} from "@/components/social";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function SocialScreen() {
  const [activeView, setActiveView] = useState<LeaderboardScope>("global");
  const { user, isLoading: isUserLoading, error: userError } = useCurrentUser();

  const leaderboardArgs = useMemo(
    () => ({ userId: user?._id }),
    [user?._id]
  );
  const leaderboardData = useQuery(api.streaks.getGlobalLeaderboard, leaderboardArgs);

  if (userError) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base font-semibold text-textPrimary mb-2">
          Could not load your account
        </Text>
        <Text className="text-sm text-textSecondary text-center">
          {String(userError?.message ?? userError)}
        </Text>
      </SafeAreaView>
    );
  }

  const isGlobal = activeView === "global";
  const isLoadingLeaderboard = isUserLoading || leaderboardData === undefined;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-secondary">Social</Text>
        <Text className="text-sm text-textSecondary mt-1">
          Climb the global streak leaderboard. Communities are coming soon.
        </Text>
      </View>

      <LeaderboardHeader activeView={activeView} onChange={setActiveView} />

      <View className="flex-1">
        {isGlobal ? (
          <GlobalLeaderboard
            entries={leaderboardData?.top50}
            currentUserId={user?._id ?? null}
            currentUser={leaderboardData?.currentUser ?? null}
            totalUsers={leaderboardData?.totalUsers}
            isLoading={isLoadingLeaderboard}
          />
        ) : (
          <View className="flex-1 px-5">
            <View className="bg-surface rounded-2xl border border-[#E2E8F0] p-4 mt-1 shadow-sm">
              <Text className="text-base font-semibold text-secondary">
                Communities
              </Text>
              <Text className="text-sm text-textSecondary mt-1">
                No communities yet. Join a community to see your group's leaderboard.
              </Text>
              <View className="mt-3 px-4 py-3 rounded-xl bg-[#F7FAFC] border border-[#E2E8F0]">
                <Text className="text-textSecondary font-semibold text-center">
                  Join a community (coming soon)
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
