import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
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
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const triggerRef = useRef<View>(null);

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
          <Ionicons name="ellipse-outline" size={20} color="#CBD5E0" />
        )}
      </Pressable>
    );
  };

  const isGlobalActive = !hasUser || activeCommunity === null;
  const isLoading =
    hasUser && (communities === undefined || activeCommunity === undefined);
  const isDisabled = !isUserLoaded || !isSignedIn || !hasUser;

  const openDropdown = () => {
    if (isDisabled) {
      Alert.alert("Sign in required", "Sign in to manage communities.");
      return;
    }

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  };

  const screenWidth = Dimensions.get("window").width;
  const panelWidth = Math.min(320, screenWidth - 32);
  const panelLeft = Math.max(16, Math.min(anchor.x, screenWidth - panelWidth - 16));
  const panelTop = anchor.y + anchor.height + 8;

  return (
    <View className="relative">
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          className="flex-row items-center justify-between rounded-full px-4 py-2 bg-white border border-[#E2E8F0] shadow-sm"
          onPress={openDropdown}
        >
          <Text className="text-sm font-semibold text-secondary">
            {activeLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#4A5568" />
        </Pressable>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1">
          <Pressable
            className="absolute inset-0 bg-black/10"
            onPress={() => setIsOpen(false)}
          />
          <View
            style={{
              position: "absolute",
              top: panelTop,
              left: panelLeft,
              width: panelWidth,
            }}
          >
            <View className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden">
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
                      <Ionicons name="ellipse-outline" size={20} color="#CBD5E0" />
                    )}
                  </Pressable>

                  <View className="h-px bg-gray-100" />

                  {communities && communities.length > 0 ? (
                    communities.map(renderCommunity)
                  ) : (
                    <Text className="text-sm text-textSecondary px-4 py-3">
                      No communities yet.
                    </Text>
                  )}

                  <View className="h-px bg-gray-100" />

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

                  <View className="h-px bg-gray-100" />

                  <Pressable
                    className="flex-row items-center px-4 py-3"
                    onPress={() => setIsOpen(false)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#A0AEC0" />
                    <Text className="text-base font-semibold text-textSecondary ml-2">
                      Close
                    </Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
