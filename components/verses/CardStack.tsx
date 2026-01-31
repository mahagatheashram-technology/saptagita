import { Dimensions, Platform, Pressable, ScrollView, Text, View } from "react-native";
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

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const cardWidth = Math.min(screenWidth - 32, 720);
  const maxCardHeight = Math.max(320, screenHeight - 260);

  // Safety check: ensure we have verses to render
  if (remainingVerses.length === 0) {
    return null;
  }

  const isWeb = Platform.OS === "web";

  if (isWeb) {
    const top = remainingVerses[0];
    if (!top) return null;
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
          </ScrollView>

          <View className="flex-row items-center justify-between px-6 py-4 border-t border-gray-100">
            <Pressable onPress={onSwipeLeft} className="pr-3 py-2">
              <Text className="text-textSecondary font-medium">More options</Text>
            </Pressable>
            <Pressable onPress={onSwipeRight} className="pl-3 py-2">
              <Text className="text-primary font-semibold">Mark as read →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center relative w-full">
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
            cardWidth={cardWidth}
          />
        ))}
    </View>
  );
}
