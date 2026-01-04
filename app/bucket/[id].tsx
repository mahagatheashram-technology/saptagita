import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
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

export default function BucketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const bucketIdValue = Array.isArray(id) ? id[0] : id;
  const bucketId = bucketIdValue as Id<"bookmarkBuckets">;

  if (!bucketIdValue) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Pressable onPress={() => router.back()} className="mb-3">
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

  const removeBookmark = useMutation(api.bookmarks.removeBookmark);

  const bucket = useQuery(
    api.bookmarks.getBucketById,
    userId && bucketId ? { bucketId, userId } : "skip"
  );

  const bookmarks = useQuery(
    api.bookmarks.getBookmarksInBucket,
    userId && bucketId ? { bucketId, userId } : "skip"
  );

  const isLoading = isUserLoading || !userId || !bucket || !bookmarks;

  const handleBack = () => {
    router.back();
  };

  const handleRowPress = (item: any) => {
    setSelectedVerse(item);
    detailSheetRef.current?.snapToIndex(0);
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
      ) : bookmarks.length === 0 ? (
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
              {bookmarks.length} {bookmarks.length === 1 ? "verse" : "verses"}
            </Text>
          </View>
          {bookmarks.map((b: any) =>
            b.verse ? (
              <BookmarkRow
                key={b._id}
                verse={b.verse}
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
        onManageBuckets={() => {
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
