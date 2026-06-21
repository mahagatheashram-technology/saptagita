import { View, Text, Image, ScrollView } from "react-native";
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
import { notify } from "@/lib/haptics";
import { DharmicSearchBox } from "./DharmicSearchBox";

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
    notify();

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
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 32,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top: success + compact streak chip (secondary) */}
      <View className="items-center w-full">
        <Animated.View
          style={checkAnimatedStyle}
          className="w-14 h-14 rounded-full bg-success items-center justify-center mb-3"
        >
          <Ionicons name="checkmark" size={28} color="white" />
        </Animated.View>

        <Animated.View style={textAnimatedStyle} className="items-center">
          <Text className="text-xl font-bold text-secondary mb-3">
            Day Complete!
          </Text>
        </Animated.View>

        <Animated.View
          style={streakAnimatedStyle}
          className="flex-row items-center bg-surface rounded-full px-4 py-2 shadow-sm"
        >
          <Animated.View style={flameAnimatedStyle}>
            <Ionicons name="flame" size={18} color="#FF6B35" />
          </Animated.View>
          <Text className="text-base font-bold text-primary ml-1.5">
            {currentStreak}
          </Text>
          <Text className="text-sm text-textSecondary ml-1">
            day{currentStreak !== 1 ? "s" : ""} streak
          </Text>
          {isNewRecord && currentStreak > 1 && (
            <Text className="text-sm font-semibold text-accent ml-2">
              · 🎉 New record
            </Text>
          )}
        </Animated.View>

        {!isNewRecord && longestStreak > currentStreak && (
          <Animated.View style={streakAnimatedStyle}>
            <Text className="text-xs text-textSecondary mt-2">
              Longest streak: {longestStreak} days
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Hero: Dharmic search — front and center */}
      <Animated.View
        style={textAnimatedStyle}
        className="w-full items-center my-6"
      >
        <DharmicSearchBox />
      </Animated.View>

      {/* Bottom: foundation branding (secondary) */}
      <Animated.View style={textAnimatedStyle} className="items-center">
        <Image
          source={require("@/assets/images/mahagathe-foundation-logo.png")}
          style={{ width: 44, height: 44, marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text className="text-sm font-semibold text-secondary">Sapta Gita</Text>
        <Text className="text-xs text-textSecondary/60 tracking-[0.5px] mt-1">
          A Mahagathe Foundation Initiative
        </Text>
      </Animated.View>
    </ScrollView>
  );
}
