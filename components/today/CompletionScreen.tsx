import { View, Text } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface CompletionScreenProps {
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
}

export function CompletionScreen({
  currentStreak,
  longestStreak,
  isNewRecord,
}: CompletionScreenProps) {
  // Animation values
  const checkScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const streakScale = useSharedValue(0);
  const flameRotation = useSharedValue(0);

  useEffect(() => {
    // Trigger success haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Staggered animations
    checkScale.value = withSpring(1, { damping: 8, stiffness: 100 });

    textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

    streakScale.value = withDelay(500, withSpring(1, { damping: 10 }));

    // Flame wiggle animation
    flameRotation.value = withDelay(
      600,
      withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      )
    );
  }, [checkScale, flameRotation, streakScale, textOpacity]);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      {
        translateY: interpolate(
          textOpacity.value,
          [0, 1],
          [20, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const streakAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
    opacity: streakScale.value,
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flameRotation.value}deg` }],
  }));

  return (
    <View className="flex-1 items-center justify-center px-8">
      {/* Success checkmark circle */}
      <Animated.View
        style={checkAnimatedStyle}
        className="w-24 h-24 rounded-full bg-success items-center justify-center mb-6"
      >
        <Ionicons name="checkmark" size={48} color="white" />
      </Animated.View>

      {/* Main text */}
      <Animated.View style={textAnimatedStyle} className="items-center">
        <Text className="text-3xl font-bold text-secondary mb-2">
          Day Complete!
        </Text>
        <Text className="text-lg text-textSecondary text-center mb-8">
          You've read all 7 verses today.{"\n"}
          Come back tomorrow for more wisdom.
        </Text>
      </Animated.View>

      {/* Streak card */}
      <Animated.View
        style={streakAnimatedStyle}
        className="bg-surface rounded-2xl p-6 shadow-lg w-full max-w-xs"
      >
        <View className="flex-row items-center justify-center mb-4">
          <Animated.View style={flameAnimatedStyle}>
            <Ionicons name="flame" size={32} color="#FF6B35" />
          </Animated.View>
          <Text className="text-4xl font-bold text-primary ml-2">
            {currentStreak}
          </Text>
          <Text className="text-lg text-textSecondary ml-2">
            day{currentStreak !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Streak label */}
        <Text className="text-center text-textSecondary mb-4">
          {currentStreak === 1
            ? "You've started your journey!"
            : currentStreak < 7
            ? "Keep the momentum going!"
            : currentStreak < 30
            ? "You're building a great habit!"
            : "Incredible dedication! 🙏"}
        </Text>

        {/* New record badge */}
        {isNewRecord && currentStreak > 1 && (
          <View className="bg-accent/20 rounded-full py-2 px-4 self-center">
            <Text className="text-accent font-semibold">🎉 New Record!</Text>
          </View>
        )}

        {/* Longest streak (if different from current) */}
        {!isNewRecord && longestStreak > currentStreak && (
          <Text className="text-center text-textSecondary text-sm mt-2">
            Longest streak: {longestStreak} days
          </Text>
        )}
      </Animated.View>

      {/* Motivational quote - optional */}
      <Animated.View style={textAnimatedStyle} className="mt-8">
        <Text className="text-center text-textSecondary italic text-sm px-4">
          "योगस्थः कुरु कर्माणि"{"\n"}
          <Text className="text-xs">"Established in yoga, perform action"</Text>
        </Text>
      </Animated.View>
    </View>
  );
}
