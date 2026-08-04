import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SwipeableCard } from "./SwipeableCard";
import { Verse } from "./VerseCard";
import { getDisplayVerseText, ScriptPreference } from "@/lib/verseText";
import { Ionicons } from "@expo/vector-icons";
import {
  getVerseTextStyle,
  translationTextStyle,
  transliterationTextStyle,
} from "@/lib/textStyles";

interface CardStackProps {
  verses: Verse[];
  viewIndex: number; // which verse is on screen
  frontier: number; // first unread verse (read count)
  isSaved: boolean; // is the viewed verse saved to default
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
  onShare: () => void;
  interactionsEnabled?: boolean;
  microDemoNonce?: number;
  scriptPreference?: ScriptPreference | null;
}

export function CardStack({
  verses,
  viewIndex,
  frontier,
  isSaved,
  onPrev,
  onNext,
  onSave,
  onShare,
  interactionsEnabled = true,
  microDemoNonce = 0,
  scriptPreference,
}: CardStackProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!verses || verses.length === 0) return null;

  const verse = verses[viewIndex];
  if (!verse || !verse._id) return null;

  const isReviewing = viewIndex < frontier;
  const canPrev = viewIndex > 0;
  const canNext = viewIndex < verses.length; // forward always available while reading

  // Must match the `px-5` (20dp) gutter of the screen container in
  // app/(tabs)/index.tsx. It was screenWidth - 32, which made the card 4dp
  // wider than its own parent on each side and left it visibly out of line
  // with the header above it.
  const cardWidth = Math.min(screenWidth - 40, 720);
  const maxCardHeight = Math.max(240, screenHeight - 260);

  const isWeb = Platform.OS === "web";

  if (isWeb) {
    const verseText = getDisplayVerseText(verse, scriptPreference);
    return (
      <View className="w-full items-center justify-start pb-6">
        <View
          className="bg-surface rounded-3xl shadow-lg overflow-hidden"
          style={{ width: "100%", maxWidth: cardWidth, maxHeight: maxCardHeight }}
        >
          <ScrollView
            className="px-6 pt-6"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Text className="text-sm text-textSecondary">
                  Chapter {verse.chapterNumber} • Verse {verse.verseNumber}
                </Text>
                {isReviewing && (
                  <View className="flex-row items-center bg-green-50 rounded-full px-2 py-0.5 ml-2">
                    <Ionicons name="checkmark" size={12} color="#1F7A4D" />
                    <Text className="text-[11px] text-[#1F7A4D] font-medium ml-0.5">
                      Read
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={onSave}
                  className="w-9 h-9 rounded-xl items-center justify-center active:bg-sand-50"
                >
                  <Ionicons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={isSaved ? "#FF6B35" : "#5F5E5A"}
                  />
                </Pressable>
                <Pressable
                  onPress={onShare}
                  className="w-9 h-9 rounded-xl items-center justify-center active:bg-sand-50 ml-1"
                >
                  <Ionicons name="share-outline" size={20} color="#5F5E5A" />
                </Pressable>
              </View>
            </View>

            <Text
              className="text-xl text-secondary mb-4"
              style={getVerseTextStyle(scriptPreference)}
            >
              {verseText}
            </Text>
            <Text
              className="text-base italic text-textSecondary mb-4"
              style={transliterationTextStyle}
            >
              {verse.transliteration}
            </Text>
            <View className="h-px bg-sand-100 my-4" />
            <Text className="text-base text-textPrimary" style={translationTextStyle}>
              {verse.translationEnglish}
            </Text>
          </ScrollView>

          <View className="flex-row items-center justify-between px-6 py-4 border-t border-sand-100">
            <Pressable
              onPress={onPrev}
              disabled={!canPrev}
              className="pr-3 py-2"
              style={{ opacity: canPrev ? 1 : 0.4 }}
            >
              <Text className="text-textSecondary font-medium">← Previous</Text>
            </Pressable>
            <Pressable onPress={onNext} className="pl-3 py-2">
              <Text className="text-primary font-semibold">
                {isReviewing ? "Next →" : "Mark as read →"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1 items-center justify-start relative w-full py-1"
      style={{ minHeight: 0 }}
    >
      <SwipeableCard
        key={verse._id}
        verse={verse}
        scriptPreference={scriptPreference}
        isReviewing={isReviewing}
        isSaved={isSaved}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        onSave={onSave}
        onShare={onShare}
        cardWidth={cardWidth}
        maxCardHeight={maxCardHeight}
        interactionsEnabled={interactionsEnabled}
        microDemoNonce={microDemoNonce}
      />
    </View>
  );
}
