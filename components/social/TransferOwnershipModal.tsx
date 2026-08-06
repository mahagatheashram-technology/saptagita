import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getInitials } from "./leaderboardPresentation";
import { type } from "@/lib/typography";

interface TransferOwnershipModalProps {
  visible: boolean;
  onClose: () => void;
  communityId: Id<"communities"> | null;
  communityName: string;
  userId: Id<"users"> | null;
  onTransferred: () => void;
}

// An owner cannot leave their own community — the backend refuses. Their two
// exits are handing it to someone else or deleting it; this is the first.
export function TransferOwnershipModal({
  visible,
  onClose,
  communityId,
  communityName,
  userId,
  onTransferred,
}: TransferOwnershipModalProps) {
  const insets = useSafeAreaInsets();
  const [pendingUserId, setPendingUserId] = useState<Id<"users"> | null>(null);

  const members = useQuery(
    api.communities.getCommunityMembers,
    visible && communityId && userId ? { communityId, userId } : "skip"
  );
  const transferOwnership = useMutation(api.communities.transferOwnership);

  // You can't hand the community to yourself.
  const candidates = (members ?? []).filter(
    (member) => String(member.userId) !== String(userId)
  );
  const isLoading = visible && members === undefined;

  const handleTransfer = (member: { userId: Id<"users">; displayName: string }) => {
    if (!communityId || !userId) return;
    Alert.alert(
      `Make ${member.displayName} the owner?`,
      `You'll become an admin of ${communityName}. Only ${member.displayName} will be able to delete it or transfer it again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: async () => {
            setPendingUserId(member.userId);
            try {
              await transferOwnership({
                communityId,
                userId,
                newOwnerUserId: member.userId,
              });
              onTransferred();
            } catch (error: any) {
              Alert.alert(
                "Could not transfer",
                String(error?.data?.message ?? error?.message ?? error)
              );
            } finally {
              setPendingUserId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="bg-white rounded-t-3xl"
          style={{
            paddingTop: 18,
            paddingHorizontal: 20,
            paddingBottom: (insets.bottom || 0) + 18,
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className={`${type.title} text-textPrimary`}>
              Transfer ownership
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text className={`${type.body} text-textSecondary`}>Close</Text>
            </Pressable>
          </View>
          <Text className={`${type.bodySm} text-textSecondary mb-3`}>
            Choose a member of {communityName} to take over.
          </Text>

          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#FF6B35" />
            </View>
          ) : candidates.length === 0 ? (
            <Text className={`${type.bodySm} text-textSecondary py-6 text-center`}>
              You&apos;re the only member. Delete the community instead.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {candidates.map((member) => (
                <Pressable
                  key={member.userId}
                  onPress={() => handleTransfer(member)}
                  disabled={pendingUserId !== null}
                  className="flex-row items-center py-3 active:opacity-70"
                >
                  <View className="h-9 w-9 rounded-full bg-sand-200 items-center justify-center mr-3">
                    <Text className={`${type.bodySm} font-semibold text-secondary`}>
                      {getInitials(member.displayName)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`${type.body} font-semibold text-textPrimary`}
                      numberOfLines={1}
                    >
                      {member.displayName}
                    </Text>
                    <Text className={`${type.meta} text-textSecondary`}>
                      {member.role}
                    </Text>
                  </View>
                  {pendingUserId === member.userId ? (
                    <ActivityIndicator size="small" color="#FF6B35" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#D6C3AE" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
