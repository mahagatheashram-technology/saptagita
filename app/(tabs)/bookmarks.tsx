import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import BottomSheet from "@gorhom/bottom-sheet";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BucketCard, BucketPickerModal, EmojiPicker } from "@/components/bookmarks";
import { FoundationFooter } from "@/components/common";
import {
  ReadVerseDetailSheet,
  ReadVerseRow,
  VerseBrowser,
} from "@/components/library";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useReadHistory } from "@/lib/hooks/useReadHistory";
import { getUserFacingErrorMessage } from "@/lib/userFacingError";

// Selected-segment styling. Deliberately a plain style object rather than a
// conditional `shadow-sm` class — see the comment at its use site.
const SELECTED_SEGMENT_STYLE = {
  backgroundColor: "#FFFFFF",
  shadowColor: "#D6C3AE",
  shadowOpacity: 0.2,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

/** Rows revealed per page in the Read tab. */
const READ_PAGE_SIZE = 10;

export default function BookmarksScreen() {
  const router = useRouter();
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const userId = currentUser?._id ?? null;
  const timezone = currentUser?.timezone ?? "UTC";

  const [activeTab, setActiveTab] = useState<"bookmarks" | "read" | "explore">(
    "bookmarks"
  );
  // Read history arrives as one payload, but rendering all of it at once means
  // hundreds of rows on a mature account. Reveal a page at a time as the user
  // scrolls. (The payload itself is still whole — trimming that needs a
  // paginated Convex query, which is a separate change.)
  const [visibleReadCount, setVisibleReadCount] = useState(READ_PAGE_SIZE);
  const isRevealingRef = useRef(false);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
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

  // Release the reveal latch once the new rows have committed, and start from
  // the first page again whenever the user leaves and re-enters the Read tab.
  useEffect(() => {
    isRevealingRef.current = false;
  }, [visibleReadCount]);

  useEffect(() => {
    if (activeTab !== "read") setVisibleReadCount(READ_PAGE_SIZE);
  }, [activeTab]);

  const buckets = useQuery(
    api.bookmarks.getUserBuckets,
    userId ? { userId } : "skip"
  );
  const userState = useQuery(
    api.users.getUserState,
    userId ? { userId } : "skip"
  );
  const selectedReadVerseBuckets = useQuery(
    api.bookmarks.getVerseBuckets,
    userId && selectedReadVerse?._id
      ? { userId, verseId: selectedReadVerse._id }
      : "skip"
  );

  const readHistory = useReadHistory(activeTab === "read" ? userId : null);

  const handleCreate = async () => {
    if (!userId) return;
    const name = newBucketName.trim();
    if (!name) return;
    try {
      await createBucket({ userId, name, icon: newBucketIcon });
      setNewBucketName("");
      setNewBucketIcon("📁");
      setShowCreateBucket(false);
    } catch (error: any) {
      Alert.alert("Could not create bucket", getUserFacingErrorMessage(error));
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

  const closeRenameEditor = () => {
    setRenamingId(null);
    setRenameValue("");
    setRenameIcon("📁");
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
      closeRenameEditor();
    } catch (error: any) {
      Alert.alert("Could not rename bucket", getUserFacingErrorMessage(error));
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

  const openBucketActions = (
    id: Id<"bookmarkBuckets">,
    name: string,
    icon?: string
  ) => {
    Alert.alert(name, "Choose an action", [
      {
        text: "Rename",
        onPress: () => startRename(id, name, icon),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDelete(id, name),
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
        Alert.alert("Removed", "Removed from Default.");
      } else if (result?.added) {
        Alert.alert("Saved", "Saved to Default.");
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
  const visibleReadItems = readItems.slice(0, visibleReadCount);
  const hasMoreReadItems = visibleReadCount < readItems.length;
  const isReadLoading = activeTab === "read" && !readHistory;

  const revealMoreReadItems = () => {
    // onEndReached can fire several times per scroll gesture; the ref keeps a
    // single gesture from skipping pages.
    if (!hasMoreReadItems || isRevealingRef.current) return;
    isRevealingRef.current = true;
    setVisibleReadCount((count) =>
      Math.min(count + READ_PAGE_SIZE, readItems.length)
    );
  };
  const defaultBucketId = buckets?.find((bucket) => bucket.isDefault)?._id ?? null;
  const isReadVerseSavedToDefault = Boolean(
    defaultBucketId &&
      selectedReadVerseBuckets?.some(
        (bucketId) => String(bucketId) === String(defaultBucketId)
      )
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-secondary mb-1">Library</Text>
        <Text className="text-sm text-textSecondary">
          Saved and read verses.
        </Text>
      </View>

      <View className="px-5 pb-2">
        <View className="flex-row bg-sand-50 rounded-full p-1">
          {(
            [
              { key: "bookmarks", label: "Bookmarks" },
              { key: "read", label: "Read" },
              { key: "explore", label: "Explore" },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              // The selected pill is styled through `style`, not a conditional
              // className. Adding `shadow-sm` only when selected made NativeWind
              // introduce a CSS variable *after* the initial render, which
              // triggers its dev-only "upgrade" warning. That warning calls
              // stringify(originalProps), which deep-walks props with
              // Object.entries() and enumerates React internals — including
              // React Navigation's context object, whose getters throw by
              // design. Result: "Couldn't find a navigation context" on every
              // sub-tab press, in dev only. Keep this className static.
              className="flex-1 py-2 rounded-full items-center"
              style={
                activeTab === tab.key ? SELECTED_SEGMENT_STYLE : undefined
              }
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key
                    ? "text-secondary"
                    : "text-textSecondary"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "bookmarks" ? (
        <>
          {/* The create form used to sit here permanently, taking the top of
              the screen for an action most visits never use. It now opens on
              demand and the bucket list gets the space back. */}
          <View className="px-5 py-2">
            {showCreateBucket ? (
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
                    autoFocus
                    onSubmitEditing={handleCreate}
                    style={{ paddingVertical: 10 }}
                  />
                  <Pressable
                    onPress={handleCreate}
                    className="ml-3 px-4 py-2 rounded-full bg-primary active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-sm">Add</Text>
                  </Pressable>
                </View>

                <EmojiPicker
                  selected={newBucketIcon}
                  onSelect={setNewBucketIcon}
                />

                <Pressable
                  onPress={() => {
                    setShowCreateBucket(false);
                    setNewBucketName("");
                    setNewBucketIcon("📁");
                  }}
                  className="items-center pt-1"
                >
                  <Text className="text-sm text-textSecondary">Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowCreateBucket(true)}
                className="flex-row items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 py-3 active:opacity-70"
              >
                <Ionicons name="add" size={18} color="#FF6B35" />
                <Text className="text-sm font-semibold text-primary ml-1">
                  New bucket
                </Text>
              </Pressable>
            )}
          </View>

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
                      onMenuPress={
                        item.isDefault
                          ? undefined
                          : () =>
                              openBucketActions(
                                item._id as Id<"bookmarkBuckets">,
                                item.name,
                                item.icon
                              )
                      }
                    />
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            )}
          </View>
        </>
      ) : activeTab === "read" ? (
        <View className="flex-1 px-5 pt-2">
          <FlatList
            data={visibleReadItems}
            onEndReached={revealMoreReadItems}
            onEndReachedThreshold={0.4}
            keyExtractor={(item) => item.verse._id}
            renderItem={({ item }) => {
              const lastRead = formatLastRead(item.lastReadAt);
              return (
                <ReadVerseRow
                  verse={item.verse}
                  meta={lastRead ? `Last read ${lastRead}` : "Read"}
                  scriptPreference={userState?.scriptPreference}
                  onPress={() => handleReadRowPress(item)}
                />
              );
            }}
            ListFooterComponent={
              hasMoreReadItems ? (
                <View className="items-center py-5">
                  <ActivityIndicator size="small" color="#FF6B35" />
                  <Text className="text-xs text-textSecondary mt-2">
                    Showing {visibleReadItems.length} of {readItems.length}
                  </Text>
                </View>
              ) : readItems.length > READ_PAGE_SIZE ? (
                <Text className="text-xs text-textSecondary/70 text-center py-5">
                  All {readItems.length} verses shown
                </Text>
              ) : null
            }
            ListHeaderComponent={
              <View>
                <View className="bg-surface rounded-2xl p-4 shadow-sm mb-4">
                  <Text className="text-sm text-textSecondary mb-2">
                    Read {totalReadVerses} / {totalVerses} verses
                  </Text>
                  <View className="h-2 bg-sand-100 rounded-full overflow-hidden">
                    <View
                      className="h-2 bg-primary"
                      style={{ width: `${progressPct}%` }}
                    />
                  </View>
                </View>
                <View className="h-2" />
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
                    onPress={() => router.push("/")}
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
            isSavedToDefault={isReadVerseSavedToDefault}
            onAddToBucket={handleAddToBucket}
            onQuickBookmark={handleQuickBookmark}
            onLogReadToday={handleLogReadToday}
            scriptPreference={userState?.scriptPreference}
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
      ) : (
        <VerseBrowser
          userId={userId}
          scriptPreference={userState?.scriptPreference}
        />
      )}

      <FoundationFooter />

      <Modal
        visible={Boolean(renamingId)}
        transparent
        animationType="fade"
        onRequestClose={closeRenameEditor}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-surface rounded-2xl p-4 w-full shadow-sm">
            <Text className="text-base font-semibold text-secondary mb-3">
              Rename bucket
            </Text>

            <View className="flex-row items-center mb-2">
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
            </View>

            <EmojiPicker selected={renameIcon} onSelect={setRenameIcon} />

            <View className="flex-row justify-end mt-4">
              <Pressable
                onPress={closeRenameEditor}
                className="px-4 py-2 rounded-xl bg-sand-50 active:opacity-80"
              >
                <Text className="text-textSecondary font-medium text-sm">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRename}
                className="ml-2 px-4 py-2 rounded-xl bg-primary active:opacity-80"
              >
                <Text className="text-white font-medium text-sm">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
