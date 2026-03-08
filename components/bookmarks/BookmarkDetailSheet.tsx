import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Verse } from "../verses/VerseCard";
import { Ionicons } from "@expo/vector-icons";
import { formatVerseShareMessage, shareText } from "@/lib/shareText";
import { VerseAudioPlayer } from "../verses/VerseAudioPlayer";
import { useVerseAudio } from "@/hooks/useVerseAudio";

interface BookmarkDetailSheetProps {
  verse: Verse | null;
  bucketName: string;
  onRemove: () => void;
  onManageBuckets: () => void;
  onClose?: () => void;
}

export const BookmarkDetailSheet = forwardRef<
  BottomSheet,
  BookmarkDetailSheetProps
>(({ verse, bucketName, onRemove, onManageBuckets, onClose }, ref) => {
  const snapPoints = useMemo(() => ["72%"], []);

  // Stop audio when sheet closes — falls back gracefully if verse is null
  const { stop } = useVerseAudio(verse?.chapterNumber ?? 0, verse?.verseNumber ?? 0);

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

  const handleClose = useCallback(async () => {
    await stop();
    onClose?.();
  }, [stop, onClose]);

  const handleShare = useCallback(async () => {
    if (!verse) return;
    const message = formatVerseShareMessage(verse);
    await shareText(message);
  }, [verse]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#FFFFFF" }}
      handleIndicatorStyle={{ backgroundColor: "#CBD5E0" }}
    >
      <BottomSheetView className="flex-1 px-4">
        {!verse ? (
          <View className="flex-1 items-center justify-center py-10">
            <Text className="text-base font-semibold text-textPrimary mb-2">
              Select a verse
            </Text>
            <Text className="text-sm text-textSecondary text-center">
              Tap any verse in this bucket to view actions.
            </Text>
          </View>
        ) : (
          <>
            <View className="items-center pb-4">
              <Text className="text-base font-semibold text-textPrimary">
                {bucketName}
              </Text>
              <Text className="text-sm text-textSecondary mt-1">
                Chapter {verse.chapterNumber} • Verse {verse.verseNumber}
              </Text>
            </View>

            {/* Verse content */}
            <View className="bg-surface rounded-2xl p-3 shadow-sm mb-3">
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

            {/* Audio player */}
            <View className="mb-3">
              <VerseAudioPlayer
                chapterNumber={verse.chapterNumber}
                verseNumber={verse.verseNumber}
                variant="full"
              />
            </View>

            {/* Action buttons */}
            <View className="space-y-2">
              <SheetButton
                icon="folder-open-outline"
                label="Add / remove buckets"
                onPress={onManageBuckets}
              />
              <SheetButton
                icon="share-outline"
                label="Share verse"
                onPress={handleShare}
              />
              <SheetButton
                icon="trash-outline"
                label="Remove from bucket"
                onPress={onRemove}
              />
            </View>
          </>
        )}
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
