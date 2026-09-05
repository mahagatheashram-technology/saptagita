import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Alert } from "@/lib/alert";
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
  const [bucketFeedback, setBucketFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setBucketFeedback(null);
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  const selectedSet = useMemo(() => {
    if (!verseBuckets) return new Set<string>();
    return new Set(verseBuckets.map((id) => String(id)));
  }, [verseBuckets]);
  const canCreateBucket = newBucketName.trim().length > 0;

  const setTransientFeedback = (message: string) => {
    setBucketFeedback(message);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setBucketFeedback(null);
    }, 1800);
  };

  const handleToggle = async (bucketId: Id<"bookmarkBuckets">) => {
    if (!userId || !verseId) return;
    const key = String(bucketId);
    const isSelected = selectedSet.has(key);
    const bucketName =
      buckets?.find((bucket) => String(bucket._id) === String(bucketId))?.name ??
      "this bucket";

    try {
      if (mode === "move" && sourceBucketId) {
        await moveBookmark({
          userId,
          verseId,
          sourceBucketId,
          targetBucketId: bucketId,
        });
        setTransientFeedback(`Moved to ${bucketName}`);
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = setTimeout(() => {
          onMoved?.();
          onClose();
        }, 450);
      } else if (isSelected) {
        await removeBookmark({ userId, bucketId, verseId });
        setTransientFeedback(`Removed from ${bucketName}`);
      } else {
        await addToBucket({ userId, bucketId, verseId });
        setTransientFeedback(`Saved to ${bucketName}`);
      }
    } catch (error: any) {
      Alert.alert("Bucket update failed", String(error?.message ?? error));
    }
  };

  const handleCreate = async () => {
    if (!userId || !canCreateBucket) return;
    const name = newBucketName.trim();
    try {
      const bucket = await createBucket({
        userId,
        name,
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
          setTransientFeedback(`Moved to ${name}`);
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
          }
          closeTimerRef.current = setTimeout(() => {
            onMoved?.();
            onClose();
          }, 450);
        } else {
          await addToBucket({ userId, bucketId: bucket._id, verseId });
          setTransientFeedback(`Saved to ${name}`);
        }
      }
    } catch (error: any) {
      Alert.alert("Could not create bucket", String(error?.message ?? error));
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedSet.has(String(item._id));
    return (
      <Pressable
        className={`flex-row items-center justify-between px-3 py-3 rounded-xl border ${
          isSelected
            ? "bg-[#ECF8F1] border-[#B7E3CA]"
            : "bg-white border-[#E9DFD3]"
        }`}
        onPress={() => handleToggle(item._id)}
      >
        <View className="flex-row items-center">
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
              isSelected ? "bg-[#2F855A]/15" : "bg-primary/10"
            }`}
          >
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
        <View
          className={`flex-row items-center px-2.5 py-1 rounded-full ${
            isSelected ? "bg-[#2F855A]/15" : "bg-sand-50"
          }`}
        >
          <Ionicons
            name={isSelected ? "checkmark-circle" : "add-circle-outline"}
            size={14}
            color={isSelected ? "#2F855A" : "#718096"}
          />
          <Text
            className={`text-xs font-medium ml-1 ${
              isSelected ? "text-[#2F855A]" : "text-textSecondary"
            }`}
          >
            {isSelected ? "Saved" : "Add"}
          </Text>
        </View>
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
            {bucketFeedback && (
              <View className="mb-3 rounded-lg bg-[#ECF8F1] border border-[#B7E3CA] px-3 py-2">
                <Text className="text-sm font-medium text-[#2F855A]">
                  {bucketFeedback}
                </Text>
              </View>
            )}

            <FlatList
              data={buckets ?? []}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View className="h-2" />}
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
              <View className="flex-row items-center bg-sand-50 rounded-xl px-3 py-2">
                <View style={{ marginRight: 8 }}>
                  <Text className="text-xl">{newBucketIcon}</Text>
                </View>
                <TextInput
                  value={newBucketName}
                  onChangeText={setNewBucketName}
                  placeholder="Type bucket name"
                  placeholderTextColor="#B8A894"
                  className="flex-1 text-base text-textPrimary"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (canCreateBucket) {
                      handleCreate();
                    }
                  }}
                  style={{
                    height: 44,
                    lineHeight: 20,
                    paddingTop: Platform.OS === "ios" ? 10 : 8,
                    paddingBottom: Platform.OS === "ios" ? 10 : 8,
                    includeFontPadding: false,
                    textAlignVertical: "center",
                  }}
                />
                <Pressable
                  onPress={handleCreate}
                  disabled={!canCreateBucket}
                  className={`px-3 py-2 rounded-lg ${
                    canCreateBucket ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <Text
                    className={`font-medium text-sm ${
                      canCreateBucket ? "text-white" : "text-sand-600"
                    }`}
                  >
                    Add
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row mt-2 gap-2">
                {["📁", "⭐️", "📚", "🙏", "❤️", "✨"].map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setNewBucketIcon(emoji)}
                    className={`px-3 py-2 rounded-full ${
                      newBucketIcon === emoji ? "bg-primary/10" : "bg-sand-50"
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
