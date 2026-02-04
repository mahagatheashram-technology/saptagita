import { useEffect, useRef, useState } from "react";
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
import BottomSheet from "@gorhom/bottom-sheet";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BucketCard, BucketPickerModal } from "@/components/bookmarks";
import { ReadVerseDetailSheet, ReadVerseRow } from "@/components/library";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useReadHistory, ReadSortMode } from "@/lib/hooks/useReadHistory";

export default function BookmarksScreen() {
  const router = useRouter();
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const userId = currentUser?._id ?? null;
  const timezone = currentUser?.timezone ?? "UTC";

  const [activeTab, setActiveTab] = useState<"bookmarks" | "read">(
    "bookmarks"
  );
  const [sortMode, setSortMode] = useState<ReadSortMode>("recent");
  const [selectedReadVerse, setSelectedReadVerse] = useState<any | null>(null);
  const [showBucketPicker, setShowBucketPicker] = useState(false);

  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketIcon, setNewBucketIcon] = useState("📁");
  const [renamingId, setRenamingId] = useState<Id<"bookmarkBuckets"> | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [renameIcon, setRenameIcon] = useState("📁");

  const readDetailSheetRef = useRef<BottomSheet>(null);

  const ensureDefaultBucket = useMutation(api.bookmarks.ensureDefaultBucket);
  const createBucket = useMutation(api.bookmarks.createBucket);
  const renameBucket = useMutation(api.bookmarks.renameBucket);
  const deleteBucket = useMutation(api.bookmarks.deleteBucket);
  const quickBookmark = useMutation(api.bookmarks.quickBookmark);
  const logReread = useMutation(api.dailySets.logReread);

  useEffect(() => {
    if (userId) {
      ensureDefaultBucket({ userId }).catch(console.error);
    }
  }, [userId, ensureDefaultBucket]);

  const buckets = useQuery(
    api.bookmarks.getUserBuckets,
    userId ? { userId } : "skip"
  );

  const readHistory = useReadHistory(
    activeTab === "read" ? userId : null,
    sortMode
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

  const startRename = (
    id: Id<"bookmarkBuckets">,
    current: string,
    icon?: string
  ) => {
    setRenamingId(id);
    setRenameValue(current);
    setRenameIcon(icon || "📁");
  };

  const handleRename = async () => {
    if (!userId || !renamingId) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameBucket({
        bucketId: renamingId,
        userId,
        newName: name,
        icon: renameIcon,
      });
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
              Alert.alert(
                "Could not delete bucket",
                String(error?.message ?? error)
              );
            }
          },
        },
      ]
    );
  };

  const formatLastRead = (timestamp?: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    try {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: timezone,
      });
    } catch {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const handleReadRowPress = (item: any) => {
    setSelectedReadVerse(item.verse);
    readDetailSheetRef.current?.snapToIndex(0);
  };

  const handleAddToBucket = () => {
    if (!selectedReadVerse) return;
    readDetailSheetRef.current?.close();
    setShowBucketPicker(true);
  };

  const handleQuickBookmark = async () => {
    if (!userId || !selectedReadVerse) return;
    try {
      const result = await quickBookmark({
        userId,
        verseId: selectedReadVerse._id,
      });
      if (result?.removed) {
        Alert.alert("Removed", "Verse removed from Saved.");
      } else if (result?.added) {
        Alert.alert("Saved", "Verse added to Saved.");
      }
    } catch (error: any) {
      Alert.alert("Could not bookmark", String(error?.message ?? error));
    }
  };

  const handleLogReadToday = async () => {
    if (!userId || !selectedReadVerse) return;
    try {
      await logReread({ userId, verseId: selectedReadVerse._id });
      readDetailSheetRef.current?.close();
      Alert.alert("Logged", "Counted your reading for today.");
    } catch (error: any) {
      Alert.alert("Could not log read", String(error?.message ?? error));
    }
  };

  if (isUserLoading || !userId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Loading your account...</Text>
      </SafeAreaView>
    );
  }

  const totalReadVerses = readHistory?.totalReadVerses ?? 0;
  const totalVerses = readHistory?.totalVerses ?? 701;
  const progressPct = totalVerses
    ? Math.min(100, Math.round((totalReadVerses / totalVerses) * 100))
    : 0;
  const readItems = readHistory?.items ?? [];
  const isReadLoading = activeTab === "read" && !readHistory;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-secondary mb-1">Library</Text>
        <Text className="text-sm text-textSecondary">
          Saved and read verses.
        </Text>
      </View>

      <View className="px-5 pb-2">
        <View className="flex-row bg-gray-100 rounded-full p-1">
          <Pressable
            onPress={() => setActiveTab("bookmarks")}
            className={`flex-1 py-2 rounded-full items-center ${
              activeTab === "bookmarks" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === "bookmarks"
                  ? "text-secondary"
                  : "text-textSecondary"
              }`}
            >
              Bookmarks
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("read")}
            className={`flex-1 py-2 rounded-full items-center ${
              activeTab === "read" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === "read" ? "text-secondary" : "text-textSecondary"
              }`}
            >
              Read
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === "bookmarks" ? (
        <>
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
                contentContainerStyle={{
                  paddingVertical: 4,
                  gap: 8,
                  paddingRight: 4,
                }}
              >
                {["📁", "⭐️", "📚", "🙏", "❤️", "✨", "🧘‍♂️", "📝", "🌱", "🎯"].map(
                  (emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => setNewBucketIcon(emoji)}
                      className={`px-3 py-2 rounded-full ${
                        newBucketIcon === emoji
                          ? "bg-primary/10"
                          : "bg-gray-100"
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
                    <Text className="text-textSecondary font-medium text-sm">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingVertical: 4,
                    gap: 8,
                    paddingRight: 4,
                  }}
                >
                  {["📁", "⭐️", "📚", "🙏", "❤️", "✨", "🧘‍♂️", "📝", "🌱", "🎯"].map(
                    (emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => setRenameIcon(emoji)}
                        className={`px-3 py-2 rounded-full ${
                          renameIcon === emoji
                            ? "bg-primary/10"
                            : "bg-gray-100"
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
              <Text className="text-textSecondary mt-4">
                Loading buckets...
              </Text>
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
                            startRename(
                              item._id as Id<"bookmarkBuckets">,
                              item.name,
                              item.icon
                            )
                          }
                          className="px-3 py-2 rounded-full bg-primary/10 active:opacity-80"
                        >
                          <Text className="text-primary text-sm font-medium">
                            Rename
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            confirmDelete(
                              item._id as Id<"bookmarkBuckets">,
                              item.name
                            )
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
        </>
      ) : (
        <View className="flex-1 px-5 pt-2">
          <FlatList
            data={readItems}
            keyExtractor={(item) => item.verse._id}
            renderItem={({ item }) => {
              const lastRead = formatLastRead(item.lastReadAt);
              return (
                <ReadVerseRow
                  verse={item.verse}
                  meta={lastRead ? `Last read ${lastRead}` : "Read"}
                  onPress={() => handleReadRowPress(item)}
                />
              );
            }}
            ListHeaderComponent={
              <View>
                <View className="bg-surface rounded-2xl p-4 shadow-sm mb-4">
                  <Text className="text-sm text-textSecondary mb-2">
                    Read {totalReadVerses} / {totalVerses} verses
                  </Text>
                  <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View
                      className="h-2 bg-primary"
                      style={{ width: `${progressPct}%` }}
                    />
                  </View>
                </View>
                <View className="flex-row items-center mb-3 space-x-2">
                  <Pressable
                    onPress={() => setSortMode("recent")}
                    className={`px-3 py-2 rounded-full ${
                      sortMode === "recent" ? "bg-primary/10" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        sortMode === "recent"
                          ? "text-primary"
                          : "text-textSecondary"
                      }`}
                    >
                      Most recent
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSortMode("canonical")}
                    className={`px-3 py-2 rounded-full ${
                      sortMode === "canonical"
                        ? "bg-primary/10"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        sortMode === "canonical"
                          ? "text-primary"
                          : "text-textSecondary"
                      }`}
                    >
                      Canonical order
                    </Text>
                  </Pressable>
                </View>
              </View>
            }
            ListEmptyComponent={
              isReadLoading ? (
                <Text className="text-textSecondary mt-4">
                  Loading read history...
                </Text>
              ) : (
                <View className="items-center justify-center py-10">
                  <Text className="text-lg font-semibold text-textPrimary mb-2">
                    No verses read yet
                  </Text>
                  <Text className="text-sm text-textSecondary text-center mb-4">
                    Read your daily verses to build your library.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/index")}
                    className="px-4 py-2 rounded-full bg-primary active:opacity-80"
                  >
                    <Text className="text-white font-medium">Go to Today</Text>
                  </Pressable>
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />

          <ReadVerseDetailSheet
            ref={readDetailSheetRef}
            verse={selectedReadVerse}
            onAddToBucket={handleAddToBucket}
            onQuickBookmark={handleQuickBookmark}
            onLogReadToday={handleLogReadToday}
          />

          <BucketPickerModal
            visible={showBucketPicker}
            onClose={() => {
              setShowBucketPicker(false);
              setSelectedReadVerse(null);
            }}
            userId={userId}
            verseId={selectedReadVerse?._id ?? null}
            onMoved={() => setShowBucketPicker(false)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
