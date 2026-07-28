import { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { VerseAudioPlayer } from "./VerseAudioPlayer";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "./VerseCard";
import { getDisplayVerseText, ScriptPreference } from "@/lib/verseText";
import {
  getVerseTextStyle,
  translationTextStyle,
  transliterationTextStyle,
} from "@/lib/textStyles";

interface SwipeableCardProps {
  verse: Verse;
  scriptPreference?: ScriptPreference | null;
  // viewing an already-read verse (vs. the current/live one)
  isReviewing: boolean;
  isSaved: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void; // forward; marks read when on the live verse
  onSave: () => void;
  onShare: () => void;
  cardWidth: number;
  interactionsEnabled?: boolean;
  microDemoNonce?: number;
}

export function SwipeableCard({
  verse,
  scriptPreference,
  isReviewing,
  isSaved,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSave,
  onShare,
  cardWidth,
  interactionsEnabled = true,
  microDemoNonce = 0,
}: SwipeableCardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const swipeThreshold = screenWidth * 0.3;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const verseText = getDisplayVerseText(verse, scriptPreference);
  const cardPadding = screenHeight < 700 ? 16 : 20;

  const resetPosition = () => {
    "worklet";
    translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
  };

  // Micro-demo nudge to hint the swipe affordance.
  useEffect(() => {
    if (!interactionsEnabled || microDemoNonce === 0) return;
    translateX.value = withSequence(
      withTiming(30, { duration: 170 }),
      withTiming(-24, { duration: 220 }),
      withTiming(0, { duration: 180 })
    );
    rotation.value = withSequence(
      withTiming(5, { duration: 170 }),
      withTiming(-4, { duration: 220 }),
      withTiming(0, { duration: 180 })
    );
  }, [interactionsEnabled, microDemoNonce, rotation, translateX]);

  const panGesture = Gesture.Pan()
    .enabled(interactionsEnabled)
    .activeOffsetX([-12, 12]) // let inner taps / vertical scroll win until clearly horizontal
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
      rotation.value = interpolate(
        event.translationX,
        [-screenWidth / 2, 0, screenWidth / 2],
        [-12, 0, 12],
        Extrapolation.CLAMP
      );
    })
    .onEnd((event) => {
      // Swipe RIGHT — forward (marks read on the live verse)
      if (event.translationX > swipeThreshold && canNext) {
        runOnJS(onNext)();
        translateX.value = withTiming(screenWidth + 100, { duration: 250 });
        rotation.value = withTiming(16, { duration: 250 });
      }
      // Swipe LEFT — back to the previous verse
      else if (event.translationX < -swipeThreshold && canPrev) {
        runOnJS(onPrev)();
        translateX.value = withTiming(-screenWidth - 100, { duration: 250 });
        rotation.value = withTiming(-16, { duration: 250 });
      } else {
        resetPosition();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const p = interpolate(
      translateX.value,
      [0, swipeThreshold],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: canNext ? p : 0, transform: [{ scale: 0.9 + p * 0.15 }] };
  });

  const leftIndicatorStyle = useAnimatedStyle(() => {
    const p = interpolate(
      translateX.value,
      [-swipeThreshold, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity: canPrev ? p : 0, transform: [{ scale: 0.9 + p * 0.15 }] };
  });

  const cardFeedbackStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      translateX.value,
      [-swipeThreshold, 0, swipeThreshold],
      ["#C7DAEE", "#E9DFD3", "#BFE5D1"]
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={FadeIn.duration(160)}
        className="bg-surface rounded-2xl shadow-lg overflow-hidden"
        style={[
          {
            width: cardWidth,
            flex: 1,
            alignSelf: "center",
            padding: cardPadding,
            borderWidth: 1,
            borderColor: "#E9DFD3",
          },
          animatedStyle,
          cardFeedbackStyle,
        ]}
      >
        {/* Forward indicator */}
        <Animated.View
          pointerEvents="none"
          className="absolute top-4 right-4 z-10 rounded-full p-2"
          style={[
            { backgroundColor: isReviewing ? "#1A365D" : "#2F855A" },
            rightIndicatorStyle,
          ]}
        >
          <Ionicons
            name={isReviewing ? "arrow-forward" : "checkmark"}
            size={22}
            color="white"
          />
        </Animated.View>
        {/* Back indicator */}
        <Animated.View
          pointerEvents="none"
          className="absolute top-4 left-4 z-10 bg-secondary rounded-full p-2"
          style={leftIndicatorStyle}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 2 }}
        >
          {/* Header: chapter/verse + read badge + actions */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-2">
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
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={isSaved ? "Remove bookmark" : "Save verse"}
                className="w-10 h-10 rounded-xl items-center justify-center active:bg-gray-100"
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={21}
                  color={isSaved ? "#FF6B35" : "#5F5E5A"}
                />
              </Pressable>
              <View className="w-2" />
              <Pressable
                onPress={onShare}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Share verse"
                className="w-10 h-10 rounded-xl items-center justify-center active:bg-gray-100"
              >
                <Ionicons name="share-outline" size={21} color="#5F5E5A" />
              </Pressable>
            </View>
          </View>

          {/* Sanskrit */}
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

          <View className="h-px bg-gray-200 my-4" />

          {/* Translation */}
          <Text className="text-base text-textPrimary" style={translationTextStyle}>
            {verse.translationEnglish}
          </Text>

          {Platform.OS !== "web" && (
            <VerseAudioPlayer
              chapterNumber={verse.chapterNumber}
              verseNumber={verse.verseNumber}
              variant="compact"
            />
          )}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}
