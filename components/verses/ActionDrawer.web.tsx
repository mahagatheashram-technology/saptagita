import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import { impact } from "@/lib/haptics";
import { ScriptPreference } from "@/lib/verseText";

interface ActionDrawerProps {
  verseId: string;
  chapterNumber: number;
  verseNumber: number;
  isSavedToDefault: boolean;
  scriptPreference?: ScriptPreference | null;
  onBookmark: () => void;
  onAddToBucket: () => void;
  onShare: () => void;
  onScriptPreferenceChange: (value: ScriptPreference) => void | Promise<void>;
  onClose: () => void;
}

export const ActionDrawer = forwardRef<BottomSheet, ActionDrawerProps>(
  (
    {
      chapterNumber,
      verseNumber,
      isSavedToDefault,
      scriptPreference,
      onBookmark,
      onAddToBucket,
      onShare,
      onScriptPreferenceChange,
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
            <View className="items-center pb-4 border-b border-sand-100">
              <Text className="text-lg font-semibold text-secondary">
                {headerTitle}
              </Text>
            </View>

            <View className="py-4">
              <View className="px-2 pb-3 mb-1">
                <Text className="text-[11px] uppercase tracking-[1.2px] text-textSecondary mb-2">
                  Verse Script
                </Text>
                <View className="bg-[#F8F4EE] rounded-2xl p-1 flex-row">
                  <ScriptChip
                    label="Devanagari"
                    subtitle="Classic"
                    active={scriptPreference !== "telugu"}
                    onPress={() =>
                      handleAction(() => onScriptPreferenceChange("devanagari"), {
                        closeAfter: false,
                      })
                    }
                  />
                  <ScriptChip
                    label="Telugu"
                    subtitle="Regional"
                    active={scriptPreference === "telugu"}
                    onPress={() =>
                      handleAction(() => onScriptPreferenceChange("telugu"), {
                        closeAfter: false,
                      })
                    }
                  />
                </View>
              </View>

              <ActionButton
                icon="bookmark-outline"
                label={isSavedToDefault ? "Remove from Default" : "Save to Default"}
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

            <Pressable
              onPress={handleClose}
              className="py-3 items-center border-t border-sand-100"
            >
              <Text className="text-textSecondary font-medium">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }
);

function ScriptChip({
  label,
  subtitle,
  active,
  onPress,
}: {
  label: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-[14px] px-4 py-3 ${active ? "bg-white" : ""}`}
      style={
        active
          ? {
              shadowColor: "#D6C3AE",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 1,
            }
          : undefined
      }
    >
      <Text className="text-[11px] uppercase tracking-[1.2px] text-textSecondary mb-1">
        {subtitle}
      </Text>
      <Text className="text-base font-semibold text-textPrimary">{label}</Text>
    </Pressable>
  );
}

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
      className="flex-row items-center py-3 px-2 rounded-xl active:bg-sand-50"
    >
      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
        <Ionicons name={icon} size={20} color="#FF6B35" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-medium text-textPrimary">{label}</Text>
        <Text className="text-sm text-textSecondary">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D6C3AE" />
    </Pressable>
  );
}
