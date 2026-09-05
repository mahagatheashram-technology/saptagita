import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type BottomSheet from "@gorhom/bottom-sheet";
import { Verse } from "../verses/VerseCard";
import { Ionicons } from "@expo/vector-icons";
import { formatVerseShareMessage, shareText } from "@/lib/shareText";
import { VerseAudioPlayer } from "../verses/VerseAudioPlayer";

import { getDisplayVerseText, ScriptPreference } from "@/lib/verseText";
import {
  getVerseTextStyle,
  translationTextStyle,
  transliterationTextStyle,
} from "@/lib/textStyles";

export interface BookmarkDetailSheetProps {
  verse: Verse | null;
  bucketName: string;
  onRemove: () => void;
  onManageBuckets: () => void;
  onClose?: () => void;
  scriptPreference?: ScriptPreference | null;
}

export const BookmarkDetailSheet = forwardRef<
  BottomSheet,
  BookmarkDetailSheetProps
>(
  (
    {
      verse,
      bucketName,
      onRemove,
      onManageBuckets,
      onClose,
      scriptPreference,
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);
    const isOpen = useRef(false);
    const { height } = useWindowDimensions();
    const open = useCallback(() => {
      isOpen.current = true;
      setVisible(true);
    }, []);
    const close = useCallback(() => {
      if (!isOpen.current) return;
      isOpen.current = false;
      setVisible(false);
      onClose?.();
    }, [onClose]);

    // Match the native sheet ref API, but never infer a user dismissal from
    // layout/snap animation events. The selected verse survives opening/resizing.
    useImperativeHandle(
      ref,
      () => ({
        snapToIndex: (index) => (index < 0 ? close() : open()),
        snapToPosition: open,
        expand: open,
        collapse: open,
        close,
        forceClose: close,
      }),
      [open, close]
    );

    const handleShare = useCallback(async () => {
      if (!verse) return;
      const message = formatVerseShareMessage(verse, scriptPreference);
      await shareText(message);
    }, [scriptPreference, verse]);
    const verseText = verse
      ? getDisplayVerseText(verse, scriptPreference)
      : "";

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(47,59,78,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss verse details"
            onPress={close}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            style={{
              height: height * 0.85,
              maxHeight: "100%",
              width: "100%",
              maxWidth: 720,
              alignSelf: "center",
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: "hidden",
            }}
          >
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-sand-100">
              <Text className="text-base font-semibold text-textPrimary">
                Verse details
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close verse details"
                onPress={close}
                className="px-3 py-2"
              >
                <Text className="text-base font-semibold text-primary">
                  Close
                </Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ flex: 1, minHeight: 0 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              {visible &&
                (!verse ? (
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
                      <Text
                        className="text-base text-textPrimary"
                        style={translationTextStyle}
                      >
                        {verse.translationEnglish}
                      </Text>
                    </View>

                    <View className="mb-3">
                      <VerseAudioPlayer
                        key={verse._id}
                        chapterNumber={verse.chapterNumber}
                        verseNumber={verse.verseNumber}
                        variant="full"
                      />
                    </View>

                    <View className="gap-2">
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
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
);

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
      className="flex-row items-center px-3 py-3 rounded-xl active:bg-sand-50"
    >
      <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#FF6B35" />
      </View>
      <Text className="text-base text-textPrimary flex-1">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#D6C3AE" />
    </Pressable>
  );
}
