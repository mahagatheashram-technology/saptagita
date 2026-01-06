import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function AppleSignInButton({
  onSuccess,
  onError,
}: AppleSignInButtonProps) {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    try {
      setIsLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        onSuccess?.();
      }
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      className="flex-row items-center justify-center bg-black py-3 px-4 rounded-lg"
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          <Ionicons name="logo-apple" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">
            Continue with Apple
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
