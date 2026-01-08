import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CommunityType = "public" | "private";
const PRIVATE_ENABLED = false;

interface CreateCommunityModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: Id<"users"> | null;
  onCreated?: (result: {
    communityId: Id<"communities">;
    inviteCode?: string;
  }) => void;
}

export function CreateCommunityModal({
  visible,
  onClose,
  userId,
  onCreated,
}: CreateCommunityModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CommunityType>("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const createCommunity = useMutation(api.communities.createCommunity);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setName("");
      setType("public");
      setError(null);
      setInviteCode(null);
      setLoading(false);
    }
  }, [visible]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const isValidName = trimmedName.length >= 3 && trimmedName.length <= 30;

  const handleCreate = async () => {
    if (!isValidName || loading) return;
    if (!userId) {
      setError("Sign in to create a community.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await createCommunity({ name: trimmedName, type, userId });
      onCreated?.(result);

      if (result.inviteCode) {
        setInviteCode(result.inviteCode);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-black/40 justify-end">
          <Pressable className="flex-1" onPress={handleClose} />

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
                Create Community
              </Text>
              <Pressable onPress={handleClose} hitSlop={10}>
                <Text className="text-base text-textSecondary">Close</Text>
              </Pressable>
            </View>

            {inviteCode ? (
              <View className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <Text className="text-base font-semibold text-secondary">
                  Private community created
                </Text>
                <Text className="text-sm text-textSecondary mt-1">
                  Share this invite code with members to join.
                </Text>
                <View className="mt-3 px-4 py-3 bg-white rounded-xl border border-primary/30 items-center">
                  <Text className="text-2xl font-bold tracking-[4px] text-secondary">
                    {inviteCode}
                  </Text>
                </View>
                <Pressable
                  className="mt-4 rounded-xl bg-secondary px-4 py-3"
                  onPress={handleClose}
                >
                  <Text className="text-white font-semibold text-center">
                    Done
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="text-sm text-textSecondary mb-2">
                  Name your community (3-30 characters)
                </Text>
                <View className="bg-gray-50 rounded-xl border border-[#E2E8F0] px-3 py-2">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Sunrise Seekers"
                    className="text-base text-textPrimary"
                    maxLength={30}
                    autoFocus
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                  <View className="flex-row justify-between items-center mt-1">
                    {!isValidName && name.length > 0 ? (
                      <Text className="text-xs text-red-500">
                        Must be 3-30 characters
                      </Text>
                    ) : (
                      <View />
                    )}
                    <Text className="text-xs text-textSecondary">
                      {name.length}/30
                    </Text>
                  </View>
                </View>

                <Text className="text-sm text-textSecondary mt-4 mb-2">
                  Visibility
                </Text>
                <View className="flex-row bg-gray-100 rounded-xl p-1">
                  {(["public", "private"] as CommunityType[]).map((option) => {
                    const isActive = type === option;
                    const isDisabled = option === "private" && !PRIVATE_ENABLED;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          if (isDisabled) return;
                          setType(option);
                        }}
                        disabled={isDisabled}
                        className={`flex-1 px-4 py-2 rounded-xl ${
                          isActive ? "bg-white shadow-sm" : ""
                        } ${isDisabled ? "opacity-60" : ""}`}
                      >
                        <Text
                          className={`text-sm font-semibold text-center ${
                            isActive ? "text-secondary" : "text-textSecondary"
                          }`}
                        >
                          {option === "public" ? "Public" : "Private"}
                        </Text>
                        <Text
                          className="text-[12px] text-textSecondary text-center mt-1"
                          numberOfLines={2}
                        >
                          {option === "public"
                            ? "Anyone can join"
                            : PRIVATE_ENABLED
                              ? "Members join via invite code"
                              : "Coming soon"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {type === "private" && PRIVATE_ENABLED ? (
                  <Text className="text-xs text-textSecondary mt-2">
                    A 6-character invite code will be generated.
                  </Text>
                ) : null}

                {error ? (
                  <Text className="text-xs text-red-500 mt-2">{error}</Text>
                ) : null}

                <View className="flex-row mt-5 space-x-3">
                  <Pressable
                    className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-3 bg-white"
                    onPress={handleClose}
                    disabled={loading}
                  >
                    <Text className="text-center text-textPrimary font-semibold">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 rounded-xl px-4 py-3 ${
                      isValidName && !loading && userId
                        ? "bg-primary"
                        : "bg-primary/60"
                    }`}
                    onPress={handleCreate}
                    disabled={!isValidName || loading || !userId}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white font-semibold text-center">
                        Create
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
