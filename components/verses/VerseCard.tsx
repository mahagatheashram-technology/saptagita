import { Dimensions, View, Text } from "react-native";
import Animated from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40; // 20px padding each side

export interface Verse {
  _id: string;
  chapterNumber: number;
  verseNumber: number;
  sanskritDevanagari: string;
  transliteration: string;
  translationEnglish: string;
}

interface VerseCardProps {
  verse: Verse;
  index: number;
  totalCards: number;
}

export function VerseCard({ verse, index, totalCards }: VerseCardProps) {
  // Only render top 3 cards for performance
  if (index > 2) return null;

  // Calculate stack offset - top card is index 0
  const scale = 1 - index * 0.05;
  const translateY = index * 10;
  const opacity = 1 - index * 0.2;
  const zIndex = totalCards - index;

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
      <Text className="text-xl text-secondary leading-9 mb-4">
        {verse.sanskritDevanagari}
      </Text>

      {/* Transliteration */}
      <Text className="text-base italic text-textSecondary mb-4">
        {verse.transliteration}
      </Text>

      {/* Divider */}
      <View className="h-px bg-gray-200 my-4" />

      {/* English Translation */}
      <Text className="text-base text-textPrimary leading-7">
        {verse.translationEnglish}
      </Text>
    </Animated.View>
  );
}
