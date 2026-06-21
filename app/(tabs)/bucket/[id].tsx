import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BookmarkRow } from "@/components/bookmarks/BookmarkRow";
import { BookmarkDetailSheet } from "@/components/bookmarks/BookmarkDetailSheet";
import BottomSheet from "@gorhom/bottom-sheet";
import { BucketPickerModal } from "@/components/bookmarks";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BucketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const bucketIdValue = Array.isArray(id) ? id[0] : id;
  const bucketId = bucketIdValue as Id<"bookmarkBuckets">;

  if (!bucketIdValue) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Pressable onPress={() => router.replace("/bookmarks")} className="mb-3">
          <Text className="text-primary">Go back</Text>
        </Pressable>
        <Text className="text-textSecondary">Bucket not found</Text>
      </SafeAreaView>
    );
  }

  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const userId = currentUser?._id ?? null;
  const [selectedVerse, setSelectedVerse] = useState<any | null>(null);
  const [showMovePicker, setShowMovePicker] = useState(false);

  const detailSheetRef = useRef<BottomSheet>(null);
  // When we close the sheet to hand off to another flow (move picker), the
  // resulting close event must NOT wipe the selection. This flag distinguishes
  // a programmatic hand-off close from a genuine user dismiss.
  const preserveSelectionRef = useRef(false);

  const removeBookmark = useMutation(api.bookmarks.removeBookmark);

  const bucket = useQuery(
    api.bookmarks.getBucketById,
    userId && bucketId ? { bucketId, userId } : "skip"
  );
  const userState = useQuery(
    api.users.getUserState,
    userId ? { userId } : "skip"
  );

  const bookmarks = useQuery(
    api.bookmarks.getBookmarksInBucket,
    userId && bucketId ? { bucketId, userId } : "skip"
  );

  const isQueryLoading =
    !!userId && (bucket === undefined || bookmarks === undefined);
  const isLoading = isUserLoading || isQueryLoading;
  const bookmarkItems = bookmarks ?? [];

  const handleBack = () => {
    // bucket/[id] is a hidden tab screen, so router.back() pops to the default
    // tab (Today). Navigate to the Library (bookmarks) tab explicitly instead.
    router.replace("/bookmarks");
  };

  const handleRowPress = (item: any) => {
    setSelectedVerse(item);
    // Snap on the next frame so the sheet renders the freshly-selected verse
    // before it animates open. Switching verses while open just re-snaps; the
    // open sheet emits no close event, so selection stays in sync.
    requestAnimationFrame(() => {
      detailSheetRef.current?.snapToIndex(0);
    });
  };

  const handleSheetClose = () => {
    if (preserveSelectionRef.current) {
      preserveSelectionRef.current = false;
      return;
    }
    setSelectedVerse(null);
  };

  const handleRemove = async () => {
    if (!userId || !selectedVerse) return;
    await removeBookmark({
      userId,
      bucketId,
      verseId: selectedVerse.verse._id,
    });
    detailSheetRef.current?.close();
    setSelectedVerse(null);
  };

  const headerEmoji = useMemo(() => bucket?.icon ?? "📁", [bucket]);

  const emptyHint = bucket?.isDefault
    ? "Swipe left on any verse and tap Bookmark to save it here."
    : "Add verses to this bucket from the Today screen.";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: false,
          title: bucket ? bucket.name : "Bucket",
        }}
      />
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={handleBack} hitSlop={10} className="mr-2">
          <Ionicons name="chevron-back" size={24} color="#1A365D" />
        </Pressable>
        <Text className="text-lg font-semibold text-textPrimary">
          {headerEmoji} {bucket?.name ?? ""}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : !userId || !bucket ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-textPrimary mb-2">
            Could not load this bucket
          </Text>
          <Text className="text-sm text-textSecondary text-center mb-4">
            Please go back and open it again.
          </Text>
          <Pressable
            onPress={handleBack}
            className="px-4 py-2 rounded-full bg-primary active:opacity-80"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </Pressable>
        </View>
      ) : bookmarkItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📖</Text>
          <Text className="text-lg font-semibold text-textPrimary mb-2">
            No verses saved yet
          </Text>
          <Text className="text-sm text-textSecondary text-center">
            {emptyHint}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="flex-row items-center mb-3">
            <Text className="text-sm text-textSecondary">
              {bookmarkItems.length}{" "}
              {bookmarkItems.length === 1 ? "verse" : "verses"}
            </Text>
          </View>
          {bookmarkItems.map((b: any) =>
            b.verse ? (
              <BookmarkRow
                key={b._id}
                verse={b.verse}
                scriptPreference={userState?.scriptPreference}
                onPress={() => handleRowPress(b)}
              />
            ) : null
          )}
        </ScrollView>
      )}

      <BookmarkDetailSheet
        ref={detailSheetRef}
        verse={selectedVerse?.verse ?? null}
        bucketName={`${headerEmoji} ${bucket?.name ?? ""}`}
        onRemove={handleRemove}
        onClose={handleSheetClose}
        scriptPreference={userState?.scriptPreference}
        onManageBuckets={() => {
          // Hand off to the move picker without losing the selected verse.
          preserveSelectionRef.current = true;
          detailSheetRef.current?.close();
          setShowMovePicker(true);
        }}
      />

      <BucketPickerModal
        visible={showMovePicker}
        onClose={() => {
          setShowMovePicker(false);
          setSelectedVerse(null);
        }}
        userId={userId}
        verseId={selectedVerse?.verse?._id ?? null}
        onMoved={() => setShowMovePicker(false)}
      />
    </SafeAreaView>
  );
}
