import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { useConvex, useQuery } from "convex/react";
import { usePathname } from "expo-router";
import { api } from "@/convex/_generated/api";
import {
  LeaderboardList,
  LeaderboardHeader,
  CreateCommunityModal,
  JoinCommunityModal,
  TodayReadersStat,
  UserSearchBox,
  UserStatsSheet,
} from "@/components/social";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { FoundationFooter } from "@/components/common";
import { type } from "@/lib/typography";

export default function SocialScreen() {
  const isWeb = Platform.OS === "web";
  const Content = isWeb ? ScrollView : View;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [todayReaderCount, setTodayReaderCount] = useState<number | null>(null);
  const [viewedUser, setViewedUser] = useState<{
    userId: Id<"users">;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const statsSheetRef = useRef<BottomSheet>(null);

  const openUserStats = (user: {
    userId: Id<"users">;
    displayName: string;
    avatarUrl: string | null;
  }) => {
    // Any route into the sheet drops the keyboard first: the sheet snaps to a
    // percentage of screen height, so an open keyboard would cover it.
    Keyboard.dismiss();
    setViewedUser(user);
    // Snap on the next frame so the sheet renders the freshly-selected reader
    // before it animates open.
    requestAnimationFrame(() => statsSheetRef.current?.snapToIndex(0));
  };
  const convex = useConvex();
  const pathname = usePathname();
  const { user, error: userError } = useCurrentUser();
  const activeCommunity = useQuery(
    api.communities.getActiveCommunity,
    user?._id ? { userId: user._id } : "skip"
  );

  const isActiveCommunityLoading = activeCommunity === undefined;
  const activeCommunityName = activeCommunity?.name ?? null;
  const activeCommunityId = activeCommunity?._id ?? null;

  // One snapshot per visit avoids turning a popular global statistic into a
  // realtime fan-out subscription when many readers start together.
  useEffect(() => {
    if (!user?._id || !pathname.includes("social")) {
      if (!user?._id) setTodayReaderCount(null);
      return;
    }

    let cancelled = false;
    void convex
      .query(api.dailyReaders.getTodayReaderCount, {})
      .then((result) => {
        if (!cancelled) setTodayReaderCount(result.count);
      })
      .catch((error) => {
        console.log("Could not load today's reader count", error);
        if (!cancelled) setTodayReaderCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [convex, pathname, user?._id]);

  if (userError) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className={`${type.title} text-textPrimary mb-2`}>
          Could not load your account
        </Text>
        <Text className={`${type.bodySm} text-textSecondary text-center`}>
          {String(userError?.message ?? userError)}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ minHeight: 0 }}>
      <Content
        style={{ flex: 1, minHeight: 0 }}
        {...(isWeb
          ? {
              contentContainerStyle: { flexGrow: 1, paddingBottom: 24 },
              keyboardShouldPersistTaps: "handled" as const,
            }
          : {})}
      >
        <View className="px-5 pt-3 pb-1">
          <Text className={`${type.display} text-secondary`}>Social</Text>
          <Text className={`${type.bodySm} text-textSecondary mt-1`}>
            Climb the global streak leaderboard or compete inside your community.
          </Text>
        </View>

        <TodayReadersStat count={todayReaderCount} />

        <UserSearchBox onSelectUser={openUserStats} />

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

        <View className={isWeb ? undefined : "flex-1"}>
          {isActiveCommunityLoading ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text className={`${type.bodySm} text-textSecondary mt-2`}>
                Loading communities...
              </Text>
            </View>
          ) : (
            <LeaderboardList
              embedded={isWeb}
              communityId={activeCommunityId}
              currentUserId={user?._id ?? null}
              onSelectUser={openUserStats}
            />
          )}
        </View>

        <FoundationFooter />
      </Content>

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

      <UserStatsSheet
        ref={statsSheetRef}
        userId={viewedUser?.userId ?? null}
        fallbackName={viewedUser?.displayName}
        fallbackAvatarUrl={viewedUser?.avatarUrl}
      />
    </SafeAreaView>
  );
}
