import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AuthHeader,
  GoogleSignInButton,
  EmailSignIn,
} from "@/components/auth";

type AuthTab = "google" | "email";

export default function SignInScreen() {
  const [activeTab, setActiveTab] = useState<AuthTab>("google");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={["#FFEAD4", "#FFF7EE", "#FFFBF5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Decorative blobs — hidden on email tab so they don't compete with keyboard layout */}
      {activeTab === "google" && (
        <>
          <View
            className="absolute w-72 h-72 rounded-full"
            style={{ backgroundColor: "rgba(255, 107, 53, 0.12)", top: -80, left: -70 }}
          />
          <View
            className="absolute w-64 h-64 rounded-full"
            style={{ backgroundColor: "rgba(214, 158, 46, 0.10)", bottom: -90, right: -50 }}
          />
        </>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 24}
      >
        <View className="flex-1 justify-center px-6">

          {/* Google tab: show full hero header */}
          {activeTab === "google" && <AuthHeader />}

          {/* Email tab: show compact brand mark instead of full headline */}
          {activeTab === "email" && (
            <View className="items-center mb-6">
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 52, height: 52, borderRadius: 13, marginBottom: 10 }}
              />
              <Text
                className="text-[12px] uppercase tracking-[2.5px] text-[#A56A4C]"
                style={{ fontFamily: "SpaceMono" }}
              >
                Sapta Gita
              </Text>
            </View>
          )}

          {/* Auth card */}
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.86)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.95)",
              shadowColor: "#D65C29",
              shadowOpacity: 0.15,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 4,
            }}
          >
            {/* Pill toggle */}
            <View
              className="flex-row rounded-xl p-1 mb-4"
              style={{ backgroundColor: "#F5EDE4" }}
            >
              <Pressable
                onPress={() => setActiveTab("google")}
                className="flex-1 rounded-lg py-2.5 items-center"
                style={{
                  backgroundColor: activeTab === "google" ? "#FF6B35" : "transparent",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: activeTab === "google" ? "#FFFFFF" : "#A56A4C" }}
                >
                  Google
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("email")}
                className="flex-1 rounded-lg py-2.5 items-center"
                style={{
                  backgroundColor: activeTab === "email" ? "#FF6B35" : "transparent",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: activeTab === "email" ? "#FFFFFF" : "#A56A4C" }}
                >
                  Email
                </Text>
              </Pressable>
            </View>

            {/* Google tab content */}
            {activeTab === "google" && (
              <View>
                <Text className="text-[13px] text-[#7A8798] leading-5 mb-4">
                  Your reading history and streak stay synced automatically after
                  login.
                </Text>
                <GoogleSignInButton />
              </View>
            )}

            {/* Email tab content */}
            {activeTab === "email" && <EmailSignIn />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
