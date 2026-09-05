import { useState } from "react";
import { useSignIn } from "@clerk/clerk-expo";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "@/lib/alert";

export function GoogleSignInButton({ onError }: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { isLoaded, signIn } = useSignIn();
  const [pending, setPending] = useState(false);
  const signInWithGoogle = async () => {
    if (!isLoaded || pending) return;
    setPending(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (error: any) {
      setPending(false);
      Alert.alert("Google sign-in failed", error?.errors?.[0]?.longMessage ?? error?.message ?? "Please try again.");
      onError?.(error);
    }
  };
  return (
    <TouchableOpacity
      onPress={signInWithGoogle}
      disabled={!isLoaded || pending}
      accessibilityRole="button"
      className="flex-row items-center justify-center bg-white border border-sand-200 rounded-2xl py-4 px-6"
      style={{ opacity: !isLoaded || pending ? 0.6 : 1 }}
    >
      {pending ? <ActivityIndicator color="#FF6B35" /> : <>
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text className="text-secondary font-semibold ml-2 text-base">Continue with Google</Text>
      </>}
    </TouchableOpacity>
  );
}
