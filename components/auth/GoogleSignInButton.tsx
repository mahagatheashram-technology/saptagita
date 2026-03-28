import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [isLoading, setIsLoading] = useState(false);

  const toMessage = (error: any) => {
    const first = error?.errors?.[0];
    return (
      first?.longMessage ||
      first?.message ||
      error?.message ||
      "Google sign-in failed. Please try again."
    );
  };

  const handlePress = async () => {
    try {
      setIsLoading(true);
      const { createdSessionId, setActive, authSessionResult } =
        await startOAuthFlow();

      if (authSessionResult?.type && authSessionResult.type !== "success") {
        if (
          authSessionResult.type === "cancel" ||
          authSessionResult.type === "dismiss"
        ) {
          return;
        }
        throw new Error(`Google auth session ended with '${authSessionResult.type}'.`);
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        onSuccess?.();
        return;
      }

      throw new Error(
        "No active session was created. Check Clerk Google OAuth settings and native redirect configuration."
      );
    } catch (error) {
      const message = toMessage(error);
      console.error("[GoogleSignInButton] OAuth failed:", error);
      Alert.alert("Google sign-in failed", message);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      className={`flex-row items-center justify-center border rounded-xl py-3.5 px-4 ${
        isLoading ? "bg-[#F4E6D8]" : "bg-white"
      }`}
      style={{ borderColor: "#E8D4BF" }}
    >
      {isLoading ? (
        <ActivityIndicator color="#1A365D" />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text className="text-[#2F3B4E] font-semibold ml-2 text-[16px]">
            Continue with Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
