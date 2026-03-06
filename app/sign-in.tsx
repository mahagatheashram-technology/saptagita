import { SafeAreaView } from "react-native-safe-area-context";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AuthHeader,
  GoogleSignInButton,
  EmailSignIn,
} from "@/components/auth";

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={["#FFEAD4", "#FFF7EE", "#FFFBF5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <View
        className="absolute w-72 h-72 rounded-full"
        style={{ backgroundColor: "rgba(255, 107, 53, 0.12)", top: -80, left: -70 }}
      />
      <View
        className="absolute w-64 h-64 rounded-full"
        style={{ backgroundColor: "rgba(214, 158, 46, 0.10)", bottom: -90, right: -50 }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 32,
            paddingBottom: 56,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6">
            <AuthHeader />

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
              <Text className="text-[13px] text-[#7A8798] leading-5 mb-4">
                Pick a sign-in method. Your reading history and streak stay synced
                automatically after login.
              </Text>

              <GoogleSignInButton />

              <View className="flex-row items-center my-4">
                <View className="flex-1 h-px bg-[#E8D4BF]" />
                <Text
                  className="mx-3 text-[11px] uppercase tracking-[1.6px] text-[#A56A4C]"
                  style={{ fontFamily: "SpaceMono" }}
                >
                  or continue with email
                </Text>
                <View className="flex-1 h-px bg-[#E8D4BF]" />
              </View>

              <EmailSignIn />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
