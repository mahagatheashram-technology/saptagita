import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type Community = {
  _id: Id<"communities">;
  name: string;
  type: "public" | "private";
  inviteCode?: string;
  role: "owner" | "admin" | "member";
  memberCount: number;
};

interface CommunityDropdownProps {
  userId?: Id<"users"> | null;
  onPressCreate?: () => void;
  onPressJoin?: () => void;
}

export function CommunityDropdown({
  userId,
  onPressCreate,
  onPressJoin,
}: CommunityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<
    Id<"communities"> | "global" | null
  >(null);

  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const hasUser = Boolean(userId);
  const communities = useQuery(
    api.communities.getUserCommunities,
    hasUser ? { userId: userId! } : "skip"
  );
  const activeCommunity = useQuery(
    api.communities.getActiveCommunity,
    hasUser ? { userId: userId! } : "skip"
  );
  const setActiveCommunity = useMutation(api.communities.setActiveCommunity);
  const leaveCommunity = useMutation(api.communities.leaveCommunity);

  // Members had no way out at all — leaveCommunity existed on the backend with
  // nothing calling it. Owners are handled separately: the backend refuses to
  // let them leave, and deleting/transferring is not built yet.
  const confirmLeave = (community: Community) => {
    Alert.alert(
      `Leave ${community.name}?`,
      "You'll stop appearing on this community's leaderboard. You can rejoin later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveCommunity({
                communityId: community._id,
                userId: userId ?? undefined,
              });
            } catch (error: any) {
              Alert.alert("Could not leave", String(error?.message ?? error));
            }
          },
        },
      ]
    );
  };

  const activeLabel = useMemo(() => {
    if (!hasUser) return "Global";
    if (activeCommunity === undefined) return "Loading...";
    return activeCommunity?.name ?? "Global";
  }, [activeCommunity, hasUser]);

  const handleSelect = async (communityId: Id<"communities"> | null) => {
    if (!isUserLoaded || !isSignedIn || !hasUser) {
      Alert.alert("Sign in required", "Sign in to switch communities.");
      setIsOpen(false);
      return;
    }

    const selectionKey = communityId ?? "global";
    setPendingSelection(selectionKey);
    try {
      await setActiveCommunity({ communityId, userId: userId ?? undefined });
    } catch (error: any) {
      Alert.alert("Could not switch", String(error?.message ?? error));
    } finally {
      setIsOpen(false);
      setPendingSelection(null);
    }
  };

  const renderCommunity = (community: Community) => {
    const isActive = activeCommunity?._id === community._id;
    const isPending = pendingSelection === community._id;

    return (
      <Pressable
        key={community._id}
        className="flex-row items-center justify-between px-4 py-3"
        onPress={() => handleSelect(community._id)}
        disabled={Boolean(pendingSelection)}
      >
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-textPrimary">
            {community.name}
          </Text>
          <Text className="text-xs text-textSecondary mt-1">
            {community.memberCount} members · {community.role}
            {community.type === "private" ? " · Private" : ""}
          </Text>
        </View>
        {isPending ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : isActive ? (
          <Ionicons name="checkmark-circle" size={20} color="#38A169" />
        ) : (
          <Ionicons name="ellipse-outline" size={20} color="#D6C3AE" />
        )}

        {community.role !== "owner" ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              confirmLeave(community);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Leave ${community.name}`}
            className="ml-3 w-8 h-8 rounded-full items-center justify-center active:opacity-70"
          >
            <Ionicons name="exit-outline" size={18} color="#8C7B68" />
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  const isGlobalActive = !hasUser || activeCommunity === null;
  const isLoading =
    hasUser && (communities === undefined || activeCommunity === undefined);
  const isDisabled = !isUserLoaded || !isSignedIn || !hasUser;

  return (
    <View className="relative">
      <Pressable
        className="flex-row items-center justify-between rounded-full px-4 py-2 bg-white border border-[#E9DFD3] shadow-sm"
        onPress={() => {
          if (isDisabled) {
            Alert.alert("Sign in required", "Sign in to manage communities.");
            return;
          }
          setIsOpen((prev) => !prev);
        }}
      >
        <Text className="text-sm font-semibold text-secondary">
          {activeLabel}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color="#8C7B68"
        />
      </Pressable>

      {isOpen ? (
        <View className="absolute left-0 right-0 mt-2 z-20">
          <View
            className="bg-white rounded-2xl border border-[#E9DFD3] shadow-lg overflow-hidden"
            style={{ minWidth: 260, alignSelf: "flex-start" }}
          >
            {isLoading ? (
              <View className="px-4 py-6 items-center justify-center">
                <ActivityIndicator color="#FF6B35" />
                <Text className="text-sm text-textSecondary mt-2">
                  Loading communities...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                <Pressable
                  className="flex-row items-center justify-between px-4 py-3"
                  onPress={() => handleSelect(null)}
                  disabled={Boolean(pendingSelection)}
                >
                  <View>
                    <Text className="text-base font-semibold text-textPrimary">
                      Global
                    </Text>
                    <Text className="text-xs text-textSecondary mt-1">
                      Global streak leaderboard
                    </Text>
                  </View>
                  {pendingSelection === "global" ? (
                    <ActivityIndicator size="small" color="#FF6B35" />
                  ) : isGlobalActive ? (
                    <Ionicons name="checkmark-circle" size={20} color="#38A169" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color="#D6C3AE" />
                  )}
                </Pressable>

                <View className="h-px bg-sand-50" />

                {communities && communities.length > 0 ? (
                  communities.map(renderCommunity)
                ) : (
                  <Text className="text-sm text-textSecondary px-4 py-3">
                    No communities yet.
                  </Text>
                )}

                <View className="h-px bg-sand-50" />

                <Pressable
                  className="flex-row items-center px-4 py-3"
                  onPress={() => {
                    if (isDisabled) {
                      Alert.alert("Sign in required", "Sign in to create a community.");
                      setIsOpen(false);
                      return;
                    }
                    setIsOpen(false);
                    onPressCreate?.();
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FF6B35" />
                  <Text className="text-base font-semibold text-primary ml-2">
                    Create Community
                  </Text>
                </Pressable>

                <Pressable
                  className="flex-row items-center px-4 py-3"
                  onPress={() => {
                    if (isDisabled) {
                      Alert.alert("Sign in required", "Sign in to join a community.");
                      setIsOpen(false);
                      return;
                    }
                    setIsOpen(false);
                    onPressJoin?.();
                  }}
                >
                  <Ionicons name="link-outline" size={18} color="#3182CE" />
                  <Text className="text-base font-semibold text-secondary ml-2">
                    Join Community
                  </Text>
                </Pressable>

                <View className="h-px bg-sand-50" />

                <Pressable
                  className="flex-row items-center px-4 py-3"
                  onPress={() => setIsOpen(false)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#B8A894" />
                  <Text className="text-base font-semibold text-textSecondary ml-2">
                    Close
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
