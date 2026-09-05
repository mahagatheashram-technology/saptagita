import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { TransferOwnershipModal } from "./TransferOwnershipModal";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Alert } from "@/lib/alert";

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

  const leaveCommunity = useMutation(api.communities.leaveCommunity);
  const deleteCommunity = useMutation(api.communities.deleteCommunity);
  const [transferTarget, setTransferTarget] = useState<Community | null>(null);

  // Owners must transfer ownership or delete; members may leave.
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

  // An owner can't leave — the backend refuses. Their exits are handing the
  // community over or deleting it outright.
  const openOwnerActions = (community: Community) => {
    Alert.alert(community.name, "You own this community.", [
      {
        text: "Transfer ownership",
        onPress: () => {
          setIsOpen(false);
          setTransferTarget(community);
        },
      },
      {
        text: "Delete community",
        style: "destructive",
        onPress: () => confirmDelete(community),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const confirmDelete = (community: Community) => {
    const otherMembers = Math.max(0, (community.memberCount ?? 1) - 1);
    Alert.alert(
      `Delete ${community.name}?`,
      otherMembers > 0
        ? `This removes the community for you and ${otherMembers} other ${
            otherMembers === 1 ? "member" : "members"
          }. Its leaderboard and invite code stop working. This can't be undone.`
        : "This community will be removed permanently. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;
            try {
              await deleteCommunity({ communityId: community._id, userId });
            } catch (error: any) {
              Alert.alert(
                "Could not delete",
                String(error?.data?.message ?? error?.message ?? error)
              );
            }
          },
        },
      ]
    );
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

        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            if (community.role === "owner") {
              openOwnerActions(community);
            } else {
              confirmLeave(community);
            }
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            community.role === "owner"
              ? `Manage ${community.name}`
              : `Leave ${community.name}`
          }
          className="ml-3 w-8 h-8 rounded-full items-center justify-center active:opacity-70"
        >
          <Ionicons
            name={
              community.role === "owner"
                ? "ellipsis-horizontal"
                : "exit-outline"
            }
            size={18}
            color="#8C7B68"
          />
        </Pressable>
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

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const panelWidth = Math.min(320, screenWidth - 32);
  const panelLeft = Math.max(16, Math.min(anchor.x, screenWidth - panelWidth - 16));
  const panelTop = Math.max(16, Math.min(anchor.y + anchor.height + 8, screenHeight - 160));
  const panelHeight = Math.max(100, Math.min(400, screenHeight - panelTop - 16));

  return (
    <View className="relative">
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          className="flex-row items-center justify-between rounded-full px-4 py-2 bg-white border border-[#E9DFD3] shadow-sm"
          onPress={openDropdown}
        >
          <Text className="text-sm font-semibold text-secondary">
            {activeLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#8C7B68" />
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
            <View className="bg-white rounded-2xl border border-[#E9DFD3] shadow-xl overflow-hidden">
              {isLoading ? (
                <View className="px-4 py-6 items-center justify-center">
                  <ActivityIndicator color="#FF6B35" />
                  <Text className="text-sm text-textSecondary mt-2">
                    Loading communities...
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: panelHeight }}>
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
        </View>
      </Modal>
      <TransferOwnershipModal
        visible={transferTarget !== null}
        onClose={() => setTransferTarget(null)}
        communityId={transferTarget?._id ?? null}
        communityName={transferTarget?.name ?? ""}
        userId={userId ?? null}
        onTransferred={() => setTransferTarget(null)}
      />
    </View>
  );
}
