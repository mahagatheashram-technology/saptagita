import { Platform, Text, View } from "react-native";
import { SwipeableCard } from "./SwipeableCard";
import { Verse } from "./VerseCard";

interface CardStackProps {
  verses: Verse[];
  currentIndex: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

export function CardStack({
  verses,
  currentIndex,
  onSwipeRight,
  onSwipeLeft,
}: CardStackProps) {
  // Safety check: ensure verses is an array
  if (!verses || verses.length === 0) {
    return null;
  }

  // Get remaining verses from current index (limit to 3 for stack)
  const remainingVerses = verses.slice(currentIndex).slice(0, 3);
  const total = remainingVerses.length;

  // Safety check: ensure we have verses to render
  if (remainingVerses.length === 0) {
    return null;
  }

  const isWeb = Platform.OS === "web";

  // Web fallback: render a static card (no gesture) with responsive max width
  if (isWeb) {
    const top = remainingVerses[0];
    if (!top) return null;
    return (
      <View className="w-full items-center justify-start">
        <View
          className="bg-surface rounded-3xl p-6 shadow-lg"
          style={{ width: "100%", maxWidth: 720 }}
        >
          <Text className="text-sm text-textSecondary mb-4">
            Chapter {top.chapterNumber} • Verse {top.verseNumber}
          </Text>

          <Text className="text-xl text-secondary leading-9 mb-4">
            {top.sanskritDevanagari}
          </Text>

          <Text className="text-base italic text-textSecondary mb-4">
            {top.transliteration}
          </Text>

          <View className="h-px bg-gray-200 my-4" />

          <Text className="text-base text-textPrimary leading-7">
            {top.translationEnglish}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center relative">
      {remainingVerses
        .filter((verse) => verse && verse._id) // Filter out invalid verses
        .map((verse, position) => ({ verse, position }))
        .reverse()
        .map(({ verse, position }) => (
          <SwipeableCard
            key={verse._id}
            verse={verse}
            index={position}
            totalCards={total}
            onSwipeRight={onSwipeRight}
            onSwipeLeft={onSwipeLeft}
            isTop={position === 0}
          />
        ))}
    </View>
  );
}
