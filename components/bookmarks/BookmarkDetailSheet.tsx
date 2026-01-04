import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, Share, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Verse } from "../verses/VerseCard";
import { Ionicons } from "@expo/vector-icons";

interface BookmarkDetailSheetProps {
  verse: Verse | null;
  bucketName: string;
  onRemove: () => void;
  onManageBuckets: () => void;
}

export const BookmarkDetailSheet = forwardRef<
  BottomSheet,
  BookmarkDetailSheetProps
>(({ verse, bucketName, onRemove, onManageBuckets }, ref) => {
  const snapPoints = useMemo(() => ["65%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleShare = useCallback(async () => {
    if (!verse) return;
    try {
      await Share.share({
        message: `Bhagavad Gita ${verse.chapterNumber}.${verse.verseNumber}\n\n${verse.sanskritDevanagari}\n\n${verse.transliteration}\n\n"${verse.translationEnglish}"\n\n— Shared from Sapta Gita`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  }, [verse]);

  if (!verse) return null;

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#FFFFFF" }}
      handleIndicatorStyle={{ backgroundColor: "#CBD5E0" }}
    >
      <BottomSheetView className="flex-1 px-4">
        <View className="items-center pb-4">
          <Text className="text-base font-semibold text-textPrimary">
            {bucketName}
          </Text>
          <Text className="text-sm text-textSecondary mt-1">
            Chapter {verse.chapterNumber} • Verse {verse.verseNumber}
          </Text>
        </View>

        <View className="bg-surface rounded-2xl p-3 shadow-sm mb-4">
          <Text className="text-sm text-textSecondary mb-1">
            {verse.sanskritDevanagari}
          </Text>
          <Text className="text-xs text-textSecondary italic mb-2">
            {verse.transliteration}
          </Text>
          <Text className="text-base text-textPrimary">
            {verse.translationEnglish}
          </Text>
        </View>

        <View className="space-y-2">
          <SheetButton icon="folder-open-outline" label="Add / remove buckets" onPress={onManageBuckets} />
          <SheetButton icon="share-outline" label="Share verse" onPress={handleShare} />
          <SheetButton icon="trash-outline" label="Remove from bucket" onPress={onRemove} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

function SheetButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-3 py-3 rounded-xl active:bg-gray-50"
    >
      <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#FF6B35" />
      </View>
      <Text className="text-base text-textPrimary flex-1">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
    </Pressable>
  );
}
