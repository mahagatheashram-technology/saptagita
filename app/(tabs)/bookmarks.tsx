import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BucketCard } from "@/components/bookmarks";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function BookmarksScreen() {
  const router = useRouter();
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const userId = currentUser?._id ?? null;
  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketIcon, setNewBucketIcon] = useState("📁");
  const [renamingId, setRenamingId] = useState<Id<"bookmarkBuckets"> | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [renameIcon, setRenameIcon] = useState("📁");

  const ensureDefaultBucket = useMutation(api.bookmarks.ensureDefaultBucket);
  const createBucket = useMutation(api.bookmarks.createBucket);
  const renameBucket = useMutation(api.bookmarks.renameBucket);
  const deleteBucket = useMutation(api.bookmarks.deleteBucket);

  useEffect(() => {
    if (userId) {
      ensureDefaultBucket({ userId }).catch(console.error);
    }
  }, [userId, ensureDefaultBucket]);

  const buckets = useQuery(
    api.bookmarks.getUserBuckets,
    userId ? { userId } : "skip"
  );

  const handleCreate = async () => {
    if (!userId) return;
    const name = newBucketName.trim();
    if (!name) return;
    try {
      await createBucket({ userId, name, icon: newBucketIcon });
      setNewBucketName("");
      setNewBucketIcon("📁");
    } catch (error: any) {
      Alert.alert("Could not create bucket", String(error?.message ?? error));
    }
  };

  const startRename = (id: Id<"bookmarkBuckets">, current: string, icon?: string) => {
    setRenamingId(id);
    setRenameValue(current);
    setRenameIcon(icon || "📁");
  };

  const handleRename = async () => {
    if (!userId || !renamingId) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameBucket({ bucketId: renamingId, userId, newName: name, icon: renameIcon });
      setRenamingId(null);
      setRenameValue("");
      setRenameIcon("📁");
    } catch (error: any) {
      Alert.alert("Could not rename bucket", String(error?.message ?? error));
    }
  };

  const confirmDelete = (id: Id<"bookmarkBuckets">, name: string) => {
    Alert.alert(
      "Delete bucket?",
      `Bucket "${name}" and its bookmarks will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;
            try {
              await deleteBucket({ bucketId: id, userId });
            } catch (error: any) {
              Alert.alert("Could not delete bucket", String(error?.message ?? error));
            }
          },
        },
      ]
    );
  };

  if (isUserLoading || !userId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Loading your account...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-secondary mb-1">
          Bookmarks
        </Text>
        <Text className="text-sm text-textSecondary">
          Organize your saved verses into buckets.
        </Text>
      </View>

      <View className="px-5 py-2">
        <View className="bg-surface rounded-2xl px-4 py-3 shadow-sm">
          <View className="flex-row items-center">
            <View className="mr-3">
              <Text className="text-2xl">{newBucketIcon}</Text>
            </View>
            <TextInput
              value={newBucketName}
              onChangeText={setNewBucketName}
              placeholder="New bucket name"
              className="flex-1 text-base text-textPrimary"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              style={{ paddingVertical: 10 }}
            />
            <Pressable
              onPress={handleCreate}
              className="ml-3 px-3 py-2 rounded-xl bg-primary active:opacity-80"
            >
              <Text className="text-white font-medium text-sm">Add</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, gap: 8, paddingRight: 4 }}
          >
            {["📁", "⭐️", "📚", "🙏", "❤️", "✨", "🧘‍♂️", "📝", "🌱", "🎯"].map(
              (emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => setNewBucketIcon(emoji)}
                  className={`px-3 py-2 rounded-full ${
                    newBucketIcon === emoji ? "bg-primary/10" : "bg-gray-100"
                  }`}
                >
                  <Text className="text-lg">{emoji}</Text>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>
      </View>

      {renamingId && (
        <View className="px-5">
          <Text className="text-sm text-textSecondary mb-2">
            Renaming bucket
          </Text>
          <View className="bg-surface rounded-2xl px-4 py-3 shadow-sm">
            <View className="flex-row items-center">
              <View className="mr-3">
                <Text className="text-2xl">{renameIcon}</Text>
              </View>
              <TextInput
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="New name"
                className="flex-1 text-base text-textPrimary"
                returnKeyType="done"
                onSubmitEditing={handleRename}
                style={{ paddingVertical: 10 }}
              />
              <Pressable
                onPress={handleRename}
                className="ml-3 px-3 py-2 rounded-xl bg-primary active:opacity-80"
              >
                <Text className="text-white font-medium text-sm">Save</Text>
              </Pressable>
              <Pressable
              onPress={() => {
                setRenamingId(null);
                setRenameValue("");
                setRenameIcon("📁");
              }}
              className="ml-2 px-3 py-2 rounded-xl bg-gray-100 active:opacity-80"
            >
                <Text className="text-textSecondary font-medium text-sm">Cancel</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4, gap: 8, paddingRight: 4 }}
            >
              {["📁", "⭐️", "📚", "🙏", "❤️", "✨", "🧘‍♂️", "📝", "🌱", "🎯"].map(
                (emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setRenameIcon(emoji)}
                    className={`px-3 py-2 rounded-full ${
                      renameIcon === emoji ? "bg-primary/10" : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-lg">{emoji}</Text>
                  </Pressable>
                )
              )}
            </ScrollView>
          </View>
        </View>
      )}

      <View className="flex-1 px-5 pt-2">
        {!buckets ? (
          <Text className="text-textSecondary mt-4">Loading buckets...</Text>
        ) : buckets.length === 0 ? (
          <Text className="text-textSecondary mt-4">
            No buckets yet. Create one above.
          </Text>
        ) : (
          <FlatList
            data={buckets}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View>
                <BucketCard
                  name={item.name}
                  count={item.bookmarkCount ?? 0}
                  isDefault={item.isDefault}
                  icon={item.icon}
                  onPress={() => router.push(`/bucket/${item._id}`)}
                  onLongPress={
                    item.isDefault
                      ? undefined
                      : () =>
                          confirmDelete(
                            item._id as Id<"bookmarkBuckets">,
                            item.name
                          )
                  }
                />
                {!item.isDefault && (
                  <View className="flex-row justify-end mb-4 px-2 space-x-2">
                    <Pressable
                      onPress={() =>
                        startRename(item._id as Id<"bookmarkBuckets">, item.name, item.icon)
                      }
                      className="px-3 py-2 rounded-full bg-primary/10 active:opacity-80"
                    >
                      <Text className="text-primary text-sm font-medium">
                        Rename
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        confirmDelete(item._id as Id<"bookmarkBuckets">, item.name)
                      }
                      className="px-3 py-2 rounded-full bg-red-50 active:opacity-80"
                    >
                      <Text className="text-red-500 text-sm font-medium">
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

