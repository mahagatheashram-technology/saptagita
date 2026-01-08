import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  LeaderboardList,
  LeaderboardHeader,
  CreateCommunityModal,
  JoinCommunityModal,
} from "@/components/social";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function SocialScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { user, error: userError } = useCurrentUser();
  const activeCommunity = useQuery(
    api.communities.getActiveCommunity,
    user?._id ? { userId: user._id } : "skip"
  );

  const isActiveCommunityLoading = activeCommunity === undefined;
  const activeCommunityName = activeCommunity?.name ?? null;
  const activeCommunityId = activeCommunity?._id ?? null;

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-secondary">Social</Text>
        <Text className="text-sm text-textSecondary mt-1">
          Climb the global streak leaderboard or compete inside your community.
        </Text>
      </View>

      <LeaderboardHeader
        userId={user?._id ?? null}
        activeCommunityName={activeCommunityName}
        onPressCreate={() => {
          setShowJoinModal(false);
          setShowCreateModal(true);
        }}
        onPressJoin={() => {
          setShowCreateModal(false);
          setShowJoinModal(true);
        }}
      />

      <View className="flex-1">
        {isActiveCommunityLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="text-sm text-textSecondary mt-2">
              Loading communities...
            </Text>
          </View>
        ) : (
          <LeaderboardList
            communityId={activeCommunityId}
            currentUserId={user?._id ?? null}
          />
        )}
      </View>

      <CreateCommunityModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={user?._id ?? null}
        onCreated={(result) => {
          if (!result.inviteCode) {
            setShowCreateModal(false);
          }
        }}
      />

      <JoinCommunityModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        userId={user?._id ?? null}
      />
    </SafeAreaView>
  );
}
