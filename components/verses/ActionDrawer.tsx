import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { impact } from "@/lib/haptics";
import { VerseAudioPlayer } from "./VerseAudioPlayer";
import { useVerseAudio } from "@/hooks/useVerseAudio";

interface ActionDrawerProps {
  verseId: string;
  chapterNumber: number;
  verseNumber: number;
  isSavedToDefault: boolean;
  onBookmark: () => void;
  onAddToBucket: () => void;
  onShare: () => void;
  onClose: () => void;
}

export const ActionDrawer = forwardRef<BottomSheet, ActionDrawerProps>(
  (
    {
      verseId,
      chapterNumber,
      verseNumber,
      isSavedToDefault,
      onBookmark,
      onAddToBucket,
      onShare,
      onClose,
    },
    ref
  ) => {
    const snapPoints = useMemo(() => ["52%"], []);
    const { stop } = useVerseAudio(chapterNumber, verseNumber);

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
      onClose();
    }, [stop, onClose]);

    const handleAction = async (
      action: () => void | Promise<void>,
      options?: { closeAfter?: boolean }
    ) => {
      impact();
      await action();
      if (options?.closeAfter !== false) {
        handleClose();
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={handleClose}
        containerStyle={{ zIndex: 50, elevation: 50 }}
        backgroundStyle={{ backgroundColor: "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: "#CBD5E0" }}
      >
        <BottomSheetView className="flex-1 px-4">
          {/* Header */}
          <View className="items-center pb-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-secondary">
              Chapter {chapterNumber} • Verse {verseNumber}
            </Text>
          </View>

          {/* Audio player */}
          <View className="pt-4">
            <VerseAudioPlayer
              chapterNumber={chapterNumber}
              verseNumber={verseNumber}
              variant="full"
            />
          </View>

          {/* Actions */}
          <View className="py-3">
            <ActionButton
              icon="bookmark-outline"
              label={isSavedToDefault ? "Remove from Saved" : "Save to Saved"}
              subtitle="Default bucket (Saved)"
              onPress={() => handleAction(onBookmark)}
            />

            <ActionButton
              icon="folder-outline"
              label="Add to Bucket"
              subtitle="Choose one or more specific buckets"
              onPress={() => handleAction(onAddToBucket, { closeAfter: false })}
            />

            <ActionButton
              icon="share-outline"
              label="Share Verse"
              subtitle="Send to friends or social media"
              onPress={() => handleAction(onShare)}
            />
          </View>

          {/* Cancel button */}
          <Pressable
            onPress={handleClose}
            className="py-3 items-center border-t border-gray-100"
          >
            <Text className="text-textSecondary font-medium">Cancel</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

// Action button component
function ActionButton({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 px-2 rounded-xl active:bg-gray-50"
    >
      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
        <Ionicons name={icon} size={20} color="#FF6B35" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-medium text-textPrimary">
          {label}
        </Text>
        <Text className="text-sm text-textSecondary">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
    </Pressable>
  );
}
