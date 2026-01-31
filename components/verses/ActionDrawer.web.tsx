import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import { impact } from "@/lib/haptics";

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
      chapterNumber,
      verseNumber,
      onBookmark,
      onAddToBucket,
      onShare,
      onClose,
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);

    const handleClose = useCallback(() => {
      setVisible(false);
      onClose();
    }, [onClose]);

    useImperativeHandle(
      ref,
      () =>
        ({
          snapToIndex: () => setVisible(true),
          close: handleClose,
        }) as unknown as BottomSheet
    );

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

    const headerTitle = useMemo(() => {
      if (!chapterNumber || !verseNumber) return "Choose an action";
      return `Chapter ${chapterNumber} • Verse ${verseNumber}`;
    }, [chapterNumber, verseNumber]);

    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={handleClose}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <Pressable className="flex-1" onPress={handleClose} />
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-6 w-full max-w-xl self-center">
            <View className="items-center pb-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-secondary">
                {headerTitle}
              </Text>
              <Text className="text-sm text-textSecondary mt-1">
                Choose an action
              </Text>
            </View>

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

            <Pressable
              onPress={handleClose}
              className="py-3 items-center border-t border-gray-100"
            >
              <Text className="text-textSecondary font-medium">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }
);

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
        <Text className="text-base font-medium text-textPrimary">{label}</Text>
        <Text className="text-sm text-textSecondary">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
    </Pressable>
  );
}
