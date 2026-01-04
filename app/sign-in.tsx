import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { Link } from "expo-router";
import {
  AuthHeader,
  GoogleSignInButton,
  EmailSignIn,
} from "@/components/auth";

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        <AuthHeader />

        <View className="space-y-3">
          <GoogleSignInButton />
          <EmailSignIn />
        </View>

        <View className="items-center mt-6">
          <Text className="text-sm text-textSecondary">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-primary font-semibold">
              Sign up
            </Link>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
