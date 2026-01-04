import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";

interface BucketPickerModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users"> | null;
  verseId: Id<"verses"> | null;
  mode?: "toggle" | "move";
  sourceBucketId?: Id<"bookmarkBuckets"> | null;
  onMoved?: () => void;
}

export function BucketPickerModal({
  visible,
  onClose,
  userId,
  verseId,
  mode = "toggle",
  sourceBucketId,
  onMoved,
}: BucketPickerModalProps) {
  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketIcon, setNewBucketIcon] = useState("📁");
  const insets = useSafeAreaInsets();

  const buckets = useQuery(
    api.bookmarks.getUserBuckets,
    userId ? { userId } : "skip"
  );

  const verseBuckets = useQuery(
    api.bookmarks.getVerseBuckets,
    userId && verseId ? { userId, verseId } : "skip"
  );

  const addToBucket = useMutation(api.bookmarks.addToBucket);
  const removeBookmark = useMutation(api.bookmarks.removeBookmark);
  const createBucket = useMutation(api.bookmarks.createBucket);
  const moveBookmark = useMutation(api.bookmarks.moveBookmark);

  useEffect(() => {
    if (!visible) {
      setNewBucketName("");
      setNewBucketIcon("📁");
    }
  }, [visible]);

  const selectedSet = useMemo(() => {
    if (!verseBuckets) return new Set<string>();
    return new Set(verseBuckets.map((id) => String(id)));
  }, [verseBuckets]);

  const handleToggle = async (bucketId: Id<"bookmarkBuckets">) => {
    if (!userId || !verseId) return;
    const key = String(bucketId);
    const isSelected = selectedSet.has(key);

    try {
      if (mode === "move" && sourceBucketId) {
        await moveBookmark({
          userId,
          verseId,
          sourceBucketId,
          targetBucketId: bucketId,
        });
        onMoved?.();
        onClose();
      } else if (isSelected) {
        await removeBookmark({ userId, bucketId, verseId });
      } else {
        await addToBucket({ userId, bucketId, verseId });
      }
    } catch (error: any) {
      Alert.alert("Bucket update failed", String(error?.message ?? error));
    }
  };

  const handleCreate = async () => {
    if (!userId || !newBucketName.trim()) return;
    try {
      const bucket = await createBucket({
        userId,
        name: newBucketName.trim(),
        icon: newBucketIcon,
      });
      setNewBucketName("");
      setNewBucketIcon("📁");
      if (bucket && verseId) {
        if (mode === "move" && sourceBucketId) {
          await moveBookmark({
            userId,
            verseId,
            sourceBucketId,
            targetBucketId: bucket._id,
          });
          onMoved?.();
          onClose();
        } else {
          await addToBucket({ userId, bucketId: bucket._id, verseId });
        }
      }
    } catch (error: any) {
      Alert.alert("Could not create bucket", String(error?.message ?? error));
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedSet.has(item._id);
    return (
      <Pressable
        className="flex-row items-center justify-between py-3"
        onPress={() => handleToggle(item._id)}
      >
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
            {item.icon ? (
              <Text className="text-xl">{item.icon}</Text>
            ) : (
              <Ionicons
                name={item.isDefault ? "bookmark" : "folder-outline"}
                size={18}
                color="#FF6B35"
              />
            )}
          </View>
          <View>
            <Text className="text-base font-medium text-textPrimary">
              {item.name}
            </Text>
            {item.isDefault && (
              <Text className="text-xs text-textSecondary">Default</Text>
            )}
          </View>
        </View>
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color="#38A169" />
        ) : (
          <Ionicons name="ellipse-outline" size={20} color="#CBD5E0" />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
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
              paddingTop: 16,
              paddingBottom: (insets.bottom || 0) + 16,
              paddingHorizontal: 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-textPrimary">
                Choose bucket
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color="#718096" />
              </Pressable>
            </View>
            <Text className="text-sm text-textSecondary mb-3">
              {mode === "move"
                ? "Choose a bucket to move this verse."
                : "Tap to add or remove this verse from your collections."}
            </Text>

            <FlatList
              data={buckets ?? []}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => (
                <View className="h-px bg-gray-100" />
              )}
              ListEmptyComponent={() => (
                <Text className="text-textSecondary py-6 text-center">
                  No buckets yet.
                </Text>
              )}
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            />

            <View className="mt-4">
              <Text className="text-sm text-textSecondary mb-2">
                Create new bucket
              </Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2">
                <View style={{ marginRight: 8 }}>
                  <Text className="text-xl">{newBucketIcon}</Text>
                </View>
                <TextInput
                  value={newBucketName}
                  onChangeText={setNewBucketName}
                  placeholder="Bucket name"
                  className="flex-1 text-base text-textPrimary"
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                  style={{ paddingVertical: 10 }}
                />
                <Pressable
                  onPress={handleCreate}
                  className="px-3 py-2 rounded-lg bg-primary"
                >
                  <Text className="text-white font-medium text-sm">Add</Text>
                </Pressable>
              </View>
              <View className="flex-row mt-2 space-x-2">
                {["📁", "⭐️", "📚", "🙏", "❤️", "✨"].map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setNewBucketIcon(emoji)}
                    className={`px-3 py-2 rounded-full ${
                      newBucketIcon === emoji ? "bg-primary/10" : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-lg text-center">{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
