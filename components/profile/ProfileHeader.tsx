import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ProfileHeaderProps {
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt: number;
  onEditName?: (nextName: string) => Promise<void>;
  isUpdatingName?: boolean;
}

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function ProfileHeader({
  displayName,
  email,
  avatarUrl,
  createdAt,
  onEditName,
  isUpdatingName,
}: ProfileHeaderProps) {
  const memberSince = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const initials = getInitials(displayName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftName(displayName);
  }, [displayName]);

  const handleSave = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      Alert.alert("Enter a name", "Display name cannot be empty.");
      return;
    }
    if (!onEditName) {
      setIsEditing(false);
      return;
    }
    try {
      setIsSaving(true);
      await onEditName(trimmed);
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Update failed", "Could not update your name. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm">
      <View className="flex-row items-center">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-12 w-12 rounded-full"
          />
        ) : (
          <View className="h-12 w-12 rounded-full bg-[#E2E8F0] items-center justify-center">
            <Text className="text-textPrimary font-semibold">{initials}</Text>
          </View>
        )}

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold text-textPrimary flex-1">
              {displayName}
            </Text>
            {onEditName ? (
              <Pressable
                onPress={() => {
                  setDraftName(displayName);
                  setIsEditing(true);
                }}
                disabled={isUpdatingName}
                className="pl-2"
              >
                <Ionicons
                  name="pencil"
                  size={18}
                  color="#718096"
                  style={{ opacity: isUpdatingName ? 0.6 : 1 }}
                />
              </Pressable>
            ) : null}
          </View>
          {email ? (
            <Text className="text-sm text-textSecondary">{email}</Text>
          ) : null}
          <Text className="text-xs text-textSecondary mt-1">
            Member since {memberSince}
          </Text>
        </View>
      </View>

      {isEditing ? (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditing(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 justify-center items-center bg-black/40 px-6"
          >
            <View className="bg-white w-full rounded-xl p-4">
              <Text className="text-base font-semibold text-secondary mb-2">
                Edit display name
              </Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Display name"
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-base text-textPrimary"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <View className="flex-row justify-end mt-3 space-x-3">
                <Pressable
                  onPress={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-lg"
                >
                  <Text className="text-textSecondary font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={isSaving || isUpdatingName}
                  className="bg-primary rounded-lg px-4 py-2 items-center"
                  style={{ opacity: isSaving || isUpdatingName ? 0.7 : 1 }}
                >
                  <Text className="text-white font-semibold">
                    {isSaving || isUpdatingName ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </View>
  );
}
