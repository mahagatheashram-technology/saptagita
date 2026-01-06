import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { Link } from "expo-router";
import {
  AuthHeader,
  GoogleSignInButton,
  EmailSignIn,
} from "@/components/auth";

export default function SignUpScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        <AuthHeader
          title="Join Sapta Gita"
          subtitle="Create your account to save progress across devices."
        />

        <View className="space-y-3">
          <GoogleSignInButton />
          <EmailSignIn />
        </View>

        <View className="items-center mt-6">
          <Text className="text-sm text-textSecondary">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary font-semibold">
              Sign in
            </Link>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
