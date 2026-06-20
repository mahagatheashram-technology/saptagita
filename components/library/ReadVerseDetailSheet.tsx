import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../verses/VerseCard";
import { formatVerseShareMessage, shareText } from "@/lib/shareText";
import { VerseAudioPlayer } from "../verses/VerseAudioPlayer";
import { useVerseAudio } from "@/hooks/useVerseAudio";
import { getDisplayVerseText, ScriptPreference } from "@/lib/verseText";
import {
  getVerseTextStyle,
  translationTextStyle,
  transliterationTextStyle,
} from "@/lib/textStyles";

interface ReadVerseDetailSheetProps {
  verse: Verse | null;
  isSavedToDefault: boolean;
  onAddToBucket: () => void;
  onQuickBookmark: () => void;
  onLogReadToday: () => void;
  scriptPreference?: ScriptPreference | null;
}

export const ReadVerseDetailSheet = forwardRef<
  BottomSheet,
  ReadVerseDetailSheetProps
>(({ verse, isSavedToDefault, onAddToBucket, onQuickBookmark, onLogReadToday, scriptPreference }, ref) => {
  const snapPoints = useMemo(() => ["72%"], []);

  // Stop audio when sheet closes
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
  }, [stop]);

  const handleShare = useCallback(async () => {
    if (!verse) return;
    const message = formatVerseShareMessage(verse, scriptPreference);
    await shareText(message);
  }, [scriptPreference, verse]);

  if (!verse) return null;
  const verseText = getDisplayVerseText(verse, scriptPreference);

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
        <View className="items-center pb-4">
          <Text className="text-base font-semibold text-textPrimary">
            Chapter {verse.chapterNumber} • Verse {verse.verseNumber}
          </Text>
        </View>

        {/* Verse content */}
        <View className="bg-surface rounded-2xl p-3 shadow-sm mb-3">
          <Text
            className="text-sm text-textSecondary mb-1"
            style={getVerseTextStyle(scriptPreference)}
          >
            {verseText}
          </Text>
          <Text
            className="text-xs text-textSecondary italic mb-2"
            style={transliterationTextStyle}
          >
            {verse.transliteration}
          </Text>
          <Text className="text-base text-textPrimary" style={translationTextStyle}>
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

        {/* Actions */}
        <View className="space-y-2">
          <SheetButton
            icon="folder-open-outline"
            label="Add to bucket"
            onPress={onAddToBucket}
          />
          <SheetButton
            icon="checkmark-circle-outline"
            label="Log read today"
            onPress={onLogReadToday}
          />
          <SheetButton
            icon="bookmark-outline"
            label={isSavedToDefault ? "Remove from Saved" : "Save to Saved"}
            onPress={onQuickBookmark}
          />
          <SheetButton
            icon="share-outline"
            label="Share verse"
            onPress={handleShare}
          />
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
