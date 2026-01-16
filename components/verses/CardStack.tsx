import { Dimensions, Platform, Text, View } from "react-native";
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
  const cardWidth = Math.min(screenWidth - 32, 720);

  // Safety check: ensure we have verses to render
  if (remainingVerses.length === 0) {
    return null;
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
