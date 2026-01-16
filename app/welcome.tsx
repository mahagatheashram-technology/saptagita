import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function WelcomeScreen() {
  const router = useRouter();
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslate, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroOpacity, heroTranslate]);

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      <LinearGradient
        colors={["rgba(255,231,210,0.82)", "rgba(255,248,240,0.96)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <View className="absolute w-64 h-64 rounded-full bg-[#FF6B35]/10 blur-3xl -left-16 top-10" />
      <View className="absolute w-64 h-64 rounded-full bg-[#7C3AED]/8 blur-3xl -right-12 bottom-24" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingVertical: 32,
        }}
        className="flex-1"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View
            className="w-full max-w-xl items-center mb-10"
            style={{
              opacity: heroOpacity,
              transform: [{ translateY: heroTranslate }],
            }}
          >
            <Text
              className="mb-5"
              style={{ fontSize: 64, lineHeight: 76, textAlign: "center" }}
            >
              🕉️
            </Text>

            <Text className="text-3xl font-extrabold text-[#0F2D52] mb-3 text-center">
              Sapta Gita
            </Text>

            <Text className="text-lg text-[#5B6A82] text-center mb-1">
              Read 7 verses of the Bhagavad Gita daily.
            </Text>
            <Text className="text-lg text-[#5B6A82] text-center mb-1">
              Build your streak.
            </Text>
            <Text className="text-lg text-[#5B6A82] text-center mb-6">
              Grow with your community.
            </Text>

            <View className="flex-row flex-wrap items-center justify-center gap-2 mt-1 px-2">
              <Badge label="Daily devotion" />
              <Badge label="Mindful focus" />
              <Badge label="Community energy" />
              <Badge label="Offline-friendly reading" />
            </View>
          </Animated.View>

          <Animated.View
            className="w-full max-w-xl"
            style={{
              opacity: heroOpacity,
              transform: [{ translateY: Animated.multiply(heroTranslate, 0.5) }],
            }}
          >
            <Pressable
              onPress={() => router.push("/sign-up")}
              className="bg-[#FF6B35] py-4 rounded-xl mb-3 shadow-md shadow-[#FF6B35]/30"
            >
              <Text className="text-white text-center text-lg font-semibold">
                Get Started
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push("/sign-in")}>
              <Text className="text-[#5B6A82] text-center text-base">
                Already have an account?{" "}
                <Text className="text-[#FF6B35] font-semibold">Sign In</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View className="bg-white/75 border border-white/70 rounded-full px-3 py-1 shadow-sm">
      <Text className="text-xs font-semibold text-[#4B5563]">{label}</Text>
    </View>
  );
}
