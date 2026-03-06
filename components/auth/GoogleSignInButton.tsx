import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
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
