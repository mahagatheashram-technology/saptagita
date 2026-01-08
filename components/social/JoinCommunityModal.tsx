import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type JoinMode = "browse" | "code";
const INVITE_CODE_ENABLED = false;

interface JoinCommunityModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: Id<"users"> | null;
}

export function JoinCommunityModal({
  visible,
  onClose,
  userId,
}: JoinCommunityModalProps) {
  const [mode, setMode] = useState<JoinMode>("browse");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joiningCommunityId, setJoiningCommunityId] =
    useState<Id<"communities"> | null>(null);
  const [joiningCode, setJoiningCode] = useState(false);

  const insets = useSafeAreaInsets();

  const publicCommunities = useQuery(
    api.communities.getPublicCommunities,
    visible ? {} : "skip"
  );
  const userCommunities = useQuery(
    api.communities.getUserCommunities,
    userId ? { userId } : "skip"
  );

  const joinPublicCommunity = useMutation(api.communities.joinPublicCommunity);
  const joinByInviteCode = useMutation(api.communities.joinByInviteCode);

  useEffect(() => {
    if (!visible) {
      setMode("browse");
      setInviteCode("");
      setError(null);
      setJoiningCommunityId(null);
      setJoiningCode(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!INVITE_CODE_ENABLED && mode === "code") {
      setMode("browse");
    }
  }, [mode]);

  const memberIds = useMemo(() => {
    if (!userCommunities) return new Set<string>();
    return new Set(userCommunities.map((community) => String(community._id)));
  }, [userCommunities]);

  const availableCommunities = useMemo(() => {
    if (!publicCommunities) return [];
    return publicCommunities.filter(
      (community) => !memberIds.has(String(community._id))
    );
  }, [memberIds, publicCommunities]);

  const isBrowseLoading =
    publicCommunities === undefined ||
    (userId ? userCommunities === undefined : false);
  const isBusy = Boolean(joiningCommunityId) || joiningCode;
  const showInviteCode = mode === "code" && INVITE_CODE_ENABLED;

  const trimmedCode = inviteCode.trim().toUpperCase();
  const canSubmitCode = trimmedCode.length > 0 && !isBusy;

  const handleJoinPublic = async (communityId: Id<"communities">) => {
    if (!userId) {
      setError("Sign in to join a community.");
      return;
    }

    setJoiningCommunityId(communityId);
    setError(null);
    try {
      const result = await joinPublicCommunity({ communityId, userId });
      Alert.alert(
        "Joined community",
        `You're now a member of ${result.communityName}.`
      );
      onClose();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setJoiningCommunityId(null);
    }
  };

  const handleJoinByCode = async () => {
    if (!userId) {
      setError("Sign in to join a community.");
      return;
    }
    if (!canSubmitCode) return;

    setJoiningCode(true);
    setError(null);
    try {
      const result = await joinByInviteCode({ inviteCode: trimmedCode, userId });
      Alert.alert(
        "Joined community",
        `You're now a member of ${result.communityName}.`
      );
      onClose();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setJoiningCode(false);
    }
  };

  const renderCommunityRow = (community: {
    _id: Id<"communities">;
    name: string;
    memberCount: number;
  }) => {
    const isJoining = joiningCommunityId === community._id;
    const isJoinDisabled = !userId || isBusy;
    return (
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1 mr-3">
          <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
            <Ionicons name="people-outline" size={18} color="#FF6B35" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-textPrimary">
              {community.name}
            </Text>
            <Text className="text-xs text-textSecondary mt-1">
              {community.memberCount} members
            </Text>
          </View>
        </View>
        <Pressable
          className={`rounded-full px-4 py-2 ${
            isJoinDisabled ? "bg-primary/60" : "bg-primary"
          }`}
          onPress={() => handleJoinPublic(community._id)}
          disabled={isJoinDisabled}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text className="text-white text-sm font-semibold">Join</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
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
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-textPrimary">
                Join a Community
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text className="text-base text-textSecondary">Close</Text>
              </Pressable>
            </View>

            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
              {(["browse", "code"] as JoinMode[]).map((option) => {
                const isActive = mode === option;
                const isDisabled =
                  option === "code" && !INVITE_CODE_ENABLED;
                return (
                  <Pressable
                    key={option}
                    className={`flex-1 px-4 py-2 rounded-xl ${
                      isActive ? "bg-white shadow-sm" : ""
                    } ${isDisabled ? "opacity-60" : ""}`}
                    onPress={() => {
                      if (isDisabled) return;
                      setMode(option);
                      setError(null);
                    }}
                    disabled={isDisabled}
                  >
                    <Text
                      className={`text-sm font-semibold text-center ${
                        isActive ? "text-secondary" : "text-textSecondary"
                      }`}
                    >
                      {option === "browse" ? "Browse Public" : "Enter Code"}
                    </Text>
                    {isDisabled ? (
                      <Text className="text-[11px] text-textSecondary text-center mt-1">
                        Coming soon
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {!showInviteCode ? (
              <>
                <Text className="text-sm text-textSecondary mb-2">
                  Join a public community instantly.
                </Text>
                {isBrowseLoading ? (
                  <View className="py-6 items-center justify-center">
                    <ActivityIndicator color="#FF6B35" />
                    <Text className="text-sm text-textSecondary mt-2">
                      Loading communities...
                    </Text>
                  </View>
                ) : availableCommunities.length > 0 ? (
                  <ScrollView style={{ maxHeight: 320 }}>
                    {availableCommunities.map((community, index) => (
                      <View key={community._id}>
                        {index > 0 ? <View className="h-px bg-gray-100" /> : null}
                        {renderCommunityRow(community)}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text className="text-sm text-textSecondary px-4 py-4 text-center">
                    You're already in all public communities.
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text className="text-sm text-textSecondary mb-2">
                  Enter an invite code to join a private community.
                </Text>
                <View className="bg-gray-50 rounded-xl border border-[#E2E8F0] px-3 py-2">
                  <TextInput
                    value={inviteCode}
                    onChangeText={(text) => setInviteCode(text.toUpperCase())}
                    placeholder="Invite code"
                    className="text-base text-textPrimary tracking-[3px]"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    returnKeyType="done"
                  />
                </View>
              </>
            )}

            {error ? (
              <Text className="text-xs text-red-500 mt-2">{error}</Text>
            ) : null}

            <View className="flex-row mt-5 space-x-3">
              <Pressable
                className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-3 bg-white"
                onPress={onClose}
                disabled={isBusy}
              >
                <Text className="text-center text-textPrimary font-semibold">
                  Cancel
                </Text>
              </Pressable>
              {showInviteCode ? (
                <Pressable
                  className={`flex-1 rounded-xl px-4 py-3 ${
                    canSubmitCode && userId ? "bg-primary" : "bg-primary/60"
                  }`}
                  onPress={handleJoinByCode}
                  disabled={!canSubmitCode || !userId}
                >
                  {joiningCode ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text className="text-white font-semibold text-center">
                      Join with Code
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
