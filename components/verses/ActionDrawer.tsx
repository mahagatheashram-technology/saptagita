import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface ActionDrawerProps {
  verseId: string;
  chapterNumber: number;
  verseNumber: number;
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
      onBookmark,
      onAddToBucket,
      onShare,
      onClose,
    },
    ref
  ) => {
    const snapPoints = useMemo(() => ["45%"], []);

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

    const handleAction = async (
      action: () => void | Promise<void>,
      options?: { closeAfter?: boolean }
    ) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await action();
      if (options?.closeAfter !== false) {
        onClose();
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={onClose}
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
            <Text className="text-sm text-textSecondary mt-1">
              Choose an action
            </Text>
          </View>

          {/* Actions */}
          <View className="py-4">
            <ActionButton
              icon="bookmark-outline"
              label="Quick Bookmark"
              subtitle="Save to your default collection"
              onPress={() => handleAction(onBookmark)}
            />

            <ActionButton
              icon="folder-outline"
              label="Add to Bucket"
              subtitle="Choose a specific collection"
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
            onPress={onClose}
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
