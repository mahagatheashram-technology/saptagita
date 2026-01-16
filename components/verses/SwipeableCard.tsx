import { Dimensions, View, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "./VerseCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width

interface SwipeableCardProps {
  verse: Verse;
  index: number;
  totalCards: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  cardWidth: number;
}

export function SwipeableCard({
  verse,
  index,
  totalCards,
  onSwipeRight,
  onSwipeLeft,
  isTop,
  cardWidth,
}: SwipeableCardProps) {
  // Only render top 3 cards for performance
  if (index > 2) return null;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Stack positioning
  const baseScale = 1 - index * 0.05;
  const baseTranslateY = index * 10;
  const baseOpacity = 1 - index * 0.2;
  const zIndex = totalCards - index;

  const resetPosition = () => {
    'worklet';
    translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
  };

  const panGesture = Gesture.Pan()
    .enabled(isTop) // Only top card is swipeable
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5; // Dampen vertical movement
      rotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-15, 0, 15],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      // Swipe RIGHT - Mark as read
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(onSwipeRight)();
        translateX.value = withTiming(SCREEN_WIDTH + 100, { duration: 300 });
        rotation.value = withTiming(20, { duration: 300 });
      }
      // Swipe LEFT - More options (animate but keep card)
      else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(onSwipeLeft)();
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
      // Return to center
      else {
        resetPosition();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + baseTranslateY },
        { rotate: `${rotation.value}deg` },
        { scale: baseScale },
      ],
      opacity: baseOpacity,
      zIndex,
    };
  });

  // Swipe indicator styles
  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute bg-surface rounded-2xl p-6 shadow-lg"
        style={[{ width: cardWidth }, animatedStyle]}
      >
        {/* Right swipe indicator - Mark as read */}
        <Animated.View
          className="absolute top-4 right-4 bg-green-500 rounded-full p-2"
          style={rightIndicatorStyle}
        >
          <Ionicons name="checkmark" size={24} color="white" />
        </Animated.View>

        {/* Left swipe indicator - More options */}
        <Animated.View
          className="absolute top-4 left-4 bg-primary rounded-full p-2"
          style={leftIndicatorStyle}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="white" />
        </Animated.View>

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
    </GestureDetector>
  );
}
