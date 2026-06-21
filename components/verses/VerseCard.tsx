import { Dimensions, Platform, View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { VerseAudioPlayer } from "./VerseAudioPlayer";
import { getDisplayVerseText, ScriptPreference } from "@/lib/verseText";
import {
  getVerseTextStyle,
  translationTextStyle,
  transliterationTextStyle,
} from "@/lib/textStyles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40; // 20px padding each side

export interface Verse {
  _id: string;
  chapterNumber: number;
  verseNumber: number;
  sanskritDevanagari: string;
  sanskritTelugu?: string | null;
  transliteration: string;
  translationEnglish: string;
}

interface VerseCardProps {
  verse: Verse;
  index: number;
  totalCards: number;
  scriptPreference?: ScriptPreference | null;
}

export function VerseCard({
  verse,
  index,
  totalCards,
  scriptPreference,
}: VerseCardProps) {
  // Only render top 3 cards for performance
  if (index > 2) return null;

  // Calculate stack offset - top card is index 0
  const scale = 1 - index * 0.05;
  const translateY = index * 10;
  const opacity = 1 - index * 0.2;
  const zIndex = totalCards - index;
  const verseText = getDisplayVerseText(verse, scriptPreference);

  return (
    <Animated.View
      className="absolute bg-surface rounded-2xl p-6 shadow-lg"
      style={{
        width: CARD_WIDTH,
        transform: [{ scale }, { translateY }],
        opacity,
        zIndex,
      }}
    >
      {/* Chapter & Verse Label */}
      <Text className="text-sm text-textSecondary mb-4">
        Chapter {verse.chapterNumber} • Verse {verse.verseNumber}
      </Text>

      {/* Sanskrit Text */}
      <Text
        className="text-xl text-secondary mb-4"
        style={getVerseTextStyle(scriptPreference)}
      >
        {verseText}
      </Text>

      {/* Transliteration */}
      <Text
        className="text-base italic text-textSecondary mb-4"
        style={transliterationTextStyle}
      >
        {verse.transliteration}
      </Text>

      {/* Divider */}
      <View className="h-px bg-gray-200 my-4" />

      {/* English Translation */}
      <Text className="text-base text-textPrimary" style={translationTextStyle}>
        {verse.translationEnglish}
      </Text>

      {/* Audio player — only on the top interactive card, not on native web */}
      {index === 0 && Platform.OS !== "web" && (
        <VerseAudioPlayer
          chapterNumber={verse.chapterNumber}
          verseNumber={verse.verseNumber}
          variant="compact"
        />
      )}
    </Animated.View>
  );
}
